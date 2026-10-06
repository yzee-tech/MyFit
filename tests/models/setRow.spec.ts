import { test, expect, type Page } from '../fixtures';
import { PrismaClient, type MuscleGroup } from '@prisma/client';
import { solveBergerFormula } from '../../src/lib/utils/workoutUtils';
import { pickExercise, pickRoutine } from './commonFunctions';

const prisma = new PrismaClient();

/**
 * Last time (two days ago): Barbell rows 60 × 10, 60 × 9, a skipped set; Pull-ups +10 × 8, BW × 8,
 * −20 × 8; Leg press (myo-reps) 100 × 15, 12, 10. My routines has "Test day" with these and
 * Lateral raises (drop sets, never done).
 */
async function setUpLastTime(userId: string) {
	const exercises = {
		rows: await prisma.exercise.create({ data: { userId, name: 'Barbell rows', targetMuscleGroup: 'Traps' } }),
		pullUps: await prisma.exercise.create({
			data: { userId, name: 'Pull-ups', targetMuscleGroup: 'Lats', bodyweightFraction: 1 }
		}),
		legPress: await prisma.exercise.create({ data: { userId, name: 'Leg press', targetMuscleGroup: 'Quads' } }),
		raises: await prisma.exercise.create({ data: { userId, name: 'Lateral raises', targetMuscleGroup: 'SideDelts' } })
	};
	const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
	const sets = (rows: [number, number, number, boolean?][]) => ({
		create: rows.map(([load, reps, RIR, skipped = false], setIndex) => ({ setIndex, load, reps, RIR, skipped }))
	});
	const workout = await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 100,
			startedAt: twoDaysAgo,
			endedAt: new Date(twoDaysAgo.getTime() + 3600000),
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						exerciseId: exercises.rows.id,
						name: 'Barbell rows',
						targetMuscleGroup: 'Traps',
						setType: 'Straight',
						repRangeStart: 10,
						repRangeEnd: 15,
						sets: sets([
							[60, 10, 2],
							[60, 9, 2],
							[0, 0, 0, true]
						])
					},
					{
						exerciseIndex: 1,
						exerciseId: exercises.pullUps.id,
						name: 'Pull-ups',
						targetMuscleGroup: 'Lats',
						bodyweightFraction: 1,
						setType: 'Straight',
						repRangeStart: 5,
						repRangeEnd: 15,
						sets: sets([
							[10, 8, 2],
							[0, 8, 2],
							[-20, 8, 2]
						])
					},
					{
						exerciseIndex: 2,
						exerciseId: exercises.legPress.id,
						name: 'Leg press',
						targetMuscleGroup: 'Quads',
						setType: 'Myorep',
						repRangeStart: 10,
						repRangeEnd: 20,
						sets: sets([
							[100, 15, 2],
							[100, 12, 1],
							[100, 10, 0]
						])
					}
				]
			}
		}
	});
	const routineExercise = (
		exerciseIndex: number,
		exercise: { id: string; name: string; targetMuscleGroup: MuscleGroup },
		more: object
	) => ({
		exerciseIndex,
		exerciseId: exercise.id,
		name: exercise.name,
		targetMuscleGroup: exercise.targetMuscleGroup,
		sets: 3,
		setType: 'Straight' as const,
		repRangeStart: 10,
		repRangeEnd: 15,
		...more
	});
	await prisma.exerciseSplit.create({
		data: {
			userId,
			name: 'My routines',
			exerciseSplitDays: {
				create: [
					{
						name: 'Test day',
						dayIndex: 0,
						isRestDay: false,
						exercises: {
							create: [
								routineExercise(0, exercises.rows, {}),
								routineExercise(1, exercises.pullUps, { bodyweightFraction: 1, repRangeStart: 5 }),
								routineExercise(2, exercises.legPress, { setType: 'Myorep', repRangeEnd: 20 }),
								routineExercise(3, exercises.raises, {
									sets: 2,
									setType: 'Drop',
									repRangeEnd: 20,
									changeType: 'Percentage',
									changeAmount: 20
								})
							]
						}
					}
				]
			}
		}
	});
	return workout;
}

async function startTestDay(page: Page) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Test day');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(page.locator('[id="Barbell\\ rows-set-1-load"]')).toHaveValue(/^\d/);
}

