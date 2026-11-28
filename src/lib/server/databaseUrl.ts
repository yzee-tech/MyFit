/**
 * Prisma gives up connecting to the database after 5 seconds unless the connection string says otherwise. A database
 * that was asleep (the free plan's is, when idle) needs a few seconds to wake, so the app asks for 8. A string that
 * already has its own connect_timeout is left alone.
 *
 * The string is added to, never parsed and written back: a password with special characters stays exactly as it is.
 * No string (unset or blank, e.g. while the app is built) gives undefined, so Prisma does what it does without one.
 */
export const CONNECT_TIMEOUT_SECONDS = 8;

export function withConnectTimeout(url: string | undefined, seconds = CONNECT_TIMEOUT_SECONDS): string | undefined {
	if (!url || url.trim() === '') return undefined;
	if (/[?&]connect_timeout=/i.test(url)) return url;
	const separator = !url.includes('?') ? '?' : /[?&]$/.test(url) ? '' : '&';
	return `${url}${separator}connect_timeout=${seconds}`;
}
