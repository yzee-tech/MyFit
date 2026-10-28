import { test, expect, type Page } from '../fixtures';
import { convertWeight, roundWeight } from '../../src/lib/utils/weightUnits';
import { PrismaClient, type MuscleGroup } from '@prisma/client';
import {
	solveBergerFormula,
	switchExerciseUnit,
	type WorkoutExerciseInProgress
} from '../../src/lib/utils/workoutUtils';
import { boxNumber, editWorkoutExercise, expectBox, expectBoxNot, pickRoutine, quickAdd } from './commonFunctions';

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
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), /^\d/);
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

	// Set numbers stand out: bold, in the main text colour
	expect(
		await page.getByTestId('Barbell rows-set-1-number').evaluate((el) => Number(getComputedStyle(el).fontWeight))
	).toBeGreaterThanOrEqual(600);
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
	await expectBox(box(page, 'Barbell rows', 1, 'load'), '60');
	await expectBox(box(page, 'Barbell rows', 1, 'reps'), '10');
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
		// The spare width goes to the boxes, not just Previous: wider than the minimums on a usual phone
		const minimums = { load: 52, reps: 44, RIR: 36 };
		for (const field of ['load', 'reps', 'RIR'] as const) {
			// The layout is redrawn for the new width, and the box can be swapped between a check and a
			// measure: measure until it's back on screen
			await expect
				.poll(async () => (await box(page, 'Barbell rows', 2, field).boundingBox())?.width ?? 0)
				.toBeGreaterThanOrEqual(width === 390 ? minimums[field] + 6 : minimums[field] - 1);
		}
		const { width: previousWidth } = (await page.getByTestId('Barbell rows-set-2-previous').boundingBox())!;
		if (width === 390) expect(previousWidth).toBeLessThan(90);
		// Headings on the bottom line, even when "KG / (BW)" stacks
		const bottom = async (locator: ReturnType<Page['getByText']>) => {
			const { y, height } = (await locator.boundingBox())!;
			return y + height;
		};
		const pullUps = page.getByTestId('Pull-ups-sets');
		const loadHeaderBottom = await bottom(page.getByTestId('Pull-ups-load-header'));
		for (const heading of ['Set', 'Previous', 'Reps', 'RIR']) {
			const headingBottom = await bottom(pullUps.getByText(heading, { exact: true }).first());
			expect(Math.abs(headingBottom - loadHeaderBottom)).toBeLessThanOrEqual(2);
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
	const startLoad = Number(await boxNumber(box(page, 'Barbell rows', 2, 'load')));
	const reps = Number(await boxNumber(box(page, 'Barbell rows', 2, 'reps')));
	const RIR = Number(await boxNumber(box(page, 'Barbell rows', 2, 'RIR')));
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
	await expectBox(box(page, 'Barbell rows', 2, 'reps'), String(firstGuess));
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
	// Changed again: back, from the reps it has now
	await box(page, 'Barbell rows', 2, 'load').fill(String(heavier + 5));
	const again = expectedReps(heavier + 5, firstGuess, heavier);
	await expect(hint(page, 'Barbell rows', 2)).toContainText(`aim for about ${again} ${again === 1 ? 'rep' : 'reps'}`);
	// Ticked: done, no hint
	await page.getByTestId('Barbell rows-set-2-action').click();
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);

	// Bodyweight exercises too, said as weight added
	await box(page, 'Pull-ups', 1, 'load').fill('20');
	await expect(hint(page, 'Pull-ups', 1)).toContainText('At +20 kg, aim for about');

	// Myo-reps share set 1's weight: one hint under set 1, for the sets not done yet
	await page.getByTestId('Leg press-set-2-action').click();
	const set2Reps = await boxNumber(box(page, 'Leg press', 2, 'reps'));
	const set3Reps = await boxNumber(box(page, 'Leg press', 3, 'reps'));
	const legPressLoad = Number(await boxNumber(box(page, 'Leg press', 1, 'load')));
	await box(page, 'Leg press', 1, 'load').fill(String(legPressLoad + 20));
	await expect(hint(page, 'Leg press', 1)).toContainText(`At ${legPressLoad + 20} kg, aim for about`);
	await expect(hint(page, 'Leg press', 2)).toHaveCount(0);
	await hint(page, 'Leg press', 1)
		.getByRole('button', { name: /Use the suggested reps/ })
		.click();
	await expectBox(box(page, 'Leg press', 2, 'reps'), set2Reps);
	await expectBoxNot(box(page, 'Leg press', 3, 'reps'), set3Reps);
});

test('drop sets: mini-sets line up under the load, reps and RIR boxes', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	// A bin got ready to remove a set goes back to normal when a mini-set is added
	const bin = page.getByTestId('Lateral raises-set-2-remove');
	await bin.click();
	await expect(bin).toHaveAttribute('data-armed', 'true');
	await page.getByLabel('add-mini-set-to-set-1-of-Lateral raises').click();
	await expect(bin).toHaveAttribute('data-armed', 'false');
	await expect(box(page, 'Lateral raises', 2, 'reps')).toBeVisible();
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
	await quickAdd(page, ['Barbell rows']);
	await editWorkoutExercise(page, 'Barbell rows');
	await page.getByLabel('Sets').fill('3');
	await page.getByRole('button', { name: 'Update' }).click();
	await expect(previous(page, 'Barbell rows', 1)).toHaveText('60 × 10');
	await expect(previous(page, 'Barbell rows', 2)).toHaveText('60 × 9');
	await expect(previous(page, 'Barbell rows', 3)).toHaveText('–');
});

