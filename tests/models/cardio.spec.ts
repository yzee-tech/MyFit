import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createExercises, editWorkoutExercise, expectBox, pickRoutine, quickAdd, saveWorkout } from './commonFunctions';

const prisma = new PrismaClient();

/** Starts a blank workout at 80 kg, on the exercises screen */
async function startBlankWorkout(page: Page) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	// With no routines, the start page is already a blank workout and has no picker.
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
}

const box = (page: Page, exercise: string, set: number, field: 'load' | 'reps' | 'RIR' | 'time' | 'distance') =>
	page.locator(`[id="${exercise.replaceAll(' ', '\\ ')}-set-${set}-${field}"]`);

/** Last time: a 5 km run in 26:00, and 2 × 30 s on the bike at level 8 */
async function logPastCardio(userId: string) {
	const run = await prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name: 'Run' } } });
	const bike = await prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name: 'Bike' } } });
	const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
	const shared = { setType: 'V2' as const, repRangeStart: 8, repRangeEnd: 15 };
	return prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: twoDaysAgo,
			endedAt: new Date(twoDaysAgo.getTime() + 3600000),
			workoutExercises: {
				create: [
					{
						...shared,
						exerciseIndex: 0,
						exerciseId: run.id,
						name: 'Run',
						targetMuscleGroup: 'Cardio',
						sets: {
							create: [
								{ setIndex: 0, reps: 0, load: 0, RIR: 0, skipped: false, timeSeconds: 1560, distanceMeters: 5000 }
							]
						}
					},
					{
						...shared,
						exerciseIndex: 1,
						exerciseId: bike.id,
						name: 'Bike',
						targetMuscleGroup: 'Cardio',
						weightUnit: 'LEVEL',
						sets: {
							create: [0, 1].map((setIndex) => ({
								setIndex,
								reps: 0,
								load: 8,
								RIR: 0,
								skipped: false,
								timeSeconds: 30,
								distanceMeters: null
							}))
						}
					}
				]
			}
		}
	});
}

test('New exercise: how it’s measured, with a distance unit for distances and levels for a cardio machine', async ({
	page,
	userData
}) => {
	await page.goto('/exercises');
	await page.getByRole('button', { name: 'New exercise', exact: true }).click();
	await page.getByLabel('Name', { exact: true }).fill('Run');
	// The built-in Running suggestion fills in distance and time in km
	await page.getByTestId('built-in-suggestions').getByRole('button', { name: 'Running' }).click();
	await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Running');
	await expect(page.getByRole('radio', { name: 'Measured in distance and time' })).toHaveAttribute('data-state', 'on');
	await expect(page.getByRole('radio', { name: 'Distance in km' })).toHaveAttribute('data-state', 'on');
	// Cardio has no reps only, no bodyweight share, and only levels for a machine
	await expect(page.getByLabel('Reps only')).toBeHidden();
	await expect(page.getByLabel('Counts bodyweight')).toBeHidden();
	await page.getByLabel('Name', { exact: true }).fill('Run');
	await page.getByRole('radio', { name: 'Distance in mi' }).click();
	await page.getByRole('button', { name: 'Create exercise' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise created' })).toBeVisible();

	await page.goto('/exercises');
	await page.getByRole('button', { name: 'New exercise', exact: true }).click();
	await page.getByLabel('Name', { exact: true }).fill('Bike');
	await page.getByRole('combobox', { name: 'Muscle group' }).click();
	await page.getByRole('option', { name: 'Cardio' }).click();
	await expect(page.getByRole('radio', { name: 'Measured in time' })).toHaveAttribute('data-state', 'on');
	await expect(page.getByRole('radio', { name: 'Measured in reps and weight' })).toBeDisabled();
	await expect(page.getByRole('radio', { name: 'Distance in km' })).toHaveCount(0);
	await page.getByLabel('Machine', { exact: true }).click();
	// A cardio machine shows levels: there's no weights/levels choice to make
	await expect(page.getByTestId('exercise-form-machine-settings')).toContainText('Each interval logs its level');
	await expect(page.getByTestId('exercise-form-machine-settings').getByText('It shows')).toBeHidden();
	await page.getByRole('button', { name: 'Create exercise' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise created' })).toBeVisible();

	const run = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Run' } }
	});
	expect(run).toMatchObject({
		measure: 'DistanceTime',
		distanceUnit: 'MI',
		targetMuscleGroup: 'Cardio',
		repsOnly: false
	});
	const bike = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Bike' } }
	});
	expect(bike).toMatchObject({ measure: 'Time', distanceUnit: null, levelsFrom: 1, levelsTo: 20 });

	// The exercise page says how it's measured; the unit can still change
	await page.goto(`/exercises/${run.id}`);
	await expect(page.getByTestId('exercise-measure')).toHaveText('Distance & time in mi');
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await expect(page.getByRole('radio', { name: 'Measured in distance and time' })).toBeEnabled();
	await page.getByRole('radio', { name: 'Distance in km' }).click();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByTestId('exercise-measure')).toHaveText('Distance & time in km');
});

