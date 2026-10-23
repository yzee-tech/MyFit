import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import {
	createExercises,
	createMesocycle,
	createTemplateExerciseSplit,
	editRoutine,
	editWorkoutExercise,
	expectBox,
	expectBoxNot,
	pickRoutine,
	quickAdd,
	saveRoutine,
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

	await quickAdd(page, ['Barbell bench press']);
	await editWorkoutExercise(page, 'Barbell bench press');
	// Never done before: it starts as Independent
	await expect(page.locator('button').filter({ hasText: 'Independent' })).toBeVisible();
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Update' }).click();

	await page.locator('[id="Barbell\\ bench\\ press-set-1-reps"]').fill('9');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-load"]').fill('100');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-RIR"]').fill('2');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-reps"]').fill('8');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-load"]').fill('95');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Barbell bench press-set-1-action').click();
	await page.getByTestId('Barbell bench press-set-2-action').click();

	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status')).toContainText('Workout created successfully');
	await page.getByRole('link', { name: `${getTodaysDateString()}` }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		/Mesocycle No mesocycle (Morning|Noon|Afternoon|Evening) workout User bodyweight 100 kg/
	);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Barbell bench press 2 Independent sets of 8 to 15 reps Chest Feet flat, back arched, grip just outside shoulders. Lower bar to mid-chest, press up explosively. Load (kg) Reps RIR 1 100 9 2 2 95 8 1'
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

	await quickAdd(page, ['Barbell bench press']);
	await editWorkoutExercise(page, 'Barbell bench press');
	await page.locator('button').filter({ hasText: 'Independent' }).click();
	await page.getByRole('option', { name: 'Down', exact: true }).click();
	await page.locator('button').filter({ hasText: 'Pick one' }).click();
	await page.getByRole('option', { name: 'Absolute load' }).click();
	await page.locator('#exercise-set-decrement').fill('5');
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Update' }).click();

	await page.locator('[id="Barbell\\ bench\\ press-set-1-reps"]').fill('9');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-load"]').fill('50');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-RIR"]').fill('1');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-reps"]').fill('8');
	await page.getByPlaceholder('45').fill('45');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Barbell bench press-set-1-action').click();
	await page.getByTestId('Barbell bench press-set-2-action').click();

	await quickAdd(page, ['Dumbbell bicep curls']);
	await editWorkoutExercise(page, 'Dumbbell bicep curls');
	await page.getByLabel('Sets').fill('2');
	await page.locator('button').filter({ hasText: 'Independent' }).click();
	await page.getByRole('option', { name: 'Myorep match' }).first().click();
	await page.getByRole('button', { name: 'Update' }).click();

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

	await quickAdd(page, ['Leaning dumbbell lateral raises']);
	await editWorkoutExercise(page, 'Leaning dumbbell lateral raises');
	await page.getByLabel('Sets').fill('2');
	await page.locator('button').filter({ hasText: 'Independent' }).click();
	await page.getByRole('option', { name: 'Drop' }).click();
	await page.locator('button').filter({ hasText: 'Pick one' }).click();
	await page.getByRole('option', { name: 'Absolute load' }).click();
	await page.locator('#exercise-set-decrement').fill('5');
	await page.getByRole('button', { name: 'Update' }).click();

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

	await quickAdd(page, ['Incline dumbbell press']);
	await editWorkoutExercise(page, 'Incline dumbbell press');
	await expect(page.locator('button').filter({ hasText: 'Independent' })).toBeVisible();
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Update' }).click();

	await page.locator('[id="Incline\\ dumbbell\\ press-set-1-reps"]').fill('14');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-1-load"]').fill('20');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-1-RIR"]').fill('2');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-2-reps"]').fill('12');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-2-load"]').fill('15');
	await page.locator('[id="Incline\\ dumbbell\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Incline dumbbell press-set-1-action').click();
	await page.getByTestId('Incline dumbbell press-set-2-action').click();

	await quickAdd(page, ['Leg press']);
	await editWorkoutExercise(page, 'Leg press');
	await page.locator('button').filter({ hasText: 'Independent' }).click();
	await page.getByRole('option', { name: 'Myorep', exact: true }).click();
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Update' }).click();

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
	await expect(page.getByRole('tabpanel')).toContainText(
		/Mesocycle No mesocycle (Morning|Noon|Afternoon|Evening) workout User bodyweight 100 kg/
	);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('main')).toContainText(
		'Barbell bench press 2 Down sets of 8 to 15 reps Chest Feet flat, back arched, grip just outside shoulders. Lower bar to mid-chest, press up explosively. Load (kg) Reps RIR 1 50 9 1 2 45 8 1 Dumbbell bicep curls 2 Myorep match sets of 8 to 15 reps Biceps Hold dumbbells at sides, curl up, squeeze biceps, lower slow. Load (kg) Reps RIR 1 10 12 2 2 10 10 0 1 10 2 0Leaning dumbbell lateral raises 2 Drop sets of 8 to 15 reps Side delts Lean slightly, raise dumbbells to shoulder height. Control descent. Load (kg) Reps RIR 1 10 18 2 1 5 12 22 10 16 2 1 5 10 2Incline dumbbell press 2 Independent sets of 8 to 15 reps Chest Bench at 30-45 degrees, elbows tucked. Press dumbbells up, control descent. Load (kg) Reps RIR 1 20 14 2 2 15 12 1 Leg press 2 Myorep sets of 8 to 15 reps BW Quads Feet high for quad focus, push up, control return. Load (kg) Reps RIR 1 180 18 2 2 180 12 0'
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
	// No visible title on the workout's screens, only one for screen readers
	await expect(page.getByRole('heading', { level: 2 })).toHaveCSS('position', 'absolute');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	// The page title is for screen readers only; the workout's clock sits beside "Exercises"
	const title = page.getByRole('heading', { level: 2 });
	await expect(title).toHaveText('Log workout');
	await expect(title).toHaveCSS('position', 'absolute');
	await expect(page.getByRole('heading', { level: 3, name: 'Exercises', exact: true })).toBeVisible();
	await expect(page.getByTestId('workout-clock')).toHaveText(/^\d+:\d\d$/);
	for (const text of [
		'Pull A Week 1',
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
		'Pull-ups 3 Straight sets of 5 to 15 reps BW Lats Load (kg) Reps RIR 1 0 12 3 2 0 11 3 3 0 10 0'
	);
	await expect(page.getByRole('tabpanel')).toContainText(
		'Barbell rows 3 Straight sets of 10 to 15 reps Traps Load (kg) Reps RIR 1 40 15 3 2 40 14 3 3 40 15 0'
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

	await quickAdd(page, ['Barbell bench press']);
	await editWorkoutExercise(page, 'Barbell bench press');
	await page.getByLabel('Sets').fill('2');
	await page.getByRole('button', { name: 'Update' }).click();

	await page.locator('[id="Barbell\\ bench\\ press-set-1-reps"]').fill('9');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-load"]').fill('100');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-RIR"]').fill('2');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-reps"]').fill('8');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-load"]').fill('95');
	await page.locator('[id="Barbell\\ bench\\ press-set-2-RIR"]').fill('1');
	await page.getByTestId('Barbell bench press-set-1-action').click();
	await page.getByTestId('Barbell bench press-set-2-action').click();

	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status')).toContainText('Workout created successfully');
	await page.getByRole('link', { name: `${getTodaysDateString()}` }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		/Mesocycle No mesocycle (Morning|Noon|Afternoon|Evening) workout User bodyweight 100 kg/
	);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(
		'Barbell bench press 2 Independent sets of 8 to 15 reps Chest Feet flat, back arched, grip just outside shoulders. Lower bar to mid-chest, press up explosively. Load (kg) Reps RIR 1 100 9 2 2 95 8 1'
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
	await saveWorkout(page);

	// Legs B also has calf raises: its suggestion starts from the Legs A session
	await page.getByLabel('create-workout').click();
	await expect(page.getByRole('main')).toContainText('Legs A Done today');
	await pickRoutine(page, 'Legs B');
	await page.getByRole('button', { name: 'Next' }).click();
	await expectBox(page.locator('[id="Calf\\ raises-set-1-load"]'), '50');
	// Straight sets share set 1's weight; each set gets a rep target
	await expectBoxNot(page.locator('[id="Calf\\ raises-set-3-reps"]'), '');
	// Exercises never done before have no suggestion
	await expectBox(page.locator('#Lunges-set-1-load'), '');
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
	await saveWorkout(page);

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
	await saveWorkout(page);

	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	// Straight to its exercises; bodyweight, date and times are at the top
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	// Titled as an edit, with no running clock
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('Edit workout');
	await expect(page.getByRole('heading', { level: 2 })).not.toHaveCSS('position', 'absolute');
	await expect(page.getByTestId('workout-clock')).toHaveCount(0);
	await page.getByLabel('Edit date, time and bodyweight').click();
	await page.getByLabel('Bodyweight (kg)').fill('95');
	await page.getByLabel('Bodyweight (kg)').blur();
	await page.getByRole('button', { name: 'Done' }).click();
	await expect(page.getByTestId('edit-workout-details')).toContainText('Bodyweight 95 kg');
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
		'Pull-ups 3 Straight sets of 5 to 15 reps BW Lats Load (kg) Reps RIR 1 0 7 3 2 0 6 3 3 0 5 0'
	);
});

