/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI entry points use CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { validateArtifact, validateStates } = require('./safe-artifacts.cjs');

/** Publishes no raw Playwright errors, step titles, attachments, traces, screenshots or auth state. */
class SafeFailureReporter {
	constructor(options = {}) {
		this.output = path.resolve(options.outputDir || 'playwright-diagnostics');
		this.steps = new Map();
	}
	onBegin() {
		fs.rmSync(this.output, { recursive: true, force: true });
		fs.mkdirSync(this.output, { recursive: true });
	}
	onTestBegin(test) {
		this.steps.set(test.id, []);
	}
	onStepEnd(test, result, step) {
		const steps = this.steps.get(test.id);
		if (!steps || steps.length >= 500) return;
		const kind =
			{ 'pw:api': 'action', expect: 'assertion', fixture: 'fixture', hook: 'hook' }[step.category] || 'other';
		const operation =
			/\b(click|fill|check|uncheck|navigate|goto|wait|waitForURL|waitForLoadState|press|select|selectOption|expect|setContent|evaluate|addInitScript)\b/i
				.exec(step.title)?.[1]
				?.toLowerCase() || 'other';
		steps.push({
			operation,
			kind,
			elapsedMs: Math.max(0, step.startTime - result.startTime),
			durationMs: step.duration,
			failed: !!step.error
		});
	}
	onTestEnd(test, result) {
		const attachment = result.attachments.find((item) => item.name === 'safe-ui-state');
		// Validate and fail closed, rather than trusting anything carrying the attachment's name.
		const states = (attachment ? validateStates(JSON.parse(attachment.body.toString('utf8'))) : []).map((state) => ({
			...state,
			elapsedMs: Math.max(0, state.elapsedMs - result.startTime.getTime())
		}));
		const file = path.relative(process.cwd(), test.location.file).replaceAll(path.sep, '/');
		const data = validateArtifact({
			version: 1,
			retry: result.retry,
			status: result.status,
			durationMs: result.duration,
			file,
			line: test.location.line,
			steps: this.steps.get(test.id) || [],
			states
		});
		const id = crypto.createHash('sha256').update(test.id).digest('hex').slice(0, 16);
		const outputFile = path.join(this.output, `${id}-retry-${result.retry}.json`);
		fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
		if (result.status !== test.expectedStatus) {
			execFileSync('python3', [path.join(__dirname, 'action-trace.py'), outputFile]);
		}
		this.steps.delete(test.id);
	}
}
module.exports = SafeFailureReporter;
