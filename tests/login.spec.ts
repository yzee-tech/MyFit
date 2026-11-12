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
	// A browser drops tabs and line breaks from an address: each of these would be read as "//evil.com"
	for (const hidden of ['\t', '\n', '\r', '\t\n', ' ', '\u0000', '\u0085']) {
		expect(safeRedirectPath(`/${hidden}/evil.com`), JSON.stringify(hidden)).toEqual('/dashboard');
		expect(safeRedirectPath(`/workouts${hidden}`), JSON.stringify(hidden)).toEqual('/dashboard');
	}
	// As the sign-in page gets it from a link
	const fromLink = (link: string) =>
		safeRedirectPath(new URL(link, 'https://myfit.example').searchParams.get('redirectTo'));
	expect(fromLink('/login?redirectTo=/%09/evil.com')).toEqual('/dashboard');
	expect(fromLink('/login?redirectTo=%2Fworkouts%3Froutine%3DPull%2520A')).toEqual('/workouts?routine=Pull%20A');
	// Whatever is let through is still this site when a browser reads it
	for (const path of ['/workouts', '/exercise-splits/edit?routine=Pull%20A', '/stats?tab=exercises#top']) {
		expect(safeRedirectPath(path)).toEqual(path);
		expect(new URL(safeRedirectPath(path), 'https://myfit.example').origin).toEqual('https://myfit.example');
	}
	expect(isPublicPath('/docs')).toBe(true);
	expect(isPublicPath('/dashboard')).toBe(false);
	expect(isPublicPath('/loginx')).toBe(false);
});
