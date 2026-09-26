import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createMesocycle, pickRoutine } from './commonFunctions';

const prisma = new PrismaClient();

/** Opens the exercise search on Exercise stats, once the page is ready for it */
async function openExerciseSearch(page: Page) {
	await expect(async () => {
		await page.getByRole('combobox').filter({ hasText: 'Search for an exercise' }).click();
		await expect(page.getByPlaceholder('Type here')).toBeVisible({ timeout: 1000 });
	}).toPass();
}

test('one exercise, shared by every routine that uses it; editing it changes it everywhere', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createMesocycle(page);

	// Cable lateral raises is in two routines of the library, and in the block made from it
	const exercise = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Cable lateral raises' } },
		include: { exerciseTemplates: true, mesocycleExerciseTemplates: true }
	});
	expect(exercise.exerciseTemplates).toHaveLength(2);
	expect(exercise.mesocycleExerciseTemplates).toHaveLength(2);
	expect(exercise.targetMuscleGroup).toEqual('SideDelts');

	// Change its muscle group in one routine of the library
	await page.goto('/exercise-splits');
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('tab', { name: 'Push A' }).click();
	await page.getByLabel('Cable lateral raises options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.locator('button').filter({ hasText: 'Side delts' }).click();
	await page.getByRole('option', { name: 'Front delts' }).click();
	await page.getByRole('button', { name: 'Edit exercise' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Routine library and current block updated' })).toBeVisible({
		timeout: 10000
	});

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
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

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
