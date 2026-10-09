import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import {
	createExercises,
	createMesocycle,
	createTemplateExerciseSplit,
	pickExercise,
	pickRoutine,
	saveWorkout
} from './commonFunctions';

const prisma = new PrismaClient();

function getTodaysDateString() {
	return new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit' });
}

async function createSplitAndMesoForTest(page: Page) {
	await page.goto('/exercise-splits');
	await createMesocycle(page);
	await page.goto('/workouts');
}

test('create workout', async ({ page, userData }) => {
	await createExercises(userData.userId, ['Barbell bench press']);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Barbell bench press');
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.locator('[id="Barbell\\ bench\\ press-set-1-reps"]').fill('9');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-load"]').fill('100');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-RIR"]').fill('2');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-reps"]').fill('8');
	await page.getByPlaceholder('95').fill('95');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Barbell bench press-set-1-action').click();
	await page.getByTestId('Barbell bench press-set-2-action').click();

	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status')).toContainText('Workout created successfully');
	await page.getByRole('link', { name: `${getTodaysDateString()}` }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Mesocycle No mesocycle User bodyweight 100 kg');
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Barbell bench press 2 Down sets of 5 to 10 reps Chest Feet flat, back arched, grip just outside shoulders. Lower bar to mid-chest, press up explosively. Reps Load (kg) RIR 1 9 100 2 2 8 95 1'
	);
});

test('create workout with all set types', async ({ page, userData }) => {
	await createExercises(userData.userId, [
		'Barbell bench press',
		'Dumbbell bicep curls',
		'Leaning dumbbell lateral raises',
		'Incline dumbbell press',
		{
			name: 'Leg press',
			targetMuscleGroup: 'Quads',
			bodyweightFraction: 0.5,
			note: 'Feet high for quad focus, push up, control return.'
		}
	]);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Barbell bench press');
	await page.getByRole('button', { name: 'Add exercise' }).click();
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.locator('[id="Barbell\\ bench\\ press-set-1-reps"]').fill('9');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-load"]').fill('50');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-RIR"]').fill('1');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-reps"]').fill('8');
	await page.getByPlaceholder('45').fill('45');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Barbell bench press-set-1-action').click();
	await page.getByTestId('Barbell bench press-set-2-action').click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Dumbbell bicep curls');
	await page.getByLabel('Sets').fill('2');
	await page.locator('button').filter({ hasText: 'Straight' }).click();
	await page.getByRole('option', { name: 'Myorep match' }).first().click();
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-reps"]').fill('12');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('10');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-RIR"]').fill('2');
	await page.getByTestId('Dumbbell bicep curls-set-1-action').click();
	await expect(page.getByRole('main')).toContainText('12 reps left');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-reps"]').fill('10');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-RIR"]').fill('0');
	await expect(page.getByRole('main')).toContainText('2 reps left');
	await page.getByLabel('add-mini-set-to-set-2-of-').click();
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-mini-set-1-reps"]').fill('2');
	await expect(page.getByRole('main')).toContainText('matched');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-mini-set-1-RIR"]').fill('0');
	await page.getByTestId('Dumbbell bicep curls-set-2-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-2-mini-set-1-action').click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Leaning dumbbell lateral raises');
	await page.getByLabel('Sets').fill('2');
	await page.locator('button').filter({ hasText: 'Straight' }).click();
	await page.getByRole('option', { name: 'Drop' }).click();
	await page.locator('button').filter({ hasText: 'Pick one' }).click();
	await page.getByRole('option', { name: 'Absolute load' }).click();
	await page.locator('#exercise-set-decrement').fill('5');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-1-reps"]').fill('18');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-1-load"]').fill('10');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-1-RIR"]').fill('2');
	await page.getByLabel('add-mini-set-to-set-1-of-').click();
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-1-mini-set-1-reps"]').fill('12');
	await page.getByPlaceholder('5', { exact: true }).fill('5');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-1-mini-set-1-RIR"]').fill('2');
	await page.getByTestId('Leaning dumbbell lateral raises-set-1-action').click();
	await page.getByTestId('Leaning dumbbell lateral raises-set-1-mini-set-1-action').click();
	await page.getByLabel('add-mini-set-to-set-2-of-Leaning dumbbell lateral raises').click();
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-2-reps"]').fill('16');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-2-load"]').fill('10');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-2-RIR"]').fill('2');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-2-mini-set-1-reps"]').fill('10');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-2-mini-set-1-load"]').fill('5');
	await page.locator('[id="Leaning\\ dumbbell\\ lateral\\ raises-set-2-mini-set-1-RIR"]').fill('2');
	await page.getByTestId('Leaning dumbbell lateral raises-set-2-action').click();
	await page.getByTestId('Leaning dumbbell lateral raises-set-2-mini-set-1-action').click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Incline dumbbell press');
	await page.locator('button').filter({ hasText: 'Straight' }).click();
	await page.getByRole('option', { name: 'V2' }).click();
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.locator('[id="Incline\\ dumbbell\\ press-set-1-reps"]').fill('14');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-1-load"]').fill('20');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-1-RIR"]').fill('2');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-2-reps"]').fill('12');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-2-load"]').fill('15');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Incline dumbbell press-set-1-action').click();
	await page.getByTestId('Incline dumbbell press-set-2-action').click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Leg press');
	await page.locator('button').filter({ hasText: 'Straight' }).click();
	await page.getByRole('option', { name: 'Myorep', exact: true }).click();
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.locator('[id="Leg\\ press-set-1-reps"]').fill('18');
	await page.locator('[id="Leg\\ press-set-1-load"]').fill('180');
	await page.locator('[id="Leg\\ press-set-1-RIR"]').fill('2');
	await page.locator('[id="Leg\\ press-set-2-reps"]').fill('12');
	await page.locator('[id="Leg\\ press-set-2-RIR"]').fill('0');
	await page.getByTestId('Leg press-set-1-action').click();
	await page.getByTestId('Leg press-set-2-action').click();
	await expectSetsFitPhone(page);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByRole('link', { name: `${getTodaysDateString()}` }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Mesocycle No mesocycle User bodyweight 100 kg');
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('main')).toContainText(
		'Barbell bench press 2 Down sets of 5 to 10 reps Chest Feet flat, back arched, grip just outside shoulders. Lower bar to mid-chest, press up explosively. Reps Load (kg) RIR 1 9 50 1 2 8 45 1 Dumbbell bicep curls 2 Myorep match sets of 10 to 20 reps Biceps Hold dumbbells at sides, curl up, squeeze biceps, lower slow. Reps Load (kg) RIR 1 12 10 2 2 10 10 0 1 2 10 0Leaning dumbbell lateral raises 2 Drop sets of 10 to 20 reps Side delts Lean slightly, raise dumbbells to shoulder height. Control descent. Reps Load (kg) RIR 1 18 10 2 1 12 5 22 16 10 2 1 10 5 2Incline dumbbell press 2 V2 sets of 10 to 15 reps Chest Bench at 30-45 degrees, elbows tucked. Press dumbbells up, control descent. Reps Load (kg) RIR 1 14 20 2 2 12 15 1 Leg press 2 Myorep sets of 10 to 20 reps BW Quads Feet high for quad focus, push up, control return. Reps Load (kg) RIR 1 18 180 2 2 12 180 0'
	);
});

