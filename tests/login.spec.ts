import { expect, test } from '@playwright/test';
import { isPublicPath, safeRedirectPath } from '../src/lib/utils/safeRedirect';

// Signed out (no saved sign-in for this file)

test('signed out: an app page opens the sign-in page, which comes back to it', async ({ page }) => {
	await page.goto('/workouts?x=1');
	await page.waitForURL('/login?redirectTo=%2Fworkouts%3Fx%3D1');
	await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'MyFit' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
	await expect(page.getByText('Error 401')).toHaveCount(0);
});

test('signed out: public pages stay open; tRPC calls are refused as before, not sent to sign in', async ({
	page,
	request
}) => {
	for (const path of ['/', '/docs', '/privacy-policy', '/terms-of-service', '/offline']) {
		await page.goto(path);
		expect(new URL(page.url()).pathname).toEqual(path);
	}
	const response = await request.get('/trpc/workouts.getTodaysWorkoutData', { maxRedirects: 0 });
	expect(response.status()).not.toEqual(303);
	expect(response.ok()).toBe(false);
	expect(response.headers()['content-type']).toContain('application/json');
});

test('sign-in returns only to pages on this site', () => {
	expect(safeRedirectPath('/workouts?x=1')).toEqual('/workouts?x=1');
	expect(safeRedirectPath('//evil.com')).toEqual('/dashboard');
	expect(safeRedirectPath('https://evil.com')).toEqual('/dashboard');
	expect(safeRedirectPath('/\\evil.com')).toEqual('/dashboard');
	expect(safeRedirectPath(null)).toEqual('/dashboard');
	expect(isPublicPath('/docs')).toBe(true);
	expect(isPublicPath('/dashboard')).toBe(false);
	expect(isPublicPath('/loginx')).toBe(false);
});
