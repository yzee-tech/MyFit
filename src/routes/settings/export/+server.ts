import { version } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/prisma';
import {
	EXPORT_FORMATS,
	EXPORT_MAX_BYTES,
	EXPORT_TX_OPTIONS,
	ExportTooLargeError,
	buildCsvExport,
	buildJsonExport,
	fetchExportData,
	gzipExportBody,
	type ExportFormat
} from '$lib/server/export';
import { checkExportRateLimit, recordExport } from '$lib/server/exportRateLimit';

import type { ServerlessConfig } from '@sveltejs/adapter-vercel';

// Within every Vercel plan's cap; the transaction timeout (20s) stays below it
export const config: ServerlessConfig = { maxDuration: 30 };

const tooLargeResponse = () =>
	new Response(
		'Export exceeds the maximum download size of 4 MB. Try the CSV format, which is smaller; if it is still too large, contact support.',
		{ status: 413 }
	);

export const GET: RequestHandler = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user?.id) return new Response('Not logged in', { status: 401 });

	const formatParam = event.url.searchParams.get('format');
	if (!EXPORT_FORMATS.includes(formatParam as ExportFormat))
		return new Response('Unsupported export format; use format=json or format=csv.', { status: 400 });
	const format = formatParam as ExportFormat;

	// The user id comes only from the session; any id in the request is ignored
	const userId = session.user.id;
	const retryAfterSeconds = checkExportRateLimit(userId, format);
	if (retryAfterSeconds > 0)
		return new Response(`Too many exports; retry in ${retryAfterSeconds} seconds.`, {
			status: 429,
			headers: { 'Retry-After': String(retryAfterSeconds) }
		});

	let body: string;
	try {
		const data = await prisma.$transaction((tx) => fetchExportData(tx, userId), EXPORT_TX_OPTIONS);
		// The deployed commit SHA on Vercel, the kit build id elsewhere (a timestamp locally)
		const appVersion = env.VERCEL_GIT_COMMIT_SHA ?? version;
		body = format === 'json' ? buildJsonExport(data, appVersion) : buildCsvExport(data);
	} catch (caught) {
		if (caught instanceof ExportTooLargeError) return tooLargeResponse();
		throw caught;
	}

	// Backstop on the exact wire bytes: the response goes out gzip-compressed, so the limit applies to
	// the compressed size. The preflight estimate ran first and stays as it was.
	const compressed = await gzipExportBody(body);
	if (compressed.byteLength > EXPORT_MAX_BYTES) return tooLargeResponse();

	// Only a delivered export counts toward the rate limit
	recordExport(userId, format);

	const date = new Date().toISOString().slice(0, 10);
	return new Response(compressed, {
		headers: {
			'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="myfit-export-${date}.${format}"`,
			'Content-Encoding': 'gzip',
			'Cache-Control': 'private, no-store'
		}
	});
};
