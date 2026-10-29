import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';
import { APP_UPDATED_MESSAGE } from '../../src/lib/trpc/appUpdated';

/**
 * Cardio through the server procedures: how it's measured on the exercise, suggestions that repeat
 * last time, what a save accepts, and what stays fixed once there's history
 */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

const run = {
	name: 'Run',
	targetMuscleGroup: 'Cardio' as const,
	setType: 'V2' as const,
	repRangeStart: 8,
	repRangeEnd: 15
};
const bike = {
	name: 'Bike',
	targetMuscleGroup: 'Cardio' as const,
	setType: 'V2' as const,
	repRangeStart: 8,
	repRangeEnd: 15
};
const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

/** A set as the workout screen sends it */
const repsSet = (setIndex: number) => ({ setIndex, reps: 12, load: 40, RIR: 2, skipped: false });
const cardioSet = (
	setIndex: number,
	extra: { timeSeconds?: number | null; distanceMeters?: number | null; load?: number; skipped?: boolean }
) => ({
	setIndex,
	reps: 0,
	load: extra.load ?? 0,
	RIR: 0,
	skipped: extra.skipped ?? false,
	timeSeconds: extra.timeSeconds ?? null,
	distanceMeters: extra.distanceMeters ?? null
});

/**
 * A person with Run (distance in km), Bike (time, a machine with levels 1–20) and Barbell rows in
 * "Cardio day", and each done once two days ago: a 5 km run in 26:00, 2 × 30 s at level 8, rows 3 × 12
 */
