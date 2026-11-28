import { test, expect } from '../fixtures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pacific time (UTC-8 in winter): an evening there is already the next day in UTC, where CI runs
test.use({ timezoneId: 'America/Los_Angeles' });

// Friday 27 Nov 2026, 6 pm in Los Angeles (2 am on the 28th in UTC)
const NOW = new Date('2026-11-28T02:00:00Z');

async function seedWorkout(userId: string, startedAt: Date) {
	return prisma.workout.create({
		data: { userId, userBodyweight: 80, startedAt, endedAt: new Date(startedAt.getTime() + 45 * 60000) }
	});
}

const cell = (page: import('@playwright/test').Page, day: string) => page.getByLabel(day, { exact: true });

test.beforeEach(async ({ page }) => {
	await page.clock.install({ time: NOW });
});

test('the activity graph puts a workout on its own day, also seen late in the evening west of UTC', async ({
	page,
	userData
}) => {
	// Friday at 10 am in Los Angeles (6 pm UTC): seen at 6 pm there, UTC says it is already Saturday
	await seedWorkout(userData.userId, new Date('2026-11-27T18:00:00Z'));
	// Thursday at 9 pm in Los Angeles (Friday 5 am UTC)
	await seedWorkout(userData.userId, new Date('2026-11-27T05:00:00Z'));
	await page.goto('/profile');

	await cell(page, '11/27/2026').click();
	await expect(page.getByText('1 workout on Nov 27, 2026')).toBeVisible();
	await page.keyboard.press('Escape');
	await cell(page, '11/26/2026').click();
	await expect(page.getByText('1 workout on Nov 26, 2026')).toBeVisible();
	await page.keyboard.press('Escape');
	// Today, with no workout
	await cell(page, '11/28/2026').click();
	await expect(page.getByText('No workouts on Nov 28, 2026')).toBeVisible();
});

test('the activity graph reaches its first week: the oldest cells show their workouts', async ({ page, userData }) => {
	// The grid starts on Sunday 23 Nov 2025 (a year of days back from today, then to that week's Sunday). Monday
	// 24 Nov 2025 at noon in Los Angeles is 365 days and 14 hours before now: a year-long fetch left it out
	await seedWorkout(userData.userId, new Date('2025-11-24T20:00:00Z'));
	await page.goto('/profile');

	await cell(page, '11/24/2025').click();
	await expect(page.getByText('1 workout on Nov 24, 2025')).toBeVisible();
});

test('the activity graph cells are single buttons, and the Sets count leaves out skipped sets', async ({
	page,
	userData
}) => {
	const workout = await seedWorkout(userData.userId, new Date('2026-11-27T18:00:00Z'));
	await prisma.workoutExercise.create({
		data: {
			workoutId: workout.id,
			exerciseIndex: 0,
			name: 'Bench press',
			targetMuscleGroup: 'Chest',
			setType: 'Straight',
			repRangeStart: 5,
			repRangeEnd: 10,
			sets: {
				create: [
					{ setIndex: 0, reps: 8, load: 60, RIR: 2, skipped: false },
					{ setIndex: 1, reps: 8, load: 60, RIR: 2, skipped: false },
					{ setIndex: 2, reps: 8, load: 60, RIR: 2, skipped: true }
				]
			}
		}
	});
	await page.goto('/profile');
	await expect(cell(page, '11/27/2026')).toBeVisible();

	// A button inside a button is invalid HTML: none of the cells is one
	await expect(page.locator('button button')).toHaveCount(0);
	await expect(page.locator('button[aria-label="11/27/2026"]')).toHaveCount(1);

	const sets = page.locator('div.grid-cols-3 > div').filter({ hasText: 'Sets' });
	await expect(sets).toHaveText(/^\s*Sets\s*2\s*$/);
});
