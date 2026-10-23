import { expect, test, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createExercises, pickRoutine, quickAdd } from './commonFunctions';
import { bestSetEstimate } from '../../src/lib/utils/oneRepMax';
import { getExerciseVolume, getSetVolume } from '../../src/lib/utils/workoutUtils';
import { KG_PER_LB } from '../../src/lib/utils/weightUnits';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

type SeedSet = { reps: number; load: number; RIR?: number; skipped?: boolean };

/** A saved workout `daysAgo` days ago with one exercise; bodyweight 80 kg */
async function seedWorkout(
	userId: string,
	daysAgo: number,
	name: string,
	sets: SeedSet[],
	{ weightUnit = 'KG' as 'KG' | 'LB' | 'LEVEL', bodyweightFraction = null as number | null } = {}
) {
	const startedAt = new Date(Date.now() - daysAgo * DAY);
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
						name,
						targetMuscleGroup: 'Chest',
						bodyweightFraction,
						setType: 'Straight',
						repRangeStart: 5,
						repRangeEnd: 10,
						weightUnit,
						sets: {
							create: sets.map((set, setIndex) => ({
								setIndex,
								reps: set.reps,
								load: set.load,
								RIR: set.RIR ?? 2,
								skipped: set.skipped ?? false
							}))
						}
					}
				]
			}
		},
		include: { workoutExercises: { include: { sets: { include: { miniSets: true } } } } }
	});
}

const chart = (page: Page) => page.getByTestId('exercise-chart');
const chartValues = async (page: Page) => JSON.parse((await chart(page).getAttribute('data-values')) ?? '[]');
const round2 = (value: number) => Math.round(value * 100) / 100;

async function setHomeUnit(userId: string, homeWeightUnit: 'KG' | 'LB') {
	await prisma.userSettings.upsert({
		where: { userId },
		create: { userId, homeWeightUnit },
		update: { homeWeightUnit }
	});
}

test('exercise chart: Estimated 1RM by default, Set and Session volume, Show sets only for per-set lines, in the home unit', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await createExercises(userId, ['Barbell bench press']);
	const seeded = [];
	for (const [daysAgo, sets] of [
		[
			20,
			[
				{ reps: 8, load: 70 },
				{ reps: 6, load: 70 }
			]
		],
		[
			13,
			[
				{ reps: 8, load: 75 },
				{ reps: 8, load: 75, skipped: true }
			]
		],
		[
			6,
			[
				{ reps: 8, load: 77.5 },
				{ reps: 7, load: 77.5 }
			]
		],
		[
			1,
			[
				{ reps: 8, load: 80 },
				{ reps: 6, load: 80 }
			]
		]
	] as [number, SeedSet[]][]) {
		seeded.push((await seedWorkout(userId, daysAgo, 'Barbell bench press', sets)).workoutExercises[0]);
	}
	const withoutSkipped = seeded.map((ex) => ({ ...ex, sets: ex.sets.filter((set) => !set.skipped) }));
	const estimates = withoutSkipped.map((ex) => round2(bestSetEstimate(ex, 80, false)!.estimateKg));

	await page.goto('/stats?exercise=Barbell%20bench%20press');
	await expect(chart(page)).toHaveAttribute('data-points', '4');
	await expect(chart(page)).toHaveAttribute('data-type', 'estimated-1rm');
	await expect.poll(() => chartValues(page)).toEqual([estimates]);
	const change = estimates[3] - estimates[0];
	await expect(page.getByTestId('chart-summary')).toHaveText(
		`Estimated 1RM · latest ${estimates[3].toFixed(2)} kg · +${change.toFixed(2)}`
	);

	// The menu: Estimated 1RM first; Show sets greyed, with why
	await page.getByLabel('Menu').click();
	await expect(page.getByLabel('Estimated 1RM')).toBeChecked();
	await expect(page.getByRole('radio')).toHaveCount(6);
	await expect(page.getByTestId('show-sets-reason')).toHaveText(
		'Not used by Estimated 1RM: one line for the whole workout'
	);
	await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled();

	// Set volume: a line per set, skipped sets left out; Show sets back on and filtering it
	await page.getByLabel('Set volume').click();
	await expect(chart(page)).toHaveAttribute('data-type', 'set-volume');
	await expect(page.getByTestId('show-sets-reason')).toHaveCount(0);
	const setVolumes = (setIdx: number) =>
		withoutSkipped.map((ex) => (ex.sets[setIdx] ? round2(getSetVolume(ex.sets[setIdx], 80, null)) : null));
	await expect.poll(() => chartValues(page)).toEqual([setVolumes(0), setVolumes(1)]);
	await page.getByRole('button', { name: '2', exact: true }).click();
	await expect.poll(() => chartValues(page)).toEqual([setVolumes(0)]);

	// Session volume: one line, the workout's volume as on the Workouts list
	await page.getByLabel('Session volume').click();
	await expect(chart(page)).toHaveAttribute('data-type', 'session-volume');
	await expect.poll(() => chartValues(page)).toEqual([seeded.map((ex) => round2(getExerciseVolume(ex, 80)))]);
	await expect(page.getByTestId('show-sets-reason')).toHaveText(
		'Not used by Session volume: one line for the whole workout'
	);
	await page.keyboard.press('Escape');

	// In lb at home: the same estimates in lb
	await setHomeUnit(userId, 'LB');
	try {
		await page.reload();
		await expect(chart(page)).toHaveAttribute('data-type', 'estimated-1rm');
		const inLb = withoutSkipped.map((ex) => round2(bestSetEstimate(ex, 80, false)!.estimateKg / KG_PER_LB));
		await expect.poll(() => chartValues(page)).toEqual([inLb]);
		await expect(page.getByTestId('chart-summary')).toContainText(`latest ${inLb[3].toFixed(2)} lb`);
	} finally {
		await setHomeUnit(userId, 'KG');
	}
});

