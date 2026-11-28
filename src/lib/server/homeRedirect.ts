import type { RequestEvent } from '@sveltejs/kit';

/** What the redirect needs of a request: the hook's event, or a stand-in for one in a test */
export type HomeRedirectEvent = Pick<RequestEvent, 'request' | 'url' | 'isDataRequest'> & {
	locals: { auth: () => Promise<unknown> };
};

/**
 * A signed-in visit to "/" goes to /dashboard: the start page only redirects, and loading it ran the root layout's
 * database reads first (the layout and the page load side by side, so the page can't stop them). Decided here, before
 * either loads, the visit costs only the session lookup.
 *
 * SvelteKit takes "/__data.json" (a client navigation's data request) to the page's own path before the hooks run, so
 * "/" is the only path to match, and no other page's data request is ever caught. ?forceView keeps the landing page.
 * That request gets what SvelteKit itself answers to a redirect from a page. Anything else (null) is left to the app,
 * also a session lookup that fails: the app then does what it did before, error page included.
 */
export async function homeRedirect(event: HomeRedirectEvent): Promise<Response | null> {
	if (event.request.method !== 'GET' || event.url.pathname !== '/' || event.url.searchParams.has('forceView')) {
		return null;
	}
	let session: unknown;
	try {
		session = await event.locals.auth();
	} catch {
		return null;
	}
	if (!session) return null;
	if (event.isDataRequest) {
		return new Response(JSON.stringify({ type: 'redirect', location: '/dashboard' }), {
			headers: { 'content-type': 'application/json' }
		});
	}
	return new Response(null, { status: 302, headers: { location: '/dashboard' } });
}
