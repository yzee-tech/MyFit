import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { holdFirstResponse } from '../support/holdFirstResponse';
import { mesocycleDefaults } from '../support/blocks';
import { expectBox, pickRoutine } from './commonFunctions';

const prisma = new PrismaClient();

/**
 * Fixes from the code review, on the pages: lists that drop an answer that came too late and say when a
 * request failed, the workout card's date, links and saved edits that can't be read, and each
 * exercise's own bodyweight in Compare
 */

// A fixed day and timezone: the calendar and the cards' dates are the phone's
test.use({ timezoneId: 'Asia/Shanghai' });
const TODAY = new Date('2026-10-22T12:00:00+08:00');
const hk = (year: number, month: number, day: number, hour: number) =>
	new Date(Date.UTC(year, month - 1, day, hour - 8));

async function seedWorkout(userId: string, startedAt: Date, routineName: string) {
	await prisma.workout.create({
		data: { userId, userBodyweight: 80, startedAt, endedAt: new Date(startedAt.getTime() + 45 * 60000), routineName }
	});
}
const names = (page: Page) => page.getByTestId('workout-name');

/** Fails the first request matching `pattern`; the later ones go through */
async function failFirstRequest(page: Page, pattern: RegExp) {
	let first = true;
	await page.route(pattern, async (route) => {
		if (!first) return route.continue();
		first = false;
		await route.abort();
	});
}

test.describe('the Workouts list', () => {
	test.beforeEach(async ({ page, userData }) => {
		await seedWorkout(userData.userId, hk(2025, 10, 16, 18), 'Last year');
		await seedWorkout(userData.userId, hk(2026, 10, 1, 18), 'Push A');
		await seedWorkout(userData.userId, hk(2026, 10, 16, 18), 'Pull A');
		await seedWorkout(userData.userId, hk(2026, 10, 19, 18), 'Legs A');
		await page.clock.setFixedTime(TODAY);
	});

	test('a day picked while the list is still loading shows that day only: the earlier answer is dropped', async ({
		page
	}) => {
		const held = await holdFirstResponse(page, /workouts\.load/);
		await page.goto('/workouts');
		await held.seen;
		await page.getByTestId('calendar-day-16').click();
		await page.waitForURL(/from=2026-10-16/);
		await expect(names(page)).toHaveText(['Pull A']);
		// The answer for the whole list comes now: was appended ("Pull A, Legs A, Pull A, Push A")
		const late = page.waitForResponse(/workouts\.load/);
		held.release();
		await late;
		await expect(page.getByText("That's all")).toBeVisible();
		await expect(names(page)).toHaveText(['Pull A']);
	});

	test('a card’s date is "Oct 16", with the year for another year', async ({ page }) => {
		await page.goto('/workouts');
		await expect(names(page)).toHaveText(['Legs A', 'Pull A', 'Push A', 'Last year']);
		const cards = page
			.getByRole('main')
			.getByRole('link')
			.filter({ has: names(page) });
		await expect(cards.nth(0)).toContainText('Oct 19');
		await expect(cards.nth(0)).not.toContainText('2026');
		await expect(cards.nth(3)).toContainText('Oct 16, 2025');
	});

	test('a request that fails says so with Retry, which loads the list', async ({ page }) => {
		await failFirstRequest(page, /workouts\.load/);
		await page.goto('/workouts');
		await expect(page.getByText("Couldn't load workouts, check your connection")).toBeVisible();
		await expect(names(page)).toHaveCount(0);
		await page.getByRole('button', { name: 'Retry' }).click();
		await expect(names(page)).toHaveText(['Legs A', 'Pull A', 'Push A', 'Last year']);
		await expect(page.getByText("Couldn't load workouts")).toHaveCount(0);
	});

	for (const [what, value] of [
		['cut short', '["abc'],
		['not a list', '5'],
		['a list of something else', '[5]']
	]) {
		test(`a link whose block filter is ${what} shows every workout instead of an error`, async ({ page }) => {
			await page.goto(`/workouts?selectedMesocycleIds=${encodeURIComponent(value)}`);
			await expect(names(page)).toHaveText(['Legs A', 'Pull A', 'Push A', 'Last year']);
		});
	}
});

