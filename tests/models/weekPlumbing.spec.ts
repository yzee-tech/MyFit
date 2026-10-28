import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createMesocycle, createTemplateExerciseSplit, pickRoutine, quickAdd } from './commonFunctions';

const prisma = new PrismaClient();

// The phone is in Shanghai: the week is counted in its local days. No service worker, so the test can
// answer a request itself
test.use({ timezoneId: 'Asia/Shanghai', serviceWorkers: 'block' });

// Started Oct 20 at 18:00 Shanghai: on Oct 27 at 09:00 there it is the 8th day, but under 168 hours
const STARTED = new Date('2026-10-20T10:00:00Z');
const DAY_8 = new Date('2026-10-27T01:00:00Z');

test('dashboard and start page: the 8th day of the block is Week 2, and the label follows the day when the app comes back to the front', async ({
	page
}) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await createMesocycle(page, { exerciseSplitCreated: true });
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { name: 'MyMeso' }, orderBy: { id: 'desc' } });
	await prisma.mesocycle.update({ where: { id: block.id }, data: { startDate: STARTED, endDate: null } });

	await page.clock.install({ time: DAY_8 });
	await page.goto('/dashboard');
	await expect(page.getByText(/Week 2 of \d+/)).toBeVisible();
	await page.goto('/workouts/manage/start');
	await expect(page.getByText(/Week 2 of \d+/)).toBeVisible();

	// Left open past midnight in Shanghai: the next day is still week 2, day 15 is week 3
	await page.clock.setFixedTime(new Date('2026-11-03T01:00:00Z'));
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	await expect(page.getByText(/Week 3 of \d+/)).toBeVisible();
});

const ERROR = {
	error: {
		json: {
			message: 'MyFit was updated, please close and reopen the app',
			code: -32603,
			data: { code: 'PRECONDITION_FAILED', httpStatus: 412 }
		}
	}
};

test('exercises page: a failed request ends the wait and says why', async ({ page }) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) => {
		return route.fulfill({
			status: 412,
			contentType: 'application/json',
			body: JSON.stringify(
				route.request().url().includes('forPicker') ? [{ result: { data: { json: [] } } }, ERROR] : [ERROR]
			)
		});
	});
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(page.getByText('MyFit was updated, please close and reopen the app')).toBeVisible();
	await expect(page.getByText('Fetching exercises')).toHaveCount(0);
});

test('an in-progress workout keeps its starting week after local midnight and reload', async ({ page }) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await createMesocycle(page, { exerciseSplitCreated: true });
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { name: 'MyMeso' }, orderBy: { id: 'desc' } });
	await prisma.mesocycle.update({ where: { id: block.id }, data: { startDate: STARTED, endDate: null } });
	// Last minute of day 7 in Shanghai: start in Week 1.
	await page.clock.install({ time: new Date('2026-10-26T15:59:00Z') });
	await page.goto('/workouts/manage/start');
	await expect(page.getByText(/Week 1 of \d+/)).toBeVisible();
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises?.length))
		.toBeGreaterThan(0);
	await page.clock.setFixedTime(DAY_8);
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
	const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));
	expect(saved.workoutData.workoutOfMesocycle.cycleNumber).toBe(1);
});

test('failed suggestions recover on reload without restarting the workout', async ({ page }) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) =>
		route.fulfill({
			status: 412,
			contentType: 'application/json',
			body: JSON.stringify(
				route.request().url().includes('forPicker') ? [{ result: { data: { json: [] } } }, ERROR] : [ERROR]
			)
		})
	);
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByText('MyFit was updated, please close and reopen the app')).toBeVisible();
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).suggestionsFailed)).toBe(true);
	const started = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).workoutData.startedAt);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises?.length))
		.toBe(4);
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).suggestionsFailed)).toBe(false);
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).workoutData.startedAt)).toBe(
		started
	);
});

test('no-history routine reload skips suggestions even when their endpoint is offline', async ({ page }) => {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect
		.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).workoutExercises?.length))
		.toBe(4);
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).previousWorkoutData)).toBeNull();
	let requests = 0;
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) => {
		requests++;
		return route.abort();
	});
	await page.reload();
	await expect(page.getByTestId('Barbell rows-sets')).toBeVisible();
	await page.waitForTimeout(300);
	expect(requests).toBe(0);
	await expect(page.getByText(/Couldn't get your exercises|Failed to fetch/)).toHaveCount(0);
});

async function prepareRoutine(page: import('../fixtures').Page) {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
}
async function failSuggestions(page: import('../fixtures').Page) {
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) =>
		route.fulfill({
			status: 412,
			contentType: 'application/json',
			body: JSON.stringify(
				route.request().url().includes('forPicker') ? [{ result: { data: { json: [] } } }, ERROR] : [ERROR]
			)
		})
	);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect(page.getByText('MyFit was updated, please close and reopen the app')).toBeVisible();
}
const savedState = (page: import('../fixtures').Page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!));

