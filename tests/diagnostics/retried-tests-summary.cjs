#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
/**
 * Lists the run's retried tests in the GitHub step summary, so flakes are visible without opening logs.
 * Reads only playwright-diagnostics JSON (file, line, retry, status); it collects nothing new.
 * Every record is re-validated with the same strict validator as safe-artifacts.cjs before anything is
 * rendered, so a record the privacy boundary would reject can never reach the summary, and the workflow
 * step runs only when that boundary step succeeded.
 */
const fs = require('node:fs');
const path = require('node:path');
const { validateArtifact } = require('./safe-artifacts.cjs');

/**
 * One entry per test that needed more than one attempt: where it is, how many attempts, how it ended.
 * Reads every <name>.json in dir; files that are not diagnostics records, or that fail the strict
 * validator, are skipped (counted, never rendered).
 */
function summarizeRetried(dir) {
	if (!fs.existsSync(dir)) return { entries: [], missing: true, rejected: 0 };
	const attemptsByTest = new Map();
	let rejected = 0;
	for (const name of fs.readdirSync(dir)) {
		if (!name.endsWith('.json')) continue;
		let data;
		try {
			data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
			validateArtifact(data);
		} catch {
			if (data && typeof data === 'object' && !Array.isArray(data)) rejected += 1;
			continue;
		}
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
	return { entries, missing: false, rejected };
}

/** The markdown appended to the run's summary */
function render({ entries, missing, rejected }) {
	const body = missing
		? ['No diagnostics found: the tests never ran, so there is nothing to summarize.']
		: entries.length === 0
			? ['No test needed a retry.']
			: [
					`${entries.length} test(s) needed a retry:`,
					...entries.map((entry) => `- \`${entry.where}\` — ${entry.attempts} attempts, ${entry.outcome}`)
				];
	if (rejected > 0) body.push(`${rejected} record(s) failed the strict diagnostics validator and were omitted.`);
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
