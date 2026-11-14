import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { request as playwrightRequest } from '@playwright/test';
import { createExercises, pickRoutine, quickAdd } from './commonFunctions';

const prisma = new PrismaClient();

/**
 * A workout saved with no signal waits on the phone and is sent when the app can: saved offline, sent once when
 * the connection is back (also when the answer was lost), told apart from a lapsed sign-in, shown on the
 * Workouts list with Retry, Discard and Copy details, sent before the next workout starts, and asked about
 * before signing out. The phone's storage is read and written by the tests directly
 */

const OUTBOX = 'workoutOutbox:v1';
const CREATE = /\/trpc\/workouts\.create/;

/** A blank workout of one set of Dumbbell press, done and sitting on the finish page */
async function finishPageWithOneSet(page: Page) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await quickAdd(page, ['Dumbbell press']);
	const id = 'Dumbbell\\ press';
	await page.locator(`[id="${id}-set-1-reps"]`).fill('10');
	await page.locator(`[id="${id}-set-1-load"]`).fill('30');
	await page.locator(`[id="${id}-set-1-RIR"]`).fill('2');
	await page.getByTestId('Dumbbell press-set-1-action').click();
	await expect(page.getByTestId('Dumbbell press-set-1-action')).toHaveAttribute('aria-checked', 'true');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
}

const press = (page: Page) => page.getByRole('button', { name: 'Save', exact: true });
const outboxOf = (page: Page) =>
	page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as Record<string, unknown>[], OUTBOX);
const savedWorkouts = (userId: string) => prisma.workout.findMany({ where: { userId }, orderBy: { startedAt: 'asc' } });

/** A waiting entry as the phone would have stored it, for tests that start from a list already there */
function waitingEntry(userId: string, extra: Record<string, unknown> = {}, requestExtra: Record<string, unknown> = {}) {
	const clientId = createId();
	const startedAt = new Date(Date.now() - 3 * 3600000).toISOString();
	return {
		clientId,
		userId,
		queuedAt: startedAt,
		label: 'Evening workout',
		state: 'waiting',
		attempts: 0,
		lastAttemptAt: null,
		lastError: null,
		request: {
			clientId,
			timeZone: 'UTC',
			workoutData: {
				startedAt,
				endedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
				routineName: null,
				userBodyweight: 80,
				countsForProgression: true
			},
			workoutExercises: [
				{
					name: 'Dumbbell press',
					targetMuscleGroup: 'Chest',
					customMuscleGroup: null,
					bodyweightFraction: null,
					setType: 'Straight',
					repRangeStart: 8,
					repRangeEnd: 12,
					weightUnit: 'KG',
					exerciseIndex: 0
				}
			],
			workoutExercisesSets: [[{ setIndex: 0, reps: 10, load: 30, RIR: 2, skipped: false }]],
			workoutExercisesMiniSets: [[[]]],
			...requestExtra
		},
		...extra
	};
}

async function seedOutbox(page: Page, entries: Record<string, unknown>[]) {
	await page.addInitScript(
		({ key, value }) => {
			// Once: a reload must not put it back
			if (!sessionStorage.getItem('seededOutbox')) {
				localStorage.setItem(key, JSON.stringify(value));
				sessionStorage.setItem('seededOutbox', 'yes');
			}
		},
		{ key: OUTBOX, value: entries }
	);
}

test.beforeEach(async ({ userData }) => {
	await prisma.workout.deleteMany({ where: { userId: userData.userId } });
	await createExercises(userData.userId, [{ name: 'Dumbbell press', targetMuscleGroup: 'Chest' }]);
});

