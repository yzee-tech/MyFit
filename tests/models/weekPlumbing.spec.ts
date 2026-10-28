import { expect, test, type Page } from '../fixtures';
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
const suggestionRequests = async (page: import('../fixtures').Page) => {
	const counter = { count: 0 };
	await page.route(/getWorkoutExercisesWithPreviousData/, (route) => {
		counter.count++;
		return route.continue();
	});
	return counter;
};

test('Continue workout after a failed load loads the suggestions again', async ({ page }) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	const started = (await savedState(page)).workoutData.startedAt;
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	const requests = await suggestionRequests(page);
	await page.goto('/workouts/manage/start');
	await page.getByRole('button', { name: 'Continue workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
	expect((await savedState(page)).suggestionsFailed).toBe(false);
	expect((await savedState(page)).workoutData.startedAt).toBe(started);
	expect(requests.count).toBe(1);
});

test('Continue after a failed load uses the routine as it is now, not as it was when the workout started', async ({
	page,
	userData
}) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	// Meanwhile one exercise is taken out of the routine
	const removed = await prisma.exerciseTemplate.findFirstOrThrow({
		where: { exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } },
		orderBy: { exerciseIndex: 'desc' }
	});
	await prisma.exerciseTemplate.delete({ where: { id: removed.id } });
	await page.goto('/workouts/manage/start');
	await page.getByRole('button', { name: 'Continue workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(3);
	expect((await savedState(page)).workoutExercises.map((ex: { name: string }) => ex.name)).not.toContain(removed.name);
});

test('the workout panel resumes a failed load too', async ({ page }) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	const started = (await savedState(page)).workoutData.startedAt;
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	const requests = await suggestionRequests(page);
	await page.goto('/workouts');
	await page.getByRole('button', { name: 'Back to the workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
	expect((await savedState(page)).suggestionsFailed).toBe(false);
	expect((await savedState(page)).workoutData.startedAt).toBe(started);
	expect(requests.count).toBe(1);
});

test('after a failed load, discarding the workout and starting the routine again loads it', async ({ page }) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	await page.getByRole('button', { name: 'Discard workout', exact: true }).click();
	await page.getByRole('button', { name: 'Yes, discard', exact: true }).click();
	await page.waitForURL('/workouts');
	await page.goto('/workouts/manage/start');
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
});

test('a workout whose list was never saved shows Next, not Continue, and no panel; Next loads it fresh', async ({
	page
}) => {
	await prepareRoutine(page);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
	await page.evaluate(() => {
		const s = JSON.parse(localStorage.getItem('workoutRunes')!);
		s.workoutExercises = null;
		localStorage.setItem('workoutRunes', JSON.stringify(s));
	});
	await page.goto('/workouts');
	await expect(page.getByTestId('workout-panel')).toHaveCount(0);
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('button', { name: 'Continue workout', exact: true })).toHaveCount(0);
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
});

