import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createExercises, editWorkoutExercise, pickExercise, pickRoutine, quickAdd } from './commonFunctions';

const prisma = new PrismaClient();

/**
 * Mini-sets are kept on the phone as they are added, typed and removed; a drop set of a reps-only exercise has no
 * load to enter; swapping an exercise (in a workout, or in a past one) follows the new exercise's reps-only
 * setting and a machine's own unit
 */

const savedState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes') ?? 'null'));
const miniSetsOnPhone = async (page: Page, exercise: string, setIdx = 0) =>
	(await savedState(page)).workoutExercises.find((ex: { name: string }) => ex.name === exercise).sets[setIdx].miniSets;
const box = (page: Page, exercise: string, set: number, field: 'load' | 'reps' | 'RIR') =>
	page.locator(`[id="${exercise.replaceAll(' ', '\\ ')}-set-${set}-${field}"]`);
const miniBox = (page: Page, exercise: string, set: number, mini: number, field: 'load' | 'reps' | 'RIR') =>
	page.locator(`[id="${exercise.replaceAll(' ', '\\ ')}-set-${set}-mini-set-${mini}-${field}"]`);

/** A routine "Drop day" with one drop-set exercise, started */
async function startDropDay(page: Page, userId: string, exercise: { name: string; repsOnly?: boolean }) {
	const created = await prisma.exercise.create({
		data: { userId, name: exercise.name, targetMuscleGroup: 'SideDelts', repsOnly: exercise.repsOnly ?? false }
	});
	await prisma.exerciseSplit.create({
		data: {
			userId,
			name: 'My routines',
			exerciseSplitDays: {
				create: [
					{
						name: 'Drop day',
						dayIndex: 0,
						exercises: {
							create: [
								{
									exerciseIndex: 0,
									exerciseId: created.id,
									name: created.name,
									targetMuscleGroup: 'SideDelts',
									sets: 2,
									setType: 'Drop',
									repRangeStart: 10,
									repRangeEnd: 20
								}
							]
						}
					}
				]
			}
		}
	});
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Drop day');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(box(page, exercise.name, 1, 'reps')).toBeVisible();
}

test('mini-sets added, typed in and removed are kept on the phone: a reload brings back what was there', async ({
	page,
	userData
}) => {
	await startDropDay(page, userData.userId, { name: 'Lateral raises' });
	const name = 'Lateral raises';
	await page.getByLabel(`add-mini-set-to-set-1-of-${name}`).click();
	// Kept at once, though nothing is typed in it yet
	expect(await miniSetsOnPhone(page, name)).toHaveLength(1);
	await miniBox(page, name, 1, 1, 'load').fill('12.5');
	await miniBox(page, name, 1, 1, 'reps').fill('9');
	await miniBox(page, name, 1, 1, 'RIR').fill('1');
	await expect.poll(async () => (await miniSetsOnPhone(page, name))[0]).toMatchObject({ load: 12.5, reps: 9, RIR: 1 });

	await page.reload();
	await expect(miniBox(page, name, 1, 1, 'reps')).toHaveValue('9');
	await expect(miniBox(page, name, 1, 1, 'load')).toHaveValue('12.5');

	// Its set ticked first (a mini-set follows it), then the mini-set; removed with "-": it stays removed after a
	// reload, not back ticked
	await box(page, name, 1, 'load').fill('15');
	await box(page, name, 1, 'reps').fill('12');
	await box(page, name, 1, 'RIR').fill('2');
	await page.getByTestId(`${name}-set-1-action`).click();
	await expect(page.getByTestId(`${name}-set-1-action`)).toHaveAttribute('aria-checked', 'true');
	await page.getByTestId(`${name}-set-1-mini-set-1-action`).click();
	await expect(page.getByTestId(`${name}-set-1-mini-set-1-action`)).toHaveAttribute('aria-checked', 'true');
	await page.getByLabel(`remove-mini-set-from-set-1-of-${name}`).click();
	expect(await miniSetsOnPhone(page, name)).toHaveLength(0);
	await page.reload();
	await expect(box(page, name, 1, 'reps')).toBeVisible();
	await expect(page.getByLabel(`remove-mini-set-from-set-1-of-${name}`)).toBeDisabled();
});

test('a drop set of a reps-only exercise: its mini-sets have no load to enter, and tick without one', async ({
	page,
	userData
}) => {
	const name = 'Sit-ups';
	await startDropDay(page, userData.userId, { name, repsOnly: true });
	await page.getByLabel(`add-mini-set-to-set-1-of-${name}`).click();
	await expect(page.getByTestId(`${name}-set-1-mini-set-1-no-load`)).toBeVisible();
	await expect(miniBox(page, name, 1, 1, 'load')).toHaveCount(0);

	// The set above it first (it has no load box either), then the mini-set with just reps and RIR
	await box(page, name, 1, 'reps').fill('15');
	await box(page, name, 1, 'RIR').fill('2');
	await page.getByTestId(`${name}-set-1-action`).click();
	await expect(page.getByTestId(`${name}-set-1-action`)).toHaveAttribute('aria-checked', 'true');
	await miniBox(page, name, 1, 1, 'reps').fill('8');
	await miniBox(page, name, 1, 1, 'RIR').fill('0');
	await page.getByTestId(`${name}-set-1-mini-set-1-action`).click();
	await expect(page.getByTestId(`${name}-set-1-mini-set-1-action`)).toHaveAttribute('aria-checked', 'true');
	expect((await miniSetsOnPhone(page, name))[0]).toMatchObject({ load: 0, reps: 8, completed: true });
});