test('saved with no connection: kept on the phone and said so, then sent once when the connection is back', async ({
	page,
	context,
	userData
}) => {
	await finishPageWithOneSet(page);
	await context.setOffline(true);
	await press(page).click();
	// This page stays (the Workouts list needs the server) and says where the workout is
	await expect(page.getByTestId('saved-on-phone')).toContainText('kept on this phone');
	await expect(page.getByRole('status').filter({ hasText: 'Saved on this phone' }).first()).toBeVisible();
	await expect(page).toHaveURL(/\/workouts\/manage\/overview/);
	// Nothing on the server; one on the phone's list, and the workout in progress is gone
	expect(await savedWorkouts(userData.userId)).toHaveLength(0);
	const waiting = await outboxOf(page);
	expect(waiting).toHaveLength(1);
	expect(await page.evaluate(() => localStorage.getItem('workoutRunes'))).toMatch(/"workoutData":null/);
	await expect(page.getByTestId('outbox-bar-text')).toHaveText('1 workout waiting to send');

	// The connection is back: sent by itself
	await context.setOffline(false);
	await expect(page.getByRole('status').filter({ hasText: 'Workout sent' })).toBeVisible({ timeout: 15000 });
	await expect(page.getByTestId('saved-on-phone')).toContainText('It reached your account');
	expect(await outboxOf(page)).toEqual([]);
	const saved = await savedWorkouts(userData.userId);
	expect(saved).toHaveLength(1);
	expect(saved[0].id).toBe((waiting[0] as { clientId: string }).clientId);
	// Its length is the phone's: from the start to the last ticked set, not to the moment it was sent
	expect(saved[0].endedAt.getTime() - saved[0].startedAt.getTime()).toBeLessThan(60 * 60 * 1000);
	// On the Workouts list as any other, with no offer of "Save as routine" from a send in the background
	await page.getByRole('button', { name: 'Back to workouts' }).click();
	await page.waitForURL('/workouts');
	await expect(page.getByTestId('outbox-card')).toHaveCount(0);
	await expect(page.getByTestId('workout-name')).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Save as routine' })).toHaveCount(0);
});

test('the answer is lost on the way back: it is saved once, however many times it is sent', async ({
	page,
	userData
}) => {
	await finishPageWithOneSet(page);
	// The server gets the first request and saves the workout; the page never hears
	let first = true;
	await page.route(CREATE, async (route) => {
		if (!first) return route.continue();
		first = false;
		await route.fetch();
		await route.abort('connectionreset');
	});
	await press(page).click();
	await expect(page.getByTestId('saved-on-phone')).toBeVisible();
	// Sent by the app itself a few seconds later: the server answers "already saved", and the list is empty again
	await expect(page.getByRole('status').filter({ hasText: 'Workout sent' })).toBeVisible({ timeout: 20000 });
	expect(await outboxOf(page)).toEqual([]);
	expect(await savedWorkouts(userData.userId)).toHaveLength(1);
});

test('a lapsed sign-in is told apart from a crash: kept, marked "sign in to send", and not tried again by itself', async ({
	page,
	userData
}) => {
	await finishPageWithOneSet(page);
	let calls = 0;
	await page.route(CREATE, (route) => {
		calls++;
		return route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({
				error: { json: { message: 'Not logged in', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401 } } }
			})
		});
	});
	await press(page).click();
	await expect(page.getByTestId('saved-on-phone')).toBeVisible();
	expect((await outboxOf(page))[0]).toMatchObject({ state: 'signIn' });
	await expect(page.getByTestId('outbox-bar-text')).toContainText('sign in to send');
	// The app opening tries it once more (still signed out); then it waits for the person, not for the timer
	await page.goto('/workouts');
	await expect(page.getByTestId('outbox-card-tag')).toHaveText('Sign in to send');
	await expect.poll(() => calls).toBe(2);
	await page.waitForTimeout(7000);
	expect(calls).toBe(2);
	expect((await outboxOf(page))[0]).toMatchObject({ state: 'signIn' });
	expect(await savedWorkouts(userData.userId)).toHaveLength(0);
});

test('a server that refuses the save leaves the workout open, as before: nothing is queued', async ({
	page,
	userData
}) => {
	await finishPageWithOneSet(page);
	await page.route(CREATE, (route) =>
		route.fulfill({
			status: 404,
			contentType: 'application/json',
			body: JSON.stringify({
				error: { json: { message: 'Block not found', code: -32004, data: { code: 'NOT_FOUND', httpStatus: 404 } } }
			})
		})
	);
	await press(page).click();
	await expect(page.getByRole('status').filter({ hasText: 'Block not found' })).toBeVisible();
	await expect(page).toHaveURL(/\/workouts\/manage\/overview/);
	expect(await outboxOf(page)).toEqual([]);
	expect(await page.evaluate(() => localStorage.getItem('workoutRunes'))).not.toMatch(/"workoutData":null/);
	expect(await savedWorkouts(userData.userId)).toHaveLength(0);
});