test('exercise chart: one workout has no change figure; bodyweight adds the share; levels have no 1RM or volume', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await createExercises(userId, [{ name: 'Weighted pull-ups', targetMuscleGroup: 'Lats', bodyweightFraction: 0.8 }]);
	// Pull-ups with no added weight still have an estimate: 80 kg × 0.8 = 64 kg, 1 rep at RIR 0
	await seedWorkout(userId, 1, 'Weighted pull-ups', [{ reps: 1, load: 0, RIR: 0 }], { bodyweightFraction: 0.8 });
	await page.goto('/stats?exercise=Weighted%20pull-ups');
	await expect(chart(page)).toHaveAttribute('data-type', 'estimated-1rm');
	await expect.poll(() => chartValues(page)).toEqual([[64]]);
	await expect(page.getByTestId('chart-summary')).toHaveText('Estimated 1RM · latest 64.00 kg incl. BW');
	await page.getByLabel('Menu').click();
	await expect(page.getByLabel('Load + BW')).toBeVisible();
	await page.keyboard.press('Escape');

	// Levels: the level and reps, nothing estimated
	await createExercises(userId, ['Chest press machine']);
	await seedWorkout(userId, 1, 'Chest press machine', [{ reps: 10, load: 7 }], { weightUnit: 'LEVEL' });
	await page.goto('/stats?exercise=Chest%20press%20machine');
	await expect(chart(page)).toHaveAttribute('data-type', 'absolute-load');
	await expect(page.getByTestId('chart-summary')).toHaveCount(0);
	await page.getByLabel('Menu').click();
	await expect(page.getByLabel('Level', { exact: true })).toBeChecked();
	for (const type of ['Estimated 1RM', 'Set volume', 'Session volume']) {
		await expect(page.getByLabel(type)).toHaveCount(0);
	}
});

/** A blank workout today, bodyweight 80 kg, with these exercises */
async function startBlankWorkout(page: Page, exercises: string[], unit: 'Kilograms' | 'Pounds' = 'Kilograms') {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	await expect(page.getByRole('main')).toContainText('This gym uses');
	// With no routines, a blank workout is all there is
	const blank = page.getByRole('radio', { name: /^Blank workout/ });
	await expect(blank.or(page.getByText('No routines yet'))).toBeVisible();
	if (await blank.isVisible()) await pickRoutine(page, 'Blank workout');
	await page.getByLabel(unit).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await quickAdd(page, exercises);
}