test('resuming a loaded workout, from the start page or the panel, sends no suggestions request', async ({ page }) => {
	await prepareRoutine(page);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
	const before = (await savedState(page)).workoutExercises;
	const requests = await suggestionRequests(page);
	await page.goto('/workouts/manage/start');
	await page.getByRole('button', { name: 'Continue workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	await expect(page.getByTestId('workout-routine-name')).toBeVisible();
	await page.goto('/workouts');
	await page.getByRole('button', { name: 'Back to the workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	await expect(page.getByTestId('workout-routine-name')).toBeVisible();
	expect(requests.count).toBe(0);
	expect((await savedState(page)).workoutExercises).toEqual(before);
});

test('an old resume link without a bodyweight is no error and asks for nothing', async ({ page }) => {
	await prepareRoutine(page);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBe(4);
	const requests = await suggestionRequests(page);
	for (const link of [
		'/workouts/manage/exercises?routine=Pull%20A&keepCurrent',
		'/workouts/manage/exercises?routine=Pull%20A&keepCurrent&userBodyweight=abc'
	]) {
		await page.goto(link);
		await expect(page.getByTestId('workout-routine-name')).toBeVisible();
		await expect(page.getByText('Invalid bodyweight')).toHaveCount(0);
	}
	expect(requests.count).toBe(0);
	expect((await savedState(page)).workoutExercises).toHaveLength(4);
});

test('resuming after the routine was deleted ends with an empty list, one request and no loop', async ({
	page,
	userData
}) => {
	await prepareRoutine(page);
	await failSuggestions(page);
	await page.unroute(/getWorkoutExercisesWithPreviousData/);
	await prisma.exerciseSplitDay.deleteMany({ where: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } });
	const requests = await suggestionRequests(page);
	await page.goto('/workouts');
	await page.getByRole('button', { name: 'Back to the workout', exact: true }).click();
	await page.waitForURL(/keepCurrent/);
	await expect.poll(() => requests.count).toBe(1);
	await expect.poll(async () => (await savedState(page)).suggestionsFailed).toBe(false);
	await page.waitForTimeout(500);
	expect(requests.count).toBe(1);
	expect((await savedState(page)).workoutExercises).toEqual([]);
});

test('a fresh start from the start page opens the same link as before', async ({ page }) => {
	await prepareRoutine(page);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	const url = new URL(page.url());
	expect(url.pathname + url.search).toBe('/workouts/manage/exercises?userBodyweight=80&routine=Pull%20A');
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

for (const [label, time, week, deload] of [
	['the last minute of week 5', '2026-11-23T15:59:00Z', 5, false],
	['the first minute of week 6, the deload week', '2026-11-23T16:00:00Z', 6, true]
] as const) {
	test(`the week label and the suggestions agree on the phone's clock: ${label}`, async ({ page, userData }) => {
		await page.goto('/exercise-splits');
		await createTemplateExerciseSplit(page);
		await createMesocycle(page, { exerciseSplitCreated: true });
		const block = await prisma.mesocycle.findFirstOrThrow({ where: { name: 'MyMeso' }, orderBy: { id: 'desc' } });
		await prisma.mesocycle.update({
			where: { id: block.id },
			data: { startDate: STARTED, endDate: null, weeklyRIR: [3, 2, 2, 1, 0, -1] }
		});
		// The first exercise of Pull A was done before, so there is a last time to suggest from
		const day = await prisma.exerciseSplitDay.findFirstOrThrow({
			where: { name: 'Pull A', exerciseSplit: { userId: userData.userId } },
			include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
		});
		const first = day.exercises[0];
		const exercise = await prisma.exercise.findFirstOrThrow({ where: { userId: userData.userId, name: first.name } });
		const done = new Date('2026-10-21T02:00:00Z');
		await prisma.workout.create({
			data: {
				userId: userData.userId,
				userBodyweight: 80,
				startedAt: done,
				endedAt: new Date(done.getTime() + 3600000),
				workoutExercises: {
					create: [
						{
							exerciseIndex: 0,
							exerciseId: exercise.id,
							name: first.name,
							targetMuscleGroup: first.targetMuscleGroup,
							setType: 'Straight',
							repRangeStart: first.repRangeStart,
							repRangeEnd: first.repRangeEnd,
							sets: {
								create: [
									{ setIndex: 0, load: 40, reps: 10, RIR: 1, skipped: false },
									{ setIndex: 1, load: 40, reps: 10, RIR: 1, skipped: false }
								]
							}
						}
					]
				}
			}
		});
		await page.clock.install({ time: new Date(time) });
		await page.goto('/workouts/manage/start');
		await expect(page.getByText(new RegExp(`Week ${week} of 6`))).toBeVisible();
		await page.getByPlaceholder('Type here').fill('80');
		await pickRoutine(page, 'Pull A');
		await page.getByRole('button', { name: 'Next', exact: true }).click();
		await expect.poll(async () => (await savedState(page)).workoutExercises?.length).toBeGreaterThan(0);
		const rirs = (await savedState(page)).workoutExercises[0].sets.map((set: { RIR?: number }) => set.RIR);
		expect(rirs.length).toBeGreaterThan(0);
		// The deload week suggests an easy 4 RIR; the week before does not
		for (const rir of rirs) {
			if (deload) expect(rir).toBe(4);
			else expect(rir).not.toBe(4);
		}
	});
}

// The welcome-back card counts the phone's calendar days, like the week label
async function setUpForWelcomeBack(page: Page, userId: string, lastWorkoutAt: Date) {
	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await createMesocycle(page, { exerciseSplitCreated: true });
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { name: 'MyMeso' }, orderBy: { id: 'desc' } });
	// A long block that started the same day as the last workout, so no deload week gets in the way
	await prisma.mesocycle.update({
		where: { id: block.id },
		data: { startDate: lastWorkoutAt, endDate: null, weeklyRIR: [3, 3, 3, 3, 3, 3, 3, 3] }
	});
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: lastWorkoutAt,
			endedAt: new Date(lastWorkoutAt.getTime() + 3600000)
		}
	});
}