test('logging a run and bike intervals: distance and time boxes, pace, levels; saved with zeros for reps, weight and RIR', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, [
		{ name: 'Run', targetMuscleGroup: 'Cardio', measure: 'DistanceTime', distanceUnit: 'KM' },
		{ name: 'Bike', targetMuscleGroup: 'Cardio', measure: 'Time', levelsFrom: 1, levelsTo: 20, levelStep: 1 },
		{ name: 'Barbell rows', targetMuscleGroup: 'Traps' }
	]);
	await startBlankWorkout(page);
	await quickAdd(page, ['Run', 'Bike', 'Barbell rows']);

	// A run: Set | Previous | km | Time; no reps, weight or RIR
	await expect(page.getByTestId('Run-sets')).toHaveAttribute('data-measure', 'DistanceTime');
	await expect(page.getByTestId('Run-sets')).toContainText('Set Previous km Time');
	await expect(box(page, 'Run', 1, 'reps')).toHaveCount(0);
	await expect(box(page, 'Run', 1, 'RIR')).toHaveCount(0);
	await expect(box(page, 'Run', 1, 'load')).toHaveCount(0);
	await expect(page.getByTestId('Run-summary')).toHaveText('1 interval');
	await expect(page.getByTestId('Run-distance-unit')).toHaveText('KM');
	// A time box takes m:ss; the tick needs both numbers
	await page.getByTestId('Run-set-1-action').click();
	await expect(page.getByTestId('Run-missing')).toContainText('Set 1: enter distance and time');
	await box(page, 'Run', 1, 'distance').fill('5');
	await box(page, 'Run', 1, 'time').fill('26:00');
	await box(page, 'Run', 1, 'time').blur();
	await expect(page.getByTestId('Run-set-1-pace')).toHaveText('5:12 /km');
	// Not a time: the box goes back to what it held
	await box(page, 'Run', 1, 'time').fill('fast');
	await box(page, 'Run', 1, 'time').blur();
	await expect(box(page, 'Run', 1, 'time')).toHaveValue('26:00');
	// A bare number is minutes
	await box(page, 'Run', 1, 'time').fill('30');
	await box(page, 'Run', 1, 'time').blur();
	await expect(box(page, 'Run', 1, 'time')).toHaveValue('30:00');
	await expect(page.getByTestId('Run-set-1-pace')).toHaveText('6:00 /km');
	await page.getByTestId('Run-set-1-action').click();
	await expect(page.getByTestId('Run-set-1-action')).toHaveAttribute('aria-checked', 'true');

	// Bike intervals: a level and a time, and "Add interval"
	await expect(page.getByTestId('Bike-sets')).toContainText('Set Previous LVL Time');
	await expect(box(page, 'Bike', 1, 'distance')).toHaveCount(0);
	await page.getByRole('button', { name: 'Add an interval to Bike' }).click();
	await expect(page.getByTestId('Bike-summary')).toHaveText('2 intervals');
	for (const set of [1, 2]) {
		await box(page, 'Bike', set, 'load').fill('8');
		await box(page, 'Bike', set, 'time').fill('0:30');
		await box(page, 'Bike', set, 'time').blur();
		await page.getByTestId(`Bike-set-${set}-action`).click();
	}
	// Rows as ever
	await expect(page.getByTestId('Barbell rows-sets')).toContainText('Set Previous KG Reps RIR');
	await box(page, 'Barbell rows', 1, 'load').fill('40');
	await box(page, 'Barbell rows', 1, 'reps').fill('12');
	await box(page, 'Barbell rows', 1, 'RIR').fill('2');
	await page.getByTestId('Barbell rows-set-1-action').click();
	// Cardio has no Warm up (no weight to warm up to), and no unit to switch
	await page.getByTestId('Run-menu-button').click();
	await expect(page.getByRole('menuitem', { name: 'Warm up' })).toHaveCount(0);
	await page.keyboard.press('Escape');
	await expect(page.getByTestId('Run-unit-toggle')).toHaveCount(0);

	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await saveWorkout(page);

	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId },
		orderBy: { startedAt: 'desc' },
		include: {
			workoutExercises: { orderBy: { exerciseIndex: 'asc' }, include: { sets: { orderBy: { setIndex: 'asc' } } } }
		}
	});
	const [run, bike, rows] = saved.workoutExercises;
	expect(run.sets.map((set) => [set.timeSeconds, set.distanceMeters, set.reps, set.load, set.RIR])).toEqual([
		[1800, 5000, 0, 0, 0]
	]);
	expect(bike.weightUnit).toBe('LEVEL');
	expect(bike.sets.map((set) => [set.timeSeconds, set.distanceMeters, set.reps, set.load, set.RIR])).toEqual([
		[30, null, 0, 8, 0],
		[30, null, 0, 8, 0]
	]);
	expect(rows.sets.map((set) => [set.timeSeconds, set.distanceMeters, set.reps, set.load])).toEqual([
		[null, null, 12, 40]
	]);
	// Cardio adds no volume: the card shows the rows' 12 × 40 kg
	await expect(page.getByTestId('workout-volume').first()).toHaveText('Volume 480 kg');

	// The past workout reads km, time and pace; the bike its level and time
	await page.goto(`/workouts/${saved.id}`);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	const panel = page.getByRole('tabpanel');
	await expect(panel).toContainText('1 interval');
	await expect(panel.getByTestId('Run-cardio-sets')).toContainText(/km\s*Time\s*Pace\s*1\s*5\s*30:00\s*6:00 \/km/);
	await expect(panel.getByTestId('Bike-cardio-sets')).toContainText(/Level\s*Time\s*1\s*8\s*0:30\s*2\s*8\s*0:30/);
	await expect(panel).not.toContainText('RIR 1 0 0 0');
});