test('a workout’s changes (exercises deleted, sets and a note edited) leave the block’s routine and My routines as they were', async ({
	page
}) => {
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
	await page.getByRole('dialog').getByRole('button', { name: 'Update', exact: true }).click();
	await expect(page.getByRole('main')).toContainText('Custom note');

	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByTestId('Pull-ups-set-2-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);

	await page.getByRole('link', { name: 'Mesocycles' }).click();
	await page.getByRole('link', { name: 'MyMeso Active' }).first().click();
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByRole('main')).toContainText('Pull-ups 3 Straight sets of 5 to 15 reps');
	await expect(page.getByRole('main')).toContainText('Barbell rows');
	await expect(page.getByRole('main')).not.toContainText('Custom note');
	// My routines as it was too
	await page.goto('/exercise-splits');
	await page.getByRole('button', { name: 'Show the exercises of Pull A' }).click();
	await expect(page.getByTestId('routine-card-exercises')).toContainText('Pull-ups 3 Straight sets of 5 to 15 reps');
	await expect(page.getByTestId('routine-card-exercises')).toContainText('Barbell rows');
	await expect(page.getByTestId('routine-card-exercises')).not.toContainText('Custom note');
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
	await saveWorkout(page);
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
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), '40');
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-reps"]'), '12');
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-RIR"]'), '4');

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
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), '40');
	await expect(page.locator('[id="Barbell\\ rows-set-2-reps"]')).toBeVisible();
	await expect(page.locator('[id="Barbell\\ rows-set-3-reps"]')).toHaveCount(0);
});

test('ask-each-time routine: pick lb at the gym; next time in kg converts to real kg weights', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	// "Ask each time" in My routines, which the mesocycle uses
	await prisma.exerciseSplitDay.updateMany({
		where: { name: 'Pull A', exerciseSplit: { userId: userData.userId } },
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
	await saveWorkout(page);

	// History shows what was lifted
	await page.getByRole('link', { name: new RegExp(`^${getTodaysDateString()}.* Pull A`) }).click();
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText('Load (lb) Reps RIR 1 90 12');

	// Next trip the gym uses kg: 90 lb (40.8 kg) becomes 40 kg
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByLabel('Kilograms').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('KG');
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), '40');

	// Copying last time's sets from history (stored in kg) shows them in this exercise's unit: 90 lb = 40.82 kg
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await page.getByRole('button', { name: 'Copy these sets' }).first().click();
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), '40.82');
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-reps"]'), '12');

	// Switch this exercise back to lb: the planned sets snap to 90 lb
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('LB');
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), '90');
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
	await saveWorkout(page);

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

	// Link it to the curls in My routines (a workout never changes its routine)
	await editRoutine(page, 'Pull A');
	await page.getByLabel('Dumbbell bicep curls options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Weights available').click();
	await page.getByRole('option', { name: 'Building DBs (kg)' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Update', exact: true }).click();
	await saveRoutine(page);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Barbell rows', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-reps"]').fill('20');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-2-reps"]').fill('20');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-3-reps"]').fill('19');
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('10');
	await page.getByTestId('Dumbbell bicep curls-set-1-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-2-action').click();
	await page.getByTestId('Dumbbell bicep curls-set-3-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);

	const weightSet = await prisma.weightSet.findFirstOrThrow({ where: { userId: userData.userId } });
	expect(weightSet.weights).toEqual([5, 6, 7, 8, 9, 10, 14, 20]);
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
	await expectBox(page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]'), '10');
	await expect(page.getByTestId('Dumbbell bicep curls-next-weight')).toContainText('Next weight: 14 kg. About');
	await expect(page.getByTestId('Dumbbell bicep curls-next-weight')).toContainText('more reps at 10 kg first.');

	// Deleting the weight set puts the exercise back on standard steps
	await page.goto('/exercise-splits/weight-sets');
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete Building DBs' }).click();
	await expect(page.getByTestId('weight-set-Building DBs')).toHaveCount(0);
	// In My routines, which the mesocycle uses
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
	await saveWorkout(page);

	// The routine is used at many gyms, so it doesn't keep this gym's weights
	const rows = await prisma.exerciseTemplate.findFirstOrThrow({
		where: { name: 'Barbell rows', exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } }
	});
	expect(rows.weightSetId).toBeNull();

	// Back at the hotel: 90 lb isn't there, so the suggestion is one of its weights
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByLabel('Pounds').click();
	await page.getByLabel('Weights here').click();
	await page.getByRole('option', { name: 'Hotel DBs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), /^(80|95)$/);
});

