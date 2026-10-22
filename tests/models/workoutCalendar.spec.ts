import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hong Kong's time (UTC+8): a workout at 6 am there is the day before in UTC, where CI runs
test.use({ timezoneId: 'Asia/Shanghai' });
const TODAY = new Date('2026-10-22T12:00:00+08:00');

/** A moment in UTC+8 */
const hk = (month: number, day: number, hour: number) => new Date(Date.UTC(2026, month - 1, day, hour - 8));

async function seedWorkout(
	userId: string,
	startedAt: Date,
	routineName: string | null,
	block?: { id: string; skipped?: boolean }
) {
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 45 * 60000),
			routineName,
			...(block && {
				workoutOfMesocycle: { create: { mesocycleId: block.id, workoutStatus: block.skipped ? 'Skipped' : null } }
			})
		}
	});
}

const calendarDay = (page: Page, day: number) => page.getByTestId(`calendar-day-${day}`);
const names = (page: Page) => page.getByTestId('workout-name');

/** Press and hold a day: starts a range */
async function hold(page: Page, day: number) {
	const box = (await calendarDay(page, day).boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(700);
	await page.mouse.up();
}

/** Sep 28 Push A; Oct 1 Push A; Oct 16 a 6 am blank workout and Pull A; Oct 19 Legs A */
async function seedMonth(userId: string) {
	await prisma.workout.deleteMany({ where: { userId } });
	await seedWorkout(userId, hk(9, 28, 18), 'Push A');
	await seedWorkout(userId, hk(10, 1, 18), 'Push A');
	await seedWorkout(userId, hk(10, 16, 6), null);
	await seedWorkout(userId, hk(10, 16, 18), 'Pull A');
	await seedWorkout(userId, hk(10, 19, 18), 'Legs A');
}

test('Workouts calendar: the days done this month on the phone’s days, named; today; other months', async ({
	page,
	userData
}) => {
	await seedMonth(userData.userId);
	await page.clock.setFixedTime(TODAY);
	await page.goto('/workouts');
	await expect(page.getByTestId('calendar-month')).toHaveText('October 2026');
	await expect(calendarDay(page, 1)).toHaveAttribute('data-done', 'true');
	await expect(calendarDay(page, 1)).toContainText('Push A');
	// The 6 am workout is on the 16th here (the 15th in UTC), named by its local time, with one more
	await expect(calendarDay(page, 16)).toHaveAttribute('data-done', 'true');
	await expect(calendarDay(page, 16)).toContainText('Morning +1');
	await expect(calendarDay(page, 15)).toHaveAttribute('data-done', 'false');
	await expect(calendarDay(page, 22)).toHaveAttribute('data-today', 'true');
	await expect(calendarDay(page, 22)).toHaveAttribute('data-done', 'false');

	// Six weeks every month: September (five) is as tall as October (six)
	const october = (await page.getByTestId('workout-calendar').boundingBox())!.height;
	await page.getByRole('button', { name: 'Previous month' }).click();
	await expect(page.getByTestId('calendar-month')).toHaveText('September 2026');
	await expect(calendarDay(page, 28)).toHaveAttribute('data-done', 'true');
	expect((await page.getByTestId('workout-calendar').boundingBox())!.height).toBeCloseTo(october, 0);

	// Start workout: across the page, where the + was
	await page.getByRole('button', { name: 'create-workout' }).click();
	await page.waitForURL('/workouts/manage/start');
});

test('Workouts calendar: tap a day, tap it again to clear; hold a day then tap another for a range', async ({
	page,
	userData
}) => {
	await seedMonth(userData.userId);
	await page.clock.setFixedTime(TODAY);
	await page.goto('/workouts');
	await expect(names(page)).toHaveCount(5);

	// One tap: that day only
	await calendarDay(page, 16).click();
	await expect(page).toHaveURL(/\?from=2026-10-16$/);
	await expect(page.getByTestId('showing')).toContainText('Showing Fri, Oct 16');
	await expect(names(page)).toHaveText(['Pull A', 'Morning workout']);
	await expect(calendarDay(page, 16)).toHaveAttribute('data-picked', 'true');
	// Tapped again: everything
	await calendarDay(page, 16).click();
	await expect(page.getByTestId('showing')).toHaveCount(0);
	await expect(names(page)).toHaveCount(5);

	// Hold the 19th, then tap the 1st: the two swap into Oct 1 – 19
	await hold(page, 19);
	await expect(page.getByTestId('calendar-hint')).toHaveText('From Oct 19: now tap the last day');
	await calendarDay(page, 1).click();
	await expect(page).toHaveURL(/\?from=2026-10-01&to=2026-10-19$/);
	await expect(page.getByTestId('showing')).toContainText('Showing Oct 1 – 19');
	await expect(names(page)).toHaveText(['Legs A', 'Pull A', 'Morning workout', 'Push A']);
	await expect(calendarDay(page, 10)).toHaveAttribute('data-picked', 'true');
	await expect(calendarDay(page, 20)).toHaveAttribute('data-picked', 'false');

	// Kept when coming back from a workout
	await names(page).first().click();
	await page.waitForURL(/\/workouts\/\w+$/);
	await page.goBack();
	await expect(page.getByTestId('showing')).toContainText('Oct 1 – 19');

	// Across months: hold the 1st, go back a month, tap the 28th
	await hold(page, 1);
	await page.getByRole('button', { name: 'Previous month' }).click();
	await calendarDay(page, 28).click();
	await expect(page.getByTestId('showing')).toContainText('Showing Sep 28 – Oct 1');
	await expect(names(page)).toHaveText(['Push A', 'Push A']);

	// Held, then the same day tapped: just that day
	await page.getByRole('button', { name: 'Next month' }).click();
	await hold(page, 19);
	await calendarDay(page, 19).click();
	await expect(page).toHaveURL(/\?from=2026-10-19$/);

	// Show all
	await page.getByRole('button', { name: 'Show all' }).click();
	await expect(page).toHaveURL('/workouts');
	await expect(names(page)).toHaveCount(5);

	// A day that doesn't exist is ignored
	await page.goto('/workouts?from=2026-02-30');
	await expect(page.getByTestId('showing')).toHaveCount(0);
	await expect(names(page)).toHaveCount(5);
});

test('Workouts calendar: days picked and the filters replace each other, and the filters are described', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await seedMonth(userId);
	await prisma.mesocycle.deleteMany({ where: { userId } });
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Hypertrophy',
			weeklyRIR: [3, 2, 1, 0],
			startDate: hk(10, 1, 9),
			endDate: hk(10, 20, 9),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	try {
		await seedWorkout(userId, hk(10, 2, 18), 'Pull A', { id: block.id });
		await page.clock.setFixedTime(TODAY);
		await page.goto(`/workouts?selectedMesocycleIds=${encodeURIComponent(JSON.stringify([block.id]))}`);
		await expect(page.getByTestId('showing')).toContainText('Showing Hypertrophy');
		await expect(names(page)).toHaveText(['Pull A']);
		// The filter's dates, in words
		await page.goto('/workouts?startDate=2026-10-01&endDate=2026-10-14');
		await expect(page.getByTestId('showing')).toContainText('Showing Oct 1 – 14');
		// Both ends apply (the end used to replace the start, letting Sep 28 in)
		await expect(names(page)).toHaveText(['Pull A', 'Push A']);
		// The filter's days are the phone's: the 16th from its midnight (with the 6 am workout) to the
		// next (without the 17th's 6 am one); in UTC they were 8 hours off
		await seedWorkout(userId, hk(10, 17, 6), 'Legs B');
		await page.goto('/workouts?startDate=2026-10-16&endDate=2026-10-16');
		await expect(page.getByTestId('showing')).toContainText('Showing Fri, Oct 16');
		await expect(names(page)).toHaveText(['Pull A', 'Morning workout']);
		await expect(calendarDay(page, 17)).toContainText('Legs B');

		// A day picked replaces the filters
		await page.goto(`/workouts?selectedMesocycleIds=${encodeURIComponent(JSON.stringify([block.id]))}`);
		await calendarDay(page, 16).click();
		await expect(page).toHaveURL(/\?from=2026-10-16$/);
		await expect(page.getByTestId('showing')).toContainText('Fri, Oct 16');

		// And the filters replace a day picked
		await page.getByLabel('search').click();
		await page.getByRole('combobox').click();
		await page.getByRole('option', { name: 'Hypertrophy' }).click();
		await page.getByText('Date range').click();
		await page.getByRole('button', { name: 'Apply' }).click();
		await expect(page).toHaveURL(/selectedMesocycleIds=/);
		await expect(page).not.toHaveURL(/from=/);
		await expect(page.getByTestId('showing')).toContainText('Showing Hypertrophy');
		await expect(calendarDay(page, 16)).toHaveAttribute('data-picked', 'false');
	} finally {
		await prisma.workout.deleteMany({ where: { userId } });
		await prisma.mesocycle.deleteMany({ where: { userId } });
	}
});