test.describe('the list of mesocycles', () => {
	const blocks = (page: Page) => page.getByRole('main').getByRole('link', { name: /^Block / });
	async function seedBlocks(userId: string, count: number) {
		for (let idx = 1; idx <= count; idx++) {
			await prisma.mesocycle.create({
				data: {
					...mesocycleDefaults,
					userId,
					name: `Block ${String(idx).padStart(2, '0')}`,
					weeklyRIR: [2],
					startDate: new Date(Date.UTC(2026, 0, idx)),
					endDate: new Date(Date.UTC(2026, 0, idx + 1))
				}
			});
		}
	}

	test('a search submitted while the list is still loading shows its results only', async ({ page, userData }) => {
		await seedBlocks(userData.userId, 3);
		const held = await holdFirstResponse(page, /mesocycles\.load/);
		await page.goto('/mesocycles');
		await held.seen;
		await page.locator('#search-mesocycles').fill('Block 02');
		await page.locator('#search-mesocycles').press('Enter');
		await page.waitForURL(/search=Block/);
		await expect(blocks(page)).toHaveText([/^Block 02/]);
		const late = page.waitForResponse(/mesocycles\.load/);
		held.release();
		await late;
		await expect(page.getByText("That's all")).toBeVisible();
		await expect(blocks(page)).toHaveText([/^Block 02/]);
	});

	test('text typed in the search box but not submitted doesn’t filter the rest of the list; latest started first', async ({
		page,
		userData
	}) => {
		await seedBlocks(userData.userId, 12);
		const held = await holdFirstResponse(page, /mesocycles\.load/);
		await page.goto('/mesocycles');
		await held.seen;
		// Typed, not submitted, before the second page is asked for (was sent as its search: the list ended at 10)
		await page.locator('#search-mesocycles').fill('nothing called this');
		held.release();
		await expect(blocks(page)).toHaveCount(12);
		await expect(blocks(page).first()).toContainText('Block 12');
		await expect(blocks(page).last()).toContainText('Block 01');
	});

	test('a request that fails says so with Retry', async ({ page, userData }) => {
		await seedBlocks(userData.userId, 2);
		await failFirstRequest(page, /mesocycles\.load/);
		await page.goto('/mesocycles');
		await expect(page.getByText("Couldn't load mesocycles, check your connection")).toBeVisible();
		await page.getByRole('button', { name: 'Retry' }).click();
		await expect(blocks(page)).toHaveCount(2);
	});
});

test('Stats: a request that fails says so with Retry, never the placeholders left there', async ({ page }) => {
	await failFirstRequest(page, /stats\.overview/);
	await page.goto('/stats');
	await expect(page.getByTestId('stats-failed')).toContainText("Couldn't load your stats");
	await page.getByTestId('stats-failed').getByRole('button', { name: 'Retry' }).click();
	await expect(page.getByTestId('stats-workouts-current')).toHaveText('0');
	await expect(page.getByTestId('stats-failed')).toHaveCount(0);
});

test('routine edits saved on the phone that can’t be read are set aside with a note, and the editor opens', async ({
	page
}) => {
	await page.goto('/exercise-splits');
	await page.evaluate(() => localStorage.setItem('routineEditor', '{"editing":{"originalName":null},"exerc'));
	await page.goto('/exercise-splits/edit');
	await expect(page.getByText("Your unsaved routine edits couldn't be opened")).toBeVisible();
	// Kept as they were under another key, and the editor works
	expect(await page.evaluate(() => localStorage.getItem('routineEditor:backup'))).toEqual(
		'{"editing":{"originalName":null},"exerc'
	);
	await page.locator('#routine-name').fill('Still works');
	await expect(page.locator('#routine-name')).toHaveValue('Still works');
});

/**
 * "Pull day": pull-ups (last done a week ago at 90 kg) then rows (yesterday at 80 kg), and for the
 * History sheet each done once
 */
