import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { sundayWeek } from '../../src/lib/utils/stats';
import { createExercises, createMesocycle, quickAdd, saveWorkout } from './commonFunctions';

const prisma = new PrismaClient();

const day = (page: Page, idx: number) => page.getByTestId(`week-day-${idx}`);

/** A saved workout at a moment */
async function seedWorkout(userId: string, startedAt: Date) {
	await prisma.workout.create({
		data: { userId, userBodyweight: 80, startedAt, endedAt: new Date(startedAt.getTime() + 45 * 60000) }
	});
}

test('Dashboard: this week Sunday to Saturday, a check on each day with a workout', async ({ page, userData }) => {
	const userId = userData.userId;
	await page.goto('/exercise-splits');
	await createMesocycle(page);
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
	// Pinned at midday, so a run across midnight can't move the saved workout out of the week
	const midday = new Date();
	midday.setHours(12, 0, 0, 0);
	await page.clock.setFixedTime(midday);
	await page.goto('/dashboard');
	const today = day(page, midday.getDay());
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

/** The average brightness (0–255) of a box of the canvas, in CSS pixels from its top left */
async function brightness(canvas: ReturnType<Page['locator']>, box: { x: number; y: number; w: number; h: number }) {
	return canvas.evaluate((element, box) => {
		const canvasElement = element as HTMLCanvasElement;
		const scale = canvasElement.width / canvasElement.getBoundingClientRect().width;
		const data = canvasElement
			.getContext('2d')!
			.getImageData(box.x * scale, box.y * scale, Math.max(1, box.w * scale), Math.max(1, box.h * scale)).data;
		let total = 0;
		for (let idx = 0; idx < data.length; idx += 4) total += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
		return total / (data.length / 4);
	}, box);
}

/** The brightest gridline in the chart's empty top part (pixels that aren't the background), 0–255 */
async function gridlineBrightness(canvas: ReturnType<Page['locator']>) {
	return canvas.evaluate((element) => {
		const canvasElement = element as HTMLCanvasElement;
		const { width, height } = canvasElement;
		const data = canvasElement
			.getContext('2d')!
			.getImageData(Math.round(width * 0.3), 0, 4, Math.round(height * 0.35)).data;
		const shades: number[] = [];
		for (let idx = 0; idx < data.length; idx += 4) {
			if (data[idx + 3] > 100) shades.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
		}
		return shades.length ? shades.reduce((a, b) => a + b, 0) / shades.length : -1;
	});
}

test('Dashboard chart: Light, Dark and System redraw it in the theme’s colours, with no reload', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await createMesocycle(page);
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { userId, endDate: null } });
	await prisma.workout.deleteMany({ where: { userId } });
	const exercise = await prisma.exercise.findFirstOrThrow({ where: { userId } });
	for (const [daysAgo, load] of [
		[3, 40],
		[1, 60]
	]) {
		const startedAt = new Date(Date.now() - daysAgo * 86400000);
		await prisma.workout.create({
			data: {
				userId,
				userBodyweight: 80,
				startedAt,
				endedAt: new Date(startedAt.getTime() + 3600000),
				workoutOfMesocycle: { create: { mesocycleId: block.id } },
				workoutExercises: {
					create: [
						{
							exerciseIndex: 0,
							exerciseId: exercise.id,
							name: exercise.name,
							targetMuscleGroup: exercise.targetMuscleGroup,
							setType: 'Straight',
							repRangeStart: 8,
							repRangeEnd: 12,
							sets: { create: [0, 1, 2].map((setIndex) => ({ setIndex, reps: 10, load, RIR: 2, skipped: false })) }
						}
					]
				}
			}
		});
	}
	const theme = async (name: 'Light' | 'Dark' | 'System') => {
		await page.getByRole('button', { name: 'Toggle theme' }).locator('visible=true').first().click();
		await page.getByRole('menuitem', { name, exact: true }).click();
	};
	await page.goto('/dashboard');
	await theme('Light');
	const canvas = page.locator('canvas').first();
	await expect(canvas).toBeVisible();
	const size = (await canvas.boundingBox())!;
	// The area under the line at its right end (the newer, higher workout)
	const fill = { x: size.width * 0.82, y: size.height * 0.62, w: 6, h: 6 };
	await expect.poll(() => brightness(canvas, fill)).toBeGreaterThan(180);
	await expect.poll(() => gridlineBrightness(canvas)).toBeGreaterThan(110);

	await theme('Dark');
	await expect.poll(() => brightness(canvas, fill)).toBeLessThan(90);
	await expect.poll(() => gridlineBrightness(canvas)).toBeLessThan(80);

	await theme('Light');
	await expect.poll(() => brightness(canvas, fill)).toBeGreaterThan(180);

	// System follows the phone's setting as it changes
	await theme('System');
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect.poll(() => brightness(canvas, fill)).toBeLessThan(90);
	await page.emulateMedia({ colorScheme: 'light' });
	await expect.poll(() => brightness(canvas, fill)).toBeGreaterThan(180);
});
