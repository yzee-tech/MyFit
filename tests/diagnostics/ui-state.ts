import type { Page, TestInfo } from '@playwright/test';

/** Only fixed UI labels and booleans leave the page. Never copy DOM, storage, URLs or input values. */
export function observeUiState() {
	const states: Record<string, number | boolean>[] = [];
	let previous = '';
	const visible = (element: Element | null) => !!element && element.getClientRects().length > 0;
	const record = () => {
		const buttons = [...document.querySelectorAll('button')];
		const checkbox = (name: string) => document.querySelector(`[role="checkbox"][aria-label="${name}"]`);
		const add = buttons.find((button) => /^Add \d+ exercises?$/.test(button.textContent?.trim() ?? ''));
		const state = {
			runChecked: checkbox('Run')?.getAttribute('aria-checked') === 'true',
			bikeChecked: checkbox('Bike')?.getAttribute('aria-checked') === 'true',
			runCheckboxVisible: visible(checkbox('Run')),
			bikeCheckboxVisible: visible(checkbox('Bike')),
			addCount: add ? Number(add.textContent?.trim().split(' ')[1]) : -1,
			runMenuVisible: visible(document.querySelector('[data-testid="Run-menu-button"]')),
			bikeMenuVisible: visible(document.querySelector('[data-testid="Bike-menu-button"]')),
			pickerVisible: visible(document.querySelector('[aria-label="Pick an exercise"]')),
			pickerExpanded:
				document.querySelector('[aria-label="Pick an exercise"]')?.getAttribute('aria-expanded') === 'true',
			pickerSearchVisible: visible(document.querySelector('[placeholder="Search your exercises"]')),
			newExerciseVisible: visible(buttons.find((button) => button.textContent?.trim() === 'New exercise') ?? null)
		};
		const serialized = JSON.stringify(state);
		if (serialized === previous) return;
		previous = serialized;
		states.push({ elapsedMs: Date.now(), ...state });
		if (states.length > 200) states.shift();
	};
	Object.defineProperty(window, '__myfitFailureStates', { value: states, configurable: true });
	new MutationObserver(record).observe(document, { childList: true, subtree: true, attributes: true });
	record();
}

export async function startUiCapture(page: Page) {
	await page.addInitScript(observeUiState);
	await page.evaluate(observeUiState);
}

export async function attachFailedUiState(page: Page, testInfo: TestInfo) {
	if (testInfo.status === testInfo.expectedStatus) return;
	try {
		const states = await page.evaluate(() => Reflect.get(window, '__myfitFailureStates'));
		await testInfo.attach('safe-ui-state', {
			body: Buffer.from(JSON.stringify(states ?? [])),
			contentType: 'application/json'
		});
	} catch {
		// A crashed/closed page must not hide the original failure or publish its raw error.
		await testInfo.attach('safe-ui-state', { body: Buffer.from('[]'), contentType: 'application/json' });
	}
}