test('suggested numbers look lighter until typed, copied in, or the set is ticked; kept after a reload and a unit switch', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const suggested = (set: number, field: 'load' | 'reps' | 'RIR') =>
		box(page, 'Barbell rows', set, field).getAttribute('data-suggested');
	const expectSuggested = async (set: number, field: 'load' | 'reps' | 'RIR', value: boolean) =>
		expect(box(page, 'Barbell rows', set, field)).toHaveAttribute('data-suggested', String(value));

	// Suggestions to start with; an empty box (last time's set 3 was skipped) isn't one
	for (const set of [1, 2])
		for (const field of ['load', 'reps', 'RIR'] as const) await expectSuggested(set, field, true);
	// Lighter: shown as the box's placeholder, the box itself empty
	await expect(box(page, 'Barbell rows', 1, 'load')).toHaveValue('');
	await expect(box(page, 'Barbell rows', 1, 'load')).toHaveAttribute('placeholder', /^\d/);
	await expectBox(box(page, 'Barbell rows', 3, 'load'), '');
	await expectSuggested(3, 'load', false);

	// Typing in a box makes that box the person's, not the rest of the set
	await box(page, 'Barbell rows', 1, 'reps').fill('11');
	await expectSuggested(1, 'reps', false);
	await expectSuggested(1, 'load', true);
	await expect(box(page, 'Barbell rows', 1, 'reps')).not.toHaveClass(/(^|\s)text-muted-foreground(\s|$)/);

	// Last time's numbers, copied on purpose: weight and reps
	await previous(page, 'Barbell rows', 2).click();
	await expectSuggested(2, 'load', false);
	await expectSuggested(2, 'reps', false);
	await expectSuggested(2, 'RIR', true);

	// A ticked set reads as done; unticked, its marks are as they were
	await page.getByTestId('Barbell rows-set-1-action').click();
	for (const field of ['load', 'reps', 'RIR'] as const) await expectSuggested(1, field, false);
	await page.getByTestId('Barbell rows-set-1-action').click();
	await expectSuggested(1, 'load', true);
	await expectSuggested(1, 'reps', false);
	await expectSuggested(1, 'RIR', true);

	// A new weight, then the reps hint's Use: both the person's
	const pullUps = (field: 'load' | 'reps' | 'RIR') => box(page, 'Pull-ups', 1, field);
	await expect(pullUps('reps')).toHaveAttribute('data-suggested', 'true');
	await pullUps('load').fill('20');
	await hint(page, 'Pull-ups', 1).getByRole('button').click();
	await expect(pullUps('load')).toHaveAttribute('data-suggested', 'false');
	await expect(pullUps('reps')).toHaveAttribute('data-suggested', 'false');
	await expect(pullUps('RIR')).toHaveAttribute('data-suggested', 'true');

	// Kept on the phone: a reload brings the same marks back
	await page.reload();
	await expectSuggested(1, 'reps', false);
	await expectSuggested(1, 'load', true);
	await expectSuggested(2, 'load', false);
	await expectSuggested(2, 'RIR', true);
	await expect(pullUps('reps')).toHaveAttribute('data-suggested', 'false');

	// Switching the unit converts the numbers and keeps the marks
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('LB');
	await expectSuggested(1, 'reps', false);
	await expectSuggested(1, 'load', true);
	await expectSuggested(2, 'load', false);
	expect(await suggested(2, 'RIR')).toBe('true');
});

test('editing a past workout: no "Previous" column and no reps hint', async ({ page, userData }) => {
	const workout = await setUpLastTime(userData.userId);
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await expectBox(box(page, 'Barbell rows', 1, 'load'), '60');
	await expect(page.getByTestId('Barbell rows-sets')).toContainText('Set KG Reps RIR');
	// Its numbers are the record: none look like suggestions
	await expect(page.locator('[data-suggested="true"]')).toHaveCount(0);
	await expect(page.getByTestId('Barbell rows-sets')).not.toContainText('Previous');
	await expect(previous(page, 'Barbell rows', 1)).toHaveCount(0);
	// A weight fixed after the fact: no guess at the reps
	await page.getByTestId('Barbell rows-set-1-action').click();
	await box(page, 'Barbell rows', 1, 'load').fill('65');
	await expect(hint(page, 'Barbell rows', 1)).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Adjust reps to the new load' })).toHaveCount(0);
});

test('past sets read weight, reps, RIR, like the workout screen: workout page, History and Stats', async ({
	page,
	userData
}) => {
	const workout = await setUpLastTime(userData.userId);
	// Set 1 of last time's rows: 60 kg × 10 at RIR 2
	const rowsOrder = /Load \(kg\)\s*Reps\s*RIR\s*1\s*60\s*10\s*2/;

	await page.goto(`/workouts/${workout.id}`);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByRole('tabpanel')).toContainText(rowsOrder);

	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await quickAdd(page, ['Barbell rows']);
	await editWorkoutExercise(page, 'Barbell rows');
	await page.getByLabel('Sets').fill('3');
	await page.getByRole('button', { name: 'Update' }).click();
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await expect(page.getByRole('dialog').filter({ hasText: 'History' })).toContainText(rowsOrder);

	await page.goto('/stats?tab=exercises');
	await expect(async () => {
		await page.getByRole('combobox').filter({ hasText: 'Search for an exercise' }).click();
		await expect(page.getByPlaceholder('Type here')).toBeVisible({ timeout: 1000 });
	}).toPass();
	await page.getByPlaceholder('Type here').fill('Barbell rows');
	await page.getByRole('option', { name: 'Barbell rows' }).click();
	await expect(page.locator('main')).toContainText(rowsOrder);
});

