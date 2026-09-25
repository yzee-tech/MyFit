import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createMesocycle, createTemplateExerciseSplit, pickRoutine } from './commonFunctions';

const prisma = new PrismaClient();

test.beforeEach(async ({ page }) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await page.getByRole('link', { name: 'Mesocycles' }).click();
});

test('create a mesocycle', async ({ page }) => {
	await expect(page.getByRole('main')).toContainText('Active No active mesocycle All No mesocycles found');
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('My Mesocycle');
	await page.getByLabel('Mesocycle duration').fill('6');
	// Suggested plan for 6 weeks, then make week 1 easier
	await expect(page.getByLabel('Week 6 effort')).toContainText('Deload');
	await page.getByLabel('Week 1 effort').click();
	await page.getByRole('option', { name: '4 RIR' }).click();
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByText('Pick one').click();
	await page.getByRole('option', { name: 'Pull Push Legs' }).click();
	await page.getByLabel('Take last set to failure').click();
	await page.locator('span > .absolute').click();
	await page.getByRole('button', { name: 'Next' }).click();

	// Leave one routine out of the block
	await page.getByLabel('Include Legs B').click();
	await page.getByLabel('Sets per exercise').fill('4');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();

	await expect(page.getByRole('status').filter({ hasText: 'Mesocycle created successfully' })).toBeVisible({
		timeout: 10000
	});
	await page.getByRole('link', { name: 'My Mesocycle Unused' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('My Mesocycle No dates available Unused');
	await expect(page.getByRole('tabpanel')).toContainText('Weekly effort 6 weeks');
	await expect(page.getByTestId('mesocycle-weekly-effort').locator('> *')).toHaveText([
		'W1: 4 RIR',
		'W2: 2 RIR',
		'W3: 2 RIR',
		'W4: 1 RIR',
		'W5: 0 RIR',
		'W6: Deload'
	]);
	await expect(page.getByRole('tabpanel')).toContainText(
		'Start exercise template Pull Push Legs Start overload percentage 1.25% Last set to failure'
	);

	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText('Pull-ups 4 Straight sets of 5 to 15 reps');
	await expect(page.getByRole('main')).toContainText('Pull APush ALegs APull BPush B');
	await expect(page.getByRole('main')).not.toContainText('Legs B');
});

test('delete a mesocycle', async ({ page }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('MesoToDelete');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByText('Pick one').click();
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByRole('option', { name: 'Pull Push Legs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/mesocycles\/manage\/volume/);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByRole('link', { name: 'MesoToDelete Unused' }).click();
	await page.getByLabel('mesocycle-options').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Mesocycle deleted successfully' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.getByRole('main')).toContainText('No mesocycles found');
});

test('edit a mesocycle', async ({ page }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('MesoName');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByText('Pick one').click();
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByRole('option', { name: 'Pull Push Legs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/mesocycles\/manage\/volume/);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();

	await page.getByRole('link', { name: 'MesoName Unused' }).click();
	await page.getByLabel('mesocycle-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Mesocycle name').fill('MesoName (edited)');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.locator('#mesocycle-force-RIR-matching').click();
	await page.getByLabel('Take last set to failure').click();
	await page.locator('span > .absolute').click();
	await expect(page.getByRole('main')).toContainText('Routine library cannot be changed');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/overview');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Mesocycle edited successfully' })).toBeVisible({
		timeout: 10000
	});

	await page.getByRole('link', { name: 'MesoName (edited) Unused' }).click();
	await expect(page.locator('h3')).toContainText('MesoName (edited)');
	await expect(page.getByRole('tabpanel')).toContainText('Weekly effort 5 weeks');
	await expect(page.getByTestId('mesocycle-weekly-effort').locator('> *')).toHaveText([
		'W1: 3 RIR',
		'W2: 2 RIR',
		'W3: 1 RIR',
		'W4: 0 RIR',
		'W5: Deload'
	]);
	await expect(page.getByRole('tabpanel')).toContainText(
		'Start exercise template Pull Push Legs Start overload percentage 1.25% Last set to failure'
	);
});

test('start and stop a mesocycle', async ({ page }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('MesoName');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByText('Pick one').click();
	await page.getByRole('option', { name: 'Pull Push Legs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/mesocycles\/manage\/volume/);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByRole('link', { name: 'MesoName Unused' }).click();
	await page.getByRole('button', { name: 'Start mesocycle' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Mesocycle started successfully' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.getByRole('tabpanel')).toContainText(`MesoName ${new Date().toLocaleDateString('en-US')} Active`);
	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await expect(page.getByRole('main')).toContainText("Active MesoName Active All MesoName Active That's all");
	await page.getByRole('link', { name: 'MesoName Active' }).first().click();
	await page.getByRole('button', { name: 'Stop mesocycle' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Mesocycle stopped successfully' })).toBeVisible({
		timeout: 10000
	});
	await expect(page.getByRole('tabpanel')).toContainText(
		`MesoName ${new Date().toLocaleDateString('en-US')} to ${new Date().toLocaleDateString('en-US')} Completed`
	);
	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await expect(page.getByRole('main')).toContainText("Active No active mesocycle All MesoName Completed That's all");
});

test("edit mesocycle's exercise split", async ({ page }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('MesoName');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByText('Pick one').click();
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByRole('option', { name: 'Pull Push Legs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/mesocycles\/manage\/volume/);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByRole('link', { name: 'MesoName Unused' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(`MesoName No dates available Unused`);
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText('Face pulls 3 Straight sets of 15 to 30 reps Rear delts');
	await page.getByRole('button', { name: 'Edit' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('tabpanel').getByRole('list').getByRole('button').nth(3).click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Sets').click();
	await page.getByLabel('Sets').fill('4');
	await page.getByRole('button', { name: 'Edit exercise' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Mesocycle exercise split edited successfully' })
	).toBeVisible({ timeout: 10000 });
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText('Face pulls 4 Straight sets of 15 to 30 reps Rear delts');
});

test('add routines mid-block; trained routines keep their workouts', async ({ page }) => {
	await createMesocycle(page, { exerciseSplitCreated: true });
	await page.getByRole('link', { name: 'Workouts' }).click();
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Legs A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Barbell good mornings', 'Barbell squats', 'Leg extensions']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Calf\\ raises-set-1-reps"]').fill('12');
	await page.locator('[id="Calf\\ raises-set-2-reps"]').fill('12');
	await page.locator('[id="Calf\\ raises-set-3-reps"]').fill('11');
	await page.locator('[id="Calf\\ raises-set-1-load"]').fill('50');
	await page.getByTestId('Calf raises-set-1-action').click();
	await page.getByTestId('Calf raises-set-2-action').click();
	await page.getByTestId('Calf raises-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await page.getByRole('link', { name: 'MyMeso Active' }).first().click();
	await page.getByRole('tab', { name: 'Routines' }).click();
	await page.getByRole('button', { name: 'Edit' }).click();
	// Legs A (3rd) was trained, so it can't be deleted; Push A (2nd) can
	await expect(page.getByLabel('Delete routine 3')).toBeDisabled();
	await page.getByLabel('Delete routine 2').click();
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await page.getByRole('button', { name: 'Add routine' }).click();
	await page.getByLabel('Routine 6 name').fill('Hotel gym - Full body');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('tab', { name: 'Hotel gym - Full body' }).click();
	await page.getByLabel('add-exercise').click();
	await page.getByRole('option', { name: 'Barbell bench press', exact: true }).click();
	await page.getByLabel('Sets').fill('3');
	await page.getByRole('button', { name: 'Add exercise' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Mesocycle exercise split edited successfully' })
	).toBeVisible({ timeout: 10000 });

	// Legs A moved up a position and still shows its workout; the new routine can be picked
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText('Legs A Done today');
	await expect(page.getByRole('main')).not.toContainText('Push A');
	await expect(page.getByRole('main')).toContainText('Hotel gym - Full body Not done yet');
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Legs A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Calf\\ raises-set-1-load"]')).toHaveValue('50');
});

test('extract exercise split from mesocycle', async ({ page }) => {
	await createMesocycle(page, { exerciseSplitCreated: true });
	await page.getByRole('link', { name: 'MyMeso' }).first().click();
	await expect(page.getByRole('main')).toContainText(new Date().toLocaleDateString('en-US'));
	await page.getByRole('tab', { name: 'Routines' }).click();
	await page.getByRole('button', { name: 'Edit' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('tabpanel').getByRole('list').getByRole('button').first().click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByPlaceholder('Type here or search...').fill('Lat pulldowns');
	await page.locator('#exercise-involves-bodyweight').click();
	await page.getByRole('button', { name: 'Edit exercise' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();

	await page.getByLabel('mesocycle-options').click();
	await page.getByRole('menuitem', { name: 'Extract split' }).click();
	await page.getByPlaceholder('Type here').fill('MyMeso exercise split');
	await page.getByRole('button', { name: 'Yes, extract' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise split created successfully' })).toBeVisible();
	await page.getByRole('link', { name: 'Routine libraries' }).click();
	await page.getByRole('link', { name: 'MyMeso exercise split 6 routines' }).click();
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Pull A Day 1 Lat pulldowns Straight sets of 5 to 15 reps Lats Barbell rows Straight sets of 10 to 15 reps Traps Dumbbell bicep curls Straight sets of 10 to 20 reps Biceps Face pulls Straight sets of 15 to 30 reps Rear delts'
	);
});

test('finish a block once its weeks are over', async ({ page, userData }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('OneWeekBlock');
	await page.getByLabel('Mesocycle duration').fill('1');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByText('Pick one').click();
	await page.getByRole('option', { name: 'Pull Push Legs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('Start immediately').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/mesocycles');

	// Still in week 1: no finish prompt
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText('Week 1 of 1');
	await expect(page.getByRole('button', { name: 'Finish block' })).toHaveCount(0);

	// Pretend the block started 8 days ago
	await prisma.mesocycle.updateMany({
		where: { userId: userData.userId, name: 'OneWeekBlock' },
		data: { startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }
	});
	await page.reload();
	await expect(page.getByRole('main')).toContainText('Block finished');
	await page.getByRole('button', { name: 'Finish block' }).click();
	await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
});
