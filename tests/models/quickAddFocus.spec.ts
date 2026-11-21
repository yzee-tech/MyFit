import { test, expect, type Page } from '../fixtures';
import { createExercises, pickRoutine } from './commonFunctions';

async function watchSearchFocus(page: Page) {
	await page.evaluate(() => {
		const search = document.querySelector<HTMLInputElement>('input[placeholder="Search your exercises"]');
		if (!search) throw new Error('Picker search missing');
		search.dataset.returnFocusCount = '0';
		search.addEventListener('focus', () => {
			search.dataset.returnFocusCount = String(Number(search.dataset.returnFocusCount) + 1);
		});
	});
}

async function openPicker(page: Page) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await page.getByLabel('add-exercise').click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'Add exercises' });
	await expect(sheet.getByTestId('quick-add-list')).toBeFocused();
	return sheet;
}

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1280, height: 900 }
]) {
	test.describe(`Quick add focus at ${viewport.width}px`, () => {
		test.use({ viewport });

		test('creating an exercise returns focus to the list and keeps earlier ticks', async ({ page, userData }) => {
			await createExercises(userData.userId, [{ name: 'Focus row', targetMuscleGroup: 'Traps' }]);
			const sheet = await openPicker(page);
			await sheet.getByRole('checkbox', { name: 'Focus row', exact: true }).click();
			const search = sheet.getByPlaceholder('Search your exercises');
			await search.fill('Focus');
			await sheet.getByRole('button', { name: 'New exercise', exact: true }).click();
			const form = page.getByRole('dialog', { name: 'New exercise', exact: true });
			await form.getByLabel('Name', { exact: true }).fill('Focus curl');
			await form.getByRole('combobox', { name: 'Primary muscle group', exact: true }).click();
			await page.getByRole('option', { name: 'Biceps', exact: true }).click();
			// Leave a text field focused, as with the soft keyboard on a phone.
			await form.getByLabel('Exercise note').fill('Keep this note');
			await watchSearchFocus(page);
			await form.getByRole('button', { name: 'Create exercise', exact: true }).click();
			await expect(form).toHaveCount(0);
			await expect(sheet.getByTestId('quick-add-list')).toBeFocused();
			await expect(search).not.toBeFocused();
			await expect(search).toHaveAttribute('data-return-focus-count', '0');
			await expect(search).toHaveValue('Focus');
			await expect(sheet.getByRole('checkbox', { name: 'Focus row', exact: true })).toBeChecked();
			await expect(sheet.getByRole('checkbox', { name: 'Focus curl', exact: true })).toBeChecked();
			// The success toast covers the bottom button at phone width. Move off it so it can expire.
			await page.mouse.move(0, 0);
			await expect(page.getByText('Exercise created', { exact: true })).toBeHidden();
			await expect(search).toHaveAttribute('data-return-focus-count', '0');
			await sheet.getByRole('button', { name: 'Add 2 exercises', exact: true }).click();
			await expect(sheet).toHaveCount(0);
			await expect(page.getByTestId(/-summary$/)).toHaveCount(2);
		});

		test('a failed save keeps the form and its text for retry', async ({ page, userData }) => {
			await createExercises(userData.userId, [{ name: 'Focus row', targetMuscleGroup: 'Traps' }]);
			const sheet = await openPicker(page);
			await sheet.getByRole('button', { name: 'New exercise', exact: true }).click();
			const form = page.getByRole('dialog', { name: 'New exercise', exact: true });
			await form.getByLabel('Name', { exact: true }).fill('Unsaved focus curl');
			await form.getByRole('combobox', { name: 'Primary muscle group', exact: true }).click();
			await page.getByRole('option', { name: 'Biceps', exact: true }).click();
			await form.getByLabel('Exercise note').fill('Keep my input');
			await page.route('**/trpc/exercises.create*', (route) => route.abort());
			await form.getByRole('button', { name: 'Create exercise', exact: true }).click();
			await expect(page.getByText('Failed to fetch', { exact: true })).toBeVisible();
			await expect(form).toBeVisible();
			await expect(form.getByLabel('Name', { exact: true })).toHaveValue('Unsaved focus curl');
			await expect(form.getByLabel('Exercise note')).toHaveValue('Keep my input');
			await expect(form.getByRole('button', { name: 'Create exercise', exact: true })).toBeEnabled();
		});

		test('cancelling or picking an existing exercise returns to the list, while clear search still allows typing', async ({
			page,
			userData
		}) => {
			await createExercises(userData.userId, [{ name: 'Focus row', targetMuscleGroup: 'Traps' }]);
			const sheet = await openPicker(page);
			const search = sheet.getByPlaceholder('Search your exercises');
			await search.fill('Focus');
			await sheet.getByRole('button', { name: 'New exercise', exact: true }).click();
			const form = page.getByRole('dialog', { name: 'New exercise', exact: true });
			await form.getByLabel('Name', { exact: true }).fill('Not saved');
			await watchSearchFocus(page);
			await form.getByRole('button', { name: viewport.width < 768 ? 'Cancel' : 'Close', exact: true }).click();
			await expect(form).toHaveCount(0);
			await expect(sheet.getByTestId('quick-add-list')).toBeFocused();
			await expect(search).toHaveValue('Focus');
			await expect(search).toHaveAttribute('data-return-focus-count', '0');
			await expect(sheet.getByRole('checkbox', { name: 'Focus row', exact: true })).not.toBeChecked();
			await sheet.getByRole('button', { name: 'New exercise', exact: true }).click();
			await form.getByLabel('Name', { exact: true }).fill('Focus row');
			await form
				.getByTestId('existing-exercise-matches')
				.getByRole('button', { name: 'Focus row', exact: true })
				.click();
			await expect(form).toHaveCount(0);
			await expect(sheet.getByTestId('quick-add-list')).toBeFocused();
			await expect(sheet.getByRole('checkbox', { name: 'Focus row', exact: true })).toBeChecked();
			await expect(search).toHaveAttribute('data-return-focus-count', '0');
			await sheet.getByRole('button', { name: 'Clear search' }).click();
			await expect(search).toHaveValue('');
			await expect(search).toBeFocused();
		});
	});
}
