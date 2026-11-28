import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { boxNumber, createExercises, pickRoutine, quickAdd } from './commonFunctions';
import { solveBergerFormula } from '../../src/lib/utils/workoutUtils';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const KG_PER_LB = 0.45359237;

/**
 * The overload formula where it can't compare (0 kg against a weight) says nothing instead of -46,009%, works in kg
 * whatever unit the workout shows, and the workout comparison chart counts what was done
 */

type SeedSet = { reps: number; load: number; skipped?: boolean };

async function seedPast(
	userId: string,
	daysAgo: number,
	sets: SeedSet[],
	{ name = 'Barbell rows', weightUnit = 'KG' as 'KG' | 'LB' } = {}
) {
	const exercise = await prisma.exercise.upsert({
		where: { userId_name: { userId, name } },
		create: { userId, name, targetMuscleGroup: 'Lats' },
		update: {}
	});
	const startedAt = new Date(Date.now() - daysAgo * DAY);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 3600000),
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						name,
						exerciseId: exercise.id,
						targetMuscleGroup: 'Lats',
						setType: 'Straight',
						repRangeStart: 8,
						repRangeEnd: 15,
						weightUnit,
						sets: {
							create: sets.map((set, setIndex) => ({
								setIndex,
								reps: set.reps,
								load: set.load,
								RIR: 2,
								skipped: set.skipped ?? false
							}))
						}
					}
				]
			}
		}
	});
}

const box = (page: Page, exercise: string, set: number, field: 'load' | 'reps' | 'RIR') =>
	page.locator(`[id="${exercise.replaceAll(' ', '\\ ')}-set-${set}-${field}"]`);

async function startBlank(page: Page) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
}

/** A second (and third...) set: a quick-added exercise starts with one */
async function addSets(page: Page, exercise: string, count: number) {
	for (let n = 0; n < count; n++) await page.getByTestId(`${exercise}-add-set`).click();
	await expect(page.getByTestId(`${exercise}-set-${count + 1}-action`)).toBeVisible();
}

async function tickSet(page: Page, exercise: string, set: number, load: string, reps = '10') {
	await box(page, exercise, set, 'load').fill(load);
	await box(page, exercise, set, 'reps').fill(reps);
	await box(page, exercise, set, 'RIR').fill('2');
	await page.getByTestId(`${exercise}-set-${set}-action`).click();
	await expect(page.getByTestId(`${exercise}-set-${set}-action`)).toHaveAttribute('aria-checked', 'true');
}

test('Compare: 0 kg against a weight shows no percentage; weights compare as before', async ({ page, userData }) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	await seedPast(userData.userId, 2, [
		{ reps: 10, load: 0 },
		{ reps: 10, load: 60 }
	]);
	await startBlank(page);
	await quickAdd(page, ['Barbell rows']);
	await addSets(page, 'Barbell rows', 1);
	await tickSet(page, 'Barbell rows', 1, '20');
	await tickSet(page, 'Barbell rows', 2, '62.5');
	await page.getByLabel('compare-exercises').click();

	// Set 2: 60 → 62.5 kg is a few percent; set 1: 0 → 20 kg has no percentage (it was -46,009%)
	const changes = page.getByTestId('set-volume-change');
	await expect(changes).toHaveCount(1);
	const expected = solveBergerFormula({
		variableToSolve: 'OverloadPercentage',
		knownValues: {
			oldSet: { reps: 10, load: 60, RIR: 2, miniSets: [] },
			newSet: { reps: 10, load: 62.5, RIR: 2, miniSets: [] },
			bodyweightFraction: null
		}
	});
	await expect(changes).toHaveText(`${expected.toFixed(2)}%`);
	await expect(page.getByText(/Infinity|NaN|46009/)).toHaveCount(0);
});

test('Compare: loads in pounds are put through the formula in kg', async ({ page, userData }) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	await prisma.userSettings.upsert({
		where: { userId: userData.userId },
		create: { userId: userData.userId, homeWeightUnit: 'LB' },
		update: { homeWeightUnit: 'LB' }
	});
	// 2 lb last time (stored in kg), 4 lb now: small loads, where the unit makes a difference to the formula
	await seedPast(userData.userId, 2, [{ reps: 10, load: 2 * KG_PER_LB }], { weightUnit: 'LB' });
	await startBlank(page);
	await quickAdd(page, ['Barbell rows']);
	await expect(page.getByTestId('Barbell rows-load-header')).toContainText('LB');
	await tickSet(page, 'Barbell rows', 1, '4');
	await page.getByLabel('compare-exercises').click();

	const expected = solveBergerFormula({
		variableToSolve: 'OverloadPercentage',
		knownValues: {
			oldSet: { reps: 10, load: 2 * KG_PER_LB, RIR: 2, miniSets: [] },
			newSet: { reps: 10, load: 4 * KG_PER_LB, RIR: 2, miniSets: [] },
			bodyweightFraction: null
		}
	});
	await expect(page.getByTestId('set-volume-change')).toHaveText(`${expected.toFixed(2)}%`);
});

