import { test as base } from '@playwright/test';
import { startUiCapture, attachFailedUiState } from '../ui-state';

const test = base.extend<{ capture: void }>({
	capture: [
		async ({ page }, use, testInfo) => {
			await startUiCapture(page);
			await use();
			await attachFailedUiState(page, testInfo);
		},
		{ auto: true }
	]
});

test('first attempt fails then retry passes without publishing secrets', async ({ page }, testInfo) => {
	test.setTimeout(1500);
	await page.setContent(`
		<p>AUTH_SENTINEL_NEVER_UPLOAD</p>
		<button aria-label="Pick an exercise" aria-expanded="true">Already selected exercise</button>
		<input placeholder="Search your exercises" />
		<button role="checkbox" aria-label="Run" aria-checked="false">Run</button>
		<button role="checkbox" aria-label="Bike" aria-checked="true">Bike</button>
		<button>Add 1 exercise</button>
		<button data-testid="Bike-menu-button">Bike options</button>
	`);
	await page.evaluate(() => {
		Reflect.set(window, 'sessionToken', 'SESSION_SENTINEL_NEVER_UPLOAD');
	});
	// A real runner failure, not a caught assertion in a passing helper-contract test.
	if (testInfo.retry === 0) await page.getByTestId('deliberately-missing').click();
});
