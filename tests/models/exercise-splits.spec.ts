import { test, expect } from '../fixtures';
import { createTemplateExerciseSplit } from './commonFunctions';

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
	await expect(page.getByRole('status').filter({ hasText: 'Exercise split created successfully' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.getByRole('main')).toContainText('Pull Push Legs 1 routine');
});

test('create exercise split from PPL template', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Pull Push Legs Pull APush ALegs APull BPush BLegs B');
	await expect(page.getByRole('tabpanel')).not.toContainText('Rest');
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Pull APush ALegs APull BPush BLegs B Pull A Day 1 Pull-ups Straight sets of 5 to 15 reps BW Lats Barbell rows Straight sets of 10 to 15 reps Traps Dumbbell bicep curls Straight sets of 10 to 20 reps Biceps Face pulls Straight sets of 15 to 30 reps Rear delts'
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
	await expect(page.getByRole('status').first().filter({ hasText: 'Exercise split created successfully' })).toBeVisible(
		{ timeout: 10000 }
	);
	await expect(page.locator('div').filter({ hasText: 'Pull Push Legs (clone) 6 routines' }).nth(1)).toBeVisible();
});

test('delete an exercise split', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise split deleted successfully' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.getByRole('main')).toContainText('No routine libraries found');
});

test('edit an exercise split', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByLabel('exercise-split-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByPlaceholder('Type here').click();
	await page.getByPlaceholder('Type here').fill('Pull Push Legs (edited)');
	// Delete a routine from the middle; it has exercises, so confirm
	await page.getByLabel('Delete routine 4').click();
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page.getByLabel('Routine 4 name')).toHaveValue('Push B');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise split edited successfully' })).toBeVisible({
		timeout: 10000
	});
	await page.getByRole('link', { name: 'Pull Push Legs (edited) 5 routines' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Pull Push Legs (edited) Pull APush ALegs APush BLegs B');
});