test('a phone that won’t keep the waiting list: the workout stays open with the usual message, nothing is cleared', async ({
	page,
	context,
	userData
}) => {
	await page.addInitScript((key) => {
		const set = Storage.prototype.setItem;
		Storage.prototype.setItem = function (name: string, value: string) {
			if (name === key) throw new DOMException('full', 'QuotaExceededError');
			return set.call(this, name, value);
		};
	}, OUTBOX);
	await finishPageWithOneSet(page);
	await context.setOffline(true);
	await press(page).click();
	await expect(page.getByRole('status').filter({ hasText: "Couldn't save the workout" })).toBeVisible();
	await expect(page).toHaveURL(/\/workouts\/manage\/overview/);
	expect(await page.evaluate(() => localStorage.getItem('workoutRunes'))).not.toMatch(/"workoutData":null/);
	// Back online, the same Save works
	await context.setOffline(false);
	await press(page).click();
	await page.waitForURL('/workouts');
	expect(await savedWorkouts(userData.userId)).toHaveLength(1);
});

test('a workout in progress that is already on the list is dropped when the app opens: it is never in both places', async ({
	page,
	userData
}) => {
	const entry = waitingEntry(userData.userId);
	await finishPageWithOneSet(page);
	// The app was closed after the list was written and before the workout in progress was cleared
	await page.evaluate(
		({ key, value }) => {
			const state = JSON.parse(localStorage.getItem('workoutRunes')!);
			state.workoutData.clientId = value.clientId;
			localStorage.setItem('workoutRunes', JSON.stringify(state));
			localStorage.setItem(key, JSON.stringify([value]));
		},
		{ key: OUTBOX, value: entry }
	);
	await page.route(CREATE, (route) => route.abort('internetdisconnected'));
	await page.goto('/workouts');
	await expect(page.getByTestId('outbox-card')).toHaveCount(1);
	await expect(page.getByTestId('workout-panel')).toHaveCount(0);
	expect(await page.evaluate(() => localStorage.getItem('workoutRunes'))).toMatch(/"workoutData":null/);
});

