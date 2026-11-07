/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync, execFileSync } = require('node:child_process');
const { validateStates, validateDirectory } = require('./safe-artifacts.cjs');

test('actual failed retry zero is retained and retry-to-pass still fails the run', () => {
	const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-capture-smoke-'));
	const root = path.resolve(__dirname, '../..');
	const output = path.join(temp, 'safe');
	const config = path.join(temp, 'playwright.config.cjs');
	fs.writeFileSync(
		config,
		`module.exports = ${JSON.stringify({
			testDir: path.join(__dirname, 'fixtures'),
			testMatch: 'capture-smoke.ts',
			workers: 1,
			retries: 1,
			failOnFlakyTests: true,
			timeout: 30000,
			outputDir: path.join(temp, 'raw-private'),
			reporter: [['list'], [path.join(__dirname, 'reporter.cjs'), { outputDir: output }]],
			use: { browserName: 'chromium', headless: true }
		})};`
	);
	const run = spawnSync(
		process.execPath,
		[path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', config],
		{
			cwd: root,
			encoding: 'utf8',
			timeout: 60000
		}
	);
	assert.equal(run.status, 1, run.stdout + run.stderr);
	assert.match(run.stdout, /1 flaky/);
	validateDirectory(output);
	const records = fs
		.readdirSync(output)
		.filter((file) => file.endsWith('.json'))
		.map((file) => JSON.parse(fs.readFileSync(path.join(output, file), 'utf8')));
	assert.equal(fs.readdirSync(output).filter((file) => file.endsWith('.zip')).length, 1);
	const original = records.find((record) => record.retry === 0);
	const retry = records.find((record) => record.retry === 1);
	assert.equal(original.status, 'timedOut');
	assert.equal(retry.status, 'passed');
	assert(original.steps.some((step) => step.failed));
	assert(
		original.states.some(
			(state) =>
				!state.runChecked &&
				state.bikeChecked &&
				state.addCount === 1 &&
				state.bikeMenuVisible &&
				state.pickerVisible &&
				state.pickerExpanded &&
				state.pickerSearchVisible
		)
	);
	const published = JSON.stringify(records);
	assert(!/AUTH_SENTINEL|SESSION_SENTINEL|sessionToken|cookies|storageState|headers/.test(published));
	console.log(
		'Actual runner: timed-out retry 0 + passed retry 1, exit 1; first-failure selection state retained, sentinels excluded'
	);
	const trace = path.join(
		output,
		fs.readdirSync(output).find((file) => file.endsWith('.zip'))
	);
	execFileSync('python3', [
		'-c',
		'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1], "a"); z.writestr("resources/secret", "AUTH_SENTINEL_NEVER_UPLOAD"); z.close()',
		trace
	]);
	assert.throws(() => validateDirectory(output));
	fs.writeFileSync(path.join(output, 'auth.json'), '{}');
	assert.throws(() => validateDirectory(output));
	if (!process.env.KEEP_CAPTURE_SMOKE) fs.rmSync(temp, { recursive: true, force: true });
});

test('fail closed on secret-bearing or unexpected fields, values and paths', () => {
	assert.throws(() => validateStates([{ sessionToken: 'SECRET' }]));
	assert.throws(() => validateStates([{ elapsedMs: 0, addCount: 1, runChecked: 'SECRET' }]));
	const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'myfit-capture-invalid-'));
	fs.writeFileSync(path.join(temp, 'trace.zip'), 'SECRET');
	assert.throws(() => validateDirectory(temp));
	fs.rmSync(temp, { recursive: true, force: true });
});