test('levels: a machine that shows levels logs a level, then goes up a level at the top of the rep range', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);

	// Curls are on a machine that shows levels 1–10: set on the exercise
	await page.goto('/exercises');
	await page.getByRole('link', { name: /^Dumbbell bicep curls/ }).click();
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByLabel('Machine with levels').click();
	await page.getByLabel('From level').fill('1');
	await page.getByLabel('To level').fill('10');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise saved everywhere' })).toBeVisible();
	await expect(page.getByRole('main')).toContainText('Levels 1–10');

	// Curls (10–20 reps): all three sets at the top, on level 7
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Barbell rows', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await expect(page.getByTestId('Dumbbell bicep curls-levels')).toHaveText('LVL');
	await expect(page.getByTestId('Dumbbell bicep curls-load-header')).toHaveText('LVL');
	await expect(page.getByTestId('Dumbbell bicep curls-unit-toggle')).toHaveCount(0);
	await expect(page.getByLabel('Set 1 level')).toBeVisible();

	// Its editor shows the machine's levels instead of weight sets
	await page.getByTestId('Dumbbell bicep curls-menu-button').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await expect(page.getByTestId('exercise-machine-levels')).toHaveText('Levels 1–10 by 1 (set on the exercise)');
	await expect(page.getByLabel('Weights available')).toHaveCount(0);
	await page.keyboard.press('Escape');

	for (const set of [1, 2, 3]) {
		await page.locator(`[id="Dumbbell\\ bicep\\ curls-set-${set}-reps"]`).fill('20');
	}
	await page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]').fill('7');
	for (const set of [1, 2, 3]) await page.getByTestId(`Dumbbell bicep curls-set-${set}-action`).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);

	// Logged as level 7, not a weight; the routine keeps no unit or weight set of its own
	const logged = await prisma.workoutExercise.findFirstOrThrow({
		where: { name: 'Dumbbell bicep curls', workout: { userId: userData.userId } },
		include: { sets: true }
	});
	expect(logged.weightUnit).toEqual('LEVEL');
	expect(logged.sets.map((set) => set.load)).toEqual([7, 7, 7]);
	const routineCurls = await prisma.exerciseTemplate.findFirstOrThrow({
		where: {
			name: 'Dumbbell bicep curls',
			exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } }
		}
	});
	expect(routineCurls.weightUnit).toBeNull();
	expect(routineCurls.weightSetId).toBeNull();

	// Next time: level 8, back at the bottom of the range
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expectBox(page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-load"]'), '8');
	await expectBox(page.locator('[id="Dumbbell\\ bicep\\ curls-set-1-reps"]'), '10');

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
		await quickAdd(page, [name]);
		await editWorkoutExercise(page, name);
		await page.getByLabel('Sets').fill(String(sets));
		await page.getByRole('button', { name: 'Update' }).click();
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
/** Removing a set takes two taps on its bin: the first only gets it ready */
async function removeSet(page: Page, exercise: string, set: number) {
	const bin = page.getByTestId(`${exercise}-set-${set}-remove`);
	await bin.click();
	await expect(bin).toHaveAttribute('data-armed', 'true');
	await bin.click();
}

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
	// Rest shows once a set is ticked, and keeps counting from that tick when it's unticked
	await expect(page.getByTestId('workout-clock')).toBeVisible();
	await expect(page.getByTestId('workout-rest')).toHaveCount(0);
	await fillSet(page, 'Pull-ups', 1, { reps: '12', load: '0' });
	await setBox(page, 'Pull-ups', 1).click();
	await expect(page.getByTestId('workout-rest')).toHaveText(/^\d+:\d\d$/);
	await setBox(page, 'Pull-ups', 1).click();
	await expect(setBox(page, 'Pull-ups', 1)).toHaveAttribute('aria-checked', 'false');
	await expect(page.getByTestId('workout-rest')).toBeVisible();
	// Opened straight from a link or a reload: the clock is there too
	await page.reload();
	await expect(page.getByTestId('workout-clock')).toHaveText(/^\d+:\d\d$/);
	await expect(page.getByTestId('workout-rest')).toBeVisible();

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
	await expect(page.getByRole('heading', { level: 2 })).toHaveCSS('position', 'absolute');
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
	await expectBox(page.locator('[id="Barbell\\ rows-set-2-load"]'), '40');
	await expectBox(page.locator('[id="Barbell\\ rows-set-3-load"]'), '35');
	await fillSet(page, 'Barbell rows', 2, { reps: '11' });
	await setBox(page, 'Barbell rows', 2).click();

	// Untick set 2 while 1 and 3 stay done, change it, tick it again
	await setBox(page, 'Barbell rows', 2).click();
	await expect(setBox(page, 'Barbell rows', 2)).toHaveAttribute('aria-checked', 'false');
	await expect(setBox(page, 'Barbell rows', 1)).toHaveAttribute('aria-checked', 'true');
	await expect(setBox(page, 'Barbell rows', 3)).toHaveAttribute('aria-checked', 'true');
	await fillSet(page, 'Barbell rows', 2, { reps: '10' });
	await setBox(page, 'Barbell rows', 2).click();

	// The rest isn't done: removed (the routine is never changed, so nothing to ask)
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('9 sets not done');
	await page.getByRole('button', { name: 'Remove and finish' }).click();
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
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), '40');
	await expectBox(page.locator('[id="Barbell\\ rows-set-3-load"]'), '35');
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
	await removeSet(page, 'Barbell rows', 1);
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 2: enter load');
	await expectBox(page.locator('[id="Barbell\\ rows-set-2-reps"]'), '10');
	await expect(page.locator('[id="Barbell\\ rows-set-2-load"]')).toHaveAttribute('aria-invalid', 'true');
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).not.toHaveAttribute('aria-invalid', 'true');

	// Removing the flagged set takes its note away
	await removeSet(page, 'Barbell rows', 2);
	await expect(page.getByTestId('Barbell rows-missing')).toHaveCount(0);
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).not.toHaveAttribute('aria-invalid', 'true');
});

