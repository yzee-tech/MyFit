import { test, expect, type Page } from '@playwright/test';
import { quickAdd } from '../models/commonFunctions';

/** A browser-backed helper contract, not a substitute for the real cardio/app tests. */
async function quickAddScreen(page: Page, ignoreRunClick = false) {
	await page.setContent(`
		<button aria-label="add-exercise">Add</button>
		<div id="sheet" role="dialog" aria-label="Add exercises" hidden>
			<h2>Add exercises</h2>
			<input placeholder="Search your exercises" />
			<button role="checkbox" aria-label="Run" aria-checked="false">Run</button>
			<button role="checkbox" aria-label="Bike" aria-checked="false">Bike</button>
			<button id="add">Add 0 exercises</button>
		</div>
		<main></main>
		<script>
			const sheet = document.querySelector('#sheet');
			const add = document.querySelector('#add');
			document.querySelector('[aria-label="add-exercise"]').onclick = () => sheet.hidden = false;
			for (const checkbox of document.querySelectorAll('[role="checkbox"]')) {
				checkbox.onclick = () => {
					if (${ignoreRunClick} && checkbox.getAttribute('aria-label') === 'Run') return;
					checkbox.setAttribute('aria-checked', String(checkbox.getAttribute('aria-checked') !== 'true'));
					const count = sheet.querySelectorAll('[aria-checked="true"]').length;
					add.textContent = 'Add ' + count + (count === 1 ? ' exercise' : ' exercises');
				};
			}
			add.onclick = () => {
				for (const checkbox of sheet.querySelectorAll('[aria-checked="true"]')) {
					const name = checkbox.getAttribute('aria-label');
					const menu = document.createElement('button');
					menu.dataset.testid = name + '-menu-button';
					menu.textContent = name + ' options';
					document.querySelector('main').append(menu);
				}
				sheet.remove();
			};
		</script>
	`);
}

test('quickAdd verifies both selections and both resulting exercises', async ({ page }) => {
	await quickAddScreen(page);
	await quickAdd(page, ['Run', 'Bike']);
	await expect(page.getByTestId('Run-menu-button')).toBeVisible();
	await expect(page.getByTestId('Bike-menu-button')).toBeVisible();
});

test('quickAdd rejects a missed Run selection before adding only Bike', async ({ page }) => {
	await quickAddScreen(page, true);
	await expect(quickAdd(page, ['Run', 'Bike'])).rejects.toThrow(/checked/i);
	await expect(page.getByRole('dialog')).toHaveCount(1);
	await expect(page.getByRole('checkbox', { name: 'Run', exact: true })).not.toBeChecked();
	await expect(page.getByTestId('Bike-menu-button')).toHaveCount(0);
});