test('failed suggestions Retry recovers without reload', async ({ page }) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	await page.getByRole('button', { name: 'Retry', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises.length).toBe(4);
	expect((await savedState(page)).suggestionsFailed).toBe(false);
});
test('manual addition after failure clears flag and protects list on reload', async ({ page }) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	await quickAdd(page, ['Barbell rows']);
	expect((await savedState(page)).suggestionsFailed).toBe(false);
	let requests = 0;
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) => {
		requests++;
		return route.abort();
	});
	await page.reload();
	await expect(page.getByTestId('Barbell rows-sets')).toBeVisible();
	expect((await savedState(page)).workoutExercises.map((ex: { name: string }) => ex.name)).toEqual(['Barbell rows']);
	expect(requests).toBe(0);
});
test('successful empty suggestions are loaded and never refetched', async ({ page }) => {
	await prepareRoutine(page);
	await page.route(/getWorkoutExercisesWithPreviousData/, async (route) => {
		const response = await route.fetch();
		const body = await response.json();
		const index = route
			.request()
			.url()
			.split('?')[0]
			.split('/')
			.at(-1)!
			.split(',')
			.findIndex((name: string) => name.endsWith('getWorkoutExercisesWithPreviousData'));
		body[index].result.data.json = { todaysWorkoutExercises: [], previousWorkoutData: null, repsOnly: {} };
		delete body[index].result.data.meta;
		await route.fulfill({ response, json: body });
	});
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.waitForURL(/exercises/);
	await expect.poll(async () => (await savedState(page)).workoutExercises).toEqual([]);
	expect((await savedState(page)).suggestionsFailed).toBe(false);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	let requests = 0;
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) => {
		requests++;
		return route.abort();
	});
	await page.reload();
	await expect(page.getByRole('button', { name: 'Discard workout', exact: true })).toBeVisible();
	await page.waitForTimeout(100);
	expect(requests).toBe(0);
});
test('failure Continue keeps flag and empty list; discard then restart recovers', async ({ page }) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	await page.goto('/workouts/manage/start');
	await page.getByRole('button', { name: 'Continue workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	expect((await savedState(page)).workoutExercises).toEqual([]);
	expect((await savedState(page)).suggestionsFailed).toBe(true);
	await expect(page.getByText('MyFit was updated, please close and reopen the app')).toHaveCount(0);
	await page.getByRole('button', { name: 'Discard workout', exact: true }).click();
	await page.getByRole('button', { name: 'Yes, discard', exact: true }).click();
	await page.waitForURL('/workouts');
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
});
test('delayed old response after discard cannot write into a new routine', async ({ page }) => {
	await prepareRoutine(page);
	let release!: () => void;
	const held = new Promise<void>((r) => (release = r));
	let requested!: () => void;
	const seen = new Promise<void>((r) => (requested = r));
	await page.route(/getWorkoutExercisesWithPreviousData/, async (route) => {
		if (route.request().url().includes('Pull%20A') || decodeURIComponent(route.request().url()).includes('Pull A')) {
			const response = await route.fetch();
			requested();
			await held;
			await route.fulfill({ response });
		} else await route.continue();
	});
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await seen;
	await page.getByRole('button', { name: 'Discard workout', exact: true }).click();
	await page.getByRole('button', { name: 'Yes, discard', exact: true }).click();
	await page.waitForURL('/workouts');
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Push A');
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBeGreaterThan(0);
	const before = await savedState(page);
	release();
	await page.waitForTimeout(200);
	const after = await savedState(page);
	expect(after.workoutExercises).toEqual(before.workoutExercises);
	expect(after.repsOnly.obsolete).toBeUndefined();
	expect(after.workoutData.routineName).toBe('Push A');
});
test('legacy saved workout without failure flag preserves exercises and defaults false', async ({ page }) => {
	await prepareRoutine(page);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
	await page.evaluate(() => {
		const s = JSON.parse(localStorage.getItem('workoutRunes')!);
		delete s.suggestionsFailed;
		localStorage.setItem('workoutRunes', JSON.stringify(s));
	});
	let requests = 0;
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) => {
		requests++;
		return route.abort();
	});
	await page.reload();
	await expect(page.getByTestId('Barbell rows-sets')).toBeVisible();
	// A real update persists the default as well as keeping the old list.
	await page.getByTestId('Barbell rows-add-set').click();
	expect((await savedState(page)).suggestionsFailed).toBe(false);
	expect(requests).toBe(0);
});

async function switchToBlankWorkout(page: import('../fixtures').Page) {
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.getByRole('button', { name: 'Switch', exact: true }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
}

test('starting another workout clears a failed-load flag left by the one before', async ({ page }) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	expect((await savedState(page)).suggestionsFailed).toBe(true);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	await switchToBlankWorkout(page);
	await expect.poll(async () => (await savedState(page)).workoutExercises).toEqual([]);
	expect((await savedState(page)).suggestionsFailed).toBe(false);
});

test('starting another workout clears the reps-only marks of the one before; Continue keeps them', async ({ page }) => {
	await prepareRoutine(page);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
	await page.evaluate(() => {
		const s = JSON.parse(localStorage.getItem('workoutRunes')!);
		s.repsOnly = { 'Left over': null };
		localStorage.setItem('workoutRunes', JSON.stringify(s));
	});
	await page.reload();
	// Continue workout is the same workout: everything stays
	await page.goto('/workouts/manage/start');
	await page.getByRole('button', { name: 'Continue workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	expect((await savedState(page)).repsOnly).toEqual({ 'Left over': null });
	// A different workout starts clean
	await switchToBlankWorkout(page);
	await expect.poll(async () => (await savedState(page)).repsOnly).toEqual({});
});