async function seedPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `cardio-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	const runExercise = await caller.exercises.create({
		name: run.name,
		targetMuscleGroup: run.targetMuscleGroup,
		customMuscleGroup: null,
		bodyweightFraction: null,
		note: null,
		repsOnly: false,
		maxReps: null,
		levels: null,
		machine: null,
		measure: 'DistanceTime',
		distanceUnit: 'KM'
	});
	const bikeExercise = await caller.exercises.create({
		name: bike.name,
		targetMuscleGroup: bike.targetMuscleGroup,
		customMuscleGroup: null,
		bodyweightFraction: null,
		note: null,
		repsOnly: false,
		maxReps: null,
		levels: { from: 1, to: 20, step: 1 },
		machine: null,
		measure: 'Time',
		distanceUnit: null
	});
	const rowsExercise = await prisma.exercise.create({
		data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup }
	});
	await caller.exerciseSplits.save({
		routines: [{ name: 'Cardio day', weightUnit: 'KG' }],
		routineExercises: [
			[
				{ ...run, exerciseIndex: 0, sets: 1 },
				{ ...bike, exerciseIndex: 1, sets: 2 },
				{ ...rows, exerciseIndex: 2, sets: 3 }
			]
		]
	});
	const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: twoDaysAgo,
			endedAt: twoDaysAgo,
			routineName: 'Cardio day',
			workoutExercises: {
				create: [
					{
						...run,
						exerciseIndex: 0,
						exerciseId: runExercise.id,
						sets: { create: [cardioSet(0, { timeSeconds: 1560, distanceMeters: 5000 })] }
					},
					{
						...bike,
						exerciseIndex: 1,
						exerciseId: bikeExercise.id,
						weightUnit: 'LEVEL',
						sets: { create: [cardioSet(0, { timeSeconds: 30, load: 8 }), cardioSet(1, { timeSeconds: 30, load: 8 })] }
					},
					{
						...rows,
						exerciseIndex: 2,
						exerciseId: rowsExercise.id,
						sets: { create: [0, 1, 2].map(repsSet) }
					}
				]
			}
		}
	});
	return { userId, caller, runExercise, bikeExercise, rowsExercise };
}

test('the exercise says how it is measured: a distance unit only with distances, never reps only or a machine with weights', async () => {
	const { caller, runExercise, bikeExercise } = await seedPerson();
	expect(runExercise).toMatchObject({ measure: 'DistanceTime', distanceUnit: 'KM' });
	expect(bikeExercise).toMatchObject({ measure: 'Time', distanceUnit: null, levelsFrom: 1, levelsTo: 20 });

	const details = {
		name: 'Plank',
		targetMuscleGroup: 'Abs' as const,
		customMuscleGroup: null,
		bodyweightFraction: 1,
		note: null,
		repsOnly: false,
		maxReps: null,
		levels: null,
		machine: null
	};
	// A plank: time, in a muscle group; it has no bodyweight share to count
	const plank = await caller.exercises.create({ ...details, measure: 'Time', distanceUnit: null });
	expect(plank).toMatchObject({ measure: 'Time', targetMuscleGroup: 'Abs', bodyweightFraction: null });
	// A distance needs its unit
	await expect(
		caller.exercises.create({ ...details, name: 'Row', measure: 'DistanceTime', distanceUnit: null })
	).rejects.toThrow(/distance unit/);
	// Reps only and a machine's weights are about weight
	await expect(
		caller.exercises.create({ ...details, name: 'Sit-ups', repsOnly: true, measure: 'Time', distanceUnit: null })
	).rejects.toThrow(/Reps only goes with reps/);
	await expect(
		caller.exercises.create({
			...details,
			name: 'Ski erg',
			machine: { weights: [10, 20], unit: 'KG' },
			measure: 'Time',
			distanceUnit: null
		})
	).rejects.toThrow(/machine with weights/);
	// An app version from before cardio sends no measure: the exercise is reps, as it always was
	const legacy = await caller.exercises.create({ ...details, name: 'Curls' });
	expect(legacy).toMatchObject({ measure: 'Reps', distanceUnit: null });
});

test('suggestions repeat last time’s intervals in the exercise’s unit; cardio exercises are listed with their measure', async () => {
	const { caller, runExercise } = await seedPerson();
	const today = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 80,
		routineName: 'Cardio day'
	});
	expect(today.measures).toEqual({
		Run: { measure: 'DistanceTime', distanceUnit: 'KM' },
		Bike: { measure: 'Time', distanceUnit: null }
	});
	const [runToday, bikeToday, rowsToday] = today.todaysWorkoutExercises;
	// 5 km in 26:00 again, shown in km; nothing for reps, weight or RIR
	expect(runToday.sets).toHaveLength(1);
	expect(runToday.sets[0]).toMatchObject({
		timeSeconds: 1560,
		distance: 5,
		reps: undefined,
		load: undefined,
		RIR: undefined
	});
	// The bike's level comes along
	expect(bikeToday.weightUnit).toBe('LEVEL');
	expect(bikeToday.sets.map((set) => [set.timeSeconds, set.load])).toEqual([
		[30, 8],
		[30, 8]
	]);
	// Rows progress as ever
	expect(rowsToday.sets).toHaveLength(3);
	expect(rowsToday.sets.every((set) => typeof set.reps === 'number' && typeof set.load === 'number')).toBe(true);
	// "Previous" has last time's rows for all three
	expect(today.previousWorkoutData?.exercises.map((ex) => ex.name)).toEqual(['Run', 'Bike', 'Barbell rows']);
	const previousRun = today.previousWorkoutData!.exercises[0];
	expect(previousRun.sets[0]).toMatchObject({ timeSeconds: 1560, distanceMeters: 5000 });

	// The same for an exercise added during a workout, in miles once the unit is switched
	await prisma.exercise.update({ where: { id: runExercise.id }, data: { distanceUnit: 'MI' } });
	const suggested = await caller.workouts.suggestSets({
		exerciseName: 'Run',
		sets: 2,
		setType: 'V2',
		repRangeStart: 8,
		repRangeEnd: 15,
		weightUnit: 'KG',
		userBodyweight: 80
	});
	expect(suggested).toMatchObject({ measure: 'DistanceTime', distanceUnit: 'MI' });
	expect(suggested?.sets?.map((set) => [set.timeSeconds, set.distance])).toEqual([
		[1560, 3.107],
		[1560, 3.107]
	]);
});

test('a save needs each cardio interval’s time (and distance); reps sets carry neither; an old app version is asked to reopen', async () => {
	const { caller } = await seedPerson();
	const workout = (sets: { run: object[]; rows: object[] }) => ({
		workoutData: { userBodyweight: 80, routineName: 'Cardio day' },
		workoutExercises: [
			{ ...run, exerciseIndex: 0 },
			{ ...rows, exerciseIndex: 1 }
		],
		workoutExercisesSets: [sets.run, sets.rows] as never,
		workoutExercisesMiniSets: [sets.run.map(() => []), sets.rows.map(() => [])]
	});
	// Fine: a run with its time and distance, rows with reps; a skipped interval carries nothing
	const { workoutId } = await caller.workouts.create(
		workout({
			run: [cardioSet(0, { timeSeconds: 1500, distanceMeters: 5000 }), cardioSet(1, { skipped: true })],
			rows: [repsSet(0)]
		})
	);
	const saved = await prisma.workoutExercise.findMany({
		where: { workoutId },
		orderBy: { exerciseIndex: 'asc' },
		include: { sets: { orderBy: { setIndex: 'asc' } } }
	});
	expect(
		saved[0].sets.map((set) => [set.timeSeconds, set.distanceMeters, set.reps, set.load, set.RIR, set.skipped])
	).toEqual([
		[1500, 5000, 0, 0, 0, false],
		[null, null, 0, 0, 0, true]
	]);
	expect(saved[1].sets[0]).toMatchObject({ timeSeconds: null, distanceMeters: null, reps: 12 });

	// A run without its time, or without its distance: what an app version from before cardio would send
	await expect(
		caller.workouts.create(workout({ run: [cardioSet(0, { distanceMeters: 5000 })], rows: [repsSet(0)] }))
	).rejects.toThrow(APP_UPDATED_MESSAGE);
	await expect(
		caller.workouts.create(workout({ run: [cardioSet(0, { timeSeconds: 1500 })], rows: [repsSet(0)] }))
	).rejects.toThrow(APP_UPDATED_MESSAGE);
	await expect(caller.workouts.create(workout({ run: [repsSet(0)], rows: [repsSet(0)] }))).rejects.toThrow(
		APP_UPDATED_MESSAGE
	);
	// Rows with a time: not how rows are measured
	await expect(
		caller.workouts.create(
			workout({
				run: [cardioSet(0, { timeSeconds: 1500, distanceMeters: 5000 })],
				rows: [{ ...repsSet(0), timeSeconds: 60 }]
			})
		)
	).rejects.toThrow(/measured in reps/);
	// Out of range: a day and more, or a 1,000 km run
	await expect(
		caller.workouts.create(
			workout({ run: [cardioSet(0, { timeSeconds: 86_401, distanceMeters: 5000 })], rows: [repsSet(0)] })
		)
	).rejects.toThrow(/time is out of range/);
	await expect(
		caller.workouts.create(
			workout({ run: [cardioSet(0, { timeSeconds: 1500, distanceMeters: 1_000_001 })], rows: [repsSet(0)] })
		)
	).rejects.toThrow(/distance is out of range/);
	await expect(
		caller.workouts.create(
			workout({ run: [cardioSet(0, { timeSeconds: 1500, distanceMeters: 0 })], rows: [repsSet(0)] })
		)
	).rejects.toThrow(/distance is out of range/);
	// An interval has no mini-sets (a cardio exercise left in a routine as drop sets logs plain intervals)
	await expect(
		caller.workouts.create({
			...workout({ run: [cardioSet(0, { timeSeconds: 1500, distanceMeters: 5000 })], rows: [repsSet(0)] }),
			workoutExercisesMiniSets: [[[{ miniSetIndex: 0, reps: 5, load: 20, RIR: 1 }]], [[]]]
		})
	).rejects.toThrow(/no mini-sets/);
});

test('an exercise renamed or removed elsewhere mid-workout: its rows still save, and it is made again measured as logged', async () => {
	const { caller, runExercise } = await seedPerson();
	// Renamed on another device while the workout was in progress
	await prisma.exercise.update({ where: { id: runExercise.id }, data: { name: 'Easy run' } });
	const { workoutId } = await caller.workouts.create({
		workoutData: { userBodyweight: 80, routineName: 'Cardio day' },
		workoutExercises: [{ ...run, exerciseIndex: 0 }],
		workoutExercisesSets: [[cardioSet(0, { timeSeconds: 1500, distanceMeters: 5000 })]] as never,
		workoutExercisesMiniSets: [[[]]]
	});
	const saved = await prisma.workoutExercise.findFirstOrThrow({
		where: { workoutId },
		include: { exercise: true, sets: true }
	});
	expect(saved.sets[0]).toMatchObject({ timeSeconds: 1500, distanceMeters: 5000 });
	// A new "Run", a run like its rows, in km until it's set otherwise
	expect(saved.exercise).toMatchObject({ name: 'Run', measure: 'DistanceTime', distanceUnit: 'KM' });
	expect(saved.exercise?.id).not.toBe(runExercise.id);
});

test('how an exercise is measured is fixed once it has workouts; its distance unit can change; merging across measures is refused', async () => {
	const { caller, runExercise, rowsExercise } = await seedPerson();
	const edit = (exercise: typeof runExercise, changes: object) =>
		caller.exercises.update({
			id: exercise.id,
			details: {
				name: exercise.name,
				targetMuscleGroup: exercise.targetMuscleGroup,
				customMuscleGroup: exercise.customMuscleGroup,
				bodyweightFraction: exercise.bodyweightFraction,
				note: exercise.note,
				repsOnly: exercise.repsOnly,
				maxReps: exercise.maxReps,
				levels: null,
				machine: null,
				measure: exercise.measure,
				distanceUnit: exercise.distanceUnit,
				...changes
			}
		});
	// Run has a workout: it stays a run; its unit is free to change (its past runs are in metres)
	await expect(edit(runExercise, { measure: 'Time', distanceUnit: null })).rejects.toThrow(
		/can’t change once it has workouts/
	);
	await expect(edit(runExercise, { measure: 'Reps', distanceUnit: null })).rejects.toThrow(
		/can’t change once it has workouts/
	);
	await edit(runExercise, { distanceUnit: 'MI' });
	expect(await prisma.exercise.findUniqueOrThrow({ where: { id: runExercise.id } })).toMatchObject({
		measure: 'DistanceTime',
		distanceUnit: 'MI'
	});
	expect(
		(await prisma.workoutExerciseSet.findFirst({ where: { workoutExercise: { exerciseId: runExercise.id } } }))
			?.distanceMeters
	).toBe(5000);
	// An app version from before cardio sends no measure: the run keeps its measure and unit
	await edit(runExercise, { measure: undefined, distanceUnit: null, note: 'Easy pace' });
	expect(await prisma.exercise.findUniqueOrThrow({ where: { id: runExercise.id } })).toMatchObject({
		measure: 'DistanceTime',
		distanceUnit: 'MI',
		note: 'Easy pace'
	});
	// ...but it can't make the run reps only (it can't see what that would undo)
	await expect(edit(runExercise, { measure: undefined, distanceUnit: null, repsOnly: true })).rejects.toThrow(
		APP_UPDATED_MESSAGE
	);

	// Without workouts, the measure is free: a new exercise becomes a run
	const walk = await caller.exercises.create({
		name: 'Walk',
		targetMuscleGroup: 'Cardio',
		customMuscleGroup: null,
		bodyweightFraction: null,
		note: null,
		repsOnly: false,
		maxReps: null,
		levels: null,
		machine: null,
		measure: 'Time',
		distanceUnit: null
	});
	await edit(walk, { measure: 'DistanceTime', distanceUnit: 'M' });
	expect(await prisma.exercise.findUniqueOrThrow({ where: { id: walk.id } })).toMatchObject({
		measure: 'DistanceTime',
		distanceUnit: 'M'
	});

	// A run's rows can't become a lift's
	await expect(caller.exercises.merge({ fromId: runExercise.id, intoId: rowsExercise.id })).rejects.toThrow(
		/measured the same way/
	);
	await expect(caller.exercises.merge({ fromId: walk.id, intoId: runExercise.id })).resolves.toMatchObject({
		message: 'Merged Walk into Run'
	});
});

test('the workout page knows the unit to show a run’s distances in; history keeps the exercise’s measure', async () => {
	const { caller, runExercise } = await seedPerson();
	const workout = await prisma.workout.findFirstOrThrow({
		where: { userId: runExercise.userId },
		select: { id: true }
	});
	const full = await caller.workouts.findById(workout.id);
	expect(full?.workoutExercises[0].exercise).toEqual({ measure: 'DistanceTime', distanceUnit: 'KM' });
	expect(full?.workoutExercises[2].exercise).toEqual({ measure: 'Reps', distanceUnit: null });
	const history = await caller.workouts.getExerciseHistory({ exerciseName: 'Run' });
	expect(history[0].exercise).toEqual({ repsOnly: false, measure: 'DistanceTime', distanceUnit: 'KM' });
	expect(history[0].sets[0]).toMatchObject({ timeSeconds: 1560, distanceMeters: 5000 });
});

test('cardio repeats the latest deload session while strength ignores it', async () => {
	const { caller, runExercise } = await seedPerson();
	await prisma.workout.create({
		data: {
			userId: runExercise.userId,
			userBodyweight: 80,
			startedAt: new Date(),
			endedAt: new Date(),
			isDeload: true,
			workoutExercises: {
				create: {
					...run,
					exerciseIndex: 0,
					exerciseId: runExercise.id,
					sets: { create: [cardioSet(0, { timeSeconds: 1800, distanceMeters: 6000 })] }
				}
			}
		}
	});
	const s = await caller.workouts.suggestSets({
		exerciseName: 'Run',
		sets: 1,
		setType: 'V2',
		repRangeStart: 8,
		repRangeEnd: 15,
		weightUnit: 'KG',
		userBodyweight: 80
	});

	expect(s?.sets?.[0]).toMatchObject({ timeSeconds: 1800, distance: 6 });
	const today = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 80,
		routineName: 'Cardio day'
	});
	expect(today.todaysWorkoutExercises[0].sets[0]).toMatchObject({ timeSeconds: 1800, distance: 6 });
	expect(today.previousWorkoutData?.exercises[0].sets[0]).toMatchObject({ timeSeconds: 1800, distanceMeters: 6000 });
	const latest = await prisma.workout.findFirstOrThrow({ where: { userId: runExercise.userId, isDeload: true } });
	const strength = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: runExercise.userId, name: rows.name } }
	});
	await prisma.workoutExercise.create({
		data: {
			...rows,
			exerciseIndex: 1,
			exerciseId: strength.id,
			workoutId: latest.id,
			sets: { create: [{ ...repsSet(0), load: 999 }] }
		}
	});
	const after = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 80,
		routineName: 'Cardio day'
	});
	expect(after.previousWorkoutData?.exercises.find((ex) => ex.name === rows.name)?.sets[0].load).toBe(40);
	// No normal cardio history left: deload-only history must still suggest intervals.
	await prisma.workoutExercise.deleteMany({ where: { exerciseId: runExercise.id, workout: { isDeload: false } } });
	expect(
		(
			await caller.workouts.suggestSets({
				exerciseName: 'Run',
				sets: 1,
				setType: 'V2',
				repRangeStart: 8,
				repRangeEnd: 15,
				weightUnit: 'KG',
				userBodyweight: 80
			})
		)?.sets?.[0]
	).toMatchObject({ timeSeconds: 1800, distance: 6 });
});

test('a welcome-back week repeats the cardio intervals unchanged while strength eases back in', async () => {
	const { caller } = await seedPerson();
	const today = await caller.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight: 80,
		routineName: 'Cardio day',
		welcomeBack: true
	});
	const [runToday, bikeToday, rowsToday] = today.todaysWorkoutExercises;
	// Cardio: last time's intervals exactly, no easing (distance shown in the exercise's km)
	expect(runToday.sets[0]).toMatchObject({ timeSeconds: 1560, distance: 5 });
	expect(bikeToday.sets).toHaveLength(2);
	expect(bikeToday.sets[0]).toMatchObject({ timeSeconds: 30, load: 8 });
	// Strength in the same routine: last time's weights, one rep fewer, one RIR easier
	expect(rowsToday.sets.map((set) => [set.load, set.reps, set.RIR])).toEqual([
		[40, 11, 3],
		[40, 11, 3],
		[40, 11, 3]
	]);
});

test('create and edit both reject cardio mini-sets while accepting plain intervals', async () => {
	const { caller, runExercise } = await seedPerson();
	const data = {
		workoutData: { userBodyweight: 80, startedAt: new Date() },
		workoutExercises: [{ ...run, exerciseIndex: 0 }],
		workoutExercisesSets: [[cardioSet(0, { timeSeconds: 60, distanceMeters: 200 })]],
		workoutExercisesMiniSets: [[[]]]
	};
	const { workoutId } = await caller.workouts.create(data);
	const withMiniSets = { ...data, workoutExercisesMiniSets: [[[{ miniSetIndex: 0, reps: 5, load: 20, RIR: 1 }]]] };
	await expect(caller.workouts.create(withMiniSets)).rejects.toThrow(/no mini-sets/);
	await expect(caller.workouts.editById({ id: workoutId, endedAt: new Date(), data: withMiniSets })).rejects.toThrow(
		/no mini-sets/
	);
	await expect(caller.workouts.editById({ id: workoutId, endedAt: new Date(), data })).resolves.toMatchObject({
		message: 'Workout edited successfully'
	});
	const saved = await prisma.workoutExercise.findFirstOrThrow({
		where: { workoutId, exerciseId: runExercise.id },
		include: { sets: { include: { miniSets: true } } }
	});
	expect(saved.sets[0]).toMatchObject({ timeSeconds: 60, distanceMeters: 200, miniSets: [] });
});

test('Cardio cannot use Reps on create or edit and timed machines cannot retain assistance', async () => {
	const { caller, runExercise } = await seedPerson();
	const details = {
		name: 'Invalid cardio',
		targetMuscleGroup: 'Cardio' as const,
		customMuscleGroup: null,
		bodyweightFraction: null,
		note: null,
		measure: 'Reps' as const
	};
	await expect(caller.exercises.create(details)).rejects.toThrow(/Cardio requires/);
	await expect(
		caller.exercises.update({
			id: runExercise.id,
			details: {
				...details,
				name: 'Run',
				measure: 'DistanceTime',
				distanceUnit: 'KM',
				assisted: true,
				levels: { from: 1, to: 20, step: 1 }
			}
		})
	).resolves.toBeDefined();
	expect(await prisma.exercise.findUniqueOrThrow({ where: { id: runExercise.id } })).toMatchObject({ assisted: false });
	const reps = await caller.exercises.create({ ...details, name: 'Rows two', targetMuscleGroup: 'Lats' });
	await expect(caller.exercises.update({ id: reps.id, details: { ...details, name: reps.name } })).rejects.toThrow(
		/Cardio requires/
	);
});

test('layout resources share one exercise read for cardio metadata and machine suggestions', async () => {
	const { runExercise } = await seedPerson();
	const { userExerciseResources, userWeightSets } = await import('../../src/lib/server/weightSets');
	const resources = await userExerciseResources(runExercise.userId);
	expect(resources.cardioExercises).toEqual({
		Run: { measure: 'DistanceTime', distanceUnit: 'KM' },
		Bike: { measure: 'Time', distanceUnit: null }
	});
	expect(resources.weightSets).toEqual(await userWeightSets(runExercise.userId));
	expect(resources.weightSets.some((set) => set.unit === 'LEVEL')).toBe(true);
});
