/**
 * Where to send someone after signing in: a path on this site only. Anything else ("//evil.com",
 * "https://…", "/\evil.com", nothing) goes to the dashboard
 */
export function safeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
	if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback;
	return path;
}

/** Pages anyone can open without signing in */
const PUBLIC_PATHS = ['/', '/login', '/docs', '/privacy-policy', '/terms-of-service', '/changelog', '/offline'];

/** Whether a page needs no sign-in */
export function isPublicPath(pathname: string): boolean {
	return PUBLIC_PATHS.some((path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)));
}
