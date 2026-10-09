import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import {
	createExercises,
	createMesocycle,
	createTemplateExerciseSplit,
	editRoutine,
	pickExercise,
	pickRoutine,
	saveRoutine,
	saveWorkout
} from './commonFunctions';

const prisma = new PrismaClient();

/** Opens the exercise search on Exercise stats, once the page is ready for it */
async function openExerciseSearch(page: Page) {
	await expect(async () => {
		await page.getByRole('combobox').filter({ hasText: 'Search for an exercise' }).click();
		await expect(page.getByPlaceholder('Type here')).toBeVisible({ timeout: 1000 });
	}).toPass();
}

test('one exercise, shared by every routine; edited only on the Exercises page, it changes everywhere', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createMesocycle(page);

	// Cable lateral raises is in two routines of My routines, and in the block that follows them
	const exercise = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Cable lateral raises' } },
		include: { exerciseTemplates: true, mesocycleExerciseTemplates: true }
	});
	expect(exercise.exerciseTemplates).toHaveLength(2);
	expect(exercise.mesocycleExerciseTemplates).toHaveLength(2);
	expect(exercise.targetMuscleGroup).toEqual('SideDelts');

	// Change its muscle group on the Exercises page
	await page.goto('/exercises');
	await page.getByRole('link', { name: /^Cable lateral raises/ }).click();
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByRole('combobox', { name: 'Muscle group' }).click();
	await page.getByRole('option', { name: 'Front delts' }).click();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise saved everywhere' })).toBeVisible();

	// Routines show it, but can't change it
	await editRoutine(page, 'Push A');
	await page.getByLabel('Cable lateral raises options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await expect(page.getByTestId('picked-exercise-details')).toContainText('Front delts');
	await expect(page.getByRole('combobox', { name: 'Muscle group' })).toHaveCount(0);

	// Every copy follows: the other routine, and the block
	const edited = await prisma.exercise.findUniqueOrThrow({
		where: { id: exercise.id },
		include: { exerciseTemplates: true, mesocycleExerciseTemplates: true }
	});
	expect(edited.targetMuscleGroup).toEqual('FrontDelts');
	expect(edited.exerciseTemplates.map((copy) => copy.targetMuscleGroup)).toEqual(['FrontDelts', 'FrontDelts']);
	expect(edited.mesocycleExerciseTemplates.map((copy) => copy.targetMuscleGroup)).toEqual(['FrontDelts', 'FrontDelts']);
	expect(await prisma.exercise.count({ where: { userId: userData.userId, name: 'Cable lateral raises' } })).toEqual(1);
});

