/**
 * Where to send someone after signing in: a path on this site only. Anything else ("//evil.com",
 * "https://…", "/\evil.com", nothing) goes to the dashboard. So does a path with a tab, a line break or
 * any other control character or space in it: a browser drops tabs and line breaks from an address, so
 * "/<tab>/evil.com" would be read as "//evil.com", another site
 */
export function safeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
	if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback;
	// eslint-disable-next-line no-control-regex
	if (/[\u0000-\u0020\u007f-\u009f]/.test(path)) return fallback;
	// Read as a browser reads it: still this site, and still the same path
	try {
		const base = 'https://myfit.invalid';
		const url = new URL(path, base);
		if (url.origin !== base) return fallback;
	} catch {
		return fallback;
	}
	return path;
}

/** Pages anyone can open without signing in */
const PUBLIC_PATHS = ['/', '/login', '/docs', '/privacy-policy', '/terms-of-service', '/changelog', '/offline'];

/** Whether a page needs no sign-in */
export function isPublicPath(pathname: string): boolean {
	return PUBLIC_PATHS.some((path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)));
}