test('create a workout with active mesocycle', async ({ page }) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText('Pull A Not done yet LatsTrapsBicepsRear delts');
	await expect(page.getByRole('main')).toContainText('Legs B Not done yet');
	await page.getByPlaceholder('Type here').click();
	await page.getByPlaceholder('Type here').fill('100');
	await expect(page.getByRole('button', { name: 'Pick a routine' })).toBeDisabled();
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const text of [
		'Log workout Exercises Pull A Week 1',
		'Pull-ups KG 3 Straight sets of 5 to 15 reps BW Lats Set Previous KG (BW) Reps RIR',
		'Barbell rows KG 3 Straight sets of 10 to 15 reps Traps Set Previous KG Reps RIR',
		'Dumbbell bicep curls KG 3 Straight sets of 10 to 20 reps Biceps Set Previous KG Reps RIR',
		'Face pulls KG 3 Straight sets of 15 to 30 reps Rear delts Set Previous KG Reps RIR',
		'Discard workout Previous Next'
	]) {
		await expect(page.getByRole('main')).toContainText(text);
	}
	await page.locator('#Pull-ups-set-1-reps').fill('12');
	await page.locator('#Pull-ups-set-2-reps').fill('11');
	await page.locator('#Pull-ups-set-3-reps').fill('10');
	await page.locator('#Pull-ups-set-1-load').fill('0');
	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByTestId('Pull-ups-set-2-action').click();
	await page.getByTestId('Pull-ups-set-3-action').click();

	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('15');
	await page.locator('[id="Barbell\\ rows-set-2-reps"]').fill('14');
	await page.locator('[id="Barbell\\ rows-set-3-reps"]').fill('15');
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('40');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByTestId('Barbell rows-set-2-action').click();
	await page.getByTestId('Barbell rows-set-3-action').click();

	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-reps"]').fill('18');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-reps"]').fill('17');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-3-reps"]').fill('16');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('10');
	await page.getByTestId('Dumbbell bicep curls-set-1-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-2-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-3-action').click();

	await page.locator('[id="Face\\ pulls-set-1-reps"]').fill('25');
	await page.locator('[id="Face\\ pulls-set-2-reps"]').fill('23');
	await page.locator('[id="Face\\ pulls-set-3-reps"]').fill('23');
	await page.locator('[id="Face\\ pulls-set-1-load"]').fill('10');
	await page.getByTestId('Face pulls-set-1-action').click();
	await page.getByTestId('Face pulls-set-2-action').click();
	await page.getByTestId('Face pulls-set-3-action').click();

	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status')).toContainText('Workout created successfully');
	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Mesocycle MyMeso Pull A User bodyweight 100 kg');
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Pull-ups 3 Straight sets of 5 to 15 reps BW Lats Reps Load (kg) RIR 1 12 0 3 2 11 0 3 3 10 0 0'
	);
	await expect(page.getByRole('tabpanel')).toContainText(
		'Barbell rows 3 Straight sets of 10 to 15 reps Traps Reps Load (kg) RIR 1 15 40 3 2 14 40 3 3 15 40 0'
	);
});

test('create workout without using active mesocycle', async ({ page, userData }) => {
	await createExercises(userData.userId, ['Barbell bench press']);
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Blank workout');
	await page.getByPlaceholder('Type here').click();
	await page.getByPlaceholder('Type here').fill('100');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Barbell bench press');
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await page.locator('[id="Barbell\\ bench\\ press-set-1-reps"]').fill('9');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-load"]').fill('100');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-RIR"]').fill('2');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-reps"]').fill('8');
	await page.getByPlaceholder('95').fill('95');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Barbell bench press-set-1-action').click();
	await page.getByTestId('Barbell bench press-set-2-action').click();

	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status')).toContainText('Workout created successfully');
	await page.getByRole('link', { name: `${getTodaysDateString()}` }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Mesocycle No mesocycle User bodyweight 100 kg');
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Barbell bench press 2 Down sets of 5 to 10 reps Chest Feet flat, back arched, grip just outside shoulders. Lower bar to mid-chest, press up explosively. Reps Load (kg) RIR 1 9 100 2 2 8 95 1'
	);
});

test('progression carries over between routines that share an exercise', async ({ page }) => {
	await createSplitAndMesoForTest(page);
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
	await saveWorkout(page, {
		changes: ['Removed: Barbell good mornings', 'Removed: Barbell squats', 'Removed: Leg extensions'],
		answer: 'Just this workout'
	});

	// Legs B also has calf raises: its suggestion starts from the Legs A session
	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText('Legs A Done today');
	await pickRoutine(page, 'Legs B');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Calf\\ raises-set-1-load"]')).toHaveValue('50');
	// Straight sets share set 1's weight; each set gets a rep target
	await expect(page.locator('[id="Calf\\ raises-set-3-reps"]')).not.toHaveValue('');
	// Exercises never done before have no suggestion
	await expect(page.locator('#Lunges-set-1-load')).toHaveValue('');
});

test('delete a workout', async ({ page }) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByTestId('Pull-ups-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByTestId('Dumbbell bicep curls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();

	await page.locator('[id="Face\\ pulls-set-1-reps"]').fill('5');
	await page.locator('[id="Face\\ pulls-set-2-reps"]').fill('5');
	await page.locator('[id="Face\\ pulls-set-3-reps"]').fill('5');
	await page.locator('[id="Face\\ pulls-set-1-load"]').fill('5');
	await page.getByTestId('Face pulls-set-1-action').click();
	await page.getByTestId('Face pulls-set-2-action').click();
	await page.getByTestId('Face pulls-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer: 'Just this workout' });

	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText('Pull A Done today');
	await page.getByRole('link', { name: 'Workouts' }).click();
	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Yes, delete' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Workout deleted successfully' })).toBeVisible();
	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText('Pull A Not done yet');
});

test('edit a workout', async ({ page }) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByTestId('Dumbbell bicep curls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByTestId('Face pulls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.locator('#Pull-ups-set-1-reps').fill('8');
	await page.locator('#Pull-ups-set-2-reps').fill('6');
	await page.locator('#Pull-ups-set-3-reps').fill('5');
	await page.locator('#Pull-ups-set-1-load').fill('0');
	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByTestId('Pull-ups-set-2-action').click();
	await page.getByTestId('Pull-ups-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, { changes: ['Removed: Barbell rows'], answer: 'Just this workout' });

	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByPlaceholder('Type here').fill('95');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.locator('#Pull-ups-set-1-reps').fill('7');
	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();

	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Mesocycle MyMeso Pull A User bodyweight 95 kg Targeted muscle groups Lats'
	);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Pull-ups 3 Straight sets of 5 to 15 reps BW Lats Reps Load (kg) RIR 1 7 0 3 2 6 0 3 3 5 0 0'
	);
});

