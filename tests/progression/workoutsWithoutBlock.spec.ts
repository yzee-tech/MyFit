import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';
import { NO_BLOCK_PROGRESSION } from '../../src/lib/utils/workoutUtils';

/**
 * Workouts from a routine without a block, and how a new workout's times are saved, through the
 * server procedures
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

/** A person with "Pull A" (3 sets of barbell rows) in My routines, and rows done once before */
async function seedPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `no-block-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	const exercise = await prisma.exercise.create({
		data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup }
	});
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: twoDaysAgo,
			endedAt: twoDaysAgo,
			routineName: 'Pull A',
			workoutExercises: {
				create: [
					{
						...rows,
						exerciseIndex: 0,
						exerciseId: exercise.id,
						sets: {
							create: [0, 1, 2].map((setIndex) => ({ setIndex, reps: 12, load: 40, RIR: 2, skipped: false }))
						}
					}
				]
			}
		}
	});
	return { userId, caller, exercise };
}

/** A new workout of Pull A with one set of rows, as the workout screen would send it */
function pullAWorkout(extra: { startedAt?: Date; endedAt?: Date; routineName?: string | null } = {}) {
	return {
		workoutData: { userBodyweight: 80, routineName: 'Pull A', ...extra },
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	};
}

test('no block: a routine of My routines gets the same suggestions as an exercise added to a blank workout', async () => {
	const { caller } = await seedPerson();
	const fromRoutine = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 80,
		routineName: 'Pull A'
	});
	expect(fromRoutine.todaysWorkoutExercises.map((exercise) => exercise.name)).toEqual(['Barbell rows']);
	const added = await caller.workouts.suggestSets({
		exerciseName: rows.name,
		sets: 3,
		setType: rows.setType,
		repRangeStart: rows.repRangeStart,
		repRangeEnd: rows.repRangeEnd,
		weightUnit: 'KG',
		userBodyweight: 80
	});
	const numbers = (sets: { reps?: number | null; load?: number | null; RIR?: number | null }[]) =>
		sets.map(({ reps, load, RIR }) => [reps, load, RIR]);
	expect(numbers(fromRoutine.todaysWorkoutExercises[0].sets)).toEqual(numbers(added!.sets!));
	// Last time is there to compare with
	expect(fromRoutine.previousWorkoutData?.exercises.map((exercise) => exercise.name)).toEqual(['Barbell rows']);
	// One set of steady settings for both
	expect(NO_BLOCK_PROGRESSION).toEqual({
		weeklyRIR: [2],
		startOverloadPercentage: 2.5,
		lastSetToFailure: false,
		forceRIRMatching: false
	});
});

test('starting a workout needs a routine name; an old app version sending a position is asked to reopen', async () => {
	const { caller } = await seedPerson();
	await expect(
		caller.workouts.getWorkoutExercisesWithPreviousData({ userBodyweight: 80, splitDayIndex: 0 })
	).rejects.toThrow('MyFit was updated, please close and reopen the app');
	await expect(caller.workouts.getWorkoutExercisesWithPreviousData({ userBodyweight: 80 })).rejects.toThrow(
		'Give a routine name'
	);
	// A name and an old position: the name is used, the position ignored
	const both = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 80,
		splitDayIndex: 3,
		routineName: 'Pull A'
	});
	expect(both.todaysWorkoutExercises.map((exercise) => exercise.name)).toEqual(['Barbell rows']);
});

test('a new workout ends at its last ticked set, kept between its start and now; an edit keeps its times', async () => {
	const { userId, caller } = await seedPerson();
	const startedAt = new Date(Date.now() - 2 * 3600000);
	const lastTick = new Date(Date.now() - 3600000);
	const saved = async (workoutId: string) => prisma.workout.findUniqueOrThrow({ where: { id: workoutId } });

	const { workoutId: atLastTick } = await caller.workouts.create(pullAWorkout({ startedAt, endedAt: lastTick }));
	expect((await saved(atLastTick)).endedAt.getTime()).toEqual(lastTick.getTime());
	expect((await saved(atLastTick)).routineName).toEqual('Pull A');

	// Nothing ticked: saved now
	const before = Date.now();
	const { workoutId: noTick } = await caller.workouts.create(pullAWorkout({ startedAt }));
	expect((await saved(noTick)).endedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);

	// Never in the future, never before the start
	const { workoutId: future } = await caller.workouts.create(
		pullAWorkout({ startedAt, endedAt: new Date(Date.now() + 3600000) })
	);
	expect((await saved(future)).endedAt.getTime()).toBeLessThanOrEqual(Date.now());
	const { workoutId: early } = await caller.workouts.create(
		pullAWorkout({ startedAt, endedAt: new Date(startedAt.getTime() - 3600000) })
	);
	expect((await saved(early)).endedAt.getTime()).toEqual(startedAt.getTime());

	// Editing: the times are taken as given (a later end today included), and the routine stays
	const laterToday = new Date(Date.now() + 30 * 60000);
	await caller.workouts.editById({
		id: atLastTick,
		data: pullAWorkout({ startedAt, routineName: 'Something else' }),
		endedAt: laterToday
	});
	const edited = await saved(atLastTick);
	expect(edited.endedAt.getTime()).toEqual(laterToday.getTime());
	expect(edited.routineName).toEqual('Pull A');
	expect(await prisma.workout.count({ where: { userId } })).toEqual(5);
});

test('a saved mesocycle workout is named by its routineName, else (saved by an old app version) the name it showed; never by position', async () => {
	const { userId, caller } = await seedPerson();
	await caller.mesocycles.create({
		mesocycle: {
			name: 'Now',
			weeklyRIR: [3, 2, 1],
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		},
		mesocycleCyclicSetChanges: [],
		startImmediately: true
	});
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { userId } });
	const saved = (workoutId: string) =>
		prisma.workout.findUniqueOrThrow({ where: { id: workoutId }, include: { workoutOfMesocycle: true } });

	// From an app version before routineName: an old position and the name it showed. Not in today's
	// input type, so sent as a separate object, the way an old app's JSON arrives
	const oldWorkoutOfMesocycle = {
		mesocycle: { id: block.id },
		splitDayIndex: 7,
		splitDayName: 'Pull A',
		workoutStatus: null
	};
	const { workoutId: old } = await caller.workouts.create({
		...pullAWorkout(),
		workoutData: { userBodyweight: 80, workoutOfMesocycle: oldWorkoutOfMesocycle }
	});
	const oldWorkout = await saved(old);
	expect(oldWorkout.routineName).toEqual('Pull A');
	// The position isn't kept: there is no column for it
	expect(oldWorkout.workoutOfMesocycle).not.toHaveProperty('splitDayIndex');

	// routineName wins over anything else the client sends
	const { workoutId: named } = await caller.workouts.create({
		...pullAWorkout({ routineName: 'Pull A' }),
		workoutData: {
			userBodyweight: 80,
			routineName: 'Pull A',
			workoutOfMesocycle: { mesocycle: { id: block.id }, splitDayName: 'Other', workoutStatus: null }
		}
	});
	expect((await saved(named)).routineName).toEqual('Pull A');
});

test('a block workout from today’s app: named by its routine of My routines, no position kept; renaming the routine keeps old names', async () => {
	const { userId, caller } = await seedPerson();
	await caller.mesocycles.create({
		mesocycle: {
			name: 'Now',
			weeklyRIR: [3, 2, 1],
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		},
		mesocycleCyclicSetChanges: [],
		startImmediately: true
	});
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { userId } });

	// Suggestions for a block routine come from My routines, with the block's settings
	const suggested = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 80,
		routineName: 'Pull A',
		useActiveMesocycle: true
	});
	expect(suggested.todaysWorkoutExercises.map((exercise) => exercise.name)).toEqual(['Barbell rows']);
	// The start page lists My routines for the block
	const today = await caller.workouts.getTodaysWorkoutData();
	expect(today.activeBlock?.routines.map((routine) => routine.name)).toContain('Pull A');

	const { workoutId } = await caller.workouts.create({
		...pullAWorkout(),
		workoutData: {
			userBodyweight: 80,
			routineName: 'Pull A',
			workoutOfMesocycle: { mesocycle: { id: block.id }, workoutStatus: null }
		}
	});
	const saved = await prisma.workout.findUniqueOrThrow({
		where: { id: workoutId },
		include: { workoutOfMesocycle: true }
	});
	expect(saved.routineName).toEqual('Pull A');
	expect(saved.workoutOfMesocycle).not.toHaveProperty('splitDayIndex');
	// Done from it, in this block
	const after = await caller.workouts.getTodaysWorkoutData();
	expect(after.activeBlock?.routines.find((routine) => routine.name === 'Pull A')?.lastDoneAt).not.toBeNull();

	// Renamed in My routines: the workout keeps the name it was done under
	await prisma.exerciseSplitDay.updateMany({
		where: { exerciseSplit: { userId }, name: 'Pull A' },
		data: { name: 'Pull – Hotel' }
	});
	expect((await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } })).routineName).toEqual('Pull A');
});

test('no block: Update routine is offered from the routine’s name; a deleted routine or a blank workout isn’t', async () => {
	const { userId, caller } = await seedPerson();
	const withExtraSet = {
		...pullAWorkout(),
		workoutExercisesSets: [
			[0, 1, 2, 3].map((setIndex) => ({ setIndex, reps: 12, load: 42.5, RIR: 2, skipped: false }))
		],
		workoutExercisesMiniSets: [[[], [], [], []]]
	};
	expect((await caller.workouts.previewRoutineChanges(withExtraSet))?.changes).toEqual([
		'Barbell rows: 4 sets (routine: 3)'
	]);
	expect(
		await caller.workouts.previewRoutineChanges({
			...withExtraSet,
			workoutData: { userBodyweight: 80, routineName: null }
		})
	).toBeNull();

	await caller.workouts.create({ ...withExtraSet, updateRoutine: true });
	const routine = await prisma.exerciseTemplate.findFirstOrThrow({
		where: { exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId } } }
	});
	expect(routine.sets).toEqual(4);

	await prisma.exerciseSplitDay.deleteMany({ where: { exerciseSplit: { userId } } });
	expect(await caller.workouts.previewRoutineChanges(withExtraSet)).toBeNull();
	const { workoutId } = await caller.workouts.create({ ...withExtraSet, updateRoutine: true });
	expect((await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } })).routineName).toEqual('Pull A');
});
