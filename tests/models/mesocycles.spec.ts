import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import {
	createExercises,
	createMesocycle,
	createTemplateExerciseSplit,
	deleteRoutine,
	editRoutine,
	pickExercise,
	pickRoutine,
	saveRoutine,
	saveWorkout
} from './commonFunctions';

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

	// No routine library to pick, and no routines step: a block uses My routines
	await expect(page.getByText('Pick one')).toHaveCount(0);
	await page.getByLabel('Take last set to failure').click();
	await page.locator('span > .absolute').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/overview');
	await expect(page.getByTestId('block-uses-my-routines')).toContainText(
		'Uses My routines (6 routines) Pull A, Push A, Legs A, Pull B, Push B, Legs B'
	);
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
		'Routines My routines Start overload percentage 1.25% Last set to failure'
	);

	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText('Pull-ups 3 Straight sets of 5 to 15 reps');
	await expect(page.getByRole('main')).toContainText('Pull APush ALegs APull BPush BLegs B');
});

test('delete a mesocycle', async ({ page }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('MesoToDelete');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/overview');
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
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/overview');
	await page.getByRole('button', { name: 'Save' }).click();

	await page.getByRole('link', { name: 'MesoName Unused' }).click();
	await page.getByLabel('mesocycle-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Mesocycle name').fill('MesoName (edited)');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.locator('#mesocycle-force-RIR-matching').click();
	await page.getByLabel('Take last set to failure').click();
	await page.locator('span > .absolute').click();
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
		'Routines My routines Start overload percentage 1.25% Last set to failure'
	);
});

test('start and stop a mesocycle', async ({ page }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('MesoName');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/overview');
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
	// A finished block keeps its routines as they were, and follows My routines no more
	await expect(page.getByRole('tabpanel')).toContainText('Routines As they were during this mesocycle');
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByTestId('mesocycle-routines-note')).toHaveText(
		'The routines as they were during this mesocycle'
	);
	await expect(page.getByRole('link', { name: 'Edit routines' })).toHaveCount(0);
	expect(
		(await prisma.mesocycle.findFirstOrThrow({ where: { name: 'MesoName', endDate: { not: null } } })).exerciseSplitId
	).toBeNull();
	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await expect(page.getByRole('main')).toContainText("Active No active mesocycle All MesoName Completed That's all");
});

test('a block starts with My routines as they are when it starts', async ({ page, userData }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('MesoName');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/progression');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/overview');
	await page.getByRole('button', { name: 'Save' }).click();

	// My routines change before the block starts: 4 sets of face pulls
	await editRoutine(page, 'Pull A');
	await page.getByLabel('Face pulls options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.locator('#exercise-sets').fill('4');
	await page.getByRole('button', { name: 'Edit exercise' }).click();
	await saveRoutine(page);

	await page.goto('/mesocycles');
	await page.getByRole('link', { name: 'MesoName Unused' }).click();
	await page.getByRole('button', { name: 'Start mesocycle' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Mesocycle started successfully' })).toBeVisible({
		timeout: 10000
	});
	await page.reload();
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText('Face pulls 4 Straight sets of 15 to 30 reps Rear delts');
	const list = await prisma.exerciseSplit.findUniqueOrThrow({ where: { userId: userData.userId } });
	expect((await prisma.mesocycle.findFirstOrThrow({ where: { userId: userData.userId } })).exerciseSplitId).toBe(
		list.id
	);
});

test('add routines mid-block; trained routines keep their workouts', async ({ page, userData }) => {
	await createExercises(userData.userId, ['Barbell bench press']);
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
	await saveWorkout(page, { changes: ['Removed: Barbell good mornings'], answer: 'Just this workout' });

	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await page.getByRole('link', { name: 'MyMeso Active' }).first().click();
	await page.getByRole('tab', { name: 'Routines' }).click();
	await page.getByRole('link', { name: 'Edit routines' }).click();
	await page.waitForURL('/exercise-splits');
	// Routines are edited in My routines; Legs A keeps its workout wherever it moves
	await deleteRoutine(page, 'Push A');
	await page.getByRole('link', { name: 'New routine' }).click();
	await page.getByLabel('Name', { exact: true }).fill('Hotel gym - Full body');
	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Barbell bench press');
	await page.getByLabel('Sets').fill('3');
	await page.getByRole('button', { name: 'Add exercise' }).click();
	await saveRoutine(page);

	// Legs A still shows its workout; Push A is gone; the new routine can be picked
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText('Legs A Done today');
	await expect(page.getByRole('main')).not.toContainText('Push A');
	await expect(page.getByRole('main')).toContainText('Hotel gym - Full body Not done yet');
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Legs A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Calf\\ raises-set-1-load"]')).toHaveValue('50');
});

test('finish a block once its weeks are over', async ({ page, userData }) => {
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').fill('OneWeekBlock');
	await page.getByLabel('Mesocycle duration').fill('1');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/mesocycles/manage/progression');
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