test('a workout refused after it waited: its reason is shown, and Retry, Discard and Copy details work', async ({
	page,
	context,
	userData
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	// Its block is gone (the id is one that never existed): a retry saves it outside any block
	const gone = waitingEntry(
		userData.userId,
		{ state: 'refused', attempts: 1, lastError: 'This workout needs a newer version of the app' },
		{}
	);
	(gone.request.workoutData as Record<string, unknown>).workoutOfMesocycle = { mesocycle: { id: createId() } };
	(gone.request.workoutData as Record<string, unknown>).routineName = 'Pull A';
	gone.label = 'Pull A';
	const other = waitingEntry(userData.userId, { state: 'refused', attempts: 1, lastError: 'Block not found' });
	other.label = 'Pull B';
	(other.request.workoutData as Record<string, unknown>).routineName = 'Pull B';
	(other.request.workoutData as Record<string, unknown>).startedAt = new Date(Date.now() - 5 * 3600000).toISOString();
	await seedOutbox(page, [gone, other]);
	await page.goto('/workouts');

	const cards = page.getByTestId('outbox-card');
	await expect(cards).toHaveCount(2);
	// Oldest first
	await expect(cards.first().getByTestId('outbox-card-name')).toHaveText('Pull B');
	await expect(cards.first().getByTestId('outbox-card-tag')).toHaveText("Couldn't be sent");
	await expect(cards.first().getByTestId('outbox-card-reason')).toHaveText('Block not found');
	// Not retried by itself
	await page.waitForTimeout(800);
	expect(await outboxOf(page)).toHaveLength(2);

	// Copy details: a readable text on the clipboard
	await cards.first().getByRole('button', { name: 'Copy details' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
	const copied = await page.evaluate(() => navigator.clipboard.readText());
	expect(copied).toContain('Pull B,');
	expect(copied).toContain('Dumbbell press\n  1: 10 x 30 kg, RIR 2');

	// Discard asks first; Cancel keeps it
	await cards.first().getByRole('button', { name: 'Discard' }).click();
	await expect(page.getByRole('dialog')).toContainText('was never saved to your account');
	await page.getByRole('button', { name: 'Cancel' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	expect(await outboxOf(page)).toHaveLength(2);
	await cards.first().getByRole('button', { name: 'Discard' }).click();
	await page.getByTestId('outbox-discard-confirm').click();
	await expect(cards).toHaveCount(1);
	expect(await outboxOf(page)).toHaveLength(1);

	// Retry: its block is gone, so it is saved outside any block and the person is told
	await cards.first().getByRole('button', { name: 'Retry' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'was saved outside its block' })).toBeVisible();
	await expect(cards).toHaveCount(0);
	const saved = await savedWorkouts(userData.userId);
	expect(saved).toHaveLength(1);
	expect(saved[0].routineName).toBe('Pull A');
	expect(await prisma.workoutOfMesocycle.count({ where: { workoutId: saved[0].id } })).toBe(0);
});

test('Copy details on a phone that won’t copy shows the text to select', async ({ page, userData }) => {
	const refused = waitingEntry(userData.userId, { state: 'refused', attempts: 1, lastError: 'Block not found' });
	await seedOutbox(page, [refused]);
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('no')) } });
	});
	await page.goto('/workouts');
	await page.getByRole('button', { name: 'Copy details' }).click();
	await expect(page.getByTestId('outbox-card-text')).toHaveValue(/Dumbbell press\n {2}1: 10 x 30 kg, RIR 2/);
});

test('starting the next workout sends the waiting one first; if it can’t be sent, the person is told and starts anyway', async ({
	page,
	userData
}) => {
	const entry = waitingEntry(userData.userId);
	await seedOutbox(page, [entry]);
	// No connection to the server at first: the list keeps it
	let reachable = false;
	await page.route(CREATE, (route) => (reachable ? route.continue() : route.abort('internetdisconnected')));
	await page.goto('/workouts');
	await expect(page.getByTestId('outbox-card')).toHaveCount(1);

	// Starting while it still can't be sent: a warning, and the new workout starts
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(
		page.getByRole('status').filter({ hasText: "Your last workout hasn't been sent, so today's suggestions" })
	).toBeVisible();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	expect(await savedWorkouts(userData.userId)).toHaveLength(0);

	// Reachable: the next start sends it first, with no warning (the blank workout just started is put away)
	reachable = true;
	await page.evaluate(() => localStorage.removeItem('workoutRunes'));
	await page.goto('/workouts');
	// Tap until the start sheet is open: a tap before the page is ready can miss
	await expect(async () => {
		if (!(await page.getByPlaceholder('Type here').isVisible())) await page.getByLabel('create-workout').click();
		await expect(page.getByPlaceholder('Type here')).toBeVisible({ timeout: 1000 });
	}).toPass();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expect.poll(async () => (await savedWorkouts(userData.userId)).length).toBe(1);
	expect(await outboxOf(page)).toEqual([]);
});