test('renaming an exercise renames it everywhere and keeps its progression', async ({ page, userData }) => {
	await page.goto('/exercise-splits');
	await createMesocycle(page);

	// Log barbell rows at 40 kg
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Dumbbell bicep curls', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-2-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-3-reps"]').fill('11');
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('40');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByTestId('Barbell rows-set-2-action').click();
	await page.getByTestId('Barbell rows-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer: 'Just this workout' });

	// Rename it on Exercise stats
	await page.goto('/exercise-stats');
	await openExerciseSearch(page);
	await page.getByPlaceholder('Type here').fill('Barbell rows');
	await page.getByRole('option', { name: 'Barbell rows' }).click();
	await page.getByLabel('Rename exercise').click();
	await page.getByLabel('New name').fill('Bent-over rows');
	await page.getByRole('button', { name: 'Rename', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Renamed 1 exercises' })).toBeVisible();

	// The library, the block and the past workout all have the new name
	const renamed = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Bent-over rows' } },
		include: { exerciseTemplates: true, mesocycleExerciseTemplates: true, workoutExercises: true }
	});
	for (const copy of [
		...renamed.exerciseTemplates,
		...renamed.mesocycleExerciseTemplates,
		...renamed.workoutExercises
	]) {
		expect(copy.name).toEqual('Bent-over rows');
	}
	expect(renamed.workoutExercises).toHaveLength(1);

	// Every routine, block and workout exercise saved so far is linked to an exercise
	const unlinked = await Promise.all([
		prisma.exerciseTemplate.count({
			where: { exerciseId: null, exerciseSplitDay: { exerciseSplit: { userId: userData.userId } } }
		}),
		prisma.mesocycleExerciseTemplate.count({
			where: { exerciseId: null, mesocycleExerciseSplitDay: { mesocycle: { userId: userData.userId } } }
		}),
		prisma.workoutExercise.count({ where: { exerciseId: null, workout: { userId: userData.userId } } })
	]);
	expect(unlinked).toEqual([0, 0, 0]);

	// Next time, suggestions carry on from last time's 40 kg
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Bent-over\\ rows-set-1-load"]')).toHaveValue('40');

	// A name that's taken is refused, rather than mixing two exercises
	await page.goto('/exercise-stats');
	await openExerciseSearch(page);
	await page.getByPlaceholder('Type here').fill('Bent-over rows');
	await page.getByRole('option', { name: 'Bent-over rows' }).click();
	await page.getByLabel('Rename exercise').click();
	await page.getByLabel('New name').fill('Pull-ups');
	await page.getByRole('button', { name: 'Rename', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'An exercise called Pull-ups already exists' })
	).toBeVisible();
});

test('Exercises page: an exercise outside any routine, added to routines, removed, deleted', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createMesocycle(page);

	await page.goto('/exercises');
	await page.getByRole('button', { name: 'New exercise' }).click();
	await page.getByLabel('Name').fill('Chest press – Hotel');
	await page.getByRole('combobox', { name: 'Muscle group' }).click();
	await page.getByRole('option', { name: 'Chest' }).click();
	await page.getByLabel('Exercise note').fill('Seat on 4');
	await page.getByRole('button', { name: 'Create exercise' }).click();
	await page.waitForURL(/\/exercises\/[a-z0-9]+$/);
	await expect(page.getByRole('main')).toContainText('Chest press – Hotel');
	await expect(page.getByRole('main')).toContainText('Not in a routine yet');

	// Add it to Push A and Pull B in My routines: the current block follows
	await page.getByRole('button', { name: 'Add to routine' }).click();
	await page.getByLabel('My routines Push A').click();
	await page.getByLabel('My routines Pull B').click();
	await page.getByRole('button', { name: 'Add', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Added to 2 routines' })).toBeVisible();
	await expect(page.getByRole('main')).toContainText('My routines › Push A');
	await expect(page.getByRole('main')).toContainText('My routines › Pull B');

	const exercise = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Chest press – Hotel' } },
		include: { exerciseTemplates: true, mesocycleExerciseTemplates: true }
	});
	expect(exercise.exerciseTemplates).toHaveLength(2);
	expect(exercise.mesocycleExerciseTemplates).toHaveLength(2);
	expect(exercise.mesocycleExerciseTemplates[0].sets).toBeGreaterThan(0);

	// Remove it from Pull B: gone from the block's Pull B too
	await page.getByRole('button', { name: 'Remove from routines' }).click();
	await page.getByLabel('Remove from My routines Pull B').click();
	await page.getByRole('button', { name: 'Remove', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Removed from 1 routine' })).toBeVisible();
	await expect(page.getByRole('main')).not.toContainText('My routines › Pull B');
	expect(
		await prisma.mesocycleExerciseTemplate.count({
			where: { exerciseId: exercise.id, mesocycleExerciseSplitDay: { name: 'Pull B' } }
		})
	).toEqual(0);

	// Never done, so deleting removes it completely
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await page.waitForURL('/exercises');
	expect(await prisma.exercise.count({ where: { id: exercise.id } })).toEqual(0);
	expect(await prisma.mesocycleExerciseTemplate.count({ where: { exerciseId: exercise.id } })).toEqual(0);
});

/** A past workout with one exercise, as if logged a day ago */
async function logPastWorkout(
	userId: string,
	exerciseName: string,
	load: number,
	bodyweightFraction: number | null = null
) {
	const exercise = await prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name: exerciseName } } });
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 100,
			startedAt: yesterday,
			endedAt: yesterday,
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						exerciseId: exercise.id,
						name: exercise.name,
						targetMuscleGroup: exercise.targetMuscleGroup,
						bodyweightFraction: bodyweightFraction ?? exercise.bodyweightFraction,
						setType: 'Straight',
						repRangeStart: 10,
						repRangeEnd: 15,
						sets: { create: [{ setIndex: 0, reps: 12, load, RIR: 2, skipped: false }] }
					}
				]
			}
		}
	});
}

