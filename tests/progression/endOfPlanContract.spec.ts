import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';

/**
 * Which steps pause a block that has run all its planned weeks, and which do not. The pause is made only by a
 * step that has the phone's timezone to count the days in (or, for a step that changes the block, one it is
 * counted for in UTC): the pages' own server loads and plain reads never make it. This list is deliberate: a step
 * is added to one side or the other here, not by accident
 */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

const DAY = 24 * 60 * 60 * 1000;
const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

/** A 4-week block that started 40 days ago and was never paused: its plan ended 12 days ago */
async function overdueBlock() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `contract-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	await prisma.exercise.create({ data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup } });
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Block',
			weeklyRIR: [3, 2, 1, -1],
			startDate: new Date(Date.now() - 40 * DAY),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	return { userId, caller, block };
}
const pauseCount = (mesocycleId: string) => prisma.mesocyclePause.count({ where: { mesocycleId } });

const workoutIn = (blockId: string, startedAt: Date) => ({
	timeZone: 'UTC',
	workoutData: {
		userBodyweight: 80,
		routineName: 'Pull A',
		startedAt,
		workoutOfMesocycle: { mesocycle: { id: blockId } }
	},
	workoutExercises: [{ ...rows, exerciseIndex: 0 }],
	workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
	workoutExercisesMiniSets: [[[]]]
});

type Step = (context: Awaited<ReturnType<typeof overdueBlock>>) => Promise<unknown>;

const reconciles: [string, Step][] = [
	[
		'mesocycles.reconcileEndOfPlan (the app, with its timezone)',
		({ caller }) => caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })
	],
	[
		'mesocycles.editById',
		({ caller, block }) =>
			caller.mesocycles.editById({
				id: block.id,
				timeZone: 'UTC',
				mesocycleData: {
					mesocycle: {
						name: block.name,
						weeklyRIR: [...block.weeklyRIR, 1],
						startOverloadPercentage: block.startOverloadPercentage,
						lastSetToFailure: false,
						forceRIRMatching: false
					},
					mesocycleCyclicSetChanges: []
				}
			})
	],
	['mesocycles.pause', ({ caller, block }) => caller.mesocycles.pause({ id: block.id, timeZone: 'UTC' })],
	[
		'mesocycles.progressToNextStage (Finish)',
		({ caller, block }) =>
			caller.mesocycles.progressToNextStage({
				id: block.id,
				startDate: block.startDate,
				endDate: null,
				timeZone: 'UTC'
			})
	],
	[
		'workouts.create into the block',
		({ caller, block }) => caller.workouts.create(workoutIn(block.id, new Date(Date.now() - 20 * DAY)))
	],
	[
		'workouts.getTodaysWorkoutData with a timezone',
		({ caller }) => caller.workouts.getTodaysWorkoutData({ timeZone: 'UTC' })
	],
	[
		'workouts.getWorkoutExercisesWithPreviousData in the block, with a timezone',
		({ caller }) =>
			caller.workouts.getWorkoutExercisesWithPreviousData({
				userBodyweight: 80,
				routineName: 'Pull A',
				useActiveMesocycle: true,
				timeZone: 'UTC'
			})
	],
	[
		'workouts.suggestSets with a timezone',
		({ caller }) =>
			caller.workouts.suggestSets({
				exerciseName: rows.name,
				sets: 3,
				setType: 'Straight',
				repRangeStart: 10,
				repRangeEnd: 15,
				weightUnit: 'KG',
				userBodyweight: 80,
				timeZone: 'UTC'
			})
	]
];

const noOps: [string, Step][] = [
	["mesocycles.findById (the block page's own load)", ({ caller, block }) => caller.mesocycles.findById(block.id)],
	['mesocycles.findActiveMesocycle', ({ caller }) => caller.mesocycles.findActiveMesocycle()],
	['mesocycles.load (the list)', ({ caller }) => caller.mesocycles.load({})],
	['mesocycles.getWorkouts', ({ caller }) => caller.mesocycles.getWorkouts()],
	[
		"workouts.getTodaysWorkoutData with no timezone (the page's own load)",
		({ caller }) => caller.workouts.getTodaysWorkoutData()
	]
];

test.describe('steps that pause a block past its plan', () => {
	for (const [name, step] of reconciles) {
		test(name, async () => {
			const context = await overdueBlock();
			expect(await pauseCount(context.block.id)).toBe(0);
			await step(context);
			const pauses = await prisma.mesocyclePause.findMany({ where: { mesocycleId: context.block.id } });
			expect(pauses).toHaveLength(1);
			// Where the plan ended (28 days after the start day, at midnight UTC), not now
			const startDay = Math.floor(context.block.startDate!.getTime() / DAY);
			expect(pauses[0].pausedAt.toISOString()).toBe(new Date((startDay + 28) * DAY).toISOString());
		});
	}
});

test('mesocycles.resume is refused for a block past its plan, and the refusal changes nothing (no pause is left)', async () => {
	const context = await overdueBlock();
	await expect(context.caller.mesocycles.resume({ id: context.block.id, timeZone: 'UTC' })).rejects.toThrow(
		/planned weeks/
	);
	expect(await pauseCount(context.block.id)).toBe(0);
});

test.describe('documented no-ops: they have no timezone to count the days in, so they leave the block alone', () => {
	for (const [name, step] of noOps) {
		test(name, async () => {
			const context = await overdueBlock();
			await step(context);
			expect(await pauseCount(context.block.id)).toBe(0);
		});
	}
});
