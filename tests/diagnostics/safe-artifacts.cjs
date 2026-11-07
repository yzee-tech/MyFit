/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const booleanKeys = [
	'runChecked',
	'bikeChecked',
	'runCheckboxVisible',
	'bikeCheckboxVisible',
	'runMenuVisible',
	'bikeMenuVisible',
	'pickerVisible',
	'pickerExpanded',
	'pickerSearchVisible',
	'newExerciseVisible'
];
function finite(value) {
	assert.equal(typeof value, 'number');
	assert(Number.isFinite(value));
}
function keys(value, expected) {
	assert(value && typeof value === 'object' && !Array.isArray(value));
	assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
}
function validateStates(states) {
	assert(Array.isArray(states) && states.length <= 200);
	for (const state of states) {
		keys(state, ['elapsedMs', 'addCount', ...booleanKeys]);
		finite(state.elapsedMs);
		finite(state.addCount);
		for (const key of booleanKeys) assert.equal(typeof state[key], 'boolean');
	}
	return states;
}
function validateArtifact(data) {
	keys(data, ['version', 'retry', 'status', 'durationMs', 'file', 'line', 'steps', 'states']);
	assert.equal(data.version, 1);
	finite(data.retry);
	finite(data.durationMs);
	finite(data.line);
	assert(['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(data.status));
	assert(typeof data.file === 'string' && /^tests\/[a-zA-Z0-9_./-]+\.[jt]s$/.test(data.file));
	assert(Array.isArray(data.steps) && data.steps.length <= 500);
	for (const step of data.steps) {
		keys(step, ['kind', 'operation', 'elapsedMs', 'durationMs', 'failed']);
		assert(['action', 'assertion', 'fixture', 'hook', 'other'].includes(step.kind));
		assert(
			[
				'click',
				'fill',
				'check',
				'uncheck',
				'navigate',
				'goto',
				'waitforurl',
				'waitforloadstate',
				'selectoption',
				'setcontent',
				'evaluate',
				'addinitscript',
				'wait',
				'press',
				'select',
				'expect',
				'other'
			].includes(step.operation)
		);
		finite(step.elapsedMs);
		finite(step.durationMs);
		assert.equal(typeof step.failed, 'boolean');
	}
	validateStates(data.states);
	return data;
}
function validateDirectory(directory) {
	const files = fs.readdirSync(directory);
	assert(files.length > 0, 'No diagnostic evidence was produced');
	for (const file of files) {
		assert(/^[a-f0-9]{16}-retry-\d+\.(json|zip)$/.test(file), 'Unexpected artifact path');
		if (file.endsWith('.json')) {
			validateArtifact(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
		} else {
			const source = path.join(directory, file.replace(/\.zip$/, '.json'));
			validateArtifact(JSON.parse(fs.readFileSync(source, 'utf8')));
			execFileSync('python3', [path.join(__dirname, 'action-trace.py'), source, '--verify'], { stdio: 'pipe' });
		}
	}
	console.log(`Validated ${files.length} allowlisted diagnostic records`);
}
module.exports = { validateStates, validateArtifact, validateDirectory };
if (require.main === module) validateDirectory(process.argv[2] || path.resolve('playwright-diagnostics'));
