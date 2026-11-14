#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
/**
 * Lists the run's retried tests in the GitHub step summary, so flakes are visible without opening logs.
 * Reads only the validated playwright-diagnostics JSON (file, line, retry, status); it collects nothing new.
 */
const fs = require('node:fs');
const path = require('node:path');

/**
 * One entry per test that needed more than one attempt: where it is, how many attempts, how it ended.
 * Reads every <name>.json in dir; files that are not diagnostics records are skipped.
 */
function summarizeRetried(dir) {
	if (!fs.existsSync(dir)) return { entries: [], missing: true };
	const attemptsByTest = new Map();
	for (const name of fs.readdirSync(dir)) {
		if (!name.endsWith('.json')) continue;
		let data;
		try {
			data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
		} catch {
			continue;
		}
		if (typeof data.file !== 'string' || typeof data.line !== 'number' || typeof data.retry !== 'number') continue;
		const where = `${data.file}:${data.line}`;
		if (!attemptsByTest.has(where)) attemptsByTest.set(where, []);
		attemptsByTest.get(where).push({ retry: data.retry, status: data.status });
	}
	const entries = [];
	for (const [where, attempts] of attemptsByTest) {
		if (attempts.length < 2) continue;
		attempts.sort((a, b) => a.retry - b.retry);
		const last = attempts[attempts.length - 1];
		entries.push({
			where,
			attempts: attempts.length,
			outcome: last.status === 'passed' ? 'passed on retry' : `ended ${last.status}`
		});
	}
	entries.sort((a, b) => a.where.localeCompare(b.where));
	return { entries, missing: false };
}

/** The markdown appended to the run's summary */
function render({ entries, missing }) {
	const body = missing
		? ['No diagnostics found: the tests never ran, so there is nothing to summarize.']
		: entries.length === 0
			? ['No test needed a retry.']
			: [
					`${entries.length} test(s) needed a retry:`,
					...entries.map((entry) => `- \`${entry.where}\` — ${entry.attempts} attempts, ${entry.outcome}`)
				];
	return ['## Retried tests', '', ...body, ''].join('\n');
}

function main() {
	const dir = process.argv[2] || 'playwright-diagnostics';
	const markdown = render(summarizeRetried(dir));
	const summaryFile = process.env.GITHUB_STEP_SUMMARY;
	if (summaryFile) fs.appendFileSync(summaryFile, markdown);
	else process.stdout.write(markdown);
}

if (require.main === module) main();
module.exports = { summarizeRetried, render };