test('swapping an exercise for a reps-only one (⋯ → Edit) leaves no load box; also with no connection for suggestions', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	await prisma.exercise.create({
		data: { userId: userData.userId, name: 'Crunches', targetMuscleGroup: 'Abs', repsOnly: true }
	});
	await prisma.exercise.create({
		data: { userId: userData.userId, name: 'Leg raises', targetMuscleGroup: 'Abs', repsOnly: true }
	});
	// The suggestions for an exercise added during a workout are what said "reps only" until now: none arrive
	await page.route(/workouts\.suggestSets/, (route) => route.abort());
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);

	// Added straight as a reps-only exercise
	await quickAdd(page, ['Leg raises']);
	await expect(page.getByTestId('Leg raises-set-1-no-load')).toBeVisible();
	await expect(box(page, 'Leg raises', 1, 'load')).toHaveCount(0);

	// A weighted exercise, with a load typed, swapped for a reps-only one
	await quickAdd(page, ['Barbell rows']);
	await box(page, 'Barbell rows', 1, 'load').fill('60');
	await box(page, 'Barbell rows', 1, 'reps').fill('10');
	await editWorkoutExercise(page, 'Barbell rows');
	await pickExercise(page, 'Crunches');
	await page.getByRole('button', { name: 'Update' }).click();
	await expect(page.getByTestId('Crunches-set-1-no-load')).toBeVisible();
	await expect(box(page, 'Crunches', 1, 'load')).toHaveCount(0);
	// The set ticks with just its reps and RIR
	await box(page, 'Crunches', 1, 'reps').fill('20');
	await box(page, 'Crunches', 1, 'RIR').fill('2');
	await page.getByTestId('Crunches-set-1-action').click();
	await expect(page.getByTestId('Crunches-set-1-action')).toHaveAttribute('aria-checked', 'true');
	const state = await savedState(page);
	expect(Object.keys(state.repsOnly).sort()).toEqual(['Crunches', 'Leg raises']);
});

test('replacing an exercise in a past workout with a machine in pounds: its loads move to pounds', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	await prisma.exercise.create({
		data: {
			userId,
			name: 'Row machine',
			targetMuscleGroup: 'Lats',
			machineWeights: [50, 100, 150, 200],
			machineUnit: 'LB'
		}
	});
	const startedAt = new Date(Date.now() - 86400000);
	const workout = await prisma.workout.create({
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
						weightUnit: 'KG',
						sets: { create: [{ setIndex: 0, reps: 10, load: 45.36, RIR: 2, skipped: false }] }
					}
				]
			}
		}
	});
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'Replace' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Row machine', exact: true }).click();
	await expect(page.getByText('Replaced with Row machine')).toBeVisible();

	// The machine is in pounds (it can't be switched), and the 45.36 kg logged is 100 lb
	await expect(page.getByTestId('Row machine-load-header')).toContainText('LB');
	await expect(page.getByTestId('Row machine-unit-toggle')).toHaveCount(0);
	const row = (await savedState(page)).workoutExercises.find((ex: { name: string }) => ex.name === 'Row machine');
	expect(row.weightUnit).toBe('LB');
	expect(row.sets[0].load).toBeCloseTo(100, 0);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.waitForURL('/workouts');
	const saved = await prisma.workoutExercise.findFirstOrThrow({
		where: { workoutId: workout.id },
		include: { sets: true }
	});
	expect(saved).toMatchObject({ name: 'Row machine', weightUnit: 'LB' });
	// Stored in kg, as always
	expect(saved.sets[0].load).toBeCloseTo(45.36, 1);
});

test('an assisted machine has no Warm up in its menu; a weighted exercise does', async ({ page, userData }) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	await prisma.exercise.create({
		data: {
			userId: userData.userId,
			name: 'Assisted pull-up',
			targetMuscleGroup: 'Lats',
			machineWeights: [10, 20, 30],
			machineUnit: 'KG',
			assisted: true
		}
	});
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await quickAdd(page, ['Barbell rows', 'Assisted pull-up']);

	await page.getByTestId('Barbell rows-menu-button').click();
	await expect(page.getByRole('menuitem', { name: 'Warm up' })).toBeVisible();
	await page.keyboard.press('Escape');
	// One menu open at a time: the first has closed before the second opens
	await expect(page.getByRole('menu')).toHaveCount(0);
	await page.getByTestId('Assisted pull-up-menu-button').click();
	await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
	await expect(page.getByRole('menuitem', { name: 'Warm up' })).toHaveCount(0);
});

test('History of an exercise never done: its chart says there are no sessions, not "Fetching performances" for ever', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await quickAdd(page, ['Barbell rows']);
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'History' });
	await sheet.getByText('Show progression chart?').click();
	await expect(sheet.getByTestId('chart-no-sessions')).toHaveText('No sessions to chart');
	await expect(sheet.getByText('Fetching performances')).toHaveCount(0);
});