test('workout changes should update mesocycle split', async ({ page }) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByTestId('Dumbbell bicep curls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByTestId('Face pulls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();

	await page.locator('#Pull-ups-set-1-reps').fill('8');
	await page.locator('#Pull-ups-set-2-reps').fill('7');
	await page.locator('#Pull-ups-set-1-load').fill('0');
	await page.getByTestId('Pull-ups-menu-button').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Sets').fill('2');
	await page.getByPlaceholder('For this routine').fill('Custom note');
	await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('main')).toContainText('Custom note');

	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByTestId('Pull-ups-set-2-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, {
		changes: ['Removed: Barbell rows', 'Pull-ups: 2 sets (routine: 3)', 'Pull-ups: routine note'],
		answer: 'Update routine'
	});

	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await page.getByRole('link', { name: 'MyMeso Active' }).first().click();
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText(
		'Pull APush ALegs APull BPush BLegs B Pull-ups 2 Straight sets of 5 to 15 reps BW Lats Custom note'
	);
	// My routines changed the same way
	await page.goto('/exercise-splits');
	await page.getByRole('button', { name: 'Show the exercises of Pull A' }).click();
	await expect(page.getByTestId('routine-card-exercises')).toContainText(
		'Pull-ups 2 Straight sets of 5 to 15 reps BW Lats Custom note'
	);
});

async function logBarbellRowsInPullA(page: Page) {
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Dumbbell bicep curls', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('13');
	await page.locator('[id="Barbell\\ rows-set-2-reps"]').fill('13');
	await page.locator('[id="Barbell\\ rows-set-3-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('40');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByTestId('Barbell rows-set-2-action').click();
	await page.getByTestId('Barbell rows-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer: 'Just this workout' });
}

test('welcome back after a break: repeat last numbers, easier', async ({ page, userData }) => {
	await createSplitAndMesoForTest(page);
	await logBarbellRowsInPullA(page);

	// Pretend that workout was 10 days ago
	await prisma.workout.updateMany({
		where: { userId: userData.userId },
		data: { startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
	});
	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText("Welcome back: take it easy today It's been 10 days");
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	// Same weight; 1 more rep in reserve than week 1's 3 RIR, so one rep fewer than last time
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40');
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toHaveValue('12');
	await expect(page.locator('[id="Barbell\\ rows-set-1-RIR"]')).toHaveValue('4');

	// Turned off in Settings: no banner
	await page.goto('/settings');
	await page.getByLabel('Take it easy after a break').click();
	await page.waitForTimeout(500);
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText('Pick a routine');
	await expect(page.getByRole('main')).not.toContainText('Welcome back');
});

test('deload week: same weights, half the sets', async ({ page, userData }) => {
	await createSplitAndMesoForTest(page);
	await logBarbellRowsInPullA(page);

	await prisma.mesocycle.updateMany({ where: { userId: userData.userId }, data: { weeklyRIR: [-1] } });
	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText('Deload week');
	await expect(page.getByRole('main')).toContainText('Week 1 of 1 · Deload');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40');
	await expect(page.locator('[id="Barbell\\ rows-set-2-reps"]')).toBeVisible();
	await expect(page.locator('[id="Barbell\\ rows-set-3-reps"]')).toHaveCount(0);
});

test('ask-each-time routine: pick lb at the gym; next time in kg converts to real kg weights', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	// "Ask each time" in My routines, and so in the block that follows it
	await prisma.exerciseSplitDay.updateMany({
		where: { name: 'Pull A', exerciseSplit: { userId: userData.userId } },
		data: { weightUnit: 'ASK' }
	});
	await prisma.mesocycleExerciseSplitDay.updateMany({
		where: { name: 'Pull A', mesocycle: { userId: userData.userId } },
		data: { weightUnit: 'ASK' }
	});

	// This gym uses lb
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await expect(page.getByRole('main')).toContainText('This gym uses');
	await page.getByLabel('Pounds').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('LB');
	for (const exercise of ['Pull-ups', 'Dumbbell bicep curls', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-2-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-3-reps"]').fill('11');
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('90');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByTestId('Barbell rows-set-2-action').click();
	await page.getByTestId('Barbell rows-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer: 'Just this workout' });

	// History shows what was lifted
	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Reps Load (lb) RIR 1 12 90');

	// Next trip the gym uses kg: 90 lb (40.8 kg) becomes 40 kg
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByLabel('Kilograms').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('KG');
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40');

	// Copying last time's sets from history (stored in kg) shows them in this exercise's unit: 90 lb = 40.82 kg
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await page.getByRole('button', { name: 'Copy these sets' }).first().click();
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40.82');
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toHaveValue('12');

	// Switch this exercise back to lb: the planned sets snap to 90 lb
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('LB');
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('90');
});

test('home unit in lb: bodyweight shown and entered in lb', async ({ page, userData }) => {
	await createSplitAndMesoForTest(page);
	await page.goto('/settings');
	await page.getByLabel('Home unit pounds').click();
	await page.waitForTimeout(500);
	await page.goto('/workouts/manage/start');
	await expect(page.getByText('Bodyweight (lb)')).toBeVisible();
	await page.getByPlaceholder('Type here').fill('220');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	// 220 lb is sent as kg
	await expect(page).toHaveURL(/userBodyweight=99\.79/);

	for (const exercise of ['Pull-ups', 'Barbell rows', 'Dumbbell bicep curls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Face\\ pulls-set-1-reps"]').fill('20');
	await page.locator('[id="Face\\ pulls-set-2-reps"]').fill('20');
	await page.locator('[id="Face\\ pulls-set-3-reps"]').fill('20');
	await page.locator('[id="Face\\ pulls-set-1-load"]').fill('10');
	await page.getByTestId('Face pulls-set-1-action').click();
	await page.getByTestId('Face pulls-set-2-action').click();
	await page.getByTestId('Face pulls-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer: 'Just this workout' });

	// Stored in kg, shown in lb
	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId: userData.userId },
		include: { workoutExercises: { include: { sets: true } } }
	});
	expect(saved.userBodyweight).toBeCloseTo(99.79, 1);
	expect(saved.workoutExercises[0].weightUnit).toEqual('KG');
	expect(saved.workoutExercises[0].sets[0].load).toBeCloseTo(10);
	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await expect(page.getByRole('tabpanel')).toContainText('User bodyweight 220 lb');
});

test('weight sets: set up in Settings, link to an exercise, suggestions use real weights', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);

	// The building gym's dumbbells: 5–10 kg by 1, then 14 and 20
	await page.goto('/exercise-splits/weight-sets');
	await page.getByRole('button', { name: 'Add weight set' }).click();
	await page.getByLabel('Name').fill('Building DBs');
	await page.getByLabel('Weight set in kilograms').click();
	await page.getByLabel('From').fill('5');
	await page.getByLabel('To', { exact: true }).fill('10');
	await page.getByLabel('Every').fill('1');
	await page.getByRole('button', { name: 'Add range' }).click();
	await page.getByLabel('Add one weight').fill('14');
	await page.getByRole('button', { name: 'Add weight', exact: true }).click();
	await page.getByLabel('Add one weight').fill('20');
	await page.getByLabel('Add one weight').press('Enter');
	await expect(page.getByTestId('weight-set-draft-weights')).toHaveText(/5\s*6\s*7\s*8\s*9\s*10\s*14\s*20/);
	await page.getByRole('button', { name: 'Save weight set' }).click();
	await expect(page.getByTestId('weight-set-Building DBs')).toContainText('5–10 by 1, 14, 20 kg');

	// Link it to the curls during a workout; the routine remembers it
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Barbell rows', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.getByTestId('Dumbbell bicep curls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Weights available').click();
	await page.getByRole('option', { name: 'Building DBs (kg)' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();

	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-reps"]').fill('20');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-reps"]').fill('20');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-3-reps"]').fill('19');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('10');
	await page.getByTestId('Dumbbell bicep curls-set-1-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-2-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, {
		changes: ['Removed: Pull-ups', 'Dumbbell bicep curls: weights available'],
		answer: 'Update routine'
	});

	const weightSet = await prisma.weightSet.findFirstOrThrow({ where: { userId: userData.userId } });
	expect(weightSet.weights).toEqual([5, 6, 7, 8, 9, 10, 14, 20]);
	const curls = await prisma.mesocycleExerciseTemplate.findFirstOrThrow({
		where: { name: 'Dumbbell bicep curls', mesocycleExerciseSplitDay: { mesocycle: { userId: userData.userId } } }
	});
	expect(curls.weightSetId).toEqual(weightSet.id);
	const libraryCurls = await prisma.exerciseTemplate.findFirstOrThrow({
		where: {
			name: 'Dumbbell bicep curls',
			exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } }
		}
	});
	expect(libraryCurls.weightSetId).toEqual(weightSet.id);

	// Next time: standard steps would say 12.5 kg, but this gym jumps to 14 kg, too far for 10+ reps.
	// So it stays at 10 kg with more reps, and says what's next
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]')).toHaveValue('10');
	await expect(page.getByTestId('Dumbbell bicep curls-next-weight')).toContainText('Next weight: 14 kg. About');
	await expect(page.getByTestId('Dumbbell bicep curls-next-weight')).toContainText('more reps at 10 kg first.');

	// Deleting the weight set puts the exercise back on standard steps
	await page.goto('/exercise-splits/weight-sets');
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete Building DBs' }).click();
	await expect(page.getByTestId('weight-set-Building DBs')).toHaveCount(0);
	// In My routines, and in the block that follows it
	const unlinked = await prisma.mesocycleExerciseTemplate.findFirstOrThrow({
		where: { name: 'Dumbbell bicep curls', mesocycleExerciseSplitDay: { mesocycle: { userId: userData.userId } } }
	});
	expect(unlinked.weightSetId).toBeNull();
	const unlinkedInMyRoutines = await prisma.exerciseTemplate.findFirstOrThrow({ where: { id: libraryCurls.id } });
	expect(unlinkedInMyRoutines.weightSetId).toBeNull();
});