const box = (page: Page, exercise: string, set: number, field: 'load' | 'reps' | 'RIR') =>
	page.locator(`[id="${exercise.replaceAll(' ', '\\ ')}-set-${set}-${field}"]`);
const previous = (page: Page, exercise: string, set: number) => page.getByTestId(`${exercise}-set-${set}-previous`);
const hint = (page: Page, exercise: string, set: number) => page.getByTestId(`${exercise}-set-${set}-reps-hint`);

test('set row: Set | Previous | KG | Reps | RIR, last time set by set, tap to copy it, fits a small phone', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);

	// The load column is called by its unit
	await expect(page.getByTestId('Barbell rows-sets')).toContainText('Set Previous KG Reps RIR');
	await expect(page.getByTestId('Pull-ups-sets')).toContainText('Set Previous KG (BW) Reps RIR');

	// Last time, set by set
	for (const [exercise, expected] of [
		['Barbell rows', ['60 × 10', '60 × 9', '–']],
		['Pull-ups', ['+10 × 8', 'BW × 8', '−20 × 8']],
		['Lateral raises', ['–', '–']]
	] as const) {
		for (const [idx, text] of expected.entries()) {
			await expect(previous(page, exercise, idx + 1)).toHaveText(text);
		}
	}

	// Switched to lb: the header and last time follow
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-load-header')).toHaveText('LB');
	await expect(previous(page, 'Barbell rows', 1)).toHaveText('132.28 × 10');
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(previous(page, 'Barbell rows', 1)).toHaveText('60 × 10');

	// Tap last time: its numbers go into the set
	await box(page, 'Barbell rows', 1, 'load').fill('50');
	await box(page, 'Barbell rows', 1, 'reps').fill('5');
	await previous(page, 'Barbell rows', 1).click();
	await expect(box(page, 'Barbell rows', 1, 'load')).toHaveValue('60');
	await expect(box(page, 'Barbell rows', 1, 'reps')).toHaveValue('10');
	// Last time's reps go with last time's weight: no hint
	await expect(hint(page, 'Barbell rows', 1)).toHaveCount(0);
	// A ticked set keeps its numbers
	await page.getByTestId('Barbell rows-set-1-action').click();
	await expect(page.getByRole('button', { name: /Use last time's set 1 of Barbell rows/ })).toHaveCount(0);

	// Fits a phone, even a small one: no sideways scrolling, every column on screen, boxes big enough
	for (const width of [390, 320]) {
		await page.setViewportSize({ width, height: 800 });
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
		for (const field of ['load', 'reps', 'RIR'] as const) {
			const { width: boxWidth } = (await box(page, 'Barbell rows', 2, field).boundingBox())!;
			expect(boxWidth).toBeGreaterThanOrEqual(36);
		}
		for (const testId of ['Barbell rows-set-2-previous', 'Barbell rows-set-2-action', 'Barbell rows-set-2-remove']) {
			const { x, width: w } = (await page.getByTestId(testId).boundingBox())!;
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x + w).toBeLessThanOrEqual(width);
		}
	}
});

