import type { Page } from '@playwright/test';

/**
 * Lets the first request matching `pattern` reach the server, then holds its answer back from the page until
 * `release()` is called; the later requests go through untouched. `seen` resolves once the server has answered
 * (the answer is held, so the page is still waiting for it).
 */
export async function holdFirstResponse(page: Page, pattern: RegExp) {
	let release!: () => void;
	const held = new Promise<void>((resolve) => (release = resolve));
	let requested!: () => void;
	const seen = new Promise<void>((resolve) => (requested = resolve));
	let first = true;
	await page.route(pattern, async (route) => {
		if (!first) return route.continue();
		first = false;
		const response = await route.fetch();
		requested();
		await held;
		await route.fulfill({ response });
	});
	return { release, seen };
}