test('weight sets: ask-each-time routine picks the gym’s weights at the start, routine stays unlinked', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	await prisma.exerciseSplitDay.updateMany({
		where: { name: 'Pull A', exerciseSplit: { userId: userData.userId } },
		data: { weightUnit: 'ASK' }
	});
	await prisma.mesocycleExerciseSplitDay.updateMany({
		where: { name: 'Pull A', mesocycle: { userId: userData.userId } },
		data: { weightUnit: 'ASK' }
	});
	await prisma.weightSet.create({
		data: { userId: userData.userId, name: 'Hotel DBs', unit: 'LB', weights: [80, 95, 110] }
	});
	await page.reload();

	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByLabel('Pounds').click();
	await page.getByLabel('Weights here').click();
	await page.getByRole('option', { name: 'Hotel DBs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page).toHaveURL(/sessionWeightSetId=/);
	for (const exercise of ['Pull-ups', 'Dumbbell bicep curls', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-2-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-3-reps"]').fill('11');
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('90');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByTestId('Barbell rows-set-2-action').click();
	await page.getByTestId('Barbell rows-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer: 'Update routine' });

	// The routine is used at many gyms, so it doesn't keep this gym's weights
	const rows = await prisma.mesocycleExerciseTemplate.findFirstOrThrow({
		where: { name: 'Barbell rows', mesocycleExerciseSplitDay: { mesocycle: { userId: userData.userId } } }
	});
	expect(rows.weightSetId).toBeNull();

	// Back at the hotel: 90 lb isn't there, so the suggestion is one of its weights
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByLabel('Pounds').click();
	await page.getByLabel('Weights here').click();
	await page.getByRole('option', { name: 'Hotel DBs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue(/^(80|95)$/);
});

test('levels: a machine that shows levels logs a level, then goes up a level at the top of the rep range', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);

	// The hotel's machine shows levels 1–10
	await page.goto('/exercise-splits/weight-sets');
	await page.getByRole('button', { name: 'Add weight set' }).click();
	await page.getByLabel('Name').fill('Hotel machine');
	await page.getByLabel('Machine levels').click();
	await expect(page.getByTestId('weight-set-levels-hint')).toBeVisible();
	await page.getByLabel('From').fill('1');
	await page.getByLabel('To', { exact: true }).fill('10');
	await page.getByLabel('Every').fill('1');
	await page.getByRole('button', { name: 'Add range' }).click();
	await page.getByRole('button', { name: 'Save weight set' }).click();
	await expect(page.getByTestId('weight-set-Hotel machine')).toContainText('Levels 1–10 by 1');

	// Curls on it (10–20 reps): all three sets at the top, on level 7
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Barbell rows', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.getByTestId('Dumbbell bicep curls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Weights available').click();
	await page.getByRole('option', { name: 'Hotel machine (levels)' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByTestId('Dumbbell bicep curls-levels')).toHaveText('LVL');
	await expect(page.getByTestId('Dumbbell bicep curls-load-header')).toHaveText('LVL');
	await expect(page.getByTestId('Dumbbell bicep curls-unit-toggle')).toHaveCount(0);
	await expect(page.getByLabel('Set 1 level')).toBeVisible();

	for (const set of [1, 2, 3]) {
		await page.locator(`[id="Dumbbell\\ bicep\\ curls-set-${set}-reps"]`).fill('20');
	}
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('7');
	for (const set of [1, 2, 3]) await page.getByTestId(`Dumbbell bicep curls-set-${set}-action`).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page, {
		changes: ['Removed: Pull-ups', 'Dumbbell bicep curls: weights available'],
		answer: 'Update routine'
	});

	// Logged as level 7, not a weight; the routine keeps the machine, not a unit of its own
	const logged = await prisma.workoutExercise.findFirstOrThrow({
		where: { name: 'Dumbbell bicep curls', workout: { userId: userData.userId } },
		include: { sets: true }
	});
	expect(logged.weightUnit).toEqual('LEVEL');
	expect(logged.sets.map((set) => set.load)).toEqual([7, 7, 7]);
	const routineCurls = await prisma.mesocycleExerciseTemplate.findFirstOrThrow({
		where: { name: 'Dumbbell bicep curls', mesocycleExerciseSplitDay: { mesocycle: { userId: userData.userId } } }
	});
	expect(routineCurls.weightUnit).toBeNull();
	expect(routineCurls.weightSetId).not.toBeNull();

	// Next time: level 8, back at the bottom of the range
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]')).toHaveValue('8');
	await expect(page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-reps"]')).toHaveValue('10');

	// The saved workout shows it as a level
	await page.goto(`/workouts/${logged.workoutId}`);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('main')).toContainText('Level');
});

test('save a blank workout as a routine: added to My routines, a taken name gets “(2)”', async ({ page, userData }) => {
	await createExercises(userData.userId, ['Barbell rows', 'Face pulls']);

	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	// No block, so it's a blank workout
	await page.getByRole('button', { name: 'Next' }).click();

	const addExercise = async (name: string, sets: number, load: string) => {
		await page.getByLabel('add-exercise').click();
		await pickExercise(page, name);
		await page.getByLabel('Sets').fill(String(sets));
		await page.getByRole('button', { name: 'Add exercise' }).click();
		const id = name.replace(' ', '\\ ');
		for (let set = 1; set <= sets; set++) {
			await page.locator(`[id="${id}-set-${set}-reps"]`).fill('10');
			await page.locator(`[id="${id}-set-${set}-RIR"]`).fill('2');
		}
		await page.locator(`[id="${id}-set-1-load"]`).fill(load);
		for (let set = 1; set <= sets; set++) await page.getByTestId(`${name}-set-${set}-action`).click();
	};
	await addExercise('Barbell rows', 2, '40');
	await addExercise('Face pulls', 3, '15');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();

	// Offered straight away
	await page.getByRole('button', { name: 'Save as routine' }).click();
	await expect(page.getByLabel('Name')).toBeVisible();
	await page.getByLabel('Name').fill('Hotel full body');
	await page.getByRole('button', { name: 'Save routine' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Added to My routines as “Hotel full body”' })).toBeVisible();

	const myRoutines = () =>
		prisma.exerciseSplit.findMany({
			where: { userId: userData.userId },
			include: {
				exerciseSplitDays: {
					orderBy: { dayIndex: 'asc' },
					include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
				}
			}
		});
	let lists = await myRoutines();
	expect(lists.map((list) => list.name)).toEqual(['My routines']);
	expect(lists[0].exerciseSplitDays.map((routine) => routine.name)).toEqual(['Hotel full body']);
	expect(lists[0].exerciseSplitDays[0].exercises.map((ex) => [ex.name, ex.sets])).toEqual([
		['Barbell rows', 2],
		['Face pulls', 3]
	]);
	expect(lists[0].exerciseSplitDays[0].exercises.every((ex) => ex.exerciseId !== null)).toBe(true);

	// Also on any workout's page; the same name again goes into the same list as "(2)"
	const workout = await prisma.workout.findFirstOrThrow({ where: { userId: userData.userId } });
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Save as routine' }).click();
	await page.getByLabel('Name').fill('Hotel full body');
	await page.getByRole('button', { name: 'Save routine' }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Added to My routines as “Hotel full body (2)”' })
	).toBeVisible();
	lists = await myRoutines();
	expect(lists).toHaveLength(1);
	expect(lists[0].exerciseSplitDays.map((routine) => routine.name)).toEqual(['Hotel full body', 'Hotel full body (2)']);
});

/** Fills a set's numbers by exercise name and set number (1-based); load left out when not given */
/** At phone width every set row fits: nothing scrolls sideways and every tick box is on screen */
async function expectSetsFitPhone(page: Page) {
	await page.setViewportSize({ width: 390, height: 844 });
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
	const boxes = page.getByRole('checkbox');
	expect(await boxes.count()).toBeGreaterThan(0);
	// The tick boxes, and the remove buttons after them (where shown)
	const removeButtons = page.locator('[data-testid$="-remove"]:visible');
	for (const box of [...(await boxes.all()), ...(await removeButtons.all())]) {
		const rect = await box.boundingBox();
		expect(rect).not.toBeNull();
		expect(rect!.x).toBeGreaterThanOrEqual(0);
		expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);
	}
}

async function fillSet(
	page: Page,
	exercise: string,
	set: number,
	numbers: { reps?: string; load?: string; RIR?: string }
) {
	const id = exercise.replaceAll(' ', '\\ ');
	if (numbers.reps !== undefined) await page.locator(`[id="${id}-set-${set}-reps"]`).fill(numbers.reps);
	if (numbers.load !== undefined) await page.locator(`[id="${id}-set-${set}-load"]`).fill(numbers.load);
	if (numbers.RIR !== undefined) await page.locator(`[id="${id}-set-${set}-RIR"]`).fill(numbers.RIR);
}
const setBox = (page: Page, exercise: string, set: number) => page.getByTestId(`${exercise}-set-${set}-action`);

test('first workout with a reps-only exercise: no load to enter, every set ticks, Next and Save work', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	await prisma.exercise.updateMany({
		where: { userId: userData.userId, name: 'Face pulls' },
		data: { repsOnly: true }
	});
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	// No rest timer any more
	await expect(page.getByLabel('time-since-last-set')).toHaveCount(0);

	// Face pulls: reps only, so no load box
	await expect(page.locator('[id="Face\\ pulls-set-1-load"]')).toHaveCount(0);
	await expect(page.getByTestId('Face pulls-set-1-no-load')).toBeVisible();
	const loads: Record<string, string | undefined> = {
		'Pull-ups': '0',
		'Barbell rows': '40',
		'Dumbbell bicep curls': '10',
		'Face pulls': undefined
	};
	for (const [exercise, load] of Object.entries(loads)) {
		for (const set of [1, 2, 3]) await fillSet(page, exercise, set, { reps: '12', load: set === 1 ? load : undefined });
		for (const set of [1, 2, 3]) {
			await setBox(page, exercise, set).click();
			await expect(setBox(page, exercise, set)).toHaveAttribute('aria-checked', 'true');
		}
	}
	await expectSetsFitPhone(page);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	// Same as the routine: saved without asking
	await saveWorkout(page);
	const facePulls = await prisma.workoutExercise.findFirstOrThrow({
		where: { name: 'Face pulls', workout: { userId: userData.userId } },
		include: { sets: true }
	});
	expect(facePulls.sets.map((set) => [set.reps, set.load])).toEqual([
		[12, 0],
		[12, 0],
		[12, 0]
	]);
});

test('sets: tick in any order, untick, a note for what is missing, and a load per straight set', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	// Set 3 first, without a load: not ticked, and the box and a note say why
	await fillSet(page, 'Barbell rows', 3, { reps: '10' });
	await setBox(page, 'Barbell rows', 3).click();
	await expect(setBox(page, 'Barbell rows', 3)).toHaveAttribute('aria-checked', 'false');
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 3: enter load');
	await expect(page.locator('[id="Barbell\\ rows-set-3-load"]')).toHaveAttribute('aria-invalid', 'true');
	await fillSet(page, 'Barbell rows', 3, { load: '35' });
	await expect(page.getByTestId('Barbell rows-missing')).toHaveCount(0);
	await setBox(page, 'Barbell rows', 3).click();
	await expect(setBox(page, 'Barbell rows', 3)).toHaveAttribute('aria-checked', 'true');

	// Set 1's weight goes into empty boxes only: set 2 gets 40, set 3 keeps 35
	await fillSet(page, 'Barbell rows', 1, { reps: '12', load: '40' });
	await setBox(page, 'Barbell rows', 1).click();
	await expect(page.locator('[id="Barbell\\ rows-set-2-load"]')).toHaveValue('40');
	await expect(page.locator('[id="Barbell\\ rows-set-3-load"]')).toHaveValue('35');
	await fillSet(page, 'Barbell rows', 2, { reps: '11' });
	await setBox(page, 'Barbell rows', 2).click();

	// Untick set 2 while 1 and 3 stay done, change it, tick it again
	await setBox(page, 'Barbell rows', 2).click();
	await expect(setBox(page, 'Barbell rows', 2)).toHaveAttribute('aria-checked', 'false');
	await expect(setBox(page, 'Barbell rows', 1)).toHaveAttribute('aria-checked', 'true');
	await expect(setBox(page, 'Barbell rows', 3)).toHaveAttribute('aria-checked', 'true');
	await fillSet(page, 'Barbell rows', 2, { reps: '10' });
	await setBox(page, 'Barbell rows', 2).click();

	// The rest isn't done: skip it (skipping keeps the routine, so nothing to ask)
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('9 sets not done');
	await page.getByRole('button', { name: 'Skip and continue' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await saveWorkout(page);
	const rows = await prisma.workoutExercise.findFirstOrThrow({
		where: { name: 'Barbell rows', workout: { userId: userData.userId } },
		include: { sets: { orderBy: { setIndex: 'asc' } } }
	});
	expect(rows.sets.map((set) => [set.reps, set.load])).toEqual([
		[12, 40],
		[10, 40],
		[10, 35]
	]);

	// Next time each set starts from its own weight
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40');
	await expect(page.locator('[id="Barbell\\ rows-set-3-load"]')).toHaveValue('35');
});

test('a note about a missing number stays with its set when another set is removed', async ({ page }) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	await fillSet(page, 'Barbell rows', 3, { reps: '10' });
	await setBox(page, 'Barbell rows', 3).click();
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 3: enter load');

	// Set 1 goes: the old set 3 is now set 2, and the note and outline move with it
	await page.getByTestId('Barbell rows-set-1-remove').click();
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 2: enter load');
	await expect(page.locator('[id="Barbell\\ rows-set-2-reps"]')).toHaveValue('10');
	await expect(page.locator('[id="Barbell\\ rows-set-2-load"]')).toHaveAttribute('aria-invalid', 'true');
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).not.toHaveAttribute('aria-invalid', 'true');

	// Removing the flagged set takes its note away
	await page.getByTestId('Barbell rows-set-2-remove').click();
	await expect(page.getByTestId('Barbell rows-missing')).toHaveCount(0);
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).not.toHaveAttribute('aria-invalid', 'true');
});

test('add and remove sets; the routine prompt: closing it saves nothing, Update routine changes block and library', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Dumbbell bicep curls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	// Rows: one more set, a copy of the last; face pulls: one fewer
	await fillSet(page, 'Barbell rows', 3, { reps: '9', load: '40' });
	await page.getByTestId('Barbell rows-add-set').click();
	await expect(page.locator('[id="Barbell\\ rows-set-4-reps"]')).toHaveValue('9');
	await page.getByTestId('Face pulls-set-2-remove').click();
	await expect(page.locator('[id="Face\\ pulls-set-3-reps"]')).toHaveCount(0);
	for (const set of [1, 2, 3, 4]) await fillSet(page, 'Barbell rows', set, { reps: '10', load: '40' });
	for (const set of [1, 2]) await fillSet(page, 'Face pulls', set, { reps: '15', load: '10' });
	for (const set of [1, 2, 3, 4]) await setBox(page, 'Barbell rows', set).click();
	await setBox(page, 'Face pulls', 1).click();

	// One set not done: keep going, then tick it
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Keep going' }).click();
	await setBox(page, 'Face pulls', 2).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);

	// Closing the question saves nothing
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	const changes = page.getByTestId('routine-changes');
	await expect(changes).toContainText('Barbell rows: 4 sets (routine: 3)');
	await expect(changes).toContainText('Face pulls: 2 sets (routine: 3)');
	await expect(changes).toContainText('Removed: Pull-ups');
	await page.keyboard.press('Escape');
	await expect(changes).toHaveCount(0);
	expect(await prisma.workout.count({ where: { userId: userData.userId } })).toEqual(0);
	await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();

	await saveWorkout(page, { changes: ['Barbell rows: 4 sets (routine: 3)'], answer: 'Update routine' });
	expect(await prisma.workout.count({ where: { userId: userData.userId } })).toEqual(1);
	const block = await prisma.mesocycleExerciseTemplate.findMany({
		where: { mesocycleExerciseSplitDay: { name: 'Pull A', mesocycle: { userId: userData.userId } } },
		orderBy: { exerciseIndex: 'asc' }
	});
	const library = await prisma.exerciseTemplate.findMany({
		where: { exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } },
		orderBy: { exerciseIndex: 'asc' }
	});
	const expected = [
		['Barbell rows', 4],
		['Face pulls', 2]
	];
	expect(block.map((ex) => [ex.name, ex.sets])).toEqual(expected);
	expect(library.map((ex) => [ex.name, ex.sets])).toEqual(expected);
});