test('add and remove sets in a workout: saved as done, and My routines keeps its own sets', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	const routineBefore = await prisma.exerciseTemplate.findMany({
		where: { exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } },
		orderBy: { exerciseIndex: 'asc' }
	});
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
	await expectBox(page.locator('[id="Barbell\\ rows-set-4-reps"]'), '9');
	await removeSet(page, 'Face pulls', 2);
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

	// Saved at once, with no question about the routine
	await saveWorkout(page);
	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId: userData.userId },
		include: { workoutExercises: { include: { sets: true }, orderBy: { exerciseIndex: 'asc' } } }
	});
	expect(saved.workoutExercises.map((ex) => [ex.name, ex.sets.length])).toEqual([
		['Barbell rows', 4],
		['Face pulls', 2]
	]);
	const library = await prisma.exerciseTemplate.findMany({
		where: { exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } },
		orderBy: { exerciseIndex: 'asc' }
	});
	expect(library.map(({ name, sets }) => ({ name, sets }))).toEqual(
		routineBefore.map(({ name, sets }) => ({ name, sets }))
	);
});

test('an exercise deleted in a workout stays in My routines, and the mesocycle’s next workout has it', async ({
	page,
	userData
}) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByTestId('Pull-ups-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await fillSet(page, 'Barbell rows', 1, { reps: '10', load: '40' });
	await setBox(page, 'Barbell rows', 1).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Remove and finish' }).click();
	await saveWorkout(page);
	expect(
		await prisma.exerciseTemplate.count({
			where: { name: 'Pull-ups', exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } }
		})
	).toEqual(1);
	// The mesocycle's next Pull A has them
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('Pull-ups-menu-button')).toBeVisible();
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
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-reps"]'), '11');

	// Elsewhere in the app; tapping it goes back to the workout
	for (const path of ['/workouts', '/dashboard', '/exercises']) {
		await page.goto(path);
		await expect(panel).toContainText('Workout');
	}
	await page.getByTestId('workout-panel-detail').click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-reps"]'), '11');

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
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), /^\d/);

	await fillSet(page, 'Barbell rows', 1, { reps: '10', load: '40' });
	await setBox(page, 'Barbell rows', 1).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Remove and finish' }).click();
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
	// Finishing: back to the workout, then the sets not done are removed (after asking), then it's saved
	await page.getByRole('button', { name: 'Back to the workout' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('11 sets not done');
	await page.getByRole('button', { name: 'Remove and finish' }).click();
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
	// A gap between them, so a tap meant for the tick doesn't land on the bin
	expect(removeBox.x - (tickBox.x + tickBox.width)).toBeGreaterThanOrEqual(8);

	// Removed with a note about a missing number; Undo puts it back, numbers and note too
	await fillSet(page, 'Barbell rows', 3, { reps: '10', RIR: '1' });
	await setBox(page, 'Barbell rows', 3).click();
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 3: enter load');
	await removeSet(page, 'Barbell rows', 3);
	await expect(page.getByTestId('Barbell rows-missing')).toHaveCount(0);
	await expect(page.locator('[id="Barbell\\ rows-set-3-reps"]')).toHaveCount(0);
	await page.getByRole('status').filter({ hasText: 'Set 3 removed' }).getByRole('button', { name: 'Undo' }).click();
	await expectBox(page.locator('[id="Barbell\\ rows-set-3-reps"]'), '10');
	await expect(page.getByTestId('Barbell rows-missing')).toHaveText('Set 3: enter load');

	// A ticked set is done: no remove button until it's unticked
	await fillSet(page, 'Barbell rows', 1, { reps: '12', load: '40', RIR: '2' });
	await setBox(page, 'Barbell rows', 1).click();
	await expect(remove('Barbell rows', 1)).toBeHidden();
	await setBox(page, 'Barbell rows', 1).click();
	await expect(remove('Barbell rows', 1)).toBeVisible();

	// The last set can't be removed: its bin is off, and even taps that reach it (sent straight to the
	// button) neither get it ready nor remove it
	await removeSet(page, 'Face pulls', 3);
	await removeSet(page, 'Face pulls', 2);
	await expect(remove('Face pulls', 1)).toBeDisabled();
	await remove('Face pulls', 1).dispatchEvent('click');
	await expect(remove('Face pulls', 1)).toHaveAttribute('data-armed', 'false');
	await remove('Face pulls', 1).dispatchEvent('click');
	await expect(page.locator('[id="Face\\ pulls-set-1-reps"]')).toBeVisible();
	await expectSetsFitPhone(page);
});

test('removing a set: one tap only gets the bin ready (red); any other tap, a tick or 3 seconds put it back', async ({
	page
}) => {
	await page.clock.install();
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	const bin = (set: number) => page.getByTestId(`Barbell rows-set-${set}-remove`);
	const reps = (set: number) => page.locator(`[id="Barbell\\ rows-set-${set}-reps"]`);
	await expect(reps(3)).toBeVisible();

	// One tap: still there, the bin red and saying what the next tap does
	await bin(3).click();
	await expect(reps(3)).toBeVisible();
	await expect(bin(3)).toHaveAttribute('data-armed', 'true');
	await expect(bin(3)).toHaveAccessibleName('Tap again to remove set 3 of Barbell rows');
	await expect(bin(3)).toHaveClass(/bg-destructive/);

	// 3 seconds on, it's back to normal: the next tap only gets it ready again
	await page.clock.fastForward(3100);
	await expect(bin(3)).toHaveAttribute('data-armed', 'false');
	await expect(bin(3)).toHaveAccessibleName('Remove set 3 of Barbell rows');
	await bin(3).click();
	await expect(reps(3)).toBeVisible();

	// A tap anywhere else puts it back, typing too
	await page.getByRole('heading', { name: 'Exercises', level: 3 }).click();
	await expect(bin(3)).toHaveAttribute('data-armed', 'false');
	await bin(3).click();
	await reps(1).press('5');
	await expect(bin(3)).toHaveAttribute('data-armed', 'false');

	// Adding a set puts it back too
	await bin(3).click();
	await page.getByTestId('Barbell rows-add-set').click();
	await expect(bin(3)).toHaveAttribute('data-armed', 'false');
	await removeSet(page, 'Barbell rows', 4);
	await expect(reps(4)).toHaveCount(0);

	// Another set's bin gets that one ready instead
	await bin(3).click();
	await bin(2).click();
	await expect(bin(3)).toHaveAttribute('data-armed', 'false');
	await expect(bin(2)).toHaveAttribute('data-armed', 'true');
	await expect(reps(3)).toBeVisible();

	// Ticking the set puts it back, and a ticked set can't be removed: untick it and its bin starts over
	await page.getByRole('heading', { name: 'Exercises', level: 3 }).click();
	await fillSet(page, 'Barbell rows', 2, { reps: '10', load: '40', RIR: '2' });
	await bin(2).click();
	await expect(bin(2)).toHaveAttribute('data-armed', 'true');
	await setBox(page, 'Barbell rows', 2).click();
	await expect(bin(2)).toBeHidden();
	await setBox(page, 'Barbell rows', 2).click();
	await expect(bin(2)).toHaveAttribute('data-armed', 'false');
	await bin(2).click();
	await expectBox(reps(2), '10');

	// Two taps remove it, with Undo
	await bin(2).click();
	await expect(page.getByRole('status').filter({ hasText: 'Set 2 removed' })).toBeVisible();
	await expect(reps(3)).toHaveCount(0);
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
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing&details/);
	await expect(page.getByLabel('Length (min)')).toHaveValue('240');
});