test('exercise stats, relative overload: a set is charted from the first session that had it; 0 kg and skipped sets leave gaps', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	const name = 'Lateral raises';
	await seedPast(userId, 6, [{ reps: 10, load: 0 }], { name });
	await seedPast(
		userId,
		4,
		[
			{ reps: 10, load: 20 },
			{ reps: 10, load: 20 }
		],
		{ name }
	);
	await seedPast(
		userId,
		2,
		[
			{ reps: 10, load: 30 },
			{ reps: 10, load: 25 }
		],
		{ name }
	);
	// Its second set skipped
	await seedPast(
		userId,
		1,
		[
			{ reps: 10, load: 30 },
			{ reps: 0, load: 0, skipped: true }
		],
		{ name }
	);
	await page.goto('/stats?exercise=Lateral%20raises');
	await page.getByLabel('Menu').click();
	await page.getByLabel('Relative overload').click();
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-type', 'relative-overload');

	const overload = solveBergerFormula({
		variableToSolve: 'OverloadPercentage',
		knownValues: {
			oldSet: { reps: 10, load: 20, RIR: 2, miniSets: [] },
			newSet: { reps: 10, load: 25, RIR: 2, miniSets: [] },
			bodyweightFraction: null
		}
	});
	// Set 1 starts from 0 kg: nothing compares with it. Set 2 starts at the second session (the first had no set
	// 2); the skipped set 2 of the last session is a gap
	const values = JSON.parse((await page.getByTestId('exercise-chart').getAttribute('data-values'))!);
	expect(values).toEqual([
		[0, null, null, null],
		[null, 0, Math.round(overload * 10) / 10, null]
	]);
});

test('the workout comparison chart counts what was done: last time\u2019s skipped set is left out of its sets', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	// Last time: two sets done and a skipped one
	await seedPast(userData.userId, 2, [
		{ reps: 10, load: 60 },
		{ reps: 10, load: 60 },
		{ reps: 0, load: 0, skipped: true }
	]);
	await startBlank(page);
	await quickAdd(page, ['Barbell rows']);
	await addSets(page, 'Barbell rows', 2);
	await tickSet(page, 'Barbell rows', 1, '60');
	await tickSet(page, 'Barbell rows', 2, '60');
	// The third set is left unticked and removed on the way out
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Remove and finish' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);

	const chart = page.getByTestId('comparison-chart');
	// 2 sets of 60 × 10 on each side (last time's third set was skipped)
	await expect(chart).toHaveAttribute('data-values', '1200,1200');
	await page.getByRole('combobox').filter({ hasText: 'Work volume' }).click();
	await page.getByRole('option', { name: 'Sets' }).click();
	await expect(chart).toHaveAttribute('data-values', '2,2');
});

const hint = (page: Page, exercise: string, set: number) => page.getByTestId(`${exercise}-set-${set}-reps-hint`);

test('the reps hint: none where the formula can’t compare (help without bodyweight)', async ({ page, userData }) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	// Two amounts of help counted without bodyweight: 20 → 10 would "suggest more reps for less help"
	await seedPast(userData.userId, 2, [{ reps: 10, load: -20 }]);
	await startBlank(page);
	await quickAdd(page, ['Barbell rows']);
	await expect(box(page, 'Barbell rows', 1, 'load')).toHaveAttribute('data-suggested', 'true');
	const start = Number(
		await box(page, 'Barbell rows', 1, 'load')
			.inputValue()
			.then((v) => v || '-20')
	);
	await box(page, 'Barbell rows', 1, 'load').fill(String(start + 10));
	await expect(box(page, 'Barbell rows', 1, 'load')).toHaveAttribute('data-suggested', 'false');
	await expect(hint(page, 'Barbell rows', 1)).toHaveCount(0);
});

test('the reps hint: loads in pounds go through the formula in kg', async ({ page, userData }) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Lats' }]);
	await prisma.userSettings.upsert({
		where: { userId: userData.userId },
		create: { userId: userData.userId, homeWeightUnit: 'LB' },
		update: { homeWeightUnit: 'LB' }
	});
	// 1 lb × 25 last time: at this size the unit changes the hint (8.2 reps from kg, 8.95 from pounds)
	await seedPast(userData.userId, 2, [{ reps: 25, load: 1 * KG_PER_LB }], { weightUnit: 'LB' });
	await startBlank(page);
	await quickAdd(page, ['Barbell rows']);
	const load = box(page, 'Barbell rows', 1, 'load');
	await expect(load).toHaveAttribute('data-suggested', 'true');
	const [startLoad, startReps, startRIR] = await Promise.all(
		(['load', 'reps', 'RIR'] as const).map(async (field) =>
			Number(await boxNumber(box(page, 'Barbell rows', 1, field)))
		)
	);
	expect(startLoad).toBe(1);
	const heavier = startLoad + 0.5;
	await load.fill(String(heavier));
	const reps = Math.round(
		solveBergerFormula({
			variableToSolve: 'NewReps',
			knownValues: {
				oldSet: { reps: startReps, load: startLoad * KG_PER_LB, RIR: startRIR, miniSets: [] },
				newSet: { load: heavier * KG_PER_LB, RIR: startRIR, miniSets: [] },
				bodyweightFraction: null,
				overloadPercentage: 0
			}
		})
	);
	await expect(hint(page, 'Barbell rows', 1)).toHaveText(
		`At ${heavier} lb, aim for about ${reps} ${reps === 1 ? 'rep' : 'reps'} · Use ${reps}`
	);
});