test('signing out with a workout waiting asks first; with none it signs out at once', async ({ page, userData }) => {
	await seedOutbox(page, [
		waitingEntry(userData.userId, { state: 'refused', attempts: 1, lastError: 'Block not found' })
	]);
	await page.goto('/workouts');
	await expect(page.getByTestId('outbox-card')).toHaveCount(1);
	await page.locator('[data-melt-dropdown-menu-trigger]:visible').last().click();
	await page.getByRole('menuitem', { name: 'Logout' }).click();
	await expect(page.getByRole('dialog')).toContainText("1 workout hasn't been sent yet");
	await page.getByRole('button', { name: 'Cancel' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	// Still signed in, still waiting
	expect(await outboxOf(page)).toHaveLength(1);
	await expect(page).toHaveURL(/\/workouts/);
});

/** A valid save as it goes over HTTP */
function createBody(clientId: string) {
	return {
		json: {
			clientId,
			workoutData: { userBodyweight: 80, routineName: null, startedAt: new Date(Date.now() - 3600000).toISOString() },
			workoutExercises: [
				{
					name: 'Dumbbell press',
					targetMuscleGroup: 'Chest',
					setType: 'Straight',
					repRangeStart: 8,
					repRangeEnd: 12,
					exerciseIndex: 0
				}
			],
			workoutExercisesSets: [[{ setIndex: 0, reps: 10, load: 30, RIR: 2, skipped: false }]],
			workoutExercisesMiniSets: [[[]]]
		}
	};
}

test('a signed-out save over HTTP answers 401 UNAUTHORIZED, not a server error', async ({ baseURL, userData }) => {
	// A context with no sign-in at all (a plain one would take on the signed-in test user's cookies)
	const none = { cookies: [], origins: [] };
	const signedOut = await playwrightRequest.newContext({ baseURL, storageState: none });
	const clientId = createId();
	const response = await signedOut.post('/trpc/workouts.create', { data: createBody(clientId) });
	expect(response.status()).toBe(401);
	const body = await response.json();
	expect(body.error.json.data).toMatchObject({ code: 'UNAUTHORIZED', httpStatus: 401 });
	// A bogus session is the same as none
	const bogus = await playwrightRequest.newContext({
		baseURL,
		storageState: none,
		extraHTTPHeaders: { cookie: 'authjs.session-token=expired' }
	});
	expect((await bogus.post('/trpc/workouts.create', { data: createBody(clientId) })).status()).toBe(401);
	expect(await savedWorkouts(userData.userId)).toHaveLength(0);
	await signedOut.dispose();
	await bogus.dispose();
	// A page opened signed out still goes to sign-in, as before
	const visitor = await playwrightRequest.newContext({ baseURL, storageState: none });
	const home = await visitor.get('/workouts', { maxRedirects: 0 });
	expect(home.status()).toBe(303);
	await visitor.dispose();
});

test('a signed-in save over HTTP is unchanged: it answers with the workout', async ({ page, userData }) => {
	const clientId = createId();
	const answer = await page.request.post('/trpc/workouts.create', { data: createBody(clientId) });
	expect(answer.status()).toBe(200);
	expect((await savedWorkouts(userData.userId)).map((workout) => workout.id)).toEqual([clientId]);
});

test('reloading the "Saved on this phone" page keeps saying so; with nothing waiting it says so and leads back to the list', async ({
	page,
	context,
	userData
}) => {
	await finishPageWithOneSet(page);
	await context.setOffline(true);
	await press(page).click();
	await expect(page.getByTestId('saved-on-phone')).toBeVisible();
	// The server is reachable again but the save is still refused (aborted): the workout keeps waiting
	await page.route(CREATE, (route) => route.abort());
	await context.setOffline(false);
	// Reloaded with the workout waiting: a message, no blank page
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.reload();
	await expect(page.getByTestId('saved-on-phone')).toContainText('kept on this phone');
	expect(errors).toEqual([]);
	// Once it is sent (by Send now, or by a try the app makes by itself) nothing waits: the page says there is no
	// workout here, with a way back to the list
	await page.unroute(CREATE);
	await expect(async () => {
		const sendNow = page.getByTestId('saved-on-phone').getByRole('button', { name: 'Send now' });
		if (await sendNow.isEnabled({ timeout: 500 }).catch(() => false)) await sendNow.click({ timeout: 1000 });
		await expect(page.getByTestId('no-workout-here')).toBeVisible({ timeout: 2000 });
	}).toPass({ timeout: 30000 });
	expect(await savedWorkouts(userData.userId)).toHaveLength(1);
	expect(errors).toEqual([]);
	await page.reload();
	await page.getByTestId('no-workout-here').getByRole('button', { name: 'Back to workouts' }).click();
	await page.waitForURL('/workouts');
});