test('merging a misspelling moves its workouts; deleting an exercise with workouts keeps them', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createMesocycle(page);
	await createExercises(userData.userId, [{ name: 'Barbel rows', targetMuscleGroup: 'Traps' }]);
	await logPastWorkout(userData.userId, 'Barbel rows', 35);
	const misspelt = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Barbel rows' } }
	});
	const rows = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Barbell rows' } }
	});

	await page.goto(`/exercises/${misspelt.id}`);
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Merge into…' }).click();
	await page.getByLabel('Exercise to merge into').click();
	await page.getByRole('option', { name: 'Barbell rows', exact: true }).click();
	await page.getByRole('button', { name: 'Merge', exact: true }).click();
	await page.waitForURL(`/exercises/${rows.id}`);
	await expect(page.getByRole('main')).toContainText('1 workout');
	expect(await prisma.exercise.count({ where: { id: misspelt.id } })).toEqual(0);
	const moved = await prisma.workoutExercise.findFirstOrThrow({ where: { workout: { userId: userData.userId } } });
	expect(moved.exerciseId).toEqual(rows.id);
	expect(moved.name).toEqual('Barbell rows');

	// With a workout, deleting keeps it for history: gone from routines and the picker
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await expect(page.getByRole('dialog', { name: 'Delete Barbell rows?' })).toContainText(
		'Your 1 past workout keeps it'
	);
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await page.waitForURL('/exercises');
	await expect(page.getByRole('main')).toContainText('Only in past workouts Barbell rows');
	const archived = await prisma.exercise.findUniqueOrThrow({
		where: { id: rows.id },
		include: { exerciseTemplates: true, mesocycleExerciseTemplates: true, workoutExercises: true }
	});
	expect(archived.archived).toBe(true);
	expect(archived.exerciseTemplates).toHaveLength(0);
	expect(archived.mesocycleExerciseTemplates).toHaveLength(0);
	expect(archived.workoutExercises).toHaveLength(1);
});

test('correcting an exercise’s bodyweight share recounts its past workouts', async ({ page, userData }) => {
	await createExercises(userData.userId, [{ name: 'Push-ups', targetMuscleGroup: 'Chest', bodyweightFraction: 1 }]);
	await logPastWorkout(userData.userId, 'Push-ups', 0);
	const pushUps = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Push-ups' } }
	});

	await page.goto(`/exercises/${pushUps.id}`);
	await expect(page.getByRole('main')).toContainText('100% of bodyweight');
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Share of bodyweight (%)').fill('65');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('main')).toContainText('65% of bodyweight');

	const pastWorkout = await prisma.workoutExercise.findFirstOrThrow({ where: { exerciseId: pushUps.id } });
	expect(pastWorkout.bodyweightFraction).toEqual(0.65);
});

test('blank workout: pick exercises as you go, suggested from last time', async ({ page, userData }) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Traps' }]);
	await logPastWorkout(userData.userId, 'Barbell rows', 40);
	await page.goto('/exercise-splits');
	await createMesocycle(page);

	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Blank workout');
	// Any gym: pick its unit
	await expect(page.getByRole('main')).toContainText('This gym uses');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Barbell rows');
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Add exercise' }).click();
	// Last time 40 kg × 12, so it starts from there
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40');
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).not.toHaveValue('');
});

