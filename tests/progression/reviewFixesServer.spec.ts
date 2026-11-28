import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';
import { mesocycleDefaults, pullRows as rows } from '../support/blocks';
import { downSetLoad } from '../../src/lib/utils/workoutUtils';
import { formatWorkoutDate } from '../../src/lib/utils/calendarDays';

/**
 * Fixes from the code review, through the server procedures and the helpers the pages use: each
 * exercise's own bodyweight for "Previous", the list of blocks in order, a deleted row said as such,
 * a workout whose lists don't line up refused, the down set's step and the workout card's date
 */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

async function newPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `review-${userId}@myfit.com` } });
	return { userId, caller: createCaller({ event: {} as never, userId }) };
}

const pullUps = {
	name: 'Pull-ups',
	targetMuscleGroup: 'Lats' as const,
	setType: 'Straight' as const,
	repRangeStart: 5,
	repRangeEnd: 15,
	bodyweightFraction: 1
};

test('"Previous" carries the bodyweight of the day each exercise was last done, not one for all', async () => {
	const { userId, caller } = await newPerson();
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [
			[
				{ ...pullUps, exerciseIndex: 0, sets: 2 },
				{ ...rows, exerciseIndex: 1, sets: 2 }
			]
		]
	});
	const done = async (exercise: typeof pullUps | typeof rows, daysAgo: number, userBodyweight: number) => {
		const at = new Date(Date.now() - daysAgo * 86400000);
		await caller.workouts.create({
			workoutData: { userBodyweight, startedAt: at, endedAt: at, routineName: null },
			workoutExercises: [{ ...exercise, exerciseIndex: 0 }],
			workoutExercisesSets: [[{ setIndex: 0, reps: 10, load: 20, RIR: 2, skipped: false }]],
			workoutExercisesMiniSets: [[[]]]
		});
	};
	// Pull-ups at 90 kg a week ago; rows at 80 kg yesterday
	await done(pullUps, 7, 90);
	await done(rows, 1, 80);

	const { previousWorkoutData } = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 82,
		routineName: 'Pull A'
	});
	expect(previousWorkoutData?.bodyweights).toEqual({ 'Pull-ups': 90, 'Barbell rows': 80 });
	// Still there for an app version from before the map
	expect(previousWorkoutData?.userBodyweight).toEqual(80);

	// An exercise added during a workout brings its own
	const added = await caller.workouts.suggestSets({
		exerciseName: 'Pull-ups',
		sets: 2,
		setType: 'Straight',
		repRangeStart: 5,
		repRangeEnd: 15,
		weightUnit: 'KG',
		userBodyweight: 82
	});
	expect(added?.previous?.userBodyweight).toEqual(90);
	expect(userId).toBeTruthy();
});

test('the list of blocks: not started first, then the latest started first, page after page with none repeated or missed', async () => {
	const { userId, caller } = await newPerson();
	const day = (n: number) => new Date(Date.UTC(2026, 0, n));
	// Created in an order that is neither by start nor by name
	const starts = [9, 3, null, 14, 1, 11, 6, null, 13, 2, 8, 5, 12, 4];
	for (const [idx, start] of starts.entries()) {
		await prisma.mesocycle.create({
			data: {
				...mesocycleDefaults,
				userId,
				name: start === null ? `Not started ${idx}` : `Started Jan ${start}`,
				weeklyRIR: [2],
				startDate: start === null ? null : day(start),
				endDate: start === null ? null : day(start + 1)
			}
		});
	}
	const names: string[] = [];
	let cursorId: string | undefined;
	for (let page = 0; page < 5; page++) {
		const blocks = await caller.mesocycles.load({ cursorId });
		if (blocks.length === 0) break;
		names.push(...blocks.map((block) => block.name));
		cursorId = blocks.at(-1)!.id;
	}
	expect(names).toHaveLength(starts.length);
	expect(new Set(names).size).toEqual(starts.length);
	expect(names.slice(0, 2).every((name) => name.startsWith('Not started'))).toBe(true);
	expect(names.slice(2)).toEqual([14, 13, 12, 11, 9, 8, 6, 5, 4, 3, 2, 1].map((start) => `Started Jan ${start}`));
});