test('Just this workout leaves the routine; Update routine changes My routines and the block follows', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	const logPullA = async (answer: 'Just this workout' | 'Update routine') => {
		await page.getByLabel('create-workout').click();
		await page.getByPlaceholder('Type here').fill('100');
		await pickRoutine(page, 'Pull A');
		await page.getByRole('button', { name: 'Next' }).click();
		await page.getByTestId('Pull-ups-menu-button').click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
		await page.getByRole('button', { name: 'Next' }).click();
		await page.getByRole('button', { name: 'Skip and continue' }).click();
		await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer });
	};
	const blockHasPullUps = async () =>
		(await prisma.mesocycleExerciseTemplate.count({
			where: { name: 'Pull-ups', mesocycleExerciseSplitDay: { name: 'Pull A', mesocycle: { userId: userData.userId } } }
		})) === 1;

	const myRoutinesHasPullUps = async () =>
		(await prisma.exerciseTemplate.count({
			where: { name: 'Pull-ups', exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } }
		})) === 1;

	await logPullA('Just this workout');
	expect([await myRoutinesHasPullUps(), await blockHasPullUps()]).toEqual([true, true]);

	await logPullA('Update routine');
	expect([await myRoutinesHasPullUps(), await blockHasPullUps()]).toEqual([false, false]);
});