test('"Previous" repeats last time’s intervals, tap to copy; History copies them; an added run starts from last time', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, [
		{ name: 'Run', targetMuscleGroup: 'Cardio', measure: 'DistanceTime', distanceUnit: 'KM' },
		{ name: 'Bike', targetMuscleGroup: 'Cardio', measure: 'Time', levelsFrom: 1, levelsTo: 20, levelStep: 1 }
	]);
	await logPastCardio(userId);
	await startBlankWorkout(page);
	await quickAdd(page, ['Run', 'Bike']);
	await editWorkoutExercise(page, 'Run');
	// The routine editor counts intervals for cardio, and asks nothing about reps or weights
	await expect(page.getByLabel('Intervals')).toBeVisible();
	await expect(page.getByLabel('Rep range start')).toBeHidden();
	await expect(page.getByTestId('picked-exercise-measure')).toHaveText('Distance & time in km');
	await page.getByRole('button', { name: 'Update' }).click();

	// Last time's run is suggested (lighter) and shown under Previous; an added interval starts from it
	await expect(page.getByTestId('Run-set-1-previous')).toHaveText('5 km · 26:00');
	await expect(box(page, 'Run', 1, 'distance')).toHaveAttribute('placeholder', '5');
	await expect(box(page, 'Run', 1, 'time')).toHaveAttribute('placeholder', '26:00');
	await expect(box(page, 'Run', 1, 'time')).toHaveAttribute('data-suggested', 'true');
	await page.getByRole('button', { name: 'Add an interval to Run' }).click();
	await expect(page.getByTestId('Run-set-2-previous')).toHaveText('–');
	await expect(box(page, 'Run', 2, 'time')).toHaveAttribute('placeholder', '26:00');
	await expect(page.getByTestId('Bike-set-1-previous')).toHaveText('L8 · 0:30');
	await expectBox(box(page, 'Bike', 1, 'load'), '8');

	// Typed over, then tap last time: its numbers are back, as the person's own
	await box(page, 'Run', 1, 'distance').fill('3');
	await page.getByTestId('Run-set-1-previous').click();
	await expect(box(page, 'Run', 1, 'distance')).toHaveValue('5');
	await expect(box(page, 'Run', 1, 'time')).toHaveValue('26:00');
	await expect(box(page, 'Run', 1, 'time')).toHaveAttribute('data-suggested', 'false');

	// History shows the run and copies it into the boxes
	await page.getByTestId('Run-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	const history = page.getByRole('dialog').filter({ hasText: 'History' });
	await expect(history).toContainText(/km\s*Time\s*Pace\s*1\s*5\s*26:00\s*5:12 \/km/);
	await history.getByLabel('Copy these sets').first().click();
	await expect(box(page, 'Run', 1, 'distance')).toHaveValue('5');
	await expect(box(page, 'Run', 1, 'time')).toHaveValue('26:00');

	// Swapped for a run in miles (⋯ → Edit): the distances typed so far are shown in miles
	await prisma.exercise.create({
		data: { userId, name: 'Trail run', targetMuscleGroup: 'Cardio', measure: 'DistanceTime', distanceUnit: 'MI' }
	});
	await editWorkoutExercise(page, 'Run');
	await page.getByLabel('Pick an exercise').click();
	await page.getByPlaceholder('Search your exercises').fill('Trail run');
	await page.getByRole('option', { name: 'Trail run', exact: true }).click();
	await page.getByRole('button', { name: 'Update' }).click();
	await expect(page.getByTestId('Trail run-distance-unit')).toHaveText('MI');
	await expect(box(page, 'Trail run', 1, 'distance')).toHaveValue('3.107');
	await expect(box(page, 'Trail run', 1, 'time')).toHaveValue('26:00');
	// A time past a day, or a 1,000 km run, is refused at the tick, not after the workout
	await box(page, 'Trail run', 2, 'distance').fill('700');
	await box(page, 'Trail run', 2, 'time').fill('25:00:00');
	await box(page, 'Trail run', 2, 'time').blur();
	// Invalid text restores the previous valid duration rather than erasing it.
	await expectBox(box(page, 'Trail run', 2, 'time'), '26:00');
	await page.getByTestId('Trail run-set-2-action').click();
	await expect(page.getByTestId('Trail run-missing')).toContainText('Set 2: enter a distance under 1,000 km');
});

