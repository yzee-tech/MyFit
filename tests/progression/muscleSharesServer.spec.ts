import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import type { MuscleGroup } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';

/**
 * Secondary muscles and Whole body through the server: an exercise's secondaries are its own, copied
 * to every routine entry and workout row (and recounted in past workouts when they change), and the
 * rules for them are the server's, whatever a client sends
 */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

async function newPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `muscles-${userId}@myfit.com` } });
	return { userId, caller: createCaller({ event: {} as never, userId }) };
}
type Caller = Awaited<ReturnType<typeof newPerson>>['caller'];

function details(name: string, targetMuscleGroup: MuscleGroup, secondaryMuscleGroups?: MuscleGroup[]) {
	return {
		name,
		targetMuscleGroup,
		customMuscleGroup: null as string | null,
		bodyweightFraction: null,
		note: null,
		...(secondaryMuscleGroups && { secondaryMuscleGroups })
	};
}

const settings = { setType: 'Straight' as const, repRangeStart: 8, repRangeEnd: 12 };

/** A workout of the named exercises, `sets` sets each; whatever muscles the client claims */
async function logWorkout(
	caller: Caller,
	exercises: { name: string; targetMuscleGroup: MuscleGroup; secondaryMuscleGroups?: MuscleGroup[] }[],
	sets = 2
) {
	const at = new Date(Date.now() - 3600_000);
	return caller.workouts.create({
		workoutData: { userBodyweight: 80, startedAt: at, endedAt: at, routineName: null },
		workoutExercises: exercises.map((exercise, exerciseIndex) => ({ ...settings, ...exercise, exerciseIndex })),
		workoutExercisesSets: exercises.map(() =>
			Array.from({ length: sets }, (_, setIndex) => ({ setIndex, reps: 10, load: 50, RIR: 2, skipped: false }))
		),
		workoutExercisesMiniSets: exercises.map(() => Array.from({ length: sets }, () => []))
	});
}

const overview = (caller: Caller) =>
	caller.stats.overview({ period: 'all', currentTo: new Date() }).then((result) => result.current);

const rowsOf = async (userId: string, name: string) => ({
	exercise: await prisma.exercise.findFirstOrThrow({ where: { userId, name } }),
	templates: await prisma.exerciseTemplate.findMany({
		where: { name, exerciseSplitDay: { exerciseSplit: { userId } } }
	}),
	workoutRows: await prisma.workoutExercise.findMany({ where: { name, workout: { userId } } })
});

test('an exercise is made with the muscles it also works, and without any when none are sent', async () => {
	const { userId, caller } = await newPerson();
	await caller.exercises.create(details('Bench press', 'Chest', ['Triceps', 'FrontDelts']));
	// An older app version doesn't send the field
	await caller.exercises.create(details('Curls', 'Biceps'));
	expect((await rowsOf(userId, 'Bench press')).exercise.secondaryMuscleGroups).toEqual(['Triceps', 'FrontDelts']);
	expect((await rowsOf(userId, 'Curls')).exercise.secondaryMuscleGroups).toEqual([]);
	// The pickers and the exercise's page get them
	const picker = await caller.exercises.forPicker();
	expect(picker.find((exercise) => exercise.name === 'Bench press')?.secondaryMuscleGroups).toEqual([
		'Triceps',
		'FrontDelts'
	]);
});