test('A block’s Workouts tab: its own workouts done, months within the block, days and ranges filter its list', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	// Running since Sep 28, six weeks planned (to Nov 8)
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Hypertrophy',
			weeklyRIR: [3, 2, 2, 1, 0, -1],
			startDate: hk(9, 28, 9),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	try {
		await seedWorkout(userId, hk(9, 28, 18), 'Push A', { id: block.id });
		await seedWorkout(userId, hk(10, 1, 18), 'Pull A', { id: block.id });
		await seedWorkout(userId, hk(10, 5, 18), 'Legs A', { id: block.id, skipped: true });
		await seedWorkout(userId, hk(10, 16, 6), 'Push A', { id: block.id });
		// Not in the block
		await seedWorkout(userId, hk(10, 19, 18), null);
		await page.clock.setFixedTime(TODAY);
		await page.goto(`/mesocycles/${block.id}`);
		await page.getByRole('tab', { name: 'Workouts' }).click();

		await expect(page.getByTestId('calendar-month')).toHaveText('October 2026');
		await expect(calendarDay(page, 1)).toHaveAttribute('data-done', 'true');
		await expect(calendarDay(page, 16)).toHaveAttribute('data-done', 'true');
		await expect(calendarDay(page, 15)).toHaveAttribute('data-done', 'false');
		// A skipped day and a workout outside the block: no circle
		await expect(calendarDay(page, 5)).toHaveAttribute('data-done', 'false');
		await expect(calendarDay(page, 19)).toHaveAttribute('data-done', 'false');

		// Its months: September to November
		await page.getByRole('button', { name: 'Next month' }).click();
		await expect(page.getByTestId('calendar-month')).toHaveText('November 2026');
		await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled();
		await page.getByRole('button', { name: 'Previous month' }).click();
		await page.getByRole('button', { name: 'Previous month' }).click();
		await expect(page.getByTestId('calendar-month')).toHaveText('September 2026');
		await expect(page.getByRole('button', { name: 'Previous month' })).toBeDisabled();

		// A day, then a range, filter its list
		const cards = page.locator('[data-tabs-content] a[href^="/workouts/"]');
		await expect(cards).toHaveCount(4);
		await page.getByRole('button', { name: 'Next month' }).click();
		await calendarDay(page, 16).click();
		await expect(cards).toHaveCount(1);
		await expect(cards).toContainText('October 16');
		await calendarDay(page, 16).click();
		await expect(cards).toHaveCount(4);
		await hold(page, 1);
		await calendarDay(page, 16).click();
		await expect(cards).toHaveCount(3);
	} finally {
		await prisma.workout.deleteMany({ where: { userId } });
		await prisma.mesocycle.deleteMany({ where: { userId } });
	}
});

