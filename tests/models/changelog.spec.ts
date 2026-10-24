import { test, expect } from '../fixtures';

test('Changelog: the notes in CHANGELOG.md, one title, without asking GitHub', async ({ page }) => {
	const githubCalls: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('api.github.com')) githubCalls.push(request.url());
	});
	await page.goto('/changelog');
	await expect(page.getByRole('heading', { level: 2, name: 'Changelog' })).toBeVisible();
	await expect(page.getByRole('heading', { name: '2026-10-23: cleanup (PR #48)' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Removed', exact: true }).first()).toBeVisible();
	// The file's own "# Changelog" isn't shown again
	await expect(page.getByRole('heading', { name: 'Changelog', exact: true })).toHaveCount(1);
	await expect(page.getByText('No releases yet')).toHaveCount(0);
	expect(githubCalls).toEqual([]);
});

test('Menu: Dashboard, Stats | Exercises, My routines, Mesocycles, Workouts | GitHub | the rest', async ({ page }) => {
	await page.goto('/dashboard');
	const menu = page.getByTestId('nav-links').locator('visible=true').first();
	const entries = await menu.evaluate((list) =>
		[...list.children].map((child) => (child.tagName === 'LI' ? child.textContent!.trim() : '|'))
	);
	expect(entries).toEqual([
		'Dashboard',
		'Stats',
		'|',
		'Exercises',
		'My routines',
		'Mesocycles',
		'Workouts',
		'|',
		'GitHub',
		'|',
		'Docs',
		'Changelog',
		'Privacy policy',
		'Terms of service'
	]);
});