async function openWarmUp(page: Page, exercise: string) {
	await page.getByTestId(`${exercise}-menu-button`).click();
	await page.getByRole('menuitem', { name: 'Warm up' }).click();
	await expect(warmUpSheet(page)).toBeVisible();
}

const warmUpSheet = (page: Page) => page.getByRole('dialog').filter({ hasText: 'Total warm-up sets' });

async function closeWarmUp(page: Page) {
	await page.keyboard.press('Escape');
	await expect(warmUpSheet(page)).toHaveCount(0);
	await expect(page.getByRole('menu')).toHaveCount(0);
}

const warmUpRows = (page: Page) =>
	warmUpSheet(page)
		.getByRole('row')
		.filter({ has: page.getByRole('cell') });

test('Warm up: the best of the last 3 times, a light day or an older one not counted; table and calculator', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await createExercises(userId, ['Barbell bench press']);
	const bench = 'Barbell bench press';
	// Newest first: all skipped (still one of the 3), a light day, the best, then an older heavier one left out
	await seedWorkout(userId, 1, bench, [{ reps: 8, load: 90, skipped: true }]);
	await seedWorkout(userId, 3, bench, [{ reps: 8, load: 40 }]);
	const best = await seedWorkout(userId, 5, bench, [{ reps: 8, load: 80, RIR: 2 }]);
	await seedWorkout(userId, 7, bench, [{ reps: 8, load: 100, RIR: 2 }]);

	await startBlankWorkout(page, [bench]);
	await openWarmUp(page, bench);
	const dialog = warmUpSheet(page);
	await expect(dialog.getByLabel('One rep max (kg)')).toHaveValue('101.27');
	const date = best.startedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	await expect(dialog.getByTestId('one-rep-max-source')).toHaveText(
		`Best of your last 3 times: ${date}, 80 kg × 8, RIR 2`
	);

	// 4 sets: percentages to 0.1, loads on the usual 2.5 kg steps
	await dialog.getByLabel('Total warm-up sets').fill('4');
	await dialog.getByRole('button', { name: 'Generate warm up' }).click();
	await expect(warmUpRows(page)).toHaveCount(4);
	await expect(warmUpRows(page).locator('td:nth-child(4)')).toHaveText(['40', '53.3', '66.7', '80']);
	await expect(warmUpRows(page).locator('td:nth-child(2)')).toHaveText(['10', '8', '5', '3']);
	await expect(warmUpRows(page).locator('td:nth-child(3)')).toHaveText(['40.0', '55.0', '67.5', '80.0']);

	// 1 set: 50% × 8 (was NaN)
	await dialog.getByLabel('Total warm-up sets').fill('1');
	await dialog.getByRole('button', { name: 'Generate warm up' }).click();
	await expect(warmUpRows(page)).toHaveCount(1);
	await expect(warmUpRows(page).locator('td')).toHaveText(['1', '8', '50.0', '50']);

	// The calculator counts reps in reserve, like the chart
	await dialog.getByRole('button', { name: '1-RM calculator' }).click();
	await page.locator('#weight').fill('100');
	await page.locator('#reps').fill('8');
	await page.locator('#rir').fill('2');
	await page.getByRole('button', { name: 'Calculate' }).click();
	await expect(dialog.getByLabel('One rep max (kg)')).toHaveValue('126.59');
	await expect(dialog.getByTestId('one-rep-max-source')).toHaveCount(0);

	// Nothing to estimate (0 kg): it says why and stays open, keeping the last estimate
	await dialog.getByRole('button', { name: '1-RM calculator' }).click();
	await page.locator('#weight').fill('0');
	await page.getByRole('button', { name: 'Calculate' }).click();
	await expect(page.getByTestId('one-rep-max-calculator-error')).toHaveText(
		'Enter a weight above 0 and at least 1 rep'
	);
	await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
	await expect(dialog.getByLabel('One rep max (kg)')).toHaveValue('126.59');
	// A good one clears the message and closes the calculator
	await page.locator('#weight').fill('80');
	await page.getByRole('button', { name: 'Calculate' }).click();
	await expect(page.getByRole('button', { name: 'Calculate' })).toHaveCount(0);
	await expect(dialog.getByLabel('One rep max (kg)')).toHaveValue('101.27');
	await dialog.getByRole('button', { name: '1-RM calculator' }).click();
	await expect(page.getByTestId('one-rep-max-calculator-error')).toHaveCount(0);
});

