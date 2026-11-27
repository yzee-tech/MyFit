import { expect, test } from '@playwright/test';

test('offline service worker: navigations fall back to /offline, but non-navigation GETs fail cleanly', async ({
	page
}) => {
	await page.goto('/login');
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	// Reload once so the active service worker controls this client
	await page.reload();
	await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

	await page.context().setOffline(true);

	// Non-navigation same-origin GET (e.g. tRPC query) must fail with a network error, not /offline HTML (200 OK)
	const trpcResult = await page.evaluate(() =>
		fetch('/trpc/workouts.getTodaysWorkoutData').then(
			(res) => `ok:${res.status}`,
			() => 'network-error'
		)
	);
	expect(trpcResult).toBe('network-error');

	// Cross-origin GET must not be intercepted with /offline HTML
	const crossOriginResult = await page.evaluate(() =>
		fetch('https://example.com/test.json').then(
			(res) => `ok:${res.status}`,
			() => 'network-error'
		)
	);
	expect(crossOriginResult).toBe('network-error');

	// Navigation still falls back to the precached /offline page
	await page.goto('/workouts');
	await expect(page.getByText(/offline/i).first()).toBeVisible();
});
