/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { summarizeRetried, render } = require('./retried-tests-summary.cjs');

function writeRecord(dir, name, record) {
	fs.writeFileSync(path.join(dir, name), JSON.stringify(record));
}

test('only tests with more than one attempt are listed, in order, with their outcome', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-retried-'));
	// Passed first try: not listed
	writeRecord(dir, 'a-retry-0.json', { file: 'tests/models/cardio.spec.ts', line: 56, retry: 0, status: 'passed' });
	// Flaky: passed on its retry
	writeRecord(dir, 'b-retry-0.json', {
		file: 'tests/models/workouts.spec.ts',
		line: 515,
		retry: 0,
		status: 'timedOut'
	});
	writeRecord(dir, 'b-retry-1.json', { file: 'tests/models/workouts.spec.ts', line: 515, retry: 1, status: 'passed' });
	// Failed even after its retries
	writeRecord(dir, 'c-retry-0.json', { file: 'tests/models/workouts.spec.ts', line: 67, retry: 0, status: 'failed' });
	writeRecord(dir, 'c-retry-2.json', { file: 'tests/models/workouts.spec.ts', line: 67, retry: 2, status: 'failed' });
	writeRecord(dir, 'c-retry-1.json', { file: 'tests/models/workouts.spec.ts', line: 67, retry: 1, status: 'failed' });

	const { entries, missing } = summarizeRetried(dir);
	assert.equal(missing, false);
	assert.deepEqual(entries, [
		{ where: 'tests/models/workouts.spec.ts:515', attempts: 2, outcome: 'passed on retry' },
		{ where: 'tests/models/workouts.spec.ts:67', attempts: 3, outcome: 'ended failed' }
	]);
	const markdown = render({ entries, missing });
	assert.match(markdown, /2 test\(s\) needed a retry/);
	assert.match(markdown, /workouts\.spec\.ts:515` — 2 attempts, passed on retry/);
	assert.match(markdown, /workouts\.spec\.ts:67` — 3 attempts, ended failed/);
});

test('a clean run says so, and a missing directory is reported instead of failing the step', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-retried-clean-'));
	writeRecord(dir, 'a-retry-0.json', { file: 'tests/models/cardio.spec.ts', line: 56, retry: 0, status: 'passed' });
	assert.match(render(summarizeRetried(dir)), /No test needed a retry\./);
	assert.match(render(summarizeRetried(path.join(dir, 'absent'))), /No diagnostics found/);
});

test('files that are not diagnostics records are skipped', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-retried-mixed-'));
	writeRecord(dir, 'not-a-record.json', { hello: 'world' });
	fs.writeFileSync(path.join(dir, 'broken.json'), '{ not json');
	writeRecord(dir, 'b-retry-0.json', { file: 'tests/models/workouts.spec.ts', line: 515, retry: 0, status: 'failed' });
	writeRecord(dir, 'b-retry-1.json', { file: 'tests/models/workouts.spec.ts', line: 515, retry: 1, status: 'passed' });
	const { entries } = summarizeRetried(dir);
	assert.deepEqual(entries, [{ where: 'tests/models/workouts.spec.ts:515', attempts: 2, outcome: 'passed on retry' }]);
});