test('bodyweight exercises: help as a negative load, with what it counts as; assisted machine weights', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [
		{ name: 'Assisted pull-ups', targetMuscleGroup: 'Lats', bodyweightFraction: 1 }
	]);
	await prisma.weightSet.create({
		data: {
			userId: userData.userId,
			name: 'Hotel assist machine',
			unit: 'KG',
			weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
			isAssistance: true
		}
	});
	await page.goto('/exercise-splits/weight-sets');
	await expect(page.getByTestId('weight-set-Hotel assist machine')).toContainText('Assistance: 5–50 by 5 kg');

	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Assisted pull-ups');
	await page.getByLabel('Sets').fill('1');
	await page.getByLabel('Weights available').click();
	await page.getByRole('option', { name: 'Hotel assist machine (kg)' }).click();
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await expect(page.getByRole('main')).toContainText('KG (BW)');
	await page.locator('[id="Assisted\\ pull-ups-set-1-reps"]').fill('10');
	await page.locator('[id="Assisted\\ pull-ups-set-1-load"]').fill('-20');
	await expect(page.getByTestId('Assisted pull-ups-set-1-counted')).toHaveText('= 80 kg · 80% of bodyweight');
});

test('merging when a routine has both exercises: each routine keeps exactly one, no entry or workout lost', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createMesocycle(page);
	const userId = userData.userId;
	const byName = (name: string) => prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name } } });
	const [curls, rows] = await Promise.all([byName('Dumbbell bicep curls'), byName('Barbell rows')]);

	// Where each is, before: Pull A has both, in the library and in the block
	const libraryDays = async (exerciseId: string) =>
		(await prisma.exerciseTemplate.findMany({ where: { exerciseId } })).map((entry) => entry.exerciseSplitDayId);
	const blockDays = async (exerciseId: string) =>
		(await prisma.mesocycleExerciseTemplate.findMany({ where: { exerciseId } })).map(
			(entry) => entry.mesocycleExerciseSplitDayId
		);
	const [curlsLibrary, rowsLibrary, curlsBlock, rowsBlock] = await Promise.all([
		libraryDays(curls.id),
		libraryDays(rows.id),
		blockDays(curls.id),
		blockDays(rows.id)
	]);
	expect(curlsLibrary.some((day) => rowsLibrary.includes(day))).toBe(true);
	expect(curlsBlock.some((day) => rowsBlock.includes(day))).toBe(true);
	await logPastWorkout(userId, 'Dumbbell bicep curls', 12);
	await logPastWorkout(userId, 'Barbell rows', 40);

	await page.goto(`/exercises/${curls.id}`);
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Merge into…' }).click();
	await page.getByLabel('Exercise to merge into').click();
	await page.getByRole('option', { name: 'Barbell rows', exact: true }).click();
	await page.getByRole('button', { name: 'Merge', exact: true }).click();
	await page.waitForURL(`/exercises/${rows.id}`);

	// Every routine that had either now has Barbell rows exactly once
	const [libraryAfter, blockAfter] = await Promise.all([libraryDays(rows.id), blockDays(rows.id)]);
	expect(libraryAfter.toSorted()).toEqual([...new Set([...curlsLibrary, ...rowsLibrary])].toSorted());
	expect(blockAfter.toSorted()).toEqual([...new Set([...curlsBlock, ...rowsBlock])].toSorted());
	expect(new Set(libraryAfter).size).toEqual(libraryAfter.length);
	expect(new Set(blockAfter).size).toEqual(blockAfter.length);

	// Both workouts are Barbell rows now; the duplicate is gone with nothing pointing at it
	const workouts = await prisma.workoutExercise.findMany({ where: { workout: { userId } } });
	expect(workouts).toHaveLength(2);
	workouts.forEach((workout) => {
		expect(workout.exerciseId).toEqual(rows.id);
		expect(workout.name).toEqual('Barbell rows');
	});
	expect(await prisma.exercise.count({ where: { id: curls.id } })).toEqual(0);
	expect(
		await prisma.exerciseTemplate.count({
			where: { name: 'Dumbbell bicep curls', exerciseSplitDay: { exerciseSplit: { userId } } }
		})
	).toEqual(0);
});