async function seedPullDay(userId: string) {
	const pullUps = await prisma.exercise.create({
		data: { userId, name: 'Pull-ups', targetMuscleGroup: 'Lats', bodyweightFraction: 1 }
	});
	const rows = await prisma.exercise.create({ data: { userId, name: 'Barbell rows', targetMuscleGroup: 'Traps' } });
	const common = { setType: 'Straight' as const, repRangeStart: 5, repRangeEnd: 15 };
	const done = async (exercise: typeof pullUps, daysAgo: number, userBodyweight: number, load: number) => {
		const at = new Date(Date.now() - daysAgo * 86400000);
		await prisma.workout.create({
			data: {
				userId,
				userBodyweight,
				startedAt: at,
				endedAt: new Date(at.getTime() + 3600000),
				workoutExercises: {
					create: [
						{
							...common,
							exerciseIndex: 0,
							exerciseId: exercise.id,
							name: exercise.name,
							targetMuscleGroup: exercise.targetMuscleGroup,
							bodyweightFraction: exercise.bodyweightFraction,
							sets: { create: [{ setIndex: 0, load, reps: 8, RIR: 2, skipped: false }] }
						}
					]
				}
			}
		});
	};
	await done(pullUps, 7, 90, 0);
	await done(rows, 1, 80, 60);
	await prisma.exerciseSplit.create({
		data: {
			userId,
			name: 'My routines',
			exerciseSplitDays: {
				create: [
					{
						name: 'Pull day',
						dayIndex: 0,
						exercises: {
							create: [pullUps, rows].map((exercise, exerciseIndex) => ({
								...common,
								exerciseIndex,
								exerciseId: exercise.id,
								name: exercise.name,
								targetMuscleGroup: exercise.targetMuscleGroup,
								bodyweightFraction: exercise.bodyweightFraction,
								sets: 1
							}))
						}
					}
				]
			}
		}
	});
}

async function startPullDay(page: Page) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('82');
	await pickRoutine(page, 'Pull day');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await expectBox(page.locator('[id="Barbell\\ rows-set-1-load"]'), /^\d/);
}

test('Compare: a bodyweight exercise is compared at the bodyweight of the day it was last done', async ({
	page,
	userData
}) => {
	await seedPullDay(userData.userId);
	await startPullDay(page);
	await page.getByLabel('compare-exercises').click();
	await page.getByRole('button', { name: '(BW)' }).click();
	// Pull-ups were last done at 90 kg (was 80, the bodyweight of the day rows were last done)
	await expect(page.getByTestId('previous-bodyweight')).toContainText('90');
});

test('History: an answer for the exercise opened before isn’t added to the one opened now', async ({
	page,
	userData
}) => {
	await seedPullDay(userData.userId);
	await startPullDay(page);
	const held = await holdFirstResponse(page, /workouts\.getExerciseHistory/);
	await page.getByTestId('Barbell rows-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	await held.seen;
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByRole('menuitem')).toHaveCount(0);
	await page.getByTestId('Pull-ups-menu-button').click();
	await page.getByRole('menuitem', { name: 'History' }).click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'History' });
	await expect(sheet.getByLabel('Copy these sets')).toHaveCount(1);
	const late = page.waitForResponse(/workouts\.getExerciseHistory/);
	held.release();
	await late;
	await expect(sheet.getByText("That's all")).toBeVisible();
	// Pull-ups were done once: the rows' session isn't listed under them
	await expect(sheet.getByLabel('Copy these sets')).toHaveCount(1);
});

test('a save that can’t reach the server is kept on the phone, and sent by itself a few seconds later', async ({
	page,
	userData
}) => {
	await seedPullDay(userData.userId);
	await startPullDay(page);
	await page.getByTestId('Pull-ups-set-1-action').click();
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await failFirstRequest(page, /workouts\.create/);
	await page.getByRole('button', { name: 'Save' }).click();
	// Was the browser's own "Failed to fetch", then "Couldn't save the workout...": now it is kept, and says where
	await expect(page.getByTestId('saved-on-phone')).toContainText('kept on this phone');
	expect(await prisma.workout.count({ where: { userId: userData.userId } })).toEqual(2);
	// The first try after the first pause finds the server again
	await expect(page.getByRole('status').filter({ hasText: 'Workout sent' })).toBeVisible({ timeout: 20000 });
	expect(await prisma.workout.count({ where: { userId: userData.userId } })).toEqual(3);
});
