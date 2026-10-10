import { SvelteKitAuth } from '@auth/sveltekit';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import github from '@auth/sveltekit/providers/github';
import google from '@auth/sveltekit/providers/google';
import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import { createTRPCHandle } from 'trpc-sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { isPublicPath } from '$lib/utils/safeRedirect';

const prisma = new PrismaClient();

const { handle: authHandle } = SvelteKitAuth({
	adapter: PrismaAdapter(prisma),
	basePath: '/auth',
	providers: [google, github],
	trustHost: true,
	callbacks: {
		session({ session, user }) {
			session.userId = user.id;
			return session;
		}
	}
});

const trpcHandle = createTRPCHandle({
	router,
	createContext,
	onError: ({ type, path, error }) =>
		console.error(`Encountered error while trying to process ${type} @ ${path}:`, error)
});

/**
 * A page opened without signing in goes to the sign-in page, then back. Only full page loads:
 * tRPC calls keep their 401, auth and files pass, and a page's data request (client navigation)
 * gets the error page's sign-in prompt
 */
const signInGuard: Handle = async ({ event, resolve }) => {
	// Only the path here: pre-built pages (e.g. /docs) can't read the query
	const { pathname } = event.url;
	const isPage =
		event.request.method === 'GET' &&
		!pathname.startsWith('/trpc/') &&
		!pathname.startsWith('/auth/') &&
		!pathname.startsWith('/_app/') &&
		!pathname.endsWith('/__data.json') &&
		!/\.[a-z0-9]+$/i.test(pathname);
	if (isPage && !isPublicPath(pathname)) {
		const session = await event.locals.auth();
		if (!session?.user) {
			const redirectTo = encodeURIComponent(pathname + event.url.search);
			return new Response(null, { status: 303, headers: { location: `/login?redirectTo=${redirectTo}` } });
		}
	}
	return resolve(event);
};

export const handle = sequence(authHandle, signInGuard, trpcHandle);