/** A saved workout yesterday: Barbell rows, 3 × 10 at 60 kg, bodyweight 80 kg */
async function createPastWorkout(userId: string, { weightUnit = 'KG' as 'KG' | 'LB', load = 60 } = {}) {
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
						weightUnit,
						sets: {
							create: [0, 1, 2].map((setIndex) => ({ setIndex, reps: 10, load, RIR: 2, skipped: false }))
						}
					}
				]
			}
		}
	});
}

/** Opens a past workout's edit: its exercises */
async function editPastWorkout(page: Page, workoutId: string) {
	await page.goto(`/workouts/${workoutId}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-reps"]'), '10');
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

test('editing a past workout: its date, start time and length on its exercises; a future date warns', async ({
	page,
	userData
}) => {
	const workout = await createPastWorkout(userData.userId);
	await editPastWorkout(page, workout.id);
	// A summary, opened to edit; one field per row
	await expect(page.getByTestId('edit-workout-summary')).toContainText('1 h');
	await page.getByLabel('Edit date, time and bodyweight').click();
	await expect(page.getByLabel('Length (min)')).toHaveValue('60');

	await page.getByLabel('Start time').fill('09:30');
	await page.getByLabel('Length (min)').fill('75');
	await page.getByLabel('Length (min)').blur();
	await expect(page.getByTestId('workout-ended-at')).toContainText('Ended');
	await expect(page.getByTestId('workout-ended-at')).toContainText('10:45');
	await expect(page.getByTestId('workout-in-future')).toHaveCount(0);

	// A date in the future only warns
	const nextYear = new Date(Date.now() + 365 * 86400000);
	const iso = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	await page.getByLabel('Date', { exact: true }).fill(iso(nextYear));
	await page.getByLabel('Date', { exact: true }).blur();
	await expect(page.getByTestId('workout-in-future')).toBeVisible();
	await page.getByLabel('Date', { exact: true }).fill(iso(workout.startedAt));
	await page.getByLabel('Date', { exact: true }).blur();
	await expect(page.getByTestId('workout-in-future')).toHaveCount(0);
	await page.getByRole('button', { name: 'Done' }).click();
	await expect(page.getByTestId('edit-workout-summary')).toContainText('1 h 15 min');

	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);
	const saved = await prisma.workout.findUniqueOrThrow({ where: { id: workout.id } });
	expect(saved.endedAt.getTime() - saved.startedAt.getTime()).toEqual(75 * 60000);
	await page.goto(`/workouts/${workout.id}`);
	await expect(page.getByTestId('workout-length')).toHaveText('1 h 15 min');
});

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

		// Back out of it: no question, the edit just ends
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
	await expect(page.getByTestId('workout-panel')).toHaveCount(0);

	// Keep editing: still here, the change kept and still counted
	await page.getByRole('link', { name: 'Exercises' }).first().click();
	await expect(page.getByRole('dialog')).toContainText('Save your changes?');
	await page.getByRole('button', { name: 'Keep editing' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).toHaveURL(/\/workouts\/manage\/exercises/);
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-reps"]'), '9');

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

test('editing a past workout done in lb: shown in lb, and saved unchanged its loads stay the same', async ({
	page,
	userData
}) => {
	// 135 lb, stored in kg
	const kg = 135 * 0.45359237;
	const workout = await createPastWorkout(userData.userId, { weightUnit: 'LB', load: kg });
	await editPastWorkout(page, workout.id);
	await expect(page.getByTestId('Barbell rows-load-header')).toHaveText('LB');
	for (const set of [1, 2, 3]) {
		await expectBox(page.locator(`[id="Barbell\\ rows-set-${set}-load"]`), '135');
	}

	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);
	const sets = await prisma.workoutExerciseSet.findMany({ where: { workoutExercise: { workoutId: workout.id } } });
	expect(sets).toHaveLength(3);
	for (const set of sets) expect(set.load).toBeCloseTo(kg, 6);
});

test('editing a past workout: a reload keeps the edit, and it still saves', async ({ page, userData }) => {
	const workout = await createPastWorkout(userData.userId);
	await editPastWorkout(page, workout.id);
	await changeFirstSet(page, '9');
	// Restored from the phone: its times come back as text
	await page.reload();
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-reps"]'), '9');

	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);
	expect(await savedFirstSetReps(workout.id)).toBe(9);
	const saved = await prisma.workout.findUniqueOrThrow({ where: { id: workout.id } });
	expect(saved.endedAt.getTime()).toEqual(workout.endedAt.getTime());
});

test('Workouts list: two lines, a blank workout named by its time, the volume in full; no skipped or rest day filter', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	const day = (back: number, hours: number) => {
		const date = new Date();
		date.setDate(date.getDate() - back);
		date.setHours(hours, 0, 0, 0);
		return date;
	};
	const exercise = (exerciseIndex: number, name: string, weightUnit: 'KG' | 'LEVEL', sets: [number, number][]) => ({
		exerciseIndex,
		name,
		targetMuscleGroup: 'Traps' as const,
		setType: 'Straight' as const,
		repRangeStart: 8,
		repRangeEnd: 12,
		weightUnit,
		sets: { create: sets.map(([load, reps], setIndex) => ({ setIndex, load, reps, RIR: 2, skipped: false })) }
	});
	const seed = (startedAt: Date, routineName: string | null, exercises: ReturnType<typeof exercise>[]) =>
		prisma.workout.create({
			data: {
				userId,
				userBodyweight: 80,
				startedAt,
				endedAt: new Date(startedAt.getTime() + 45 * 60000),
				routineName,
				workoutExercises: { create: exercises }
			}
		});
	// 7 am, blank: 3 × 10 at 40 kg and 2 × 12 at 50 kg = 2,400 kg; a machine's levels don't count
	await seed(day(1, 7), null, [
		exercise(0, 'Barbell rows', 'KG', [
			[40, 10],
			[40, 10],
			[40, 10]
		]),
		exercise(1, 'Face pulls', 'KG', [
			[50, 12],
			[50, 12]
		]),
		exercise(2, 'Leg press', 'LEVEL', [[8, 15]])
	]);
	await seed(day(2, 18), 'Pull A', [exercise(0, 'Barbell rows', 'KG', [[100, 36]])]);

	await page.goto('/workouts');
	await expect(page.getByTestId('workout-name')).toHaveText(['Morning workout', 'Pull A']);
	await expect(page.getByTestId('workout-volume')).toHaveText(['Volume 2,400 kg', 'Volume 3,600 kg']);
	await expect(page.getByTestId('workout-length')).toHaveText(['45 min', '45 min']);

	// In pounds at home: the same work, in lb
	await prisma.userSettings.upsert({
		where: { userId },
		create: { userId, homeWeightUnit: 'LB' },
		update: { homeWeightUnit: 'LB' }
	});
	try {
		await page.reload();
		await expect(page.getByTestId('workout-volume').first()).toHaveText('Volume 5,291 lb');
	} finally {
		await prisma.userSettings.update({ where: { userId }, data: { homeWeightUnit: 'KG' } });
	}

	// Skipped and rest days are gone from the filter; a link from before still opens the list
	await page.getByLabel('search').click();
	await expect(page.getByText('Workout types')).toHaveCount(0);
	await expect(page.getByLabel('Skipped')).toHaveCount(0);
	await page.goto(`/workouts?selectedWorkoutStatuses=${encodeURIComponent(JSON.stringify([null, 'Skipped']))}`);
	await expect(page.getByTestId('workout-name')).toHaveText(['Morning workout', 'Pull A']);
});

/** A week-long block of `name` started on `startDate`, with one workout done from `routineName` in it */
async function blockWithWorkout(userId: string, name: string, startDate: Date, routineName: string) {
	const mesocycle = await prisma.mesocycle.create({
		data: {
			userId,
			name,
			weeklyRIR: [3, 2, 1, 0],
			startDate,
			endDate: new Date(startDate.getTime() + 7 * 86400000),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	const startedAt = new Date(startDate.getTime() + 86400000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 3600000),
			routineName,
			workoutOfMesocycle: { create: { mesocycleId: mesocycle.id } }
		}
	});
	return mesocycle;
}

test('Workouts list filter: blocks with the same name, even restarted in the same month, are told apart by start date; only the one picked shows', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	// Started, ended after a week, started again the same month
	const earlier = await blockWithWorkout(userId, 'Hypertrophy', new Date(2026, 2, 2, 9), 'Push earlier');
	const later = await blockWithWorkout(userId, 'Hypertrophy', new Date(2026, 2, 12, 9), 'Push later');
	await page.goto('/workouts');
	await expect(page.getByTestId('workout-name')).toHaveText(['Push later', 'Push earlier']);

	const started = (date: Date) =>
		date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	const earlierLabel = started(earlier.startDate!);
	await page.getByLabel('search').click();
	await page.getByRole('combobox').click();
	await expect(page.getByRole('option', { name: `Hypertrophy · ${started(later.startDate!)}` })).toBeVisible();
	expect(started(later.startDate!)).not.toEqual(earlierLabel);
	await page.getByRole('option', { name: `Hypertrophy · ${earlierLabel}` }).click();
	// Closes the list, not the filter (the list may open over the dates: its own button again)
	await page.getByRole('combobox').click();
	await expect(page.getByRole('listbox')).toHaveCount(0);
	await expect(page.getByText('Date range')).toBeVisible();
	await expect(page.getByRole('combobox')).toHaveText(`Hypertrophy · ${earlierLabel}`);
	await page.getByRole('button', { name: 'Apply' }).click();
	await expect(page).toHaveURL(new RegExp(`selectedMesocycleIds=.*${earlier.id}`));
	await expect(page.getByTestId('workout-name')).toHaveText(['Push earlier']);
	await prisma.mesocycle.deleteMany({ where: { userId } });
});

test('Workouts list filter: a link from before picks its blocks by name, shown picked in the filter', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	await blockWithWorkout(userId, 'Solo', new Date(2026, 5, 1, 9), 'Pull solo');
	await blockWithWorkout(userId, 'Strength', new Date(2026, 7, 1, 9), 'Pull strength');
	await page.goto(`/workouts?selectedMesocycles=${encodeURIComponent(JSON.stringify(['Solo']))}`);
	await expect(page.getByTestId('workout-name')).toHaveText(['Pull solo']);
	await page.getByLabel('search').click();
	await expect(page.getByRole('combobox')).toHaveText('Solo');
	await prisma.mesocycle.deleteMany({ where: { userId } });
});

test('a big Add exercise button under the exercises; set 1 typed is copied into later empty sets, which follow it until typed in', async ({
	page
}) => {
	await createSplitAndMesoForTest(page);
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/manage\/exercises/);
	await expect(page.getByTestId('workout-routine-name')).toHaveText(/^(Morning|Noon|Afternoon|Evening) workout$/);

	// Empty workout: the big button instead of "No exercises added"; it opens Quick add
	const big = page.getByTestId('add-exercise-big');
	await expect(big).toBeVisible();
	await expect(page.getByText('No exercises added')).toHaveCount(0);
	await big.click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'Add exercises' });
	await sheet.getByRole('checkbox', { name: 'Face pulls', exact: true }).click();
	await sheet.getByRole('button', { name: 'Add 1 exercise' }).click();
	await expect(page.getByTestId('Face pulls-sets')).toBeVisible();
	// 1 set to start; two more
	await page.getByTestId('Face pulls-add-set').click();
	await page.getByTestId('Face pulls-add-set').click();
	// Under the exercise now; not while reordering
	const cardBox = (await page.getByTestId('Face pulls-sets').boundingBox())!;
	expect((await big.boundingBox())!.y).toBeGreaterThan(cardBox.y + cardBox.height);
	await page.getByLabel('reorder-toggle').click();
	await expect(big).toHaveCount(0);
	await page.getByLabel('reorder-toggle').click();

	const box = (set: number, field: 'load' | 'reps' | 'RIR') => page.locator(`[id="Face\\ pulls-set-${set}-${field}"]`);
	// Never done before: nothing suggested. Set 1 typed → sets 2 and 3 get it, lighter
	await box(1, 'load').fill('15');
	await box(1, 'reps').fill('12');
	await box(1, 'RIR').fill('2');
	for (const set of [2, 3]) {
		await expectBox(box(set, 'load'), '15');
		await expectBox(box(set, 'reps'), '12');
		await expectBox(box(set, 'RIR'), '2');
		await expect(box(set, 'load')).toHaveAttribute('data-suggested', 'true');
	}
	// Set 1 changed: the copies follow
	await box(1, 'load').fill('17.5');
	await expectBox(box(2, 'load'), '17.5');
	await expectBox(box(3, 'load'), '17.5');
	// A box typed in is the person's: set 1 no longer reaches it
	await box(3, 'load').fill('20');
	await box(1, 'load').fill('15');
	await expectBox(box(2, 'load'), '15');
	await expectBox(box(3, 'load'), '20');
	await expect(box(3, 'load')).toHaveAttribute('data-suggested', 'false');
	// Emptied after set 1 changed: set 1's number now, not the old copy, and it follows set 1 again
	await box(1, 'load').fill('25');
	await expectBox(box(3, 'load'), '20');
	await box(3, 'load').fill('');
	await expectBox(box(3, 'load'), '25');
	await expect(box(3, 'load')).toHaveAttribute('data-suggested', 'true');
	await box(1, 'load').fill('30');
	await expectBox(box(2, 'load'), '30');
	await expectBox(box(3, 'load'), '30');
});

test('Quick add: several at once in the order ticked, 1 set each, from the last time or Independent 8–15', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, ['Barbell rows', 'Hammer curls', 'Face pulls']);
	const rows = await prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name: 'Barbell rows' } } });
	// Barbell rows last time: Straight sets of 6 to 10 at 60 kg
	const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: yesterday,
			endedAt: new Date(yesterday.getTime() + 45 * 60000),
			workoutExercises: {
				create: {
					exerciseIndex: 0,
					exerciseId: rows.id,
					name: 'Barbell rows',
					targetMuscleGroup: rows.targetMuscleGroup,
					setType: 'Straight',
					repRangeStart: 6,
					repRangeEnd: 10,
					weightUnit: 'KG',
					sets: {
						create: [0, 1].map((setIndex) => ({ setIndex, load: 60, reps: 8, RIR: 2, skipped: false }))
					}
				}
			}
		}
	});

	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/manage\/exercises/);

	// The small + opens it too; each says what it starts with
	await page.getByLabel('add-exercise').click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'Add exercises' });
	// It opens on the list, not in the search box: no keyboard pops up
	await expect(sheet.getByTestId('quick-add-list')).toBeFocused();
	await expect(sheet.getByPlaceholder('Search your exercises')).not.toBeFocused();
	await expect(sheet.getByTestId('Barbell rows-starts-with')).toHaveText('Last time: Straight · 6–10 reps');
	await expect(sheet.getByTestId('Hammer curls-starts-with')).toHaveText('New: Independent · 8–15 reps');
	await expect(sheet.getByRole('button', { name: 'Add exercises' })).toBeDisabled();
	await sheet.getByRole('checkbox', { name: 'Hammer curls' }).click();
	await sheet.getByRole('checkbox', { name: 'Barbell rows' }).click();
	await sheet.getByRole('checkbox', { name: 'Face pulls' }).click();
	await sheet.getByRole('checkbox', { name: 'Face pulls' }).click();
	await sheet.getByRole('button', { name: 'Add 2 exercises' }).click();
	await expect(sheet).toHaveCount(0);

	// In the order ticked, 1 set each; a blank workout's cards count sets only
	await expect(page.getByTestId(/-summary$/)).toHaveText(['1 set', '1 set']);
	expect(await page.getByTestId(/-summary$/).evaluateAll((spans) => spans.map((span) => span.dataset.testid))).toEqual([
		'Hammer curls-summary',
		'Barbell rows-summary'
	]);
	// Done before: last time's numbers, suggested; never done: empty
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), '60');
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveAttribute('data-suggested', 'true');
	await expectBox(page.locator('[id="Hammer\\ curls-set-1-load"]'), '');
	await page.getByTestId('Hammer curls-add-set').click();
	await expect(page.getByTestId('Hammer curls-summary')).toHaveText('2 sets');

	// Open again: those in the workout can't be ticked twice
	await page.getByTestId('add-exercise-big').click();
	await expect(sheet.getByRole('checkbox', { name: 'Barbell rows' })).toBeDisabled();
	await expect(sheet.getByTestId('Barbell rows-starts-with')).toHaveText('In this workout');
	await expect(sheet.getByRole('checkbox', { name: 'Face pulls' })).toBeEnabled();
	await page.keyboard.press('Escape');
	await expect(sheet).toHaveCount(0);

	// The rest is in ⋯ → Edit: the set type and reps it started with
	await editWorkoutExercise(page, 'Barbell rows');
	await expect(page.locator('button').filter({ hasText: 'Straight' })).toBeVisible();
	await expect(page.locator('#exercise-rep-range-start')).toHaveValue('6');
	await expect(page.locator('#exercise-rep-range-end')).toHaveValue('10');
	await expect(page.getByLabel('Sets')).toHaveValue('1');
});

test('Quick add in a routine workout: the card still shows the set type and reps', async ({ page, userData }) => {
	await createSplitAndMesoForTest(page);
	await createExercises(userData.userId, [{ name: 'Quick add curl', targetMuscleGroup: 'Biceps' }]);
	await page.getByLabel('create-workout').click();
	await pickRoutine(page, 'Push A');
	await page.getByPlaceholder('Type here').fill('80');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/manage\/exercises/);
	await quickAdd(page, ['Quick add curl']);
	await expect(page.getByTestId('Quick add curl-summary')).toHaveText(/^1\s+independent sets of\s+8 to 15 reps$/i);
});

test('a workout’s ⋮: Edit, Warm up, History, Delete; Finish removes sets not ticked (none skipped), saves at once and leaves the routine', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createSplitAndMesoForTest(page);
	const routineBefore = await prisma.exerciseSplitDay.findFirstOrThrow({
		where: { exerciseSplit: { userId }, name: 'Pull A' },
		include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
	});
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByTestId('Barbell rows-menu-button').click();
	await expect(page.getByRole('menuitem')).toHaveText(['Edit', 'Warm up', 'History', 'Delete']);
	await page.keyboard.press('Escape');

	// Nothing ticked yet: keep going, or discard (no empty save)
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('No sets done yet');
	await expect(page.getByRole('dialog').getByRole('button', { name: 'Discard workout' })).toBeVisible();
	await page.getByRole('button', { name: 'Keep going' }).click();

	// Rows: 2 of 3 ticked; the rest of the routine untouched (an exercise left with none goes)
	for (const set of [1, 2]) {
		await fillSet(page, 'Barbell rows', set, { reps: '10', load: '40' });
		await setBox(page, 'Barbell rows', set).click();
	}
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('sets not done');
	await expect(page.getByRole('dialog')).toContainText('Remove them and finish?');
	await page.getByRole('button', { name: 'Remove and finish' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);

	// Saved straight away, without asking to update the routine (and not asking the server to)
	const create = page.waitForRequest((request) => request.url().includes('workouts.create'));
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	expect((await create).postData()).not.toContain('updateRoutine');
	await page.waitForURL('/workouts');
	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId },
		orderBy: { startedAt: 'desc' },
		include: { workoutExercises: { include: { sets: { orderBy: { setIndex: 'asc' } } } } }
	});
	expect(saved.workoutExercises.map((exercise) => exercise.name)).toEqual(['Barbell rows']);
	expect(saved.workoutExercises[0].sets.map(({ setIndex, reps, skipped }) => ({ setIndex, reps, skipped }))).toEqual([
		{ setIndex: 0, reps: 10, skipped: false },
		{ setIndex: 1, reps: 10, skipped: false }
	]);
	const routineAfter = await prisma.exerciseSplitDay.findFirstOrThrow({
		where: { id: routineBefore.id },
		include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
	});
	expect(routineAfter.exercises.map(({ name, sets }) => ({ name, sets }))).toEqual(
		routineBefore.exercises.map(({ name, sets }) => ({ name, sets }))
	);

	// Next time, Compare: a set not done last time reads the same whether it was skipped or removed
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('compare-exercises').click();
	await expect(page.getByText('uncompleted last time').first()).toBeVisible();
	await expect(page.getByText('new set')).toHaveCount(0);
});

test('editing a past workout: ⋮ is Replace, History, Delete; Replace keeps the sets; levels and weights clear the loads', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, [
		{ name: 'Barbell rows', targetMuscleGroup: 'Lats' },
		{ name: 'Pendlay rows', targetMuscleGroup: 'Traps', note: 'Bar from the floor' }
	]);
	const machine = await prisma.exercise.create({
		data: { userId, name: 'Row machine', targetMuscleGroup: 'Lats', levelsFrom: 1, levelsTo: 12, levelStep: 1 }
	});
	const pendlay = await prisma.exercise.findFirstOrThrow({ where: { userId, name: 'Pendlay rows' } });
	const workout = await createPastWorkout(userId);
	// Logged with the rows' weights; the replacement doesn't take them (a past workout's gym isn't known)
	const gymPlates = await prisma.weightSet.create({
		data: { userId, name: 'Gym plates', unit: 'KG', weights: [40, 50, 60, 70] }
	});
	await prisma.workoutExercise.updateMany({ where: { workoutId: workout.id }, data: { weightSetId: gymPlates.id } });
	await editPastWorkout(page, workout.id);

	await page.getByTestId('Barbell rows-menu-button').click();
	await expect(page.getByRole('menuitem')).toHaveText(['Replace', 'History', 'Delete']);
	await page.getByRole('menuitem', { name: 'Replace' }).click();
	const sheet = page.getByRole('dialog');
	await expect(sheet).toContainText('Replace Barbell rows');
	// The one being replaced is in the workout already: can't be picked
	await expect(sheet.getByRole('button', { name: 'Barbell rows', exact: true })).toBeDisabled();
	await sheet.getByRole('button', { name: 'Pendlay rows', exact: true }).click();
	await expect(page.getByText('Replaced with Pendlay rows')).toBeVisible();
	// Same sets, as logged
	for (const set of [1, 2, 3]) {
		await expectBox(page.locator(`[id="Pendlay\\ rows-set-${set}-reps"]`), '10');
		await expectBox(page.locator(`[id="Pendlay\\ rows-set-${set}-load"]`), '60');
	}
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.waitForURL('/workouts');
	const replaced = await prisma.workoutExercise.findFirstOrThrow({
		where: { workoutId: workout.id },
		include: { sets: { orderBy: { setIndex: 'asc' } } }
	});
	expect(replaced).toMatchObject({
		name: 'Pendlay rows',
		exerciseId: pendlay.id,
		targetMuscleGroup: 'Traps',
		setType: 'Straight',
		repRangeStart: 8,
		repRangeEnd: 12,
		weightSetId: null
	});
	expect(replaced.sets.map(({ reps, load }) => [reps, load])).toEqual([
		[10, 60],
		[10, 60],
		[10, 60]
	]);

	// To a machine with levels: the loads mean something else, so they're cleared and the sets un-ticked
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await page.getByTestId('Pendlay rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'Replace' }).click();
	await page.getByRole('dialog').getByRole('button', { name: machine.name, exact: true }).click();
	await expect(page.getByText('Replaced with Row machine')).toBeVisible();
	await expect(page.getByTestId('Row machine-levels')).toBeVisible();
	await expectBox(page.locator('[id="Row\\ machine-set-1-reps"]'), '10');
	await expect(page.locator('[id="Row\\ machine-set-1-load"]')).toHaveValue('');
	await expect(page.getByTestId('Row machine-set-1-action')).toHaveAttribute('aria-checked', 'false');
});

test('editing a past workout: nothing ticked offers Discard changes, which keeps it; an old skipped set stays, unasked', async ({
	page,
	userData
}) => {
	const workout = await createPastWorkout(userData.userId);
	// From before: its last set was skipped
	await prisma.workoutExerciseSet.updateMany({
		where: { workoutExercise: { workoutId: workout.id }, setIndex: 2 },
		data: { skipped: true }
	});
	await editPastWorkout(page, workout.id);

	// Nothing to save if every set is un-ticked: discard the changes, not the workout
	for (const set of [1, 2]) await setBox(page, 'Barbell rows', set).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('dialog')).toContainText('No sets done yet');
	await page.getByRole('dialog').getByRole('button', { name: 'Discard changes' }).click();
	const confirm = page.getByRole('dialog', { name: 'Discard your changes?' });
	await expect(confirm).toContainText('The saved workout stays as it was');
	await confirm.getByRole('button', { name: 'Yes, discard' }).click();
	await page.waitForURL('/workouts');
	expect(await prisma.workoutExerciseSet.count({ where: { workoutExercise: { workoutId: workout.id } } })).toEqual(3);

	// The old skipped set isn't "not done": straight on, and it's still there after saving
	await editPastWorkout(page, workout.id);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.waitForURL('/workouts');
	const sets = await prisma.workoutExerciseSet.findMany({
		where: { workoutExercise: { workoutId: workout.id } },
		orderBy: { setIndex: 'asc' }
	});
	expect(sets.map((set) => set.skipped)).toEqual([false, false, true]);
});