test('reps hint: after a weight change, about how many reps for the same effort; Use fills them; myo-reps leave done sets alone', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);

	// Set 2 of rows: a heavier weight
	const startLoad = Number(await box(page, 'Barbell rows', 2, 'load').inputValue());
	const reps = Number(await box(page, 'Barbell rows', 2, 'reps').inputValue());
	const RIR = Number(await box(page, 'Barbell rows', 2, 'RIR').inputValue());
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
	const expectedReps = (load: number, fromReps: number, fromLoad: number) =>
		Math.round(
			solveBergerFormula({
				variableToSolve: 'NewReps',
				knownValues: {
					oldSet: { reps: fromReps, load: fromLoad, RIR, miniSets: [] },
					newSet: { load, RIR, miniSets: [] },
					oldUserBodyweight: 100,
					newUserBodyweight: 100,
					bodyweightFraction: null,
					overloadPercentage: 0
				}
			})
		);
	const heavier = startLoad + 10;
	const firstGuess = expectedReps(heavier, reps, startLoad);
	await box(page, 'Barbell rows', 2, 'load').fill(String(heavier));
	await expect(hint(page, 'Barbell rows', 2)).toHaveText(
		`At ${heavier} kg, aim for about ${firstGuess} reps · Use ${firstGuess}`
	);
	// Back to where it started: no hint
	await box(page, 'Barbell rows', 2, 'load').fill(String(startLoad));
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
	await box(page, 'Barbell rows', 2, 'load').fill(String(heavier));

	// Use: the reps go in, and the new weight is where the set starts
	await hint(page, 'Barbell rows', 2).getByRole('button').click();
	await expect(box(page, 'Barbell rows', 2, 'reps')).toHaveValue(String(firstGuess));
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
	// Changed again: back, from the reps it has now
	await box(page, 'Barbell rows', 2, 'load').fill(String(heavier + 5));
	await expect(hint(page, 'Barbell rows', 2)).toContainText(
		`aim for about ${expectedReps(heavier + 5, firstGuess, heavier)} reps`
	);
	// Ticked: done, no hint
	await page.getByTestId('Barbell rows-set-2-action').click();
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);

	// Bodyweight exercises too, said as weight added
	await box(page, 'Pull-ups', 1, 'load').fill('20');
	await expect(hint(page, 'Pull-ups', 1)).toContainText('At +20 kg, aim for about');

	// Myo-reps share set 1's weight: one hint under set 1, for the sets not done yet
	await page.getByTestId('Leg press-set-2-action').click();
	const set2Reps = await box(page, 'Leg press', 2, 'reps').inputValue();
	const set3Reps = await box(page, 'Leg press', 3, 'reps').inputValue();
	const legPressLoad = Number(await box(page, 'Leg press', 1, 'load').inputValue());
	await box(page, 'Leg press', 1, 'load').fill(String(legPressLoad + 20));
	await expect(hint(page, 'Leg press', 1)).toContainText(`At ${legPressLoad + 20} kg, aim for about`);
	await expect(hint(page, 'Leg press', 2)).toHaveCount(0);
	await hint(page, 'Leg press', 1)
		.getByRole('button', { name: /Use the suggested reps/ })
		.click();
	await expect(box(page, 'Leg press', 2, 'reps')).toHaveValue(set2Reps);
	await expect(box(page, 'Leg press', 3, 'reps')).not.toHaveValue(set3Reps);
});

test('drop sets: mini-sets line up under the load, reps and RIR boxes', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	await page.getByLabel('add-mini-set-to-set-1-of-Lateral raises').click();
	for (const field of ['load', 'reps', 'RIR'] as const) {
		const setBox = (await box(page, 'Lateral raises', 1, field).boundingBox())!;
		const miniBox = (await page.locator(`[id="Lateral\\ raises-set-1-mini-set-1-${field}"]`).boundingBox())!;
		expect(Math.abs(miniBox.x - setBox.x)).toBeLessThanOrEqual(1);
		expect(Math.abs(miniBox.width - setBox.width)).toBeLessThanOrEqual(1);
	}
});

test('an exercise added during a workout gets its "Previous" too', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Barbell rows');
	await page.getByLabel('Sets').fill('3');
	await page.getByRole('button', { name: 'Add exercise' }).click();
	await expect(previous(page, 'Barbell rows', 1)).toHaveText('60 × 10');
	await expect(previous(page, 'Barbell rows', 2)).toHaveText('60 × 9');
	await expect(previous(page, 'Barbell rows', 3)).toHaveText('–');
});

test('editing a past workout: no "Previous" column and no reps hint', async ({ page, userData }) => {
	const workout = await setUpLastTime(userData.userId);
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/start/);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(box(page, 'Barbell rows', 1, 'load')).toHaveValue('60');
	await expect(page.getByTestId('Barbell rows-sets')).toContainText('Set KG Reps RIR');
	await expect(page.getByTestId('Barbell rows-sets')).not.toContainText('Previous');
	await expect(previous(page, 'Barbell rows', 1)).toHaveCount(0);
	// A weight fixed after the fact: no guess at the reps
	await page.getByTestId('Barbell rows-set-1-action').click();
	await box(page, 'Barbell rows', 1, 'load').fill('65');
	await expect(hint(page, 'Barbell rows', 1)).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Adjust reps to the new load' })).toHaveCount(0);
});