test('secondaries that break the rules are refused, on a new exercise and on an edit', async () => {
	const { userId, caller } = await newPerson();
	const refused: [MuscleGroup, MuscleGroup[], RegExp][] = [
		['Chest', ['Triceps', 'FrontDelts', 'Abs'], /2 muscles at most/],
		['Chest', ['Triceps', 'Triceps'], /twice/],
		['Chest', ['Chest'], /can’t also be/],
		['Chest', ['WholeBody'], /single muscles/],
		['Chest', ['Cardio'], /single muscles/],
		['Chest', ['Custom'], /single muscles/],
		['WholeBody', ['Chest'], /whole body/]
	];
	for (const [primary, secondaries, message] of refused) {
		await expect(caller.exercises.create(details('Refused', primary, secondaries))).rejects.toThrow(message);
	}
	await expect(caller.exercises.create({ ...details('Run', 'Cardio', ['Quads']), measure: 'Time' })).rejects.toThrow(
		/cardio/
	);
	expect(await prisma.exercise.count({ where: { userId } })).toBe(0);

	const { id } = await caller.exercises.create(details('Bench press', 'Chest', ['Triceps']));
	for (const [primary, secondaries, message] of refused) {
		await expect(
			caller.exercises.update({ id, details: details('Bench press', primary, secondaries) })
		).rejects.toThrow(message);
	}
	// Nothing changed by the refused edits
	const { exercise } = await rowsOf(userId, 'Bench press');
	expect(exercise).toMatchObject({ targetMuscleGroup: 'Chest', secondaryMuscleGroups: ['Triceps'] });
});

test('a whole body exercise is made, has no secondaries, and counts as its own line and half per area', async () => {
	const { userId, caller } = await newPerson();
	await caller.exercises.create(details('Burpees', 'WholeBody'));
	await caller.exercises.create(details('Bench press', 'Chest', ['Triceps']));
	await logWorkout(caller, [
		{ name: 'Burpees', targetMuscleGroup: 'WholeBody' },
		{ name: 'Bench press', targetMuscleGroup: 'Chest' }
	]);
	expect((await rowsOf(userId, 'Burpees')).workoutRows[0]).toMatchObject({
		targetMuscleGroup: 'WholeBody',
		secondaryMuscleGroups: []
	});
	const stats = await overview(caller);
	expect(stats.sets).toBe(4);
	expect(stats.setsByMuscle).toEqual({ WholeBody: 2, Chest: 2, Triceps: 1 });
	// Burpees: 2 sets × half in every area; bench: 2 for chest, 1 for arms
	expect(stats.setsByArea).toEqual({ Back: 1, Chest: 3, Core: 1, Shoulders: 1, Arms: 2, Legs: 1 });
});

test('a workout and a routine take the muscles from the exercise, not from what the client sent', async () => {
	const { userId, caller } = await newPerson();
	await caller.exercises.create(details('Bench press', 'Chest', ['Triceps']));
	await caller.exercises.create(details('Curls', 'Biceps'));
	const claimed = [
		// An older app version (or a workout begun before the update) sends none: the exercise's are used
		{ name: 'Bench press', targetMuscleGroup: 'Chest' as const },
		// A client can't add its own
		{ name: 'Curls', targetMuscleGroup: 'Biceps' as const, secondaryMuscleGroups: ['Forearms' as const] }
	];
	await logWorkout(caller, claimed);
	await caller.exerciseSplits.save({
		routines: [{ name: 'Push', weightUnit: 'KG' }],
		routineExercises: [claimed.map((exercise, exerciseIndex) => ({ ...settings, ...exercise, exerciseIndex, sets: 3 }))]
	});
	const bench = await rowsOf(userId, 'Bench press');
	expect(bench.workoutRows.map((row) => row.secondaryMuscleGroups)).toEqual([['Triceps']]);
	expect(bench.templates.map((row) => row.secondaryMuscleGroups)).toEqual([['Triceps']]);
	const curls = await rowsOf(userId, 'Curls');
	expect(curls.workoutRows.map((row) => row.secondaryMuscleGroups)).toEqual([[]]);
	expect(curls.templates.map((row) => row.secondaryMuscleGroups)).toEqual([[]]);
	expect(curls.exercise.secondaryMuscleGroups).toEqual([]);
});

