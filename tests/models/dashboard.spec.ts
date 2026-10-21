import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { sundayWeek } from '../../src/lib/utils/stats';
import { createExercises, createMesocycle, quickAdd, saveWorkout } from './commonFunctions';

const prisma = new PrismaClient();

const day = (page: Page, idx: number) => page.getByTestId(`week-day-${idx}`);

/** A saved workout at a moment */
async function seedWorkout(userId: string, startedAt: Date, mesocycle?: { id: string; skipped: true }) {
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 45 * 60000),
			...(mesocycle && {
				workoutOfMesocycle: { create: { mesocycleId: mesocycle.id, workoutStatus: 'Skipped' } }
			})
		}
	});
}

test('Dashboard: this week Sunday to Saturday, a check on each day with a workout', async ({ page, userData }) => {
	const userId = userData.userId;
	await page.goto('/exercise-splits');
	await createMesocycle(page);
	const mesocycle = await prisma.mesocycle.findFirstOrThrow({ where: { userId } });
	await prisma.workout.deleteMany({ where: { userId } });

	// The page's clock stays at midday today, so passing midnight during the test can't move the days
	const midday = new Date();
	midday.setHours(12, 0, 0, 0);
	await page.clock.setFixedTime(midday);
	const week = sundayWeek(midday);
	const at = (dayIdx: number, hours: number, minutes = 0) => {
		const date = new Date(week.days[dayIdx]);
		date.setHours(hours, minutes);
		return date;
	};
	// Two workouts on Monday (one check), one on Thursday
	await seedWorkout(userId, at(1, 7));
	await seedWorkout(userId, at(1, 18));
	await seedWorkout(userId, at(4, 18));
	// The edges: Saturday before, late; the Sunday after, just past midnight
	const before = new Date(week.from);
	before.setMinutes(-30);
	await seedWorkout(userId, before);
	const after = new Date(week.to);
	after.setMinutes(10);
	await seedWorkout(userId, after);
	// An old skipped day of a block isn't a workout done
	await seedWorkout(userId, at(5, 9), { id: mesocycle.id, skipped: true });

	await page.goto('/dashboard');
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('Dashboard');
	await expect(page.getByTestId('week-strip')).toContainText('This week');
	await expect(day(page, 1)).toHaveAttribute('data-done', 'true');
	const done = await Promise.all([0, 1, 2, 3, 4, 5, 6].map((idx) => day(page, idx).getAttribute('data-done')));
	expect(done).toEqual(['false', 'true', 'false', 'false', 'true', 'false', 'false']);
	// Today is marked; days show their date unless done; no count of workouts
	await expect(day(page, midday.getDay())).toHaveAttribute('data-today', 'true');
	await expect(page.locator('[data-today="true"]')).toHaveCount(1);
	await expect(day(page, 2)).toContainText(String(week.days[2].getDate()));
	await expect(page.getByTestId('week-strip')).not.toContainText('workouts');
});

test('Dashboard: a workout saved today shows its check back on the dashboard', async ({ page, userData }) => {
	await createExercises(userData.userId, ['Barbell rows']);
	await page.goto('/dashboard');
	const today = day(page, new Date().getDay());
	await expect(today).toHaveAttribute('data-done', 'false');

	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	await page.getByRole('button', { name: 'Next' }).click();
	await quickAdd(page, ['Barbell rows']);
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('40');
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('10');
	await page.locator('[id="Barbell\\ rows-set-1-RIR"]').fill('2');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);

	await page.goto('/dashboard');
	await expect(today).toHaveAttribute('data-done', 'true');
});