test('merging when a workout has both exercises: one entry with all their sets, in order', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, [{ name: 'Barbel rows', targetMuscleGroup: 'Traps' }, 'Barbell rows', 'Face pulls']);
	const byName = (name: string) => prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name } } });
	const [misspelt, rows, facePulls] = await Promise.all([
		byName('Barbel rows'),
		byName('Barbell rows'),
		byName('Face pulls')
	]);

	// One workout: the misspelling (2 sets), face pulls, then the right name (1 set)
	const entry = (exercise: typeof rows, exerciseIndex: number, loads: number[]) => ({
		exerciseIndex,
		exerciseId: exercise.id,
		name: exercise.name,
		targetMuscleGroup: exercise.targetMuscleGroup,
		setType: 'Straight' as const,
		repRangeStart: 8,
		repRangeEnd: 12,
		sets: {
			create: loads.map((load, setIndex) => ({ setIndex, reps: 10, load, RIR: 2, skipped: false }))
		}
	});
	const workout = await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 100,
			startedAt: new Date(),
			endedAt: new Date(),
			workoutExercises: {
				create: [entry(misspelt, 0, [40, 42.5]), entry(facePulls, 1, [15]), entry(rows, 2, [45])]
			}
		}
	});

	await page.goto(`/exercises/${misspelt.id}`);
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Merge into…' }).click();
	await expect(page.getByRole('dialog')).toContainText('A workout with both gets one entry with all their sets.');
	await page.getByLabel('Exercise to merge into').click();
	await page.getByRole('option', { name: 'Barbell rows', exact: true }).click();
	await page.getByRole('button', { name: 'Merge', exact: true }).click();
	await page.waitForURL(`/exercises/${rows.id}`);

	const exercises = await prisma.workoutExercise.findMany({
		where: { workoutId: workout.id },
		orderBy: { exerciseIndex: 'asc' },
		include: { sets: { orderBy: { setIndex: 'asc' } } }
	});
	expect(exercises.map((ex) => [ex.name, ex.exerciseIndex])).toEqual([
		['Barbell rows', 0],
		['Face pulls', 1]
	]);
	expect(exercises[0].sets.map((set) => [set.setIndex, set.load])).toEqual([
		[0, 40],
		[1, 42.5],
		[2, 45]
	]);
	expect(await prisma.exercise.count({ where: { id: misspelt.id } })).toEqual(0);
});

