/**
 * Best-effort export throttle: one export per user per format per minute, held in memory.
 * Per instance only (not a distributed guarantee); both formats can be downloaded back to back.
 */
const WINDOW_MS = 60_000;
const lastExportAt = new Map<string, number>();

/** Seconds until the next allowed export of this format, or 0 when allowed now. Doesn't count the export; see recordExport */
export function checkExportRateLimit(userId: string, format: string): number {
	const key = `${userId}:${format}`;
	const now = Date.now();
	for (const [entryKey, at] of lastExportAt) if (now - at > WINDOW_MS) lastExportAt.delete(entryKey);
	const last = lastExportAt.get(key);
	if (last !== undefined && now - last < WINDOW_MS) return Math.ceil((WINDOW_MS - (now - last)) / 1000);
	return 0;
}

/** Call once an export was delivered, so a refused (413) or failed (500) export doesn't use up the minute */
export function recordExport(userId: string, format: string): void {
	lastExportAt.set(`${userId}:${format}`, Date.now());
}
