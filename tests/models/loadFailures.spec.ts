import { test, expect } from '../fixtures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * A page whose first load fails says so, with a Retry, instead of showing a skeleton for ever; and the install button
 * is used once
 */

test('Exercises: a failed load says so and Retry brings the list', async ({ page, userData }) => {
	await prisma.exercise.create({
		data: { userId: userData.userId, name: 'Barbell rows', targetMuscleGroup: 'Lats' }
	});
	await page.route(/exercises\.list/, (route) => route.abort());
	await page.goto('/exercises');
	await expect(page.getByTestId('load-failed')).toContainText("Couldn't load your exercises");
	await page.unroute(/exercises\.list/);
	await page.getByTestId('load-failed').getByRole('button', { name: 'Retry' }).click();
	await expect(page.getByText('Barbell rows')).toBeVisible();
	await expect(page.getByTestId('load-failed')).toHaveCount(0);
});

test('My routines: a failed load says so and Retry brings the routines', async ({ page }) => {
	await page.route(/exerciseSplits\.mine/, (route) => route.abort());
	await page.goto('/exercise-splits');
	await expect(page.getByTestId('load-failed')).toContainText("Couldn't load your routines");
	await page.unroute(/exerciseSplits\.mine/);
	await page.getByTestId('load-failed').getByRole('button', { name: 'Retry' }).click();
	await expect(page.getByTestId('my-routines-count')).toHaveText('No routines yet');
});

test('An exercise: a failed load says so and Retry brings the exercise', async ({ page, userData }) => {
	const exercise = await prisma.exercise.create({
		data: { userId: userData.userId, name: 'Barbell rows', targetMuscleGroup: 'Lats' }
	});
	await page.route(/exercises\.get/, (route) => route.abort());
	await page.goto(`/exercises/${exercise.id}`);
	await expect(page.getByTestId('load-failed')).toContainText("Couldn't load this exercise");
	await page.unroute(/exercises\.get/);
	await page.getByTestId('load-failed').getByRole('button', { name: 'Retry' }).click();
	await expect(page.getByRole('heading', { name: 'Barbell rows' })).toBeVisible();
});

test('the install button is used once: a second tap has nothing to ask', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/workouts');
	await page.evaluate(() => ((window as unknown as { prompted: number }).prompted = 0));
	const download = page.getByLabel('Download');
	// The browser offers the prompt once the app is listening: offered until the button shows
	await expect(async () => {
		await page.evaluate(() => {
			const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => void };
			event.prompt = () => {
				(window as unknown as { prompted: number }).prompted++;
			};
			window.dispatchEvent(event);
		});
		await expect(download).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15000 });
	await download.click();
	await expect(download).toHaveCount(0);
	expect(await page.evaluate(() => (window as unknown as { prompted: number }).prompted)).toBe(1);
	expect(errors).toEqual([]);
});