test('workout panel: on Log workout after Back and on every screen, resumes the workout, trash asks first; switching routine asks', async ({
	page
}) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await fillSet(page, 'Barbell rows', 1, { reps: '11', load: '40' });
	const panel = page.getByTestId('workout-panel');
	// Not on the workout's own page
	await expect(panel).toHaveCount(0);

	// Back to Log workout: the panel, with the clock and the exercise being done
	await page.getByRole('link', { name: 'Previous' }).click();
	await expect(page.getByTestId('setup-in-progress')).toHaveCount(0);
	await expect(page.getByTestId('workout-panel-clock')).toHaveText(/^\d+:\d\d$/);
	const firstExercise = (await savedWorkoutState(page)).workoutExercises[0].name;
	await expect(page.getByTestId('workout-panel-detail')).toHaveText(firstExercise);
	await expect(page.getByTestId('workout-panel-dot')).toHaveAttribute('data-nudge', 'false');
	// It's below the page, never over it: Continue stays in view and clickable
	const continueButton = page.getByRole('button', { name: 'Continue workout' });
	await continueButton.scrollIntoViewIfNeeded();
	await expect(continueButton).toBeInViewport({ ratio: 1 });
	expect((await continueButton.boundingBox())!.y + (await continueButton.boundingBox())!.height).toBeLessThanOrEqual(
		(await panel.boundingBox())!.y
	);
	await page.getByPlaceholder('Type here').fill('98');
	await continueButton.click();
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toHaveValue('11');

	// Elsewhere in the app; tapping it goes back to the workout
	for (const path of ['/workouts', '/dashboard', '/exercises']) {
		await page.goto(path);
		await expect(panel).toContainText('Workout');
	}
	await page.getByTestId('workout-panel-detail').click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toHaveValue('11');

	// On a small phone: picking another routine asks first, and the dialog fits
	await page.setViewportSize({ width: 320, height: 640 });
	await page.getByRole('link', { name: 'Previous' }).click();
	await pickRoutine(page, 'Push A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('Switch to Push A?');
	await expect(page.getByRole('dialog')).toContainText("The sets you've entered for Pull A will be cleared.");
	await expect(page.getByRole('button', { name: 'Keep Pull A' })).toHaveCount(0);
	for (const name of ['Switch', 'Cancel']) {
		await expect(page.getByRole('dialog').getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
	}
	await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	expect((await savedWorkoutState(page)).workoutData.routineName).toBe('Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Switch', exact: true }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect.poll(async () => (await savedWorkoutState(page)).workoutData.routineName).toBe('Push A');

	// The trash asks first
	await page.goto('/workouts');
	await panel.getByRole('button', { name: 'Discard workout' }).click();
	await expect(page.getByRole('dialog')).toContainText('Discard this workout?');
	await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: 'Discard workout' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Discard', exact: true }).click();
	await expect(panel).toHaveCount(0);
	expect((await savedWorkoutState(page)).workoutData).toBeNull();
});

/** The workout in progress as this device keeps it */
async function savedWorkoutState(page: Page) {
	return page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes') ?? 'null'));
}

/** Changes the workout in progress kept on this device */
async function changeSavedWorkoutState(page: Page, change: { startedAt?: Date; lastActivityAt?: Date }) {
	await page.evaluate(
		({ startedAt, lastActivityAt }) => {
			const state = JSON.parse(localStorage.getItem('workoutRunes')!);
			if (startedAt) state.workoutData.startedAt = startedAt;
			if (lastActivityAt) state.lastActivityAt = lastActivityAt;
			localStorage.setItem('workoutRunes', JSON.stringify(state));
		},
		{ startedAt: change.startedAt?.toISOString(), lastActivityAt: change.lastActivityAt?.toISOString() }
	);
}

test('no mesocycle: pick a routine from My routines, suggestions from last time, saved with its name', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	// Rows done before, outside any routine
	const rows = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Barbell rows' } }
	});
	const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
	await prisma.workout.create({
		data: {
			userId: userData.userId,
			userBodyweight: 100,
			startedAt: twoDaysAgo,
			endedAt: twoDaysAgo,
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						exerciseId: rows.id,
						name: rows.name,
						targetMuscleGroup: rows.targetMuscleGroup,
						setType: 'Straight',
						repRangeStart: 10,
						repRangeEnd: 15,
						sets: { create: [{ setIndex: 0, reps: 12, load: 40, RIR: 2, skipped: false }] }
					}
				]
			}
		}
	});

	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	// My routines and a blank workout; no week, as there's no mesocycle
	await expect(page.getByRole('radio', { name: /^Pull A/ })).toBeVisible();
	await expect(page.getByRole('radio', { name: /^Blank workout/ })).toBeVisible();
	await expect(page.getByRole('main')).not.toContainText('Week 1');
	await expect(page.getByRole('radio', { name: /^Pull A/ })).toContainText('Not done yet');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('workout-routine-name')).toHaveText('Pull A');
	// Suggested from last time
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue(/^\d/);

	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Skip and continue' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await saveWorkout(page);
	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId: userData.userId, routineName: { not: null } },
		include: { workoutOfMesocycle: true }
	});
	expect([saved.routineName, saved.workoutOfMesocycle]).toEqual(['Pull A', null]);

	// The list shows the routine and the length; the routine was done today
	await expect(page.getByRole('link', { name: /Pull A/ })).toContainText(/\d+ min/);
	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('radio', { name: /^Pull A/ })).toContainText('Done today');
});

