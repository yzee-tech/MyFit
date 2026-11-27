import { expect, test } from '@playwright/test';

const ONE_PIXEL_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
	'base64'
);

test('offline service worker: navigations fall back to /offline, non-navigation GETs fail cleanly, and cross-origin images are not cached', async ({
	page
}) => {
	await page.goto('/login');
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	// Reload once so the active service worker controls this client
	await page.reload();
	await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

	const crossOriginAvatar = 'https://lh3.googleusercontent.com/a/test-avatar.png';
	await page.route(crossOriginAvatar, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'image/png',
			headers: { 'Cache-Control': 'no-store' },
			body: ONE_PIXEL_PNG
		})
	);

	// Load a cross-origin image (request.destination === 'image') while online
	const loadedOnline = await page.evaluate(
		(src) =>
			new Promise<boolean>((resolve) => {
				const img = new Image();
				img.onload = () => resolve(true);
				img.onerror = () => resolve(false);
				img.src = src;
			}),
		crossOriginAvatar
	);
	expect(loadedOnline).toBe(true);

	// The service worker must not have cached the cross-origin image in Cache Storage
	const cachedCrossOrigin = await page.evaluate(async (src) => Boolean(await caches.match(src)), crossOriginAvatar);
	expect(cachedCrossOrigin).toBe(false);

	await page.unroute(crossOriginAvatar);
	await page.context().setOffline(true);

	// Non-navigation same-origin GET (e.g. tRPC query) must fail with a network error, not /offline HTML (200 OK)
	const trpcResult = await page.evaluate(() =>
		fetch('/trpc/workouts.getTodaysWorkoutData').then(
			(res) => `ok:${res.status}`,
			() => 'network-error'
		)
	);
	expect(trpcResult).toBe('network-error');

	// Navigation still falls back to the precached /offline page
	await page.goto('/workouts');
	await expect(page.getByText(/offline/i).first()).toBeVisible();
});
