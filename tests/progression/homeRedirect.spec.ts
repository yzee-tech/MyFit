import { test, expect } from '@playwright/test';
import { homeRedirect, type HomeRedirectEvent } from '../../src/lib/server/homeRedirect';

/**
 * A signed-in visit to "/" goes to /dashboard from the hook, before the page and its layout load (the layout's
 * database reads would otherwise run for nothing). Everything else is left to the app, exactly as before
 */

function eventOf(
	path: string,
	{
		method = 'GET',
		isDataRequest = false,
		signedIn = true,
		auth
	}: { method?: string; isDataRequest?: boolean; signedIn?: boolean; auth?: () => Promise<unknown> } = {}
) {
	let calls = 0;
	const event = {
		request: { method },
		url: new URL(path, 'http://localhost'),
		isDataRequest,
		locals: {
			auth:
				auth ??
				(async () => {
					calls++;
					return signedIn ? { user: { id: 'someone' }, expires: 'later' } : null;
				})
		}
	} as unknown as HomeRedirectEvent;
	return { event, calls: () => calls };
}

test('signed in, "/" is redirected to /dashboard with a 302, after one look at the session', async () => {
	const { event, calls } = eventOf('/');
	const response = await homeRedirect(event);
	expect(response?.status).toBe(302);
	expect(response?.headers.get('location')).toBe('/dashboard');
	expect(calls()).toBe(1);
});

test('the data request of "/" (a client navigation) gets what SvelteKit sends for a page redirect', async () => {
	const { event } = eventOf('/', { isDataRequest: true });
	const response = await homeRedirect(event);
	expect(response?.status).toBe(200);
	expect(response?.headers.get('content-type')).toBe('application/json');
	expect(await response?.text()).toBe('{"type":"redirect","location":"/dashboard"}');
});

test('?forceView keeps the landing page, for the page and for its data request', async () => {
	for (const isDataRequest of [false, true]) {
		const { event, calls } = eventOf('/?forceView', { isDataRequest });
		expect(await homeRedirect(event)).toBeNull();
		// Nothing to decide, so the session isn't even looked at
		expect(calls()).toBe(0);
	}
});

test('signed out, "/" is left to the app: the landing page', async () => {
	const { event } = eventOf('/', { signedIn: false });
	expect(await homeRedirect(event)).toBeNull();
});

test('only "/" is redirected: other pages and their data requests are not', async () => {
	for (const path of ['/dashboard', '/workouts', '/stats', '/exercise-splits/edit', '/login', '/privacy-policy']) {
		for (const isDataRequest of [false, true]) {
			const { event, calls } = eventOf(path, { isDataRequest });
			expect(await homeRedirect(event), path).toBeNull();
			expect(calls(), path).toBe(0);
		}
	}
});

test('only a GET is redirected', async () => {
	for (const method of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']) {
		const { event } = eventOf('/', { method });
		expect(await homeRedirect(event), method).toBeNull();
	}
});

test('a session lookup that fails falls through to the app, as before, instead of an error of its own', async () => {
	const { event } = eventOf('/', {
		auth: async () => {
			throw new Error('Can’t reach database server');
		}
	});
	expect(await homeRedirect(event)).toBeNull();
});