test('workout panel: shown on every screen, resuming keeps its start, a nudge after 2 hours, it ends at the last tick', async ({
	page,
	userData
}) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toBeVisible();
	// Not on the workout's own pages
	await expect(page.getByTestId('workout-panel')).toHaveCount(0);
	const { startedAt } = (await savedWorkoutState(page)).workoutData;
	const firstExercise = (await savedWorkoutState(page)).workoutExercises[0].name;

	for (const path of ['/exercise-splits', '/exercises', '/settings']) {
		await page.goto(path);
		await expect(page.getByTestId('workout-panel-detail')).toHaveText(firstExercise);
	}

	// Back to setup and Continue: the same workout, the same start
	await page.goto('/workouts/manage/start');
	await page.getByRole('button', { name: 'Continue workout' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	expect((await savedWorkoutState(page)).workoutData.startedAt).toEqual(startedAt);

	// Ticked a set an hour ago; started 2.5 hours ago and never saved
	await fillSet(page, 'Barbell rows', 1, { reps: '12', load: '40', RIR: '2' });
	await setBox(page, 'Barbell rows', 1).click();
	const lastTick = new Date(Date.now() - 60 * 60000);
	await changeSavedWorkoutState(page, { startedAt: new Date(Date.now() - 150 * 60000), lastActivityAt: lastTick });
	await page.goto('/settings');
	await expect(page.getByTestId('workout-panel-detail')).toHaveText('Started 2 h 30 min ago. Finish or discard?');
	await expect(page.getByTestId('workout-panel-dot')).toHaveAttribute('data-nudge', 'true');
	await expect(page.getByTestId('workout-panel-clock')).toHaveText(/^2:3\d:\d\d$/);
	// Finishing: back to the workout, then the sets not done are skipped (after asking), then it's saved
	await page.getByRole('button', { name: 'Back to the workout' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('11 sets not done');
	await page.getByRole('button', { name: 'Skip and continue' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await saveWorkout(page);

	// It ended at the last ticked set, not when it was saved
	const saved = await prisma.workout.findFirstOrThrow({ where: { userId: userData.userId } });
	expect(Math.abs(saved.endedAt.getTime() - lastTick.getTime())).toBeLessThan(2000);
});

test('set row: the remove button is after the tick, hidden on a ticked set, off for the last one, and Undo brings a set back', async ({
	page
}) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	const remove = (exercise: string, set: number) => page.getByTestId(`${exercise}-set-${set}-remove`);
	const tickBox = (await setBox(page, 'Barbell rows', 1).boundingBox())!;
	const removeBox = (await remove('Barbell rows', 1).boundingBox())!;
	expect(removeBox.x).toBeGreaterThan(tickBox.x + tickBox.width - 1);

	// Removed with a note about a missing number; Undo puts it back, numbers and note too
	await fillSet(page, 'Barbell rows', 3, { reps: '10', RIR: '1' });
	await setBox(page, 'Barbell rows', 3).click();
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 3: enter load');
	await remove('Barbell rows', 3).click();
	await expect(page.getByTestId('Barbell rows-missing')).toHaveCount(0);
	await expect(page.locator('[id="Barbell\\ rows-set-3-reps"]')).toHaveCount(0);
	await page.getByRole('status').filter({ hasText: 'Set 3 removed' }).getByRole('button', { name: 'Undo' }).click();
	await expect(page.locator('[id="Barbell\\ rows-set-3-reps"]')).toHaveValue('10');
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 3: enter load');

	// A ticked set is done: no remove button until it's unticked
	await fillSet(page, 'Barbell rows', 1, { reps: '12', load: '40', RIR: '2' });
	await setBox(page, 'Barbell rows', 1).click();
	await expect(remove('Barbell rows', 1)).toBeHidden();
	await setBox(page, 'Barbell rows', 1).click();
	await expect(remove('Barbell rows', 1)).toBeVisible();

	// The last set can't be removed
	await remove('Face pulls', 3).click();
	await remove('Face pulls', 2).click();
	await expect(remove('Face pulls', 1)).toBeDisabled();
	await expectSetsFitPhone(page);
});

test('workout length on the list and the workout page; over 3 hours, “check times?” opens Edit', async ({
	page,
	userData
}) => {
	const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60000);
	const workout = (startMinutesAgo: number, endMinutesAgo: number) =>
		prisma.workout.create({
			data: { userId: userData.userId, userBodyweight: 100, startedAt: at(startMinutesAgo), endedAt: at(endMinutesAgo) }
		});
	const normal = await workout(26 * 60 + 68, 26 * 60);
	const tooLong = await workout(5 * 60, 60);

	await page.goto('/workouts');
	await expect(page.getByTestId('workout-length')).toHaveText(['4 h', '1 h 8 min']);

	await page.goto(`/workouts/${normal.id}`);
	await expect(page.getByTestId('workout-length')).toHaveText('1 h 8 min');
	await expect(page.getByTestId('check-workout-times')).toHaveCount(0);

	await page.goto(`/workouts/${tooLong.id}`);
	await expect(page.getByTestId('workout-length')).toHaveText('4 h');
	await page.getByTestId('check-workout-times').click();
	await page.waitForURL('/workouts/manage/start');
	await expect(page.locator('#end-date')).toBeVisible();
});

/** A saved workout yesterday: Barbell rows, 3 × 10 at 60 kg, bodyweight 80 kg */
async function createPastWorkout(userId: string) {
	const startedAt = new Date(Date.now() - 86400000);
	return prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 3600000),
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						name: 'Barbell rows',
						targetMuscleGroup: 'Lats',
						setType: 'Straight',
						repRangeStart: 8,
						repRangeEnd: 12,
						sets: {
							create: [0, 1, 2].map((setIndex) => ({ setIndex, reps: 10, load: 60, RIR: 2, skipped: false }))
						}
					}
				]
			}
		}
	});
}

