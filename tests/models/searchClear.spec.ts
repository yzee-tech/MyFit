import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createExercises, pickRoutine } from './commonFunctions';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

const clearButton = (page: Page) => page.getByRole('button', { name: 'Clear search' });

test('Add exercises sheet: the clear button shows only with text, keeps the search when an exercise is ticked, then empties it and keeps the cursor in the box', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [
		{ name: 'Cable lateral raises', targetMuscleGroup: 'SideDelts' },
		{ name: 'Lateral raise (dumbbell)', targetMuscleGroup: 'SideDelts' },
		{ name: 'Barbell rows', targetMuscleGroup: 'Traps' }
	]);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await page.getByLabel('add-exercise').click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'Add exercises' });
	const search = sheet.getByPlaceholder('Search your exercises');

	// Nothing typed: no button
	await expect(sheet.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
	await search.fill('Later');
	await expect(sheet.getByRole('checkbox')).toHaveCount(2);
	await expect(sheet.getByRole('button', { name: 'Clear search' })).toBeVisible();

	// Ticking an exercise leaves the search as it was
	await sheet.getByRole('checkbox', { name: 'Cable lateral raises', exact: true }).click();
	await expect(search).toHaveValue('Later');
	await expect(sheet.getByRole('checkbox')).toHaveCount(2);

	// The button empties it, brings the whole list back and leaves the cursor in the box
	await sheet.getByRole('button', { name: 'Clear search' }).click();
	await expect(search).toHaveValue('');
	await expect(search).toBeFocused();
	await expect(sheet.getByRole('checkbox')).toHaveCount(3);
	await expect(sheet.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
	// The tick is still there
	await expect(sheet.getByRole('checkbox', { name: 'Cable lateral raises', exact: true })).toBeChecked();
});

test('Exercises page: the clear button empties the search and brings the whole list back', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [
		{ name: 'Cable lateral raises', targetMuscleGroup: 'SideDelts' },
		{ name: 'Barbell rows', targetMuscleGroup: 'Traps' }
	]);
	await page.goto('/exercises');
	const search = page.getByLabel('Search exercises');
	await expect(clearButton(page)).toHaveCount(0);
	await search.fill('Cable');
	await expect(page.getByRole('link', { name: /^Barbell rows/ })).toHaveCount(0);
	await clearButton(page).click();
	await expect(search).toHaveValue('');
	await expect(search).toBeFocused();
	await expect(page.getByRole('link', { name: /^Barbell rows/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /^Cable lateral raises/ })).toBeVisible();
	await expect(clearButton(page)).toHaveCount(0);
});

test('Mesocycles page: the clear button drops the search from the link and shows every block again', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	for (const [name, daysAgo] of [
		['Alpha block', 60],
		['Beta block', 30]
	] as const) {
		await prisma.mesocycle.create({
			data: {
				userId,
				name,
				weeklyRIR: [3, 2, 1, 0],
				startDate: new Date(Date.now() - daysAgo * DAY),
				endDate: new Date(Date.now() - (daysAgo - 20) * DAY),
				startOverloadPercentage: 2.5,
				lastSetToFailure: false,
				forceRIRMatching: false
			}
		});
	}
	await page.goto('/mesocycles');
	await expect(page.getByText('Beta block')).toBeVisible();
	await expect(clearButton(page)).toHaveCount(0);

	const search = page.locator('#search-mesocycles');
	await search.fill('Alpha');
	await search.press('Enter');
	await expect(page).toHaveURL(/search=Alpha/);
	await expect(page.getByText('Beta block')).toHaveCount(0);

	// The button is not a submit: it only clears
	await clearButton(page).click();
	await expect(search).toHaveValue('');
	await expect(search).toBeFocused();
	await expect(page).not.toHaveURL(/search=/);
	await expect(page.getByText('Alpha block')).toBeVisible();
	await expect(page.getByText('Beta block')).toBeVisible();
});

test('routine exercise picker: the clear button empties the search and the keyboard still picks', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [{ name: 'Barbell rows', targetMuscleGroup: 'Traps' }]);
	await page.goto('/exercise-splits/edit?new');
	await page.getByLabel('add-exercise').click();
	await page.getByLabel('Pick an exercise').click();
	const search = page.getByPlaceholder('Search your exercises');
	await expect(clearButton(page)).toBeHidden();
	await search.fill('zzz');
	await expect(page.getByRole('option', { name: 'Barbell rows' })).toHaveCount(0);
	await expect(clearButton(page)).toBeVisible();
	await clearButton(page).click();
	await expect(search).toHaveValue('');
	await expect(search).toBeFocused();
	await expect(clearButton(page)).toBeHidden();
	await expect(page.getByRole('option', { name: 'Barbell rows' })).toBeVisible();
	// Still the keyboard: Enter picks the highlighted exercise
	await search.press('Enter');
	await expect(page.getByLabel('Pick an exercise')).toHaveText('Barbell rows');
});