test('Warm up: no history or offline, from set 1 with the same formula; lb shown in lb; a late answer for another exercise is ignored', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await createExercises(userId, ['Barbell bench press', 'Barbell rows']);
	await seedWorkout(userId, 2, 'Barbell rows', [{ reps: 8, load: 80, RIR: 2 }]);
	await seedWorkout(userId, 2, 'Barbell bench press', [{ reps: 10, load: 100, RIR: 0 }]);

	// The bench history answers late: opened, closed, then rows opened
	let releaseBench = () => {};
	const benchHeld = new Promise<void>((resolve) => (releaseBench = resolve));
	await page.route(/getExerciseHistory/, async (route) => {
		if (decodeURIComponent(route.request().url()).includes('Barbell bench press')) await benchHeld;
		await route.continue();
	});

	await startBlankWorkout(page, ['Barbell bench press', 'Barbell rows'], 'Pounds');
	await openWarmUp(page, 'Barbell bench press');
	await closeWarmUp(page);
	await openWarmUp(page, 'Barbell rows');
	const dialog = warmUpSheet(page);
	// 101.27 kg in lb
	await expect(dialog.getByLabel('One rep max (lb)')).toHaveValue(String(round2(101.2737 / KG_PER_LB)));
	await expect(dialog.getByTestId('one-rep-max-source')).toContainText('lb × 8, RIR 2');
	releaseBench();
	await page.waitForTimeout(500);
	await expect(dialog.getByLabel('One rep max (lb)')).toHaveValue(String(round2(101.2737 / KG_PER_LB)));
	await closeWarmUp(page);
	await page.unroute(/getExerciseHistory/);

	// Offline: from set 1 of today, with the same formula (80 lb × 8, RIR 2 → 101.27 lb)
	await page.route(/getExerciseHistory/, (route) => route.abort());
	const id = 'Barbell\\ rows';
	await page.locator(`[id="${id}-set-1-load"]`).fill('80');
	await page.locator(`[id="${id}-set-1-reps"]`).fill('8');
	await page.locator(`[id="${id}-set-1-RIR"]`).fill('2');
	await openWarmUp(page, 'Barbell rows');
	await expect(dialog.getByLabel('One rep max (lb)')).toHaveValue('101.27');
	await expect(dialog.getByTestId('one-rep-max-source')).toHaveCount(0);
});

test('Warm up isn’t offered for bodyweight or reps-only exercises', async ({ page, userData }) => {
	const userId = userData.userId;
	await createExercises(userId, [
		{ name: 'Pull-ups', targetMuscleGroup: 'Lats', bodyweightFraction: 0.8 },
		{ name: 'Sit-ups', targetMuscleGroup: 'Abs' }
	]);
	await prisma.exercise.update({ where: { userId_name: { userId, name: 'Sit-ups' } }, data: { repsOnly: true } });
	await startBlankWorkout(page, ['Pull-ups', 'Sit-ups']);
	for (const exercise of ['Pull-ups', 'Sit-ups']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await expect(page.getByRole('menuitem', { name: 'History' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Warm up' })).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('menu')).toHaveCount(0);
	}
});

test('an old skipped set reads “uncompleted” in the saved workout and when editing it', async ({ page, userData }) => {
	const userId = userData.userId;
	await createExercises(userId, ['Barbell bench press']);
	const workout = await seedWorkout(userId, 1, 'Barbell bench press', [
		{ reps: 8, load: 80 },
		{ reps: 8, load: 80, skipped: true }
	]);
	await page.goto(`/workouts/${workout.id}`);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await expect(page.getByText('uncompleted', { exact: true })).toBeVisible();
	await expect(page.getByText('skipped', { exact: true })).toHaveCount(0);

	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await expect(page.getByText('uncompleted', { exact: true })).toBeVisible();
	await expect(page.getByText('skipped', { exact: true })).toHaveCount(0);
});