test('reps only: replaces the bodyweight share (with a warning), and suggestions add reps up to the max', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, [{ name: 'Sit-ups', targetMuscleGroup: 'Abs', bodyweightFraction: 0.4 }]);
	await logPastWorkout(userId, 'Sit-ups', 0);
	const situps = await prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name: 'Sit-ups' } } });

	// Turning on reps only warns about the bodyweight share and hides it; then a max of 13
	await page.goto(`/exercises/${situps.id}`);
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await expect(page.getByLabel('Counts bodyweight')).toBeVisible();
	await page.getByLabel('Reps only').click();
	await expect(page.getByTestId('reps-only-bodyweight-warning')).toContainText(
		'counts 40% of your bodyweight. Turning on Reps only removes that, so its 1 past workout will count as 0 volume'
	);
	await expect(page.getByLabel('Counts bodyweight')).toBeHidden();
	await page.getByLabel('Max reps (optional)').fill('13');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('main')).toContainText('Reps only, max 13');

	const saved = await prisma.exercise.findUniqueOrThrow({ where: { id: situps.id } });
	expect(saved).toMatchObject({ repsOnly: true, maxReps: 13, bodyweightFraction: null });
	const past = await prisma.workoutExercise.findFirstOrThrow({ where: { exerciseId: situps.id } });
	expect(past.bodyweightFraction).toBeNull();

	// Last time 12 reps at 0: next time 13 at 0, which is the max, so the note shows
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Sit-ups');
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Add exercise' }).click();
	await expect(page.locator('[id="Sit-ups-set-1-reps"]')).toHaveValue('13');
	await expect(page.locator('[id="Sit-ups-set-2-reps"]')).toHaveValue('13');
	// No load to enter for a reps-only exercise
	await expect(page.locator('[id="Sit-ups-set-1-load"]')).toHaveCount(0);
	await expect(page.getByTestId('Sit-ups-set-1-no-load')).toBeVisible();
	await expect(page.getByTestId('Sit-ups-at-max-reps')).toHaveText(
		'All sets at your max of 13 reps — try a harder version or add weight.'
	);
	await expect(page.getByTestId('Sit-ups-next-weight')).toHaveCount(0);
});

test('New exercise: your exercises and built-in suggestions are labelled apart; yours opens', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Traps' }]);
	const rows = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Barbell rows' } }
	});

	await page.goto('/exercises');
	await page.getByLabel('New exercise').click();
	await page.getByLabel('Name').fill('Barbell');
	const yours = page.getByTestId('existing-exercise-matches');
	const builtIns = page.getByTestId('built-in-suggestions');
	await expect(yours).toContainText('Already on your list');
	await expect(yours).toContainText('Barbell rows');
	await expect(builtIns).toContainText('Suggestions — not on your list yet');
	await expect(builtIns).toContainText('Barbell bench press');
	await expect(builtIns).not.toContainText('Barbell rows');

	await yours.getByRole('button', { name: 'Barbell rows' }).click();
	await page.waitForURL(`/exercises/${rows.id}`);
});

test('New exercise in a routine: picking one already on your list keeps what you filled in', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await createExercises(userData.userId, [{ name: 'Sit-ups', targetMuscleGroup: 'Abs' }]);

	// Edit face pulls in the library: 4 sets and a routine note first
	await editRoutine(page, 'Pull A');
	await page.getByLabel('Face pulls options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.locator('#exercise-sets').fill('4');
	await page.locator('#exercise-note').fill('seat on 4');

	// Start a new exercise, then pick Sit-ups from your list instead
	await page.getByLabel('Pick an exercise').click();
	await page.getByRole('button', { name: 'New exercise' }).click();
	await page.locator('#exercise-form-name').fill('Sit');
	await page.getByTestId('existing-exercise-matches').getByRole('button', { name: 'Sit-ups' }).click();

	await expect(page.getByLabel('Pick an exercise')).toHaveText('Sit-ups');
	await expect(page.locator('#exercise-sets')).toHaveValue('4');
	await expect(page.locator('#exercise-note')).toHaveValue('seat on 4');
	expect(new URL(page.url()).pathname).toEqual('/exercise-splits/edit');
	await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('main')).toContainText('Sit-ups');
	await expect(page.getByRole('main')).not.toContainText('Face pulls');
	await saveRoutine(page);

	const pullA = await prisma.exerciseSplitDay.findFirstOrThrow({
		where: { name: 'Pull A', exerciseSplit: { userId: userData.userId } },
		include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
	});
	expect(pullA.exercises.map((ex) => ex.name)).toEqual(['Pull-ups', 'Barbell rows', 'Dumbbell bicep curls', 'Sit-ups']);
	const situps = pullA.exercises.find((ex) => ex.name === 'Sit-ups')!;
	expect(situps).toMatchObject({ sets: 4, note: 'seat on 4' });
});