test('a suggestion is the box’s placeholder: a tap selects nothing, typing replaces it, emptying brings it back', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const reps2 = box(page, 'Barbell rows', 2, 'reps');
	const load2 = await boxNumber(box(page, 'Barbell rows', 2, 'load'));
	const suggestion = await boxNumber(reps2);
	expect(suggestion).toMatch(/^\d+$/);
	// Shown as a placeholder: the box itself is empty, so a tap has nothing to select (no cut/copy/paste bar)
	await expect(reps2).toHaveValue('');
	await expect(reps2).toHaveAttribute('placeholder', suggestion);
	await expect(reps2).toHaveAttribute('data-suggested', 'true');
	await reps2.click();
	await expect(reps2).toBeFocused();
	expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');

	// Typed straight over, no deleting first
	await page.keyboard.type('7');
	await expect(reps2).toHaveValue('7');
	await expect(reps2).toHaveAttribute('data-suggested', 'false');
	await page.keyboard.type('1');
	await expect(reps2).toHaveValue('71');

	// Emptied: the suggestion is back, and it's what a tick saves
	await reps2.fill('');
	await expect(reps2).toHaveValue('');
	await expect(reps2).toHaveAttribute('placeholder', suggestion);
	await expect(reps2).toHaveAttribute('data-suggested', 'true');
	await page.getByTestId('Barbell rows-set-2-action').click();
	await expect(reps2).toHaveValue(suggestion);

	// A negative weight (assistance) can be typed: "-" alone isn't wiped on the way
	const pullUps1 = box(page, 'Pull-ups', 1, 'load');
	await pullUps1.click();
	await page.keyboard.type('-20');
	await expect(pullUps1).toHaveValue('-20');

	// Set 1's new weight stays in set 1: set 2 keeps its own suggestion
	await box(page, 'Barbell rows', 1, 'load').fill('70');
	await expectBox(box(page, 'Barbell rows', 2, 'load'), load2);
});

/** The hint's text, once it shows */
const hintText = async (page: Page, exercise: string, set: number) =>
	(await hint(page, exercise, set).innerText()).replace(/\s+/g, ' ');

test('reps hint stays put while reps or RIR are typed or emptied; emptying reps restores the starting reps; Use starts a new baseline', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const startLoad = Number(await boxNumber(box(page, 'Barbell rows', 2, 'load')));
	const startReps = await boxNumber(box(page, 'Barbell rows', 2, 'reps'));
	await box(page, 'Barbell rows', 2, 'load').fill(String(startLoad + 10));
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	const shown = await hintText(page, 'Barbell rows', 2);

	// Typing "10" key by key, then RIR, then emptying either box: the hint never moves
	const reps = box(page, 'Barbell rows', 2, 'reps');
	await reps.fill('');
	await reps.press('1');
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
	await reps.press('0');
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
	await box(page, 'Barbell rows', 2, 'RIR').fill('4');
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
	await box(page, 'Barbell rows', 2, 'RIR').fill('');
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
	await reps.fill('');
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
	// Emptied reps are back to where the hint starts from
	await expectBox(reps, startReps);

	// Use fills the hint's reps; emptying then brings those back, not the first suggestion
	await hint(page, 'Barbell rows', 2).getByRole('button').click();
	const used = await boxNumber(reps);
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
	await reps.fill('');
	await expectBox(reps, used);
});

test('reps hint: no hint on an added set; a removed set comes back with its hint; reload keeps the hint', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const startLoad = Number(await boxNumber(box(page, 'Barbell rows', 2, 'load')));
	// Added set: a copy of the last one, no starting point, so no hint
	await page.getByTestId('Barbell rows-add-set').click();
	await box(page, 'Barbell rows', 4, 'load').fill(String(startLoad + 10));
	await expect(hint(page, 'Barbell rows', 4)).toHaveCount(0);

	// Remove set 2 and Undo: its hint is still there
	await box(page, 'Barbell rows', 2, 'load').fill(String(startLoad + 10));
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	const shown = await hintText(page, 'Barbell rows', 2);
	await page.getByTestId('Barbell rows-set-2-remove').click();
	await page.getByTestId('Barbell rows-set-2-remove').click();
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);

	// Reload mid-workout: the hint is kept with the workout
	await page.reload();
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
});

