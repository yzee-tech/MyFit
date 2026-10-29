import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';

/**
 * A workout's deload flag and the week in suggestions: weeks are counted in the phone's local days
 * (the timeZone it sends), and an edit keeps the saved flag unless the start moved
 */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

// A 6-week block (week 6 a deload) that started Oct 20 at 18:00 in Shanghai (10:00 UTC)
const STARTED = new Date('2026-10-20T10:00:00Z');
// Shanghai Nov 24 is day 35, the first day of week 6; in UTC it is still Nov 23, day 34 of week 5
const DELOAD_IN_SHANGHAI = new Date('2026-11-23T17:00:00Z');
const WEEK_ONE = new Date('2026-10-21T02:00:00Z');
const SHANGHAI = 'Asia/Shanghai';

async function seedPerson(withBlock = true) {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `week-server-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	await prisma.exercise.create({ data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup } });
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const block = withBlock
		? await prisma.mesocycle.create({
				data: {
					userId,
					name: 'Block',
					weeklyRIR: [3, 2, 2, 1, 0, -1],
					startDate: STARTED,
					startOverloadPercentage: 2.5,
					lastSetToFailure: false,
					forceRIRMatching: false
				}
			})
		: null;
	return { userId, caller, block };
}

function workoutOf(blockId: string | null, startedAt: Date, timeZone?: string) {
	return {
		...(timeZone === undefined ? {} : { timeZone }),
		workoutData: {
			userBodyweight: 80,
			routineName: 'Pull A',
			startedAt,
			...(blockId ? { workoutOfMesocycle: { mesocycle: { id: blockId } } } : {})
		},
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	};
}

const deloadOf = async (id: string) => (await prisma.workout.findUniqueOrThrow({ where: { id } })).isDeload;

test('a new workout is a deload workout when its day is in the deload week in the phone timezone', async () => {
	const { caller, block } = await seedPerson();
	const inShanghai = await caller.workouts.create(workoutOf(block!.id, DELOAD_IN_SHANGHAI, SHANGHAI));
	expect(await deloadOf(inShanghai.workoutId)).toBe(true);
	// Without a timezone (or with an empty, invalid or over-long one) UTC days are counted
	for (const timeZone of [undefined, '', 'Not/AZone', 'x'.repeat(65)]) {
		const { workoutId } = await caller.workouts.create(workoutOf(block!.id, DELOAD_IN_SHANGHAI, timeZone));
		expect(await deloadOf(workoutId)).toBe(false);
	}
	const early = await caller.workouts.create(workoutOf(block!.id, WEEK_ONE, SHANGHAI));
	expect(await deloadOf(early.workoutId)).toBe(false);
});

test('an edit that keeps the start keeps the saved flag; a moved start works it out again; no block keeps the flag', async () => {
	const { caller, block } = await seedPerson();
	// Saved as deload by an older week count, though its day is week 1 now
	const { workoutId } = await caller.workouts.create(workoutOf(block!.id, WEEK_ONE, SHANGHAI));
	await prisma.workout.update({ where: { id: workoutId }, data: { isDeload: true } });
	await caller.workouts.editById({
		id: workoutId,
		data: workoutOf(block!.id, WEEK_ONE, SHANGHAI),
		endedAt: new Date(WEEK_ONE.getTime() + 3600000)
	});
	expect(await deloadOf(workoutId)).toBe(true);
	// An ISO string start that is the same instant: still unchanged
	await caller.workouts.editById({
		id: workoutId,
		data: workoutOf(block!.id, WEEK_ONE.toISOString() as unknown as Date, SHANGHAI),
		endedAt: new Date(WEEK_ONE.getTime() + 7200000).toISOString()
	});
	expect(await deloadOf(workoutId)).toBe(true);
	// Moved into the deload week, and out again
	await caller.workouts.editById({
		id: workoutId,
		data: workoutOf(block!.id, DELOAD_IN_SHANGHAI, SHANGHAI),
		endedAt: new Date(DELOAD_IN_SHANGHAI.getTime() + 3600000)
	});
	expect(await deloadOf(workoutId)).toBe(true);
	await caller.workouts.editById({
		id: workoutId,
		data: workoutOf(block!.id, WEEK_ONE, SHANGHAI),
		endedAt: new Date(WEEK_ONE.getTime() + 3600000)
	});
	expect(await deloadOf(workoutId)).toBe(false);

	// Not in a block: the stored value stays, even when the start moves
	const plain = await seedPerson(false);
	const created = await plain.caller.workouts.create(workoutOf(null, WEEK_ONE, SHANGHAI));
	await prisma.workout.update({ where: { id: created.workoutId }, data: { isDeload: true } });
	await plain.caller.workouts.editById({
		id: created.workoutId,
		data: workoutOf(null, DELOAD_IN_SHANGHAI, SHANGHAI),
		endedAt: new Date(DELOAD_IN_SHANGHAI.getTime() + 3600000)
	});
	expect(await deloadOf(created.workoutId)).toBe(true);
});

test('suggestions and the todays-workout data take a missing, empty or over-long timezone without an error, and carry no week', async () => {
	const { caller } = await seedPerson();
	for (const timeZone of [undefined, '', 'x'.repeat(65), SHANGHAI]) {
		const exercises = await caller.workouts.getWorkoutExercisesWithPreviousData({
			userBodyweight: 80,
			routineName: 'Pull A',
			timeZone
		});
		expect(exercises.todaysWorkoutExercises).toHaveLength(1);
		await caller.workouts.suggestSets({
			exerciseName: rows.name,
			sets: 3,
			setType: rows.setType,
			repRangeStart: rows.repRangeStart,
			repRangeEnd: rows.repRangeEnd,
			weightUnit: 'KG',
			userBodyweight: 80,
			timeZone
		});
	}
	const today = await caller.workouts.getTodaysWorkoutData();
	expect(today.activeBlock).toBeDefined();
	expect(today.activeBlock).not.toHaveProperty('weekNumber');
	expect(today.activeBlock).not.toHaveProperty('blockFinished');
});

test('the suggestions count the week at the time the phone sends: deload from the first minute of week 6, normal a minute before', async () => {
	const { caller, block } = await seedPerson();
	// Something done before, so there is a last time to suggest from
	await caller.workouts.create(workoutOf(block!.id, WEEK_ONE, SHANGHAI));
	const routineRIRs = async (now?: string) =>
		(
			await caller.workouts.getWorkoutExercisesWithPreviousData({
				userBodyweight: 80,
				routineName: 'Pull A',
				useActiveMesocycle: true,
				timeZone: SHANGHAI,
				now
			})
		).todaysWorkoutExercises[0].sets.map((set) => set.RIR);
	const oneExerciseRIRs = async (now?: string) =>
		(
			await caller.workouts.suggestSets({
				exerciseName: rows.name,
				sets: 3,
				setType: rows.setType,
				repRangeStart: rows.repRangeStart,
				repRangeEnd: rows.repRangeEnd,
				weightUnit: 'KG',
				userBodyweight: 80,
				timeZone: SHANGHAI,
				now
			})
		)?.sets?.map((set) => set.RIR) ?? [];
	// Shanghai midnight Nov 24 is 2026-11-23T16:00Z: day 36 (counting from 1) of the block, the first day of week 6 (the deload)
	for (const ask of [routineRIRs, oneExerciseRIRs]) {
		const deload = await ask('2026-11-23T16:00:00.000Z');
		expect(deload.length).toBeGreaterThan(0);
		for (const rir of deload) expect(rir).toBe(4);
		const before = await ask('2026-11-23T15:59:00.000Z');
		expect(before.length).toBeGreaterThan(0);
		for (const rir of before) expect(rir).not.toBe(4);
	}
});

test('a missing, empty or invalid time from the phone falls back to the server clock without an error', async () => {
	const { caller } = await seedPerson();
	for (const now of [undefined, '', 'not a date', '2026-13-45T99:99:99Z']) {
		const exercises = await caller.workouts.getWorkoutExercisesWithPreviousData({
			userBodyweight: 80,
			routineName: 'Pull A',
			timeZone: SHANGHAI,
			now
		});
		expect(exercises.todaysWorkoutExercises).toHaveLength(1);
		await caller.workouts.suggestSets({
			exerciseName: rows.name,
			sets: 3,
			setType: rows.setType,
			repRangeStart: rows.repRangeStart,
			repRangeEnd: rows.repRangeEnd,
			weightUnit: 'KG',
			userBodyweight: 80,
			timeZone: SHANGHAI,
			now
		});
	}
});