test('an exercise made by a workout or a routine save keeps the secondaries sent with it, cleaned', async () => {
	const { userId, caller } = await newPerson();
	// Neither exercise exists yet: the save makes them (an import or a template does this)
	await logWorkout(caller, [
		{ name: 'Dips', targetMuscleGroup: 'Triceps', secondaryMuscleGroups: ['Chest', 'Triceps', 'Cardio'] }
	]);
	const dips = await rowsOf(userId, 'Dips');
	expect(dips.exercise.secondaryMuscleGroups).toEqual(['Chest']);
	expect(dips.workoutRows[0].secondaryMuscleGroups).toEqual(['Chest']);
});

test('editing the secondaries recounts past workouts and routines; Stats follow', async () => {
	const { userId, caller } = await newPerson();
	const { id } = await caller.exercises.create(details('Bench press', 'Chest'));
	await logWorkout(caller, [{ name: 'Bench press', targetMuscleGroup: 'Chest' }], 4);
	await caller.exerciseSplits.save({
		routines: [{ name: 'Push', weightUnit: 'KG' }],
		routineExercises: [[{ ...settings, name: 'Bench press', targetMuscleGroup: 'Chest', exerciseIndex: 0, sets: 3 }]]
	});
	expect((await overview(caller)).setsByMuscle).toEqual({ Chest: 4 });

	await caller.exercises.update({ id, details: details('Bench press', 'Chest', ['Triceps', 'FrontDelts']) });
	const after = await rowsOf(userId, 'Bench press');
	expect(after.workoutRows.map((row) => row.secondaryMuscleGroups)).toEqual([['Triceps', 'FrontDelts']]);
	expect(after.templates.map((row) => row.secondaryMuscleGroups)).toEqual([['Triceps', 'FrontDelts']]);
	const stats = await overview(caller);
	expect(stats.sets).toBe(4);
	expect(stats.setsByMuscle).toEqual({ Chest: 4, Triceps: 2, FrontDelts: 2 });
	expect(stats.setsByArea).toMatchObject({ Chest: 4, Arms: 2, Shoulders: 2 });

	// Taken away again: so is the half
	await caller.exercises.update({ id, details: details('Bench press', 'Chest', []) });
	expect((await overview(caller)).setsByMuscle).toEqual({ Chest: 4 });
	expect((await rowsOf(userId, 'Bench press')).workoutRows[0].secondaryMuscleGroups).toEqual([]);
});

test('an edit that says nothing about secondaries keeps those that still fit the muscle group', async () => {
	const { userId, caller } = await newPerson();
	const { id } = await caller.exercises.create(details('Press', 'Chest', ['Triceps', 'FrontDelts']));
	await logWorkout(caller, [{ name: 'Press', targetMuscleGroup: 'Chest' }]);
	const stored = async () => {
		const rows = await rowsOf(userId, 'Press');
		expect(rows.workoutRows[0].secondaryMuscleGroups).toEqual(rows.exercise.secondaryMuscleGroups);
		return rows.exercise.secondaryMuscleGroups;
	};
	// An older app version renames it: nothing lost
	await caller.exercises.update({ id, details: { ...details('Press', 'Chest'), note: 'Slow' } });
	expect(await stored()).toEqual(['Triceps', 'FrontDelts']);
	// Its muscle group becomes one of them: that one goes
	await caller.exercises.update({ id, details: details('Press', 'Triceps') });
	expect(await stored()).toEqual(['FrontDelts']);
	// Whole body has none
	await caller.exercises.update({ id, details: details('Press', 'WholeBody') });
	expect(await stored()).toEqual([]);
});