// Monday Oct 19 at 18:00 in Shanghai
const LAST_WORKOUT = new Date('2026-10-19T10:00:00Z');

test('welcome back counts the phone calendar days: 7 days on Monday morning, though it is under 168 hours', async ({
	page,
	userData
}) => {
	await setUpForWelcomeBack(page, userData.userId, LAST_WORKOUT);
	// Mon Oct 26 at 09:00 in Shanghai: 6 days and 15 hours after the workout, the 7th calendar day since
	await page.clock.install({ time: new Date('2026-10-26T01:00:00Z') });
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText("Welcome back: take it easy today It's been 7 days");
});

test('welcome back appears at the first minute of the 7th calendar day, not before', async ({ page, userData }) => {
	await setUpForWelcomeBack(page, userData.userId, LAST_WORKOUT);
	// Sun Oct 25 at 23:59 in Shanghai is 6 days since; Mon at 00:00 is 7
	await page.clock.install({ time: new Date('2026-10-25T15:59:00Z') });
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText('Pick a routine');
	await expect(page.getByRole('main')).not.toContainText('Welcome back');
	await page.clock.setFixedTime(new Date('2026-10-25T16:00:00Z'));
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	await expect(page.getByRole('main')).toContainText("It's been 7 days");
});

test('welcome back: switched off on the card, the link does not carry the flag', async ({ page, userData }) => {
	await setUpForWelcomeBack(page, userData.userId, LAST_WORKOUT);
	await page.clock.install({ time: new Date('2026-10-26T01:00:00Z') });
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText("It's been 7 days");
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	await page.getByLabel('Welcome back: take it easy today').click();
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.waitForURL(/exercises\?userBodyweight/);
	expect(page.url()).not.toContain('welcomeBack');
});

test('welcome back: on by default so the link carries the flag; and the setting off or no earlier workout shows no card', async ({
	page,
	userData
}) => {
	await setUpForWelcomeBack(page, userData.userId, LAST_WORKOUT);
	await page.clock.install({ time: new Date('2026-10-26T01:00:00Z') });
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText("It's been 7 days");
	await page.getByPlaceholder('Type here').fill('80');
	await pickRoutine(page, 'Pull A');
	// On by default: the link carries the flag
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.waitForURL(/welcomeBack/);

	// Turned off in the settings
	await prisma.userSettings.upsert({
		where: { userId: userData.userId },
		create: { userId: userData.userId, welcomeBackEnabled: false },
		update: { welcomeBackEnabled: false }
	});
	await page.evaluate(() => localStorage.clear());
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText('Pick a routine');
	await expect(page.getByRole('main')).not.toContainText('Welcome back');

	// On, but nothing done before
	await prisma.userSettings.update({ where: { userId: userData.userId }, data: { welcomeBackEnabled: true } });
	await prisma.workout.deleteMany({ where: { userId: userData.userId } });
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('main')).toContainText('Pick a routine');
	await expect(page.getByRole('main')).not.toContainText('Welcome back');
});