test('reps hint: Previous starts from last time with the suggested RIR; a lb switch hides it until the weight changes', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	await box(page, 'Barbell rows', 1, 'load').fill('50');
	await previous(page, 'Barbell rows', 1).click();
	await expect(hint(page, 'Barbell rows', 1)).toHaveCount(0);
	await box(page, 'Barbell rows', 1, 'load').fill('70');
	await expect(hint(page, 'Barbell rows', 1)).toContainText('At 70 kg, aim for about');

	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-load-header')).toHaveText('LB');
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
	const afterSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
	const snapped = afterSwitch.workoutExercises.find((ex: { name: string }) => ex.name === 'Barbell rows').sets[1];
	expect(snapped.hintBase).toEqual({ load: snapped.load, reps: snapped.reps, RIR: snapped.RIR });
	const lb = Number(await boxNumber(box(page, 'Barbell rows', 2, 'load')));
	await box(page, 'Barbell rows', 2, 'load').fill(String(lb + 20));
	await expect(hint(page, 'Barbell rows', 2)).toContainText('aim for about');
});

test('hint baseline survives the drawer clone; old local workouts show no hint', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	await box(page, 'Barbell rows', 2, 'load').fill('70');
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	const before = await hintText(page, 'Barbell rows', 2);
	await editWorkoutExercise(page, 'Barbell rows');
	await page.getByRole('button', { name: 'Update', exact: true }).click();
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	expect(await hintText(page, 'Barbell rows', 2)).toBe(before);
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	// Simulate a workout persisted by the old app: no hintBase fields.
	await page.evaluate(() => {
		const state = JSON.parse(localStorage.getItem('workoutRunes')!);
		for (const ex of state.workoutExercises) for (const set of ex.sets) delete set.hintBase;
		localStorage.setItem('workoutRunes', JSON.stringify(state));
	});
	await page.reload();
	await expect(box(page, 'Barbell rows', 2, 'load')).toBeVisible();
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
});

test('hint baselines: History resets it, async suggestions capture it, copy-down rows never invent one', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	await box(page, 'Barbell rows', 2, 'load').fill('70');
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await page.getByLabel('Copy these sets').first().click();
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
	const historyState = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
	const copied = historyState.workoutExercises.find((ex: { name: string }) => ex.name === 'Barbell rows').sets[1];
	expect(copied.hintBase).toEqual({ load: copied.load, reps: copied.reps, RIR: copied.RIR });
	await box(page, 'Barbell rows', 2, 'load').fill('70');
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	// Remove the existing exercise and add it again, obtaining async suggestions.
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
	await quickAdd(page, ['Barbell rows']);
	await expectBox(box(page, 'Barbell rows', 1, 'load'), /^\d/);
	await expect(hint(page, 'Barbell rows', 1)).toHaveCount(0);
	const load = Number(await boxNumber(box(page, 'Barbell rows', 1, 'load')));
	await box(page, 'Barbell rows', 1, 'load').fill(String(load + 10));
	await expect(hint(page, 'Barbell rows', 1)).toBeVisible();
	// Simulate empty manual rows and fill them only by copy-down.
	await page.evaluate(() => {
		const saved = JSON.parse(localStorage.getItem('workoutRunes')!);
		const ex = saved.workoutExercises.find((x: { name: string }) => x.name === 'Barbell rows');
		ex.setType = 'Straight';
		ex.sets = [0, 1].map(() => ({ completed: false, skipped: false, miniSets: [] }));
		localStorage.setItem('workoutRunes', JSON.stringify(saved));
	});
	await page.reload();
	for (const [field, value] of [
		['load', '60'],
		['reps', '10'],
		['RIR', '2']
	] as const)
		await box(page, 'Barbell rows', 1, field).fill(value);
	await expectBox(box(page, 'Barbell rows', 2, 'load'), '60');
	await box(page, 'Barbell rows', 2, 'load').fill('70');
	await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
});