test('added to a routine, saved as a routine and merged: the copies carry the secondaries', async () => {
	const { userId, caller } = await newPerson();
	const bench = await caller.exercises.create(details('Bench press', 'Chest', ['Triceps']));
	const oldBench = await caller.exercises.create(details('Bench', 'Chest', ['FrontDelts']));
	await caller.exerciseSplits.save({ routines: [{ name: 'Push', weightUnit: 'KG' }], routineExercises: [[]] });
	const [routine] = await caller.exercises.routineTargets();
	await caller.exercises.addToRoutines({ exerciseId: bench.id, routineIds: [routine.id] });
	expect((await rowsOf(userId, 'Bench press')).templates.map((row) => row.secondaryMuscleGroups)).toEqual([
		['Triceps']
	]);

	// A past workout of the other one, saved as a routine
	const workout = await logWorkout(caller, [{ name: 'Bench', targetMuscleGroup: 'Chest' }]);
	const workoutId = (await prisma.workout.findFirstOrThrow({ where: { userId } })).id;
	expect(workout).toBeDefined();
	await caller.exerciseSplits.createFromWorkout({ workoutId, name: 'From workout' });
	const old = await rowsOf(userId, 'Bench');
	expect(old.templates.map((row) => row.secondaryMuscleGroups)).toEqual([['FrontDelts']]);

	// Merged into Bench press: its rows take the kept exercise's muscles
	await caller.exercises.merge({ fromId: oldBench.id, intoId: bench.id });
	const merged = await rowsOf(userId, 'Bench press');
	expect(merged.workoutRows.map((row) => row.secondaryMuscleGroups)).toEqual([['Triceps']]);
	expect(merged.templates.every((row) => row.secondaryMuscleGroups.join() === 'Triceps')).toBe(true);
	expect(merged.exercise.secondaryMuscleGroups).toEqual(['Triceps']);
	expect((await overview(caller)).setsByMuscle).toEqual({ Chest: 2, Triceps: 1 });
});

test('a custom muscle group can’t be named like a built-in one', async () => {
	const { userId, caller } = await newPerson();
	const custom = (name: string, customMuscleGroup: string) => ({
		...details(name, 'Custom'),
		customMuscleGroup
	});
	for (const name of ['Whole body', 'wholebody', 'CHEST', 'front delts', 'Cardio']) {
		await expect(caller.exercises.create(custom('Refused', name)), name).rejects.toThrow(/pick it instead of Custom/);
	}
	// A save that would make the exercise is refused the same way
	await expect(
		logWorkout(caller, [{ name: 'Refused', targetMuscleGroup: 'Custom', customMuscleGroup: 'Whole Body' } as never])
	).rejects.toThrow(/pick it instead of Custom/);
	expect(await prisma.exercise.count({ where: { userId } })).toBe(0);
	expect(await prisma.workout.count({ where: { userId } })).toBe(0);

	// Its own name is fine, and so is editing it; a built-in name on an edit isn't
	const { id } = await caller.exercises.create(custom('Calf raises', 'Soleus'));
	await expect(caller.exercises.update({ id, details: custom('Calf raises', 'Whole body') })).rejects.toThrow(
		/pick it instead of Custom/
	);
	await caller.exercises.update({
		id,
		details: { ...custom('Calf raises', 'Soleus'), secondaryMuscleGroups: ['Calves'] }
	});
	expect((await rowsOf(userId, 'Calf raises')).exercise).toMatchObject({
		customMuscleGroup: 'Soleus',
		secondaryMuscleGroups: ['Calves']
	});
});

test('the CSV export lists the secondaries in its last column', async () => {
	const { userId, caller } = await newPerson();
	await caller.exercises.create(details('Bench press', 'Chest', ['Triceps', 'FrontDelts']));
	await caller.exercises.create(details('Curls', 'Biceps'));
	await logWorkout(
		caller,
		[
			{ name: 'Bench press', targetMuscleGroup: 'Chest' },
			{ name: 'Curls', targetMuscleGroup: 'Biceps' }
		],
		1
	);
	const { buildCsvExport, fetchExportData } = await import('../../src/lib/server/export');
	const csv = buildCsvExport(await prisma.$transaction((tx) => fetchExportData(tx, userId)));
	// After the byte-order mark
	const lines = csv.slice(1).trim().split('\r\n');
	expect(lines[0].split(',').at(-1)).toBe('secondaryMuscleGroups');
	expect(lines[1].split(',').at(-1)).toBe('Triceps|FrontDelts');
	expect(lines[2].split(',').at(-1)).toBe('');
});
