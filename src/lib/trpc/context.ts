import { error, type RequestEvent } from '@sveltejs/kit';
import { TRPCError } from '@trpc/server';

export async function createContext(event: RequestEvent) {
	const session = await event.locals.auth();
	if (!session?.user?.id) error(401, 'Not logged in');
	return { event, userId: session.user.id };
}

/**
 * The context for requests that arrive over HTTP (the app's tRPC calls). Signed out, it answers with a tRPC
 * UNAUTHORIZED (HTTP 401): the shared createContext throws SvelteKit's error(401), which the tRPC handler
 * turned into a plain 500, the same as a crash, so a save that waits on the phone couldn't tell a lapsed
 * sign-in from a server error. Page loads keep createContext: they rely on SvelteKit's 401 page
 */
export async function createHttpContext(event: RequestEvent) {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
	return { event, userId: session.user.id };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
