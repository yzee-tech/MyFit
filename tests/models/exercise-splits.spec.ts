import { test, expect } from '../fixtures';
import { createMesocycle, createTemplateExerciseSplit } from './commonFunctions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.beforeEach(async ({ page }) => {
	await page.goto('/exercise-splits');
});

test('create an exercise split', async ({ page }) => {
	await page.getByLabel('exercise-split-new-options').click();
	await page.getByRole('menuitem', { name: 'Start from scratch' }).click();
	await page.getByPlaceholder('Type here').fill('Pull Push Legs');
	// A new library starts with a single routine
	await expect(page.getByLabel('Routine 2 name')).toHaveCount(0);
	await page.getByLabel('Routine 1 name').fill('Pull');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByLabel('add-exercise').click();
	await page.getByPlaceholder('Type here or search...').fill('Custom exercise');
	await page.locator('button').filter({ hasText: 'Pick one' }).click();
	await page.getByRole('option', { name: 'Custom' }).click();
	await page.getByLabel('Muscle group').fill('Soleus');
	await page.getByLabel('Bodyweight fraction').click();
	await page.getByLabel('Bodyweight fraction').fill('1');
	await page.locator('button').filter({ hasText: 'Straight' }).click();
	await page.getByRole('option', { name: 'Drop' }).click();
	await page.getByLabel('Rep range start').fill('15');
	await page.getByLabel('Rep range end').fill('30');
	await page.locator('#exercise-set-decrement').fill('5');
	await page.getByPlaceholder('Exercise cues, machine').fill('Custom note');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Routine library created' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.getByRole('main')).toContainText('Pull Push Legs 1 routine');
});

test('create exercise split from PPL template', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	// The library's name as the title, then its routines' exercises: no info tab or charts
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pull Push Legs');
	await expect(page.getByRole('main')).toContainText('Routine library · 6 routines');
	await expect(page.getByRole('tab', { name: 'Info' })).toHaveCount(0);
	await expect(page.getByRole('main')).not.toContainText('Rest');
	await expect(page.getByRole('main')).toContainText(
		'Pull APush ALegs APull BPush BLegs B Pull A 4 exercises Pull-ups Straight sets of 5 to 15 reps BW Lats Barbell rows Straight sets of 10 to 15 reps Traps Dumbbell bicep curls Straight sets of 10 to 20 reps Biceps Face pulls Straight sets of 15 to 30 reps Rear delts'
	);
});

test('create a clone of a split', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Clone' }).click();
	await page.getByPlaceholder('Type here').click();
	await page.getByPlaceholder('Type here').fill('Pull Push Legs (clone)');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/exercise-splits/manage/exercises');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').first().filter({ hasText: 'Routine library created' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.locator('div').filter({ hasText: 'Pull Push Legs (clone) 6 routines' }).nth(1)).toBeVisible();
});

test('delete an exercise split', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Routine library deleted' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.getByRole('main')).toContainText('No routine libraries found');
});

test('edit an exercise split', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByPlaceholder('Type here').click();
	await page.getByPlaceholder('Type here').fill('Pull Push Legs (edited)');
	// Delete a routine from the middle; it has exercises, so confirm
	await page.getByLabel('Delete routine 4').click();
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page.getByLabel('Routine 4 name')).toHaveValue('Push B');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Routine library saved' })).toBeVisible({
		timeout: 10000
	});
	await page.getByRole('link', { name: 'Pull Push Legs (edited) 5 routines' }).click();
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pull Push Legs (edited)');
	await expect(page.getByRole('main')).toContainText('Pull APush ALegs APush BLegs B');
});

test('editing a library can update the current block, keeping its sets and link', async ({ page, userData }) => {
	await createMesocycle(page);
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { userId: userData.userId } });
	// The block remembers 5 sets of barbell rows (e.g. changed during a workout)
	await prisma.mesocycleExerciseTemplate.updateMany({
		where: { name: 'Barbell rows', mesocycleExerciseSplitDay: { mesocycleId: block.id } },
		data: { sets: 5 }
	});

	// Edit straight away, no pop-up; rename the first routine
	await page.goto('/exercise-splits');
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL('/exercise-splits/manage/structure');
	await page.getByLabel('Routine 1 name').fill('Hotel – Pull');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByLabel('Also update my current block “MyMeso”')).toBeChecked();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Routine library and current block updated' })).toBeVisible({
		timeout: 10000
	});

	const routines = await prisma.mesocycleExerciseSplitDay.findMany({
		where: { mesocycleId: block.id },
		include: { mesocycleSplitDayExercises: true },
		orderBy: { dayIndex: 'asc' }
	});
	expect(routines.map((routine) => routine.name)).toEqual([
		'Hotel – Pull',
		'Push A',
		'Legs A',
		'Pull B',
		'Push B',
		'Legs B'
	]);
	const rows = routines[0].mesocycleSplitDayExercises.find((exercise) => exercise.name === 'Barbell rows')!;
	expect(rows.sets).toEqual(5);
	// Still linked to the library it came from
	const library = await prisma.exerciseSplit.findFirstOrThrow({ where: { userId: userData.userId } });
	expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id: block.id } })).exerciseSplitId).toEqual(library.id);

	// Untick to change only the library
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Routine 1 name').fill('Home – Pull');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('Also update my current block “MyMeso”').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Routine library saved' })).toBeVisible({
		timeout: 10000
	});
	const firstRoutine = await prisma.mesocycleExerciseSplitDay.findFirstOrThrow({
		where: { mesocycleId: block.id, dayIndex: 0 }
	});
	expect(firstRoutine.name).toEqual('Hotel – Pull');
});