test('Dashboard: Get started first while not done, then This week, then the active block, all one size', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	const sectionNames = ['Get started', 'This week', 'Active mesocycle block'];
	const sections = page
		.getByRole('heading', { level: 3 })
		.filter({ hasText: new RegExp(`^(${sectionNames.join('|')})$`) });
	await page.goto('/dashboard');
	await expect(sections).toHaveText(sectionNames);
	await expect(page.getByTestId('week-strip').getByRole('heading', { name: 'This week' })).toBeVisible();
	const sizes = await sections.evaluateAll((headings) => headings.map((h) => getComputedStyle(h).fontSize));
	expect(sizes).toEqual(['20px', '20px', '20px']);

	// Every step done: Get started goes, This week comes first
	await prisma.exerciseSplit.upsert({
		where: { userId },
		create: {
			userId,
			name: 'My routines',
			exerciseSplitDays: { create: [{ name: 'Push A', dayIndex: 0, isRestDay: false }] }
		},
		update: { exerciseSplitDays: { create: [{ name: 'Push A', dayIndex: 0, isRestDay: false }] } }
	});
	await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Hypertrophy',
			weeklyRIR: [3, 2, 1, 0],
			startDate: new Date(),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	await seedWorkout(userId, new Date(), null);
	try {
		await page.goto('/dashboard');
		await expect(sections.first()).toHaveText('This week');
		await expect(page.getByRole('heading', { name: 'Get started' })).toHaveCount(0);
	} finally {
		await prisma.workout.deleteMany({ where: { userId } });
		await prisma.mesocycle.deleteMany({ where: { userId } });
		await prisma.exerciseSplit.deleteMany({ where: { userId } });
	}
});