test('save payload strips every hint baseline from a suggested workout', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	// Keep one exercise, with its own suggestion and baseline.
	for (const ex of ['Pull-ups', 'Leg press', 'Lateral raises']) {
		await page.getByTestId(`${ex}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
	}
	for (const set of [1, 2, 3]) {
		for (const [field, value] of [
			['load', '60'],
			['reps', '10'],
			['RIR', '2']
		] as const)
			await box(page, 'Barbell rows', set, field).fill(value);
		await page.getByTestId(`Barbell rows-set-${set}-action`).click();
	}
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	const request = page.waitForRequest((r) => r.url().includes('workouts.create') && r.method() === 'POST');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	const sent = await request;
	expect(sent.postData()).not.toContain('hintBase');
	await page.waitForURL('/workouts');
});

test('myo main-set hint ignores typed reps and RIR', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const load = Number(await boxNumber(box(page, 'Leg press', 1, 'load')));
	await box(page, 'Leg press', 1, 'load').fill(String(load + 20));
	await expect(hint(page, 'Leg press', 1)).toBeVisible();
	const before = await hintText(page, 'Leg press', 1);
	await box(page, 'Leg press', 2, 'reps').fill('1');
	await box(page, 'Leg press', 2, 'RIR').fill('4');
	expect(await hintText(page, 'Leg press', 1)).toBe(before);
});

for (const setType of ['MyorepMatch', 'MyorepMatchDown'] as const) {
	test(`${setType}: main-set hint ignores mini-set inputs and Use resets every affected baseline`, async ({
		page,
		userData
	}) => {
		await setUpLastTime(userData.userId);
		await prisma.exerciseTemplate.updateMany({
			where: { name: 'Leg press', exerciseSplitDay: { exerciseSplit: { userId: userData.userId } } },
			data: { setType }
		});
		await prisma.workoutExercise.updateMany({
			where: { name: 'Leg press', workout: { userId: userData.userId } },
			data: { setType }
		});
		await startTestDay(page);
		const row = setType === 'MyorepMatch' ? 1 : 2;
		const load = Number(await boxNumber(box(page, 'Leg press', row, 'load')));
		await box(page, 'Leg press', row, 'load').fill(String(load + 10));
		await expect(hint(page, 'Leg press', row)).toBeVisible();
		const before = await hintText(page, 'Leg press', row);
		await page.getByLabel('add-mini-set-to-set-2-of-Leg press').click();
		await page.locator('[id="Leg press-set-2-mini-set-1-reps"]').fill('3');
		await page.locator('[id="Leg press-set-2-mini-set-1-RIR"]').fill('4');
		expect(await hintText(page, 'Leg press', row)).toBe(before);
		await hint(page, 'Leg press', row).getByRole('button').click();
		await expect(hint(page, 'Leg press', row)).toHaveCount(0);
		const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
		const ex = saved.workoutExercises.find((x: { name: string }) => x.name === 'Leg press');
		for (const set of setType === 'MyorepMatch' ? ex.sets : [ex.sets[row - 1]]) {
			expect(set.hintBase.load).toBe(load + 10);
			expect(set.hintBase.reps).toBe(set.reps);
		}
	});
}

test('Straight cross-set copy-down: typing set 1 reps never moves set 2 hint', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	// Keep a captured baseline but leave the live reps box empty, so copyDown owns it.
	await page.evaluate(() => {
		const saved = JSON.parse(localStorage.getItem('workoutRunes')!);
		const second = saved.workoutExercises.find((ex: { name: string }) => ex.name === 'Barbell rows').sets[1];
		delete second.reps;
		delete second.suggested;
		delete second.chosen;
		localStorage.setItem('workoutRunes', JSON.stringify(saved));
	});
	await page.reload();
	const load = Number(await boxNumber(box(page, 'Barbell rows', 2, 'load')));
	await box(page, 'Barbell rows', 2, 'load').fill(String(load + 10));
	await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
	const shown = await hintText(page, 'Barbell rows', 2);
	const reps = box(page, 'Barbell rows', 1, 'reps');
	await reps.fill('');
	await reps.press('1');
	await expectBox(box(page, 'Barbell rows', 2, 'reps'), '1');
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
	await reps.press('0');
	await expectBox(box(page, 'Barbell rows', 2, 'reps'), '10');
	expect(await hintText(page, 'Barbell rows', 2)).toBe(shown);
});

for (const source of ['History', 'Previous'] as const) {
	for (const field of source === 'History' ? (['RIR', 'load'] as const) : (['load'] as const)) {
		test(`unit switch keeps baseline after ${source} and empty ${field}`, async ({ page, userData }) => {
			await setUpLastTime(userData.userId);
			await startTestDay(page);
			if (source === 'History') {
				await page.getByTestId('Barbell rows-menu-button').click();
				await page.getByRole('menuitem', { name: 'History' }).click();
				await page.getByLabel('Copy these sets').first().click();
			} else await previous(page, 'Barbell rows', 2).click();
			const before = await page.evaluate(() =>
				JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
					(ex: { name: string }) => ex.name === 'Barbell rows'
				)
			);
			const expected =
				field === 'load'
					? { ...before.sets[1], load: roundWeight(convertWeight(before.sets[1].hintBase.load, 'KG', 'LB')) }
					: switchExerciseUnit(before, 'LB', 100).sets[1];
			await box(page, 'Barbell rows', 2, field).fill('');
			await page.getByTestId('Barbell rows-unit-toggle').click();
			expect(await box(page, 'Barbell rows', 2, field).inputValue()).toBe('');
			const state = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
			const set = state.workoutExercises.find((ex: { name: string }) => ex.name === 'Barbell rows').sets[1];
			expect(set.hintBase).toBeDefined();
			expect(set.hintBase).toEqual({ load: expected.load, reps: expected.reps, RIR: expected.RIR });
			expect(set.hintBase.RIR).toBe(2);
			await box(page, 'Barbell rows', 2, 'RIR').fill('2');
			await box(page, 'Barbell rows', 2, 'load').fill(String(set.hintBase.load));
			await expect(hint(page, 'Barbell rows', 2)).toHaveCount(0);
			await box(page, 'Barbell rows', 2, 'load').fill(String(set.hintBase.load + 20));
			const reps = Math.round(
				solveBergerFormula({
					variableToSolve: 'NewReps',
					knownValues: {
						oldSet: { ...set.hintBase, miniSets: [] },
						newSet: { load: set.hintBase.load + 20, RIR: set.hintBase.RIR, miniSets: [] },
						oldUserBodyweight: 220.46,
						newUserBodyweight: 220.46,
						bodyweightFraction: null,
						overloadPercentage: 0
					}
				})
			);
			await expect(hint(page, 'Barbell rows', 2)).toContainText(`aim for about ${reps} reps`);
			await page.reload();
			await expect(page.getByTestId('Barbell rows-sets')).toBeVisible();
			const restored = await page.evaluate(
				() =>
					JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
						(ex: { name: string }) => ex.name === 'Barbell rows'
					).sets[1]
			);
			expect(restored.hintBase).toEqual(set.hintBase);
			await box(page, 'Barbell rows', 2, 'load').fill(String(set.hintBase.load + 20));
			await expect(hint(page, 'Barbell rows', 2)).toBeVisible();
		});
	}
}

test('unit switch complete, shared-load, no-baseline and skipped controls', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	await page.getByTestId('Leg press-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await page.getByLabel('Copy these sets').first().click();
	const before: WorkoutExerciseInProgress = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
			(x: { name: string }) => x.name === 'Leg press'
		)
	);
	const expected = switchExerciseUnit(before, 'LB', 100);
	await box(page, 'Leg press', 2, 'RIR').fill('');
	await page.getByTestId('Leg press-unit-toggle').click();
	await expectBox(box(page, 'Leg press', 2, 'RIR'), '');
	const shared: WorkoutExerciseInProgress = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
			(x: { name: string }) => x.name === 'Leg press'
		)
	);
	for (const [i, set] of shared.sets.entries())
		expect(set.hintBase).toEqual({
			load: expected.sets[i].load,
			reps: expected.sets[i].reps,
			RIR: expected.sets[i].RIR
		});
	const rows: WorkoutExerciseInProgress = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
			(x: { name: string }) => x.name === 'Barbell rows'
		)
	);
	const complete = switchExerciseUnit(rows, 'LB', 100);
	await page.getByTestId('Barbell rows-add-set').click();
	await page.getByTestId('Barbell rows-unit-toggle').click();
	const switched: WorkoutExerciseInProgress = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
			(x: { name: string }) => x.name === 'Barbell rows'
		)
	);
	expect(switched.sets[0].hintBase).toEqual({
		load: complete.sets[0].load,
		reps: complete.sets[0].reps,
		RIR: complete.sets[0].RIR
	});
	expect(switched.sets[3].hintBase).toBeUndefined();
	await page.evaluate(() => {
		const s = JSON.parse(localStorage.getItem('workoutRunes')!);
		const ex = s.workoutExercises.find((x: { name: string }) => x.name === 'Barbell rows');
		delete ex.sets[0].hintBase;
		ex.sets[1].skipped = true;
		localStorage.setItem('workoutRunes', JSON.stringify(s));
	});
	await page.reload();
	await page.getByTestId('Barbell rows-unit-toggle').click();
	const final: WorkoutExerciseInProgress = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
			(x: { name: string }) => x.name === 'Barbell rows'
		)
	);
	expect(final.sets[0].hintBase).toBeUndefined();
	expect(final.sets[1].hintBase).toBeUndefined();
});

test('shared weight-set baseline uses visible target, never a second snapped neighbour', async ({ page, userData }) => {
	await setUpLastTime(userData.userId);
	const weights = await prisma.weightSet.create({
		data: {
			userId: userData.userId,
			name: 'LB steps',
			unit: 'LB',
			weights: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]
		}
	});
	await prisma.exerciseTemplate.updateMany({
		where: { name: 'Barbell rows', exerciseSplitDay: { exerciseSplit: { userId: userData.userId } } },
		data: { weightSetId: weights.id, weightUnit: 'KG', repRangeStart: 8, repRangeEnd: 12 }
	});
	const ex = await prisma.workoutExercise.findFirstOrThrow({
		where: { name: 'Barbell rows', workout: { userId: userData.userId } }
	});
	await prisma.workoutExerciseSet.updateMany({
		where: { workoutExerciseId: ex.id },
		data: { load: 10, reps: 10, RIR: 2, skipped: false }
	});
	await prisma.workoutExerciseSet.updateMany({ where: { workoutExerciseId: ex.id, setIndex: 0 }, data: { reps: 20 } });
	await startTestDay(page);
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await page.getByLabel('Copy these sets').first().click();
	await box(page, 'Barbell rows', 1, 'RIR').fill('');
	const original = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
			(x: { name: string }) => x.name === 'Barbell rows'
		)
	);
	const visible = switchExerciseUnit(original, 'LB', 100, [weights]);
	await page.getByTestId('Barbell rows-unit-toggle').click();
	const actual = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
			(x: { name: string }) => x.name === 'Barbell rows'
		)
	);
	for (const [i, set] of actual.sets.entries()) {
		const { hintBase: ignored, ...live } = set;
		const { hintBase: ignoredExpected, ...expected } = visible.sets[i];
		expect(live).toEqual(expected);
		expect(set.hintBase.load).toBe(set.load);
		await expect(hint(page, 'Barbell rows', i + 1)).toHaveCount(0);
	}
	expect(actual.sets[0].hintBase).toEqual({ load: 20, reps: 24, RIR: 2 });
	expect(actual.sets[1].hintBase).toEqual({ load: 20, reps: 14, RIR: 2 });
	await expectBox(box(page, 'Barbell rows', 1, 'RIR'), '');
});
for (const setType of ['Myorep', 'MyorepMatch'] as const) {
	test(`${setType} empty later RIR baseline matches visible shared load`, async ({ page, userData }) => {
		await setUpLastTime(userData.userId);
		await prisma.exerciseTemplate.updateMany({
			where: { name: 'Leg press', exerciseSplitDay: { exerciseSplit: { userId: userData.userId } } },
			data: { setType }
		});
		await prisma.workoutExercise.updateMany({
			where: { name: 'Leg press', workout: { userId: userData.userId } },
			data: { setType }
		});
		await startTestDay(page);
		await page.getByTestId('Leg press-menu-button').click();
		await page.getByRole('menuitem', { name: 'History' }).click();
		await page.getByLabel('Copy these sets').first().click();
		await box(page, 'Leg press', 2, 'RIR').fill('');
		await page.getByTestId('Leg press-unit-toggle').click();
		const ex = await page.evaluate(() =>
			JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
				(x: { name: string }) => x.name === 'Leg press'
			)
		);
		for (const set of ex.sets)
			if (set.hintBase && typeof set.load === 'number') expect(set.hintBase.load).toBe(set.load);
		await expectBox(box(page, 'Leg press', 2, 'RIR'), '');
	});
}

const savedExerciseSets = (page: Page, exercise: string) =>
	page.evaluate(
		(name) =>
			JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises.find(
				(ex: { name: string }) => ex.name === name
			).sets,
		exercise
	);

test('a typed-over weight comes back in the new unit when its box is emptied after a unit switch', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const load = box(page, 'Barbell rows', 1, 'load');
	const suggestedKg = Number(await boxNumber(load));
	await load.fill('70');
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('LB');
	await load.fill('');
	await expect(load).toHaveAttribute('data-suggested', 'true');
	// The suggestion in lb (the same effort), never the old kg number
	await expectBox(load, String(roundWeight(convertWeight(suggestedKg, 'KG', 'LB'))));
});

test('the remembered weight is converted and saved: a reload between the switch and the empty keeps it', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const load = box(page, 'Barbell rows', 1, 'load');
	const suggestedKg = Number(await boxNumber(load));
	await load.fill('70');
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('LB');
	const expected = roundWeight(convertWeight(suggestedKg, 'KG', 'LB'));
	await expect.poll(async () => (await savedExerciseSets(page, 'Barbell rows'))[0].suggested?.load).toBe(expected);
	await page.reload();
	await expect(page.getByTestId('Barbell rows-sets')).toBeVisible();
	expect((await savedExerciseSets(page, 'Barbell rows'))[0].suggested.load).toBe(expected);
	await box(page, 'Barbell rows', 1, 'load').fill('');
	await expectBox(box(page, 'Barbell rows', 1, 'load'), String(expected));
});

test('kg to lb and back: the remembered weight returns to the original within 0.01 (two roundings)', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const load = box(page, 'Barbell rows', 1, 'load');
	const suggestedKg = Number(await boxNumber(load));
	await load.fill('70');
	const toggle = page.getByTestId('Barbell rows-unit-toggle');
	await toggle.click();
	await expect(toggle).toHaveText('LB');
	await toggle.click();
	await expect(toggle).toHaveText('KG');
	await load.fill('');
	await expect(load).toHaveAttribute('data-suggested', 'true');
	await expect.poll(async () => Math.abs(Number(await boxNumber(load)) - suggestedKg)).toBeLessThanOrEqual(0.01);
});

test('all three typed over, then a unit switch: weight comes back converted, reps from the hint start, RIR as suggested', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	await startTestDay(page);
	const suggestedKg = Number(await boxNumber(box(page, 'Barbell rows', 1, 'load')));
	const suggestedRIR = await boxNumber(box(page, 'Barbell rows', 1, 'RIR'));
	await box(page, 'Barbell rows', 1, 'load').fill('70');
	await box(page, 'Barbell rows', 1, 'reps').fill('12');
	await box(page, 'Barbell rows', 1, 'RIR').fill('1');
	await page.getByTestId('Barbell rows-unit-toggle').click();
	await expect(page.getByTestId('Barbell rows-unit-toggle')).toHaveText('LB');
	const afterSwitch = (await savedExerciseSets(page, 'Barbell rows'))[0];
	for (const field of ['load', 'reps', 'RIR'] as const) await box(page, 'Barbell rows', 1, field).fill('');
	await expectBox(box(page, 'Barbell rows', 1, 'load'), String(roundWeight(convertWeight(suggestedKg, 'KG', 'LB'))));
	// What the hint starts from after the switch, not the old suggestion
	await expectBox(box(page, 'Barbell rows', 1, 'reps'), String(afterSwitch.hintBase.reps));
	await expectBox(box(page, 'Barbell rows', 1, 'RIR'), suggestedRIR);
});

test('a suggestions answer that arrives after the workout was discarded cannot write into the next workout', async ({
	page,
	userData
}) => {
	await setUpLastTime(userData.userId);
	let release!: () => void;
	const held = new Promise<void>((resolve) => (release = resolve));
	let requested!: () => void;
	const seen = new Promise<void>((resolve) => (requested = resolve));
	let first = true;
	await page.route(/suggestSets/, async (route) => {
		if (!first) return route.continue();
		first = false;
		const response = await route.fetch();
		requested();
		await held;
		await route.fulfill({ response });
	});
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await quickAdd(page, ['Barbell rows']);
	await seen;
	// Workout A is thrown away while its answer is still on the way; workout B starts (no navigation away from the app)
	await page.getByRole('button', { name: 'Discard workout', exact: true }).click();
	await page.getByRole('button', { name: 'Yes, discard', exact: true }).click();
	await page.waitForURL('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('90');
	await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	const before = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
	release();
	await page.waitForTimeout(500);
	const after = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
	expect(after.previousWorkoutData).toBeNull();
	expect(after.repsOnly).toEqual(before.repsOnly);
	expect(after.workoutExercises).toEqual(before.workoutExercises);
	expect(after.workoutData.userBodyweight).toBe(90);
});

test('a reps-only answer that arrives after a past workout was discarded cannot write into the next workout', async ({
	page,
	userData
}) => {
	const workout = await setUpLastTime(userData.userId);
	// The answer will say Barbell rows is reps only (the server reads this when the request is made)
	await prisma.exercise.update({
		where: { userId_name: { userId: userData.userId, name: 'Barbell rows' } },
		data: { repsOnly: true, maxReps: 30 }
	});
	let release!: () => void;
	const held = new Promise<void>((resolve) => (release = resolve));
	let requested!: () => void;
	const seen = new Promise<void>((resolve) => (requested = resolve));
	let first = true;
	await page.route(/forPicker/, async (route) => {
		if (!first) return route.continue();
		first = false;
		const response = await route.fetch();
		requested();
		await held;
		await route.fulfill({ response });
	});
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await seen;
	// Workout A (the edit) is thrown away while its answer is still on the way; workout B starts without reloading
	await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
	await page.getByRole('button', { name: 'Yes, discard', exact: true }).click();
	await page.waitForURL('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('90');
	await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	const before = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
	expect(before.repsOnly).toEqual({});
	release();
	await page.waitForTimeout(500);
	const after = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
	expect(after.repsOnly).toEqual({});
	expect(after.workoutData.userBodyweight).toBe(90);
});

/** An exercise done 5 days ago (created if it is not there yet), so adding it to a workout brings suggestions */
async function addExerciseHistory(userId: string, name: string, targetMuscleGroup: MuscleGroup) {
	const exercise = await prisma.exercise.upsert({
		where: { userId_name: { userId, name } },
		create: { userId, name, targetMuscleGroup },
		update: {}
	});
	const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 100,
			startedAt: fiveDaysAgo,
			endedAt: new Date(fiveDaysAgo.getTime() + 3600000),
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						exerciseId: exercise.id,
						name,
						targetMuscleGroup,
						setType: 'Straight',
						repRangeStart: 10,
						repRangeEnd: 20,
						sets: {
							create: [
								{ setIndex: 0, load: 10, reps: 15, RIR: 2, skipped: false },
								{ setIndex: 1, load: 10, reps: 14, RIR: 2, skipped: false }
							]
						}
					}
				]
			}
		}
	});
}

const savedWorkoutExercises = (page: Page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises);

test('an exercise added to a past workout gets suggestions but no hint start; in a live workout it does', async ({
	page,
	userData
}) => {
	const workout = await setUpLastTime(userData.userId);
	await addExerciseHistory(userData.userId, 'Lateral raises', 'SideDelts');
	await addExerciseHistory(userData.userId, 'Cable curls', 'Biceps');

	// A past workout being edited: the hint is off there, so nothing is captured for it
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await quickAdd(page, ['Lateral raises']);
	await expect
		.poll(async () => {
			const raises = (await savedWorkoutExercises(page)).find((ex: { name: string }) => ex.name === 'Lateral raises');
			return typeof raises?.sets[0].load;
		})
		.toBe('number');
	for (const ex of await savedWorkoutExercises(page)) for (const set of ex.sets) expect(set.hintBase).toBeUndefined();

	// Control: during a live workout an added exercise starts with hint starts, as before
	await page.goto('/workouts/manage/start');
	await page.evaluate(() => localStorage.removeItem('workoutRunes'));
	await startTestDay(page);
	await quickAdd(page, ['Cable curls']);
	await expect
		.poll(async () => {
			const curls = (await savedWorkoutExercises(page)).find((ex: { name: string }) => ex.name === 'Cable curls');
			return curls?.sets.some((set: { hintBase?: unknown }) => set.hintBase !== undefined);
		})
		.toBe(true);
});

test('emptying a box in a past workout never brings back a hint start or a remembered suggestion', async ({
	page,
	userData
}) => {
	const workout = await setUpLastTime(userData.userId);
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await expectBox(box(page, 'Barbell rows', 1, 'reps'), '10');
	// Left-over state from before (seeded: nothing in edit mode writes it any more)
	await page.evaluate(() => {
		const saved = JSON.parse(localStorage.getItem('workoutRunes')!);
		const set = saved.workoutExercises.find((ex: { name: string }) => ex.name === 'Barbell rows').sets[0];
		set.hintBase = { load: 61, reps: 12, RIR: 2 };
		set.suggested = { load: 99, reps: 13, RIR: 3 };
		localStorage.setItem('workoutRunes', JSON.stringify(saved));
	});
	await page.reload();
	await expectBox(box(page, 'Barbell rows', 1, 'reps'), '10');
	await page.getByTestId('Barbell rows-set-1-action').click();
	for (const field of ['reps', 'load', 'RIR'] as const) {
		await box(page, 'Barbell rows', 1, field).fill('');
		// The past number is gone and nothing takes its place: it has to be filled in again
		await expect(box(page, 'Barbell rows', 1, field)).toHaveValue('');
	}
});