test('deleting a workout or a block that is already gone says so, and leaves other people’s alone', async () => {
	const { userId, caller } = await newPerson();
	const other = await newPerson();
	const at = new Date();
	const workout = await prisma.workout.create({ data: { userId, userBodyweight: 80, startedAt: at, endedAt: at } });
	const block = await prisma.mesocycle.create({
		data: { ...mesocycleDefaults, userId, name: 'Block', weeklyRIR: [2] }
	});

	// Someone else's: not found, and still there
	await expect(other.caller.workouts.deleteById(workout.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
	await expect(other.caller.mesocycles.deleteById(block.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
	expect(await prisma.workout.count({ where: { id: workout.id } })).toEqual(1);
	expect(await prisma.mesocycle.count({ where: { id: block.id } })).toEqual(1);

	await caller.workouts.deleteById(workout.id);
	await caller.mesocycles.deleteById(block.id);
	// A second tap, or another device: said as such (was a server error)
	await expect(caller.workouts.deleteById(workout.id)).rejects.toMatchObject({
		code: 'NOT_FOUND',
		message: 'Workout not found'
	});
	await expect(caller.mesocycles.deleteById(block.id)).rejects.toMatchObject({
		code: 'NOT_FOUND',
		message: 'Mesocycle not found'
	});
});

test('a workout whose exercises, sets and mini-sets don’t line up is refused, saved or edited, and nothing is written', async () => {
	const { userId, caller } = await newPerson();
	const set = (setIndex: number) => ({ setIndex, reps: 10, load: 40, RIR: 2, skipped: false });
	const miniSet = { miniSetIndex: 0, reps: 3, load: 30, RIR: 0 };
	const workout = (sets: ReturnType<typeof set>[][], miniSets: (typeof miniSet)[][][]) => ({
		workoutData: { userBodyweight: 80, routineName: null },
		workoutExercises: [
			{ ...rows, setType: 'Drop' as const, exerciseIndex: 0 },
			{ ...pullUps, exerciseIndex: 1 }
		],
		workoutExercisesSets: sets,
		workoutExercisesMiniSets: miniSets
	});
	const refused = { code: 'BAD_REQUEST', message: 'The workout’s exercises, sets and mini-sets don’t line up' };
	const misaligned = [
		// Sets for an exercise that isn't there (was a TypeError)
		workout([[set(0)], [set(0)], [set(0)]], [[[]], [[]], [[]]]),
		// An exercise with no list of sets
		workout([[set(0)]], [[[]]]),
		// Mini-sets for one set fewer than the first exercise has: the second exercise's would land on its sets
		workout([[set(0), set(1)], [set(0)]], [[[miniSet]], [[miniSet]]]),
		// And for one set more
		workout([[set(0)], [set(0)]], [[[miniSet], [miniSet]], [[]]])
	];
	for (const input of misaligned) await expect(caller.workouts.create(input)).rejects.toMatchObject(refused);
	expect(await prisma.workout.count({ where: { userId } })).toEqual(0);

	// Lined up: saved, each mini-set under its own set
	const good = workout([[set(0), set(1)], [set(0)]], [[[], [miniSet]], [[]]]);
	await caller.workouts.create(good);
	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId },
		include: {
			workoutExercises: {
				orderBy: { exerciseIndex: 'asc' },
				include: { sets: { orderBy: { setIndex: 'asc' }, include: { miniSets: true } } }
			}
		}
	});
	expect(saved.workoutExercises[0].sets.map((s) => s.miniSets.length)).toEqual([0, 1]);
	expect(saved.workoutExercises[1].sets.map((s) => s.miniSets.length)).toEqual([0]);

	// An edit is held to the same, and leaves the workout as it was
	await expect(
		caller.workouts.editById({ id: saved.id, endedAt: saved.endedAt, data: misaligned[2] })
	).rejects.toMatchObject(refused);
	expect(await prisma.workoutExerciseSet.count({ where: { workoutExercise: { workoutId: saved.id } } })).toEqual(3);
});

test('a down set’s next weight: down to the exercise’s step, 2.5 kg or 5 lb without one, or to a weight the gym has', () => {
	// 42.5 kg less 10% is 38.25 kg: was 35 (always a step of 5)
	expect(downSetLoad(38.25, { weightUnit: 'KG', minimumWeightChange: null }, null)).toEqual(37.5);
	expect(downSetLoad(38.25, { weightUnit: null }, null)).toEqual(37.5);
	expect(downSetLoad(88, { weightUnit: 'LB', minimumWeightChange: null }, null)).toEqual(85);
	expect(downSetLoad(38.25, { weightUnit: 'KG', minimumWeightChange: 1 }, null)).toEqual(38);
	expect(downSetLoad(37.5, { weightUnit: 'KG' }, null)).toEqual(37.5);
	expect(downSetLoad(38.25, { weightUnit: 'KG' }, [20, 30, 40])).toEqual(30);
	expect(downSetLoad(15, { weightUnit: 'KG' }, [20, 30, 40])).toEqual(20);
});

test('a workout card’s date: "Oct 16", with the year when it isn’t this one', () => {
	const now = new Date(2026, 10, 10);
	expect(formatWorkoutDate(new Date(2026, 9, 16, 18), now)).toEqual('Oct 16');
	expect(formatWorkoutDate(new Date(2026, 0, 1, 0, 5), now)).toEqual('Jan 1');
	expect(formatWorkoutDate(new Date(2025, 9, 16, 18), now)).toEqual('Oct 16, 2025');
	expect(formatWorkoutDate(new Date(2025, 11, 31, 23, 59), now)).toEqual('Dec 31, 2025');
});

test('a block’s sets per muscle count the sets done: an old workout’s skipped sets are left out', async () => {
	const { getSetsPerformedPerMuscleGroup } = await import('../../src/lib/utils/mesocycleUtils');
	const set = (skipped: boolean) => ({ reps: skipped ? 0 : 10, load: skipped ? 0 : 40, RIR: 0, skipped, miniSets: [] });
	const data = [
		{
			workoutId: 'w1',
			workout: {
				userBodyweight: 80,
				routineName: 'Pull A',
				workoutExercises: [
					{
						name: 'Barbell rows',
						targetMuscleGroup: 'Traps',
						customMuscleGroup: null,
						sets: [set(false), set(false), set(true)]
					},
					{
						name: 'Pull-ups',
						targetMuscleGroup: 'Lats',
						customMuscleGroup: null,
						sets: [set(false), set(true), set(true)]
					}
				]
			}
		}
	] as unknown as Parameters<typeof getSetsPerformedPerMuscleGroup>[0];
	// Was 3 and 3: every set, done or not
	expect(getSetsPerformedPerMuscleGroup(data)).toEqual([
		{ muscleGroup: 'Lats', totalSets: 1 },
		{ muscleGroup: 'Traps', totalSets: 2 }
	]);
});

test('createFromWorkout unarchives an archived exercise linked from the workout', async () => {
	const { userId, caller } = await newPerson();
	const at = new Date('2026-11-10T10:00:00.000Z');
	await caller.workouts.create({
		workoutData: { userBodyweight: 80, startedAt: at, endedAt: at, routineName: null },
		workoutExercises: [{ ...pullUps, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 10, load: 0, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	});
	const { id: workoutId } = await prisma.workout.findFirstOrThrow({ where: { userId } });
	const exercise = await prisma.exercise.findFirstOrThrow({ where: { userId, name: pullUps.name } });
	await caller.exercises.delete(exercise.id);
	expect((await prisma.exercise.findUniqueOrThrow({ where: { id: exercise.id } })).archived).toBe(true);

	await caller.exerciseSplits.createFromWorkout({ workoutId, name: 'Recovered Pull' });
	expect((await prisma.exercise.findUniqueOrThrow({ where: { id: exercise.id } })).archived).toBe(false);
});

test('addToRoutines unarchives an archived exercise when adding it to a routine', async () => {
	const { userId, caller } = await newPerson();
	const at = new Date('2026-11-10T10:00:00.000Z');
	await caller.workouts.create({
		workoutData: { userBodyweight: 80, startedAt: at, endedAt: at, routineName: null },
		workoutExercises: [{ ...pullUps, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 10, load: 0, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	});
	const exercise = await prisma.exercise.findFirstOrThrow({ where: { userId, name: pullUps.name } });
	await caller.exercises.delete(exercise.id);
	expect((await prisma.exercise.findUniqueOrThrow({ where: { id: exercise.id } })).archived).toBe(true);

	await caller.exerciseSplits.save({
		routines: [{ name: 'Upper', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 2 }]]
	});
	const routine = await prisma.exerciseSplitDay.findFirstOrThrow({
		where: { exerciseSplit: { userId }, name: 'Upper' }
	});

	await caller.exercises.addToRoutines({ exerciseId: exercise.id, routineIds: [routine.id] });
	expect((await prisma.exercise.findUniqueOrThrow({ where: { id: exercise.id } })).archived).toBe(false);
});

test('workouts.editById keeps existing.startedAt when startedAt is omitted', async () => {
	const { userId, caller } = await newPerson();
	const startedAt = new Date('2026-11-10T10:00:00.000Z');
	const endedAt = new Date('2026-11-10T11:00:00.000Z');
	await caller.workouts.create({
		workoutData: { userBodyweight: 80, startedAt, endedAt, routineName: null },
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 10, load: 40, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	});
	const { id } = await prisma.workout.findFirstOrThrow({ where: { userId } });

	await caller.workouts.editById({
		id,
		endedAt,
		data: {
			workoutData: { userBodyweight: 82, routineName: null },
			workoutExercises: [{ ...rows, exerciseIndex: 0 }],
			workoutExercisesSets: [[{ setIndex: 0, reps: 11, load: 40, RIR: 2, skipped: false }]],
			workoutExercisesMiniSets: [[[]]]
		}
	});
	const updated = await prisma.workout.findUniqueOrThrow({ where: { id } });
	expect(updated.startedAt).toEqual(startedAt);
	expect(updated.userBodyweight).toBe(82);
});

test('exercises.delete archives an exercise used in a workout and deletes one without workouts', async () => {
	const { userId, caller } = await newPerson();
	const unused = await caller.exercises.create({
		name: 'Unused curl',
		targetMuscleGroup: 'Biceps',
		customMuscleGroup: null,
		bodyweightFraction: null,
		note: null,
		repsOnly: false,
		maxReps: null,
		levels: null,
		distanceUnit: null
	});
	const delUnused = await caller.exercises.delete(unused.id);
	expect(delUnused).toEqual({ archived: false });
	expect(await prisma.exercise.findUnique({ where: { id: unused.id } })).toBeNull();

	const at = new Date('2026-11-10T10:00:00.000Z');
	await caller.workouts.create({
		workoutData: { userBodyweight: 80, startedAt: at, endedAt: at, routineName: null },
		workoutExercises: [{ ...pullUps, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 10, load: 0, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	});
	const used = await prisma.exercise.findFirstOrThrow({ where: { userId, name: pullUps.name } });
	const delUsed = await caller.exercises.delete(used.id);
	expect(delUsed).toEqual({ archived: true });
	expect((await prisma.exercise.findUniqueOrThrow({ where: { id: used.id } })).archived).toBe(true);
});

test('createFromWorkout counts sets done, names a repeated exercise apart, keeps another unit and drops a deleted weight set', async () => {
	const { userId, caller } = await newPerson();
	const at = new Date('2026-11-10T10:00:00.000Z');
	const set = (setIndex: number, skipped = false) => ({ setIndex, reps: 10, load: 20, RIR: 2, skipped });
	await caller.workouts.create({
		workoutData: { userBodyweight: 80, startedAt: at, endedAt: at, routineName: null },
		workoutExercises: [
			{ ...pullUps, exerciseIndex: 0 },
			{ ...rows, exerciseIndex: 1 }
		],
		// Pull-ups: 2 done and 1 skipped
		workoutExercisesSets: [[set(0), set(1), set(2, true)], [set(0)]],
		workoutExercisesMiniSets: [[[], [], []], [[]]]
	});
	const { id: workoutId } = await prisma.workout.findFirstOrThrow({ where: { userId } });
	const [first, second] = await prisma.workoutExercise.findMany({
		where: { workoutId },
		orderBy: { exerciseIndex: 'asc' }
	});
	// The workout was done in KG, but the rows in LB; its rows link a weight set that was deleted since
	await prisma.workoutExercise.update({
		where: { id: second.id },
		data: { weightUnit: 'LB', weightSetId: createId() }
	});
	// A second Pull-ups (as an exercise merge can leave), and the first kept in KG
	const { id: _, ...copy } = first;
	await prisma.workoutExercise.create({ data: { ...copy, exerciseIndex: 2 } });

	await caller.exerciseSplits.createFromWorkout({ workoutId, name: 'Pull day' });
	const [routine] = (
		await prisma.exerciseSplit.findUniqueOrThrow({
			where: { userId },
			include: {
				exerciseSplitDays: { include: { exercises: { orderBy: { exerciseIndex: 'asc' } } } }
			}
		})
	).exerciseSplitDays;
	expect(routine.exercises.map((exercise) => exercise.name)).toEqual(['Pull-ups', rows.name, 'Pull-ups (2)']);
	// Sets done, not skipped ones
	expect(routine.exercises.map((exercise) => exercise.sets)).toEqual([2, 1, null]);
	expect(routine.weightUnit).toBe('KG');
	// The rows keep their LB; the others follow the routine; no link to the deleted weight set
	expect(routine.exercises.map((exercise) => exercise.weightUnit)).toEqual([null, 'LB', null]);
	expect(routine.exercises.map((exercise) => exercise.weightSetId)).toEqual([null, null, null]);
});
