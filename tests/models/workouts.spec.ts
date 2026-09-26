import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createExercises, createMesocycle, pickExercise, pickRoutine } from './commonFunctions';

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
	await expect(page.getByRole('main')).toContainText(
		'New workout Exercises Pull A Week 1 Pull-ups kg 3 Straight sets of 5 to 15 reps BW Lats Reps +/− kg (BW) RIR Barbell rows kg 3 Straight sets of 10 to 15 reps Traps Reps Load RIR Dumbbell bicep curls kg 3 Straight sets of 10 to 20 reps Biceps Reps Load RIR Face pulls kg 3 Straight sets of 15 to 30 reps Rear delts Reps Load RIR Previous Next'
	);
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
	await page.getByRole('link', { name: `${getTodaysDateString()} Pull A` }).click();
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
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

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
	await page.getByRole('button', { name: 'Save' }).click();

	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText('Pull A Done today');
	await page.getByRole('link', { name: 'Workouts' }).click();
	await page.getByRole('link', { name: `${getTodaysDateString()} Pull A` }).click();
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
	await page.getByRole('button', { name: 'Save' }).click();

	await page.getByRole('link', { name: `${getTodaysDateString()} Pull A` }).click();
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByPlaceholder('Type here').fill('95');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.locator('#Pull-ups-set-1-reps').fill('7');
	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();

	await page.getByRole('link', { name: `${getTodaysDateString()} Pull A` }).click();
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
	await page.getByRole('button', { name: 'Edit exercise' }).click();
	await expect(page.getByRole('main')).toContainText('Custom note');

	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByTestId('Pull-ups-set-2-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await page.getByRole('link', { name: 'MyMeso Active' }).first().click();
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText(
		'Pull APush ALegs APull BPush BLegs B Pull-ups 2 Straight sets of 5 to 15 reps BW Lats Custom note'
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
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');
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
	await page
		.getByRole('button', { name: 'Overwrite' })
		.click({ timeout: 2000 })
		.catch(() => {});
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
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('lb');
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
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

	// History shows what was lifted
	await page.getByRole('link', { name: `${getTodaysDateString()} Pull A` }).click();
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Reps Load (lb) RIR 1 12 90');

	// Next trip the gym uses kg: 90 lb (40.8 kg) becomes 40 kg
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByLabel('Kilograms').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('kg');
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40');

	// Copying last time's sets from history (stored in kg) shows them in this exercise's unit: 90 lb = 40.82 kg
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await page.getByRole('button', { name: 'Copy these sets' }).first().click();
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue('40.82');
	await expect(page.locator('[id="Barbell\\ rows-set-1-reps"]')).toHaveValue('12');

	// Switch this exercise back to lb: the planned sets snap to 90 lb
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('lb');
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
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

	// Stored in kg, shown in lb
	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId: userData.userId },
		include: { workoutExercises: { include: { sets: true } } }
	});
	expect(saved.userBodyweight).toBeCloseTo(99.79, 1);
	expect(saved.workoutExercises[0].weightUnit).toEqual('KG');
	expect(saved.workoutExercises[0].sets[0].load).toBeCloseTo(10);
	await page.getByRole('link', { name: `${getTodaysDateString()} Pull A` }).click();
	await expect(page.getByRole('tabpanel')).toContainText('User bodyweight 220 lb');
});

test('weight sets: set up in Settings, link to an exercise, suggestions use real weights', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);

	// The building gym's dumbbells: 5–10 kg by 1, then 14 and 20
	await page.goto('/settings');
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
	await page.getByRole('button', { name: 'Edit exercise' }).click();

	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-reps"]').fill('20');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-reps"]').fill('20');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-3-reps"]').fill('19');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('10');
	await page.getByTestId('Dumbbell bicep curls-set-1-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-2-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

	const weightSet = await prisma.weightSet.findFirstOrThrow({ where: { userId: userData.userId } });
	expect(weightSet.weights).toEqual([5, 6, 7, 8, 9, 10, 14, 20]);
	const curls = await prisma.mesocycleExerciseTemplate.findFirstOrThrow({
		where: { name: 'Dumbbell bicep curls', mesocycleExerciseSplitDay: { mesocycle: { userId: userData.userId } } }
	});
	expect(curls.weightSetId).toEqual(weightSet.id);

	// Next time: standard steps would say 12.5 kg, but this gym jumps to 14 kg, too far for 10+ reps.
	// So it stays at 10 kg with more reps, and says what's next
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]')).toHaveValue('10');
	await expect(page.getByTestId('Dumbbell bicep curls-next-weight')).toContainText('Next weight: 14 kg. About');
	await expect(page.getByTestId('Dumbbell bicep curls-next-weight')).toContainText('more reps at 10 kg first.');

	// Deleting the weight set puts the exercise back on standard steps
	await page.goto('/settings');
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete Building DBs' }).click();
	await expect(page.getByTestId('weight-set-Building DBs')).toHaveCount(0);
	const unlinked = await prisma.mesocycleExerciseTemplate.findUniqueOrThrow({ where: { id: curls.id } });
	expect(unlinked.weightSetId).toBeNull();
});

test('weight sets: ask-each-time routine picks the gym’s weights at the start, routine stays unlinked', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
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
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

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
	await page.goto('/settings');
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
	await page.getByRole('button', { name: 'Edit exercise' }).click();
	await expect(page.getByTestId('Dumbbell bicep curls-levels')).toBeVisible();
	await expect(page.getByTestId('Dumbbell bicep curls-unit-toggle')).toHaveCount(0);
	await expect(page.getByLabel('Set 1 level')).toBeVisible();

	for (const set of [1, 2, 3]) {
		await page.locator(`[id="Dumbbell\\ bicep\\ curls-set-${set}-reps"]`).fill('20');
	}
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('7');
	for (const set of [1, 2, 3]) await page.getByTestId(`Dumbbell bicep curls-set-${set}-action`).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');

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

test('save a blank workout as a routine library', async ({ page, userData }) => {
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
	await page.waitForURL(/\/exercise-splits\/\w+$/);
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('Hotel full body');

	const library = await prisma.exerciseSplit.findFirstOrThrow({
		where: { userId: userData.userId },
		include: { exerciseSplitDays: { include: { exercises: { orderBy: { exerciseIndex: 'asc' } } } } }
	});
	expect(library.exerciseSplitDays).toHaveLength(1);
	expect(library.exerciseSplitDays[0].name).toEqual('Hotel full body');
	expect(library.exerciseSplitDays[0].exercises.map((ex) => [ex.name, ex.sets])).toEqual([
		['Barbell rows', 2],
		['Face pulls', 3]
	]);
	expect(library.exerciseSplitDays[0].exercises.every((ex) => ex.exerciseId !== null)).toBe(true);

	// Also on any workout's page
	const workout = await prisma.workout.findFirstOrThrow({ where: { userId: userData.userId } });
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await expect(page.getByRole('menuitem', { name: 'Save as routine' })).toBeVisible();
});
