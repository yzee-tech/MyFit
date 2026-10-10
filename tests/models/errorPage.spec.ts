import { expect, test } from '../fixtures';

test('a page that doesn’t exist: plain words and a way home, with the new logo', async ({ page }) => {
	await page.goto('/no-such-page');
	await expect(page.getByTestId('error-page')).toContainText("This page doesn't exist");
	await expect(page.getByText('Error 404')).toHaveCount(0);
	await page.getByRole('link', { name: 'Go home' }).click();
	await page.waitForURL('/dashboard');
	await expect(page.getByRole('img', { name: 'MyFit logo' }).first()).toHaveAttribute('src', '/logo.svg');
});
