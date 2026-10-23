import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createMesocycle, pickRoutine, saveWorkout } from './commonFunctions';

const prisma = new PrismaClient();

/** The workout in progress kept on this device */
const savedWorkout = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes') ?? 'null'));

/** Starts Pull A of the current mesocycle and gets as far as its overview, Pull-ups removed */
async function pullAToOverview(page: Page) {
	await page.goto('/exercise-splits');
	await createMesocycle(page);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByTestId('Pull-ups-menu-button').click();
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Skip and continue' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
}

test('an old link naming a routine by its position goes to the start page to pick it', async ({ page }) => {
	await page.goto('/workouts/manage/exercises?splitDayIndex=0&userBodyweight=80');
	await page.waitForURL('/workouts/manage/start');
});

test('a saved workout this version can’t open is kept as a backup, and the person is told', async ({ page }) => {
	for (const broken of ['{"workoutData": {', '{"workoutData": {"startedAt": "x"}, "workoutExercises": "none"}']) {
		// A fresh page with the broken workout already saved, before any of the app's code runs
		const tab = await page.context().newPage();
		await tab.addInitScript((value) => {
			if (!sessionStorage.getItem('seeded')) {
				localStorage.setItem('workoutRunes', value);
				sessionStorage.setItem('seeded', 'yes');
			}
		}, broken);
		await tab.goto('/workouts');
		await expect(
			tab.getByRole('status').filter({ hasText: "A workout saved on this device couldn't be opened" })
		).toBeVisible({ timeout: 15000 });
		expect(await tab.evaluate(() => localStorage.getItem('workoutRunes:backup'))).toEqual(broken);
		expect(await tab.evaluate(() => localStorage.getItem('workoutRunes'))).toBeNull();
		await tab.close();
	}
});

test('a workout saved by an older app version (a position, no routine name) saves with the name it showed', async ({
	page,
	userData
}) => {
	await pullAToOverview(page);
	// As an app version from before routineName left it on the phone
	await page.evaluate(() => {
		const state = JSON.parse(localStorage.getItem('workoutRunes')!);
		delete state.workoutData.routineName;
		state.workoutData.workoutOfMesocycle.splitDayIndex = 0;
		localStorage.setItem('workoutRunes', JSON.stringify(state));
	});
	await page.reload();
	expect((await savedWorkout(page)).workoutData.workoutOfMesocycle.splitDayName).toEqual('Pull A');
	await saveWorkout(page, { changes: ['Removed: Pull-ups'], answer: 'Just this workout' });
	const workout = await prisma.workout.findFirstOrThrow({
		where: { userId: userData.userId },
		include: { workoutOfMesocycle: true }
	});
	expect(workout.routineName).toEqual('Pull A');
	// The position it sent is ignored (there is no column for it)
	expect(workout.workoutOfMesocycle).not.toHaveProperty('splitDayIndex');
});

test('a newer version going live: the next page change reloads into it, and the workout in progress is still there', async ({
	page
}) => {
	await page.clock.install();
	await pullAToOverview(page);
	const before = await savedWorkout(page);
	expect(before.workoutExercises.map((exercise: { name: string }) => exercise.name)).not.toContain('Pull-ups');

	// A new build is deployed; the app checks every 5 minutes
	await page.route('**/_app/version.json', (route) =>
		route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'newer-build' }) })
	);
	await page.evaluate(() => ((window as unknown as { beforeUpdate: boolean }).beforeUpdate = true));
	await page.clock.fastForward('06:00');

	// Moving to another page goes through, then reloads into the new version
	await page.getByRole('button', { name: 'Previous' }).click();
	// The marker set before is gone once the page has reloaded (mid-reload the page can't be asked)
	await expect
		.poll(() =>
			page.evaluate(() => (window as unknown as { beforeUpdate?: boolean }).beforeUpdate ?? false).catch(() => true)
		)
		.toBe(false);
	await page.waitForLoadState();
	expect(await savedWorkout(page)).toEqual(before);
	// Back on the workout's exercises, as it was
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	// After a full reload the exercises come back with the rest of the app, which takes longer on a busy machine
	await expect(page.getByTestId('Barbell rows-menu-button')).toBeVisible({ timeout: 10000 });
	await expect(page.getByTestId('Pull-ups-menu-button')).toHaveCount(0);
});