test('once a cardio exercise has workouts its measure is fixed; the stats chart has cardio charts; merge and replace respect measures', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createExercises(userId, [
		{ name: 'Run', targetMuscleGroup: 'Cardio', measure: 'DistanceTime', distanceUnit: 'KM' },
		{ name: 'Bike', targetMuscleGroup: 'Cardio', measure: 'Time', levelsFrom: 1, levelsTo: 20, levelStep: 1 },
		{ name: 'Barbell rows', targetMuscleGroup: 'Traps' }
	]);
	const workout = await logPastCardio(userId);
	const run = await prisma.exercise.findUniqueOrThrow({ where: { userId_name: { userId, name: 'Run' } } });

	await page.goto(`/exercises/${run.id}`);
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await expect(page.getByRole('radio', { name: 'Measured in time' })).toBeDisabled();
	await expect(page.getByRole('dialog')).toContainText('Fixed once an exercise has workouts');
	await page.keyboard.press('Escape');

	// Stats: Total time, Total distance and Pace; no 1RM or volume
	await page.goto(`/stats?exercise=${encodeURIComponent('Run')}`);
	await expect(page.getByTestId('stats-cardio')).toHaveText('cardio');
	await expect(page.getByTestId('chart-summary')).toHaveText('Total time · latest 26:00');
	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(page.getByLabel('Pace')).toBeVisible();
	await expect(page.getByLabel('Estimated 1RM')).toHaveCount(0);
	await page.getByLabel('Pace').click();
	await expect(page.getByTestId('chart-summary')).toHaveText('Pace · latest 5:12 /km');
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-type', 'pace');

	// Editing the past workout: a run can only be replaced by an exercise measured the same way
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await expect(page.getByTestId('Run-sets')).toHaveAttribute('data-measure', 'DistanceTime');
	await expect(box(page, 'Run', 1, 'distance')).toHaveValue('5');
	await expect(box(page, 'Run', 1, 'time')).toHaveValue('26:00');
	await page.getByTestId('Run-menu-button').click();
	await page.getByRole('menuitem', { name: 'Replace' }).click();
	const sheet = page.getByRole('dialog');
	await expect(sheet).toContainText('Replace Run');
	await sheet.getByRole('button', { name: 'Barbell rows', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Barbell rows is measured differently' })).toBeVisible();
});

test('an all-skipped cardio row can be corrected into completed intervals', async ({ page, userData }) => {
	const exercise = await prisma.exercise.create({
		data: {
			userId: userData.userId,
			name: 'Skipped run',
			targetMuscleGroup: 'Cardio',
			measure: 'DistanceTime',
			distanceUnit: 'MI'
		}
	});
	const workout = await prisma.workout.create({
		data: {
			userId: userData.userId,
			userBodyweight: 80,
			startedAt: new Date(),
			endedAt: new Date(),
			workoutExercises: {
				create: {
					name: exercise.name,
					targetMuscleGroup: 'Cardio',
					exerciseId: exercise.id,
					exerciseIndex: 0,
					setType: 'V2',
					repRangeStart: 8,
					repRangeEnd: 15,
					sets: { create: { setIndex: 0, reps: 0, load: 0, RIR: 0, skipped: true } }
				}
			}
		}
	});
	await page.goto(`/workouts/${workout.id}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
	await page.waitForURL(/editing/);
	await expect(page.getByTestId('Skipped run-sets')).toHaveAttribute('data-measure', 'DistanceTime');
	await page.getByTestId('Skipped run-set-1-action').click();
	await page.getByTestId('Skipped run-set-1-action').click();
	await box(page, 'Skipped run', 1, 'distance').fill('1');
	await box(page, 'Skipped run', 1, 'time').fill('10:00');
	await box(page, 'Skipped run', 1, 'time').blur();
	await page.getByTestId('Skipped run-set-1-action').click();
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await saveWorkout(page);
	const saved = await prisma.workoutExerciseSet.findFirstOrThrow({
		where: { workoutExercise: { workoutId: workout.id } }
	});
	expect(saved).toMatchObject({ skipped: false, timeSeconds: 600, distanceMeters: 1609.344, reps: 0, load: 0, RIR: 0 });
});

for (const setType of ['Drop', 'Myorep', 'MyorepMatch', 'MyorepMatchDown']) {
	test(`legacy ${setType} cardio templates log plain intervals and strip mini-sets on save`, async ({
		page,
		userData
	}) => {
		await createExercises(userData.userId, [
			{ name: 'Run', targetMuscleGroup: 'Cardio', measure: 'DistanceTime', distanceUnit: 'KM' }
		]);
		await startBlankWorkout(page);
		await quickAdd(page, ['Run']);
		// Emulate a routine/localStorage entry saved before its exercise changed to cardio.

		await page.evaluate((setType) => {
			const state = JSON.parse(localStorage.getItem('workoutRunes')!);
			state.workoutExercises[0].setType = setType;
			state.workoutExercises[0].changeType = 'Percentage';
			state.workoutExercises[0].changeAmount = 20;
			state.workoutExercises[0].sets = [0, 1].map(() => ({
				reps: undefined,
				load: undefined,
				RIR: undefined,
				timeSeconds: 60,
				distance: 0.2,
				completed: false,
				skipped: false,
				miniSets: [{ reps: 5, load: 20, RIR: 1, completed: true }]
			}));
			localStorage.setItem('workoutRunes', JSON.stringify(state));
		}, setType);
		await page.reload();
		await expect(page.getByTestId('Run-sets')).toHaveAttribute('data-measure', 'DistanceTime');
		await expect(page.locator('[id*="mini-set"]')).toHaveCount(0);
		await expect(page.getByLabel('add-mini-set-to-set-1-of-Run')).toHaveCount(0);
		for (const set of [1, 2]) await page.getByTestId(`Run-set-${set}-action`).click();
		await page.getByRole('button', { name: 'Next', exact: true }).click();
		const request = page.waitForRequest((r) => r.url().includes('workouts.create') && r.method() === 'POST');
		await saveWorkout(page);
		const posted = await request;
		expect(posted.postData()).not.toContain('"miniSetIndex"');
		const saved = await prisma.workoutExercise.findFirstOrThrow({
			where: { workout: { userId: userData.userId } },
			include: { sets: { include: { miniSets: true } } }
		});
		expect(saved.sets).toHaveLength(2);
		for (const set of saved.sets)
			expect(set).toMatchObject({ timeSeconds: 60, distanceMeters: 200, reps: 0, load: 0, RIR: 0, miniSets: [] });
	});
}

test('changing an assisted machine to time clears assistance on save', async ({ page, userData }) => {
	await createExercises(userData.userId, [
		{ name: 'Legacy machine', targetMuscleGroup: 'Lats', levelsFrom: 1, levelsTo: 20, levelStep: 1 }
	]);
	const ex = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Legacy machine' } }
	});
	await prisma.exercise.update({ where: { id: ex.id }, data: { assisted: true } });
	await page.goto(`/exercises/${ex.id}`);
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.getByRole('radio', { name: 'Measured in time' }).click();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByTestId('exercise-measure')).toHaveText('Time');
	expect(await prisma.exercise.findUniqueOrThrow({ where: { id: ex.id } })).toMatchObject({
		measure: 'Time',
		assisted: false
	});
});
test('a cardio routine with a legacy 1-1 range can be updated despite hidden rep boxes', async ({ page, userData }) => {
	await createExercises(userData.userId, [
		{ name: 'Run', targetMuscleGroup: 'Cardio', measure: 'DistanceTime', distanceUnit: 'KM' }
	]);
	await startBlankWorkout(page);
	await quickAdd(page, ['Run']);
	await page.evaluate(() => {
		const state = JSON.parse(localStorage.getItem('workoutRunes')!);
		state.workoutExercises[0].repRangeStart = 1;
		state.workoutExercises[0].repRangeEnd = 1;
		localStorage.setItem('workoutRunes', JSON.stringify(state));
	});
	await page.reload();
	await editWorkoutExercise(page, 'Run');
	await expect(page.getByLabel('Rep range end')).toBeHidden();
	await expect(page.getByLabel('Rep range end')).not.toHaveAttribute('min');
	await page.getByLabel('Intervals').fill('2');
	await page.getByRole('button', { name: 'Update', exact: true }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByTestId('Run-set-2-action')).toBeVisible();
});

test('a cardio-only block has no muscle-volume cards or muscle chart', async ({ page, userData }) => {
	const ex = await prisma.exercise.create({
		data: {
			userId: userData.userId,
			name: 'Run',
			targetMuscleGroup: 'Cardio',
			measure: 'DistanceTime',
			distanceUnit: 'KM'
		}
	});
	const block = await prisma.mesocycle.create({
		data: {
			userId: userData.userId,
			name: 'Cardio only',
			weeklyRIR: [2, 1, -1],
			startOverloadPercentage: 1.25,
			lastSetToFailure: false,
			forceRIRMatching: false,
			startDate: new Date()
		}
	});
	await prisma.workout.create({
		data: {
			userId: userData.userId,
			userBodyweight: 80,
			startedAt: new Date(),
			endedAt: new Date(),
			workoutOfMesocycle: { create: { mesocycleId: block.id } },
			workoutExercises: {
				create: {
					name: 'Run',
					targetMuscleGroup: 'Cardio',
					exerciseId: ex.id,
					exerciseIndex: 0,
					setType: 'V2',
					repRangeStart: 1,
					repRangeEnd: 1,
					sets: {
						create: { setIndex: 0, reps: 0, load: 0, RIR: 0, skipped: false, timeSeconds: 600, distanceMeters: 2000 }
					}
				}
			}
		}
	});
	await page.setViewportSize({ width: 390, height: 1000 });
	await page.goto(`/mesocycles/${block.id}`);
	await page.getByRole('button', { name: 'Stats', exact: true }).click();
	await expect(page.getByText('Completion', { exact: true })).toBeVisible();
	await expect(page.getByText('Most sets', { exact: true })).toHaveCount(0);
	await expect(page.getByText('Best muscle', { exact: true })).toHaveCount(0);
	await expect(page.getByTestId('error-page')).toHaveCount(0);
	await page.getByRole('tab', { name: 'Routines', exact: true }).click();
	await expect(page.getByText('No sets yet', { exact: true })).toBeVisible();
});
