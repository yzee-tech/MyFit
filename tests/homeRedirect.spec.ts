import { test, expect } from './fixtures';
import { request as playwrightRequest } from '@playwright/test';

/**
 * Opening the app: a signed-in "/" is sent to /dashboard before the layout's database reads run, only "/" is (never
 * another page's data request), and the installed app starts on /dashboard
 */

const DATA = '__data.json?x-sveltekit-invalidated=01';

/** A data response's first line: SvelteKit streams what a page still waits for as lines after it */
const firstLine = async (response: { text: () => Promise<string> }) =>
	JSON.parse((await response.text()).split('\n')[0]);

test('signed in, "/" answers a 302 to /dashboard', async ({ page }) => {
	const response = await page.request.get('/', { maxRedirects: 0 });
	expect(response.status()).toBe(302);
	expect(response.headers()['location']).toBe('/dashboard');
});

test('signed in, the data request of "/" answers the redirect SvelteKit sends for a page redirect', async ({
	page
}) => {
	const response = await page.request.get(`/${DATA}`, { maxRedirects: 0 });
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('application/json');
	expect(await response.json()).toEqual({ type: 'redirect', location: '/dashboard' });
});

test('?forceView keeps the landing page: the page, and its data request', async ({ page }) => {
	const landing = await page.request.get('/?forceView', { maxRedirects: 0 });
	expect(landing.status()).toBe(200);
	const data = await page.request.get('/__data.json?forceView=&x-sveltekit-invalidated=01', { maxRedirects: 0 });
	expect(data.status()).toBe(200);
	expect((await firstLine(data)).type).toBe('data');
});

test('no other page is redirected, nor is its data request', async ({ page }) => {
	for (const path of ['/dashboard', '/workouts', '/stats']) {
		const data = await page.request.get(`${path}/${DATA}`, { maxRedirects: 0 });
		expect(data.status(), path).toBe(200);
		expect((await firstLine(data)).type, path).toBe('data');
		const html = await page.request.get(path, { maxRedirects: 0 });
		expect(html.status(), path).toBe(200);
	}
});

test('signed out, "/" is the landing page as before, and /dashboard still asks to sign in', async ({ baseURL }) => {
	const signedOut = await playwrightRequest.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
	const landing = await signedOut.get('/', { maxRedirects: 0 });
	expect(landing.status()).toBe(200);
	const dashboard = await signedOut.get('/dashboard', { maxRedirects: 0 });
	expect(dashboard.status()).toBe(303);
	expect(dashboard.headers()['location']).toBe('/login?redirectTo=%2Fdashboard');
	await signedOut.dispose();
});

test('the app starts on /dashboard when opened from the home screen, and keeps its identity', async ({ page }) => {
	const response = await page.request.get('/manifest.webmanifest');
	expect(response.status()).toBe(200);
	const manifest = await response.json();
	expect(manifest.start_url).toBe('/dashboard');
	expect(manifest.id).toBe('/?app=v3');
});