/** Opens a past workout's edit, through its bodyweight step, to its exercises */
async function editPastWorkout(page: Page, workoutId: string) {
	await page.goto(`/workouts/${workoutId}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/start/);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toHaveValue('10');
}

/** Changes set 1's reps in the edit */
async function changeFirstSet(page: Page, reps: string) {
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill(reps);
	await page.getByTestId('Barbell rows-set-1-action').click();
}

const savedFirstSetReps = async (workoutId: string) =>
	(
		await prisma.workoutExerciseSet.findFirstOrThrow({
			where: { setIndex: 0, workoutExercise: { workoutId } }
		})
	).reps;

test('editing a past workout, unchanged: leaving asks nothing (even kg → lb → kg), and no panel; Discard changes asks nothing more', async ({
	page,
	userData
}) => {
	// Bodyweight shown in lb, stored in kg
	await prisma.userSettings.upsert({
		where: { userId: userData.userId },
		create: { userId: userData.userId, homeWeightUnit: 'LB' },
		update: { homeWeightUnit: 'LB' }
	});
	try {
		const workout = await createPastWorkout(userData.userId);
		await editPastWorkout(page, workout.id);

		// Back through the edit's own pages, then out of it: no question, the edit just ends
		await page.goBack();
		await page.waitForURL(/\/workouts\/manage\/start/);
		await expect(page.getByPlaceholder('Type here')).toBeVisible();
		await page.goBack();
		await page.waitForURL(`/workouts/${workout.id}`);
		await expect(page.getByRole('heading', { name: 'View workout' })).toBeVisible();
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('workout-panel')).toHaveCount(0);
		await expect.poll(async () => (await savedWorkoutState(page)).editingWorkoutId).toBeNull();

		// Discard changes on the exercises page: cleared first, so leaving asks nothing more
		await editPastWorkout(page, workout.id);
		await changeFirstSet(page, '9');
		await page.getByRole('button', { name: 'Discard changes' }).click();
		await page.getByRole('button', { name: 'Yes, discard' }).click();
		await page.waitForURL('/workouts');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		expect(await savedFirstSetReps(workout.id)).toBe(10);
	} finally {
		// The test user is shared with later tests
		await prisma.userSettings.update({ where: { userId: userData.userId }, data: { homeWeightUnit: 'KG' } });
	}
});

test('editing a past workout, changed: leaving asks to save; Keep editing stays, Discard leaves it as it was, Save saves it', async ({
	page,
	userData
}) => {
	const workout = await createPastWorkout(userData.userId);
	await editPastWorkout(page, workout.id);
	await changeFirstSet(page, '9');
	// Never shown as a workout in progress
	await page.getByRole('link', { name: 'Previous' }).click();
	await expect(page.getByTestId('workout-panel')).toHaveCount(0);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);

	// Keep editing: still here, the change kept and still counted
	await page.getByRole('link', { name: 'Exercises' }).first().click();
	await expect(page.getByRole('dialog')).toContainText('Save your changes?');
	await page.getByRole('button', { name: 'Keep editing' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).toHaveURL(/\/workouts\/manage\/exercises/);
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toHaveValue('9');

	// Discard: on to where it was going, the workout as it was
	await page.getByRole('link', { name: 'Exercises' }).first().click();
	await page.getByRole('dialog').getByRole('button', { name: 'Discard changes' }).click();
	await page.waitForURL('/exercises');
	expect(await savedFirstSetReps(workout.id)).toBe(10);
	await expect.poll(async () => (await savedWorkoutState(page)).editingWorkoutId).toBeNull();

	// Save: saved, then on to where it was going (the phone's Back here)
	await editPastWorkout(page, workout.id);
	await changeFirstSet(page, '8');
	await page.goBack();
	await page.waitForURL(/\/workouts\/manage\/start/);
	await expect(page.getByPlaceholder('Type here')).toBeVisible();
	await page.goBack();
	await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
	await page.waitForURL(`/workouts/${workout.id}`);
	expect(await savedFirstSetReps(workout.id)).toBe(8);
	await expect.poll(async () => (await savedWorkoutState(page)).editingWorkoutId).toBeNull();
});

test('an edit left without saving (tab closed) is cleared on the next visit, with a note', async ({
	page,
	userData
}) => {
	const workout = await createPastWorkout(userData.userId);
	await editPastWorkout(page, workout.id);
	await changeFirstSet(page, '9');
	// The tab closes; the app is opened again on another page
	await page.goto('about:blank');
	await page.goto('/workouts');
	await expect(page.getByText('Unsaved changes to a past workout were discarded')).toBeVisible();
	await expect(page.getByTestId('workout-panel')).toHaveCount(0);
	await expect.poll(async () => (await savedWorkoutState(page)).editingWorkoutId).toBeNull();
	expect(await savedFirstSetReps(workout.id)).toBe(10);
});
