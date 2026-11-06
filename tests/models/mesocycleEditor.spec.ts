import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createCaller } from '../../src/lib/trpc/router';
import { createExercises } from './commonFunctions';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

// The days are counted in the phone's timezone: UTC here, so "16 days ago" is day 16 whatever the hour
test.use({ timezoneId: 'UTC' });

const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

/**
 * A routine and a block with these weeks: not started (`startedDaysAgo` undefined), or started that many days
 * ago (a day with no pause counts as one), or finished
 */
async function seedBlock(
	userId: string,
	options: { weeklyRIR?: number[]; startedDaysAgo?: number; finished?: boolean; name?: string } = {}
) {
	const caller = createCaller({ event: {} as never, userId });
	await createExercises(userId, [rows.name]);
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: options.name ?? 'MyMeso',
			weeklyRIR: options.weeklyRIR ?? [3, 2, 1, 0],
			startDate: options.startedDaysAgo === undefined ? null : new Date(Date.now() - options.startedDaysAgo * DAY),
			endDate: options.finished ? new Date(Date.now() - DAY) : null,
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	return { caller, block };
}

// Held requests are let go when a test ends, however it ends, so none is left waiting
const gates: Array<() => void> = [];
test.afterEach(() => {
	for (const release of gates.splice(0)) release();
});

const week = (page: Page, n: number) => page.getByLabel(`Week ${n} effort`);
const weekRows = (page: Page) => page.getByTestId('edit-weeks').locator('li');
const saveButton = (page: Page) => page.getByRole('button', { name: 'Save', exact: true });
const cancelButton = (page: Page) => page.getByRole('button', { name: 'Cancel', exact: true });
const savedToast = (page: Page) => page.getByRole('status').filter({ hasText: 'Mesocycle edited successfully' });
const blockRow = (id: string) => prisma.mesocycle.findUniqueOrThrow({ where: { id }, include: { pauses: true } });

async function setWeek(page: Page, n: number, option: string) {
	await week(page, n).click();
	await page.getByRole('option', { name: option, exact: true }).click();
}

async function openEditor(page: Page, blockId: string) {
	await page.goto(`/mesocycles/${blockId}`);
	await page.getByLabel('mesocycle-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(`/mesocycles/${blockId}/edit`);
	await expect(page.getByLabel('Mesocycle name')).toBeVisible();
}

test.describe('one direct editor', () => {
	test('Edit opens the editor on its own page: name, a row for each week, settings, Cancel and Save; no steps, duration or Use suggested', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, -1] });
		await openEditor(page, block.id);
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('MyMeso');
		await expect(weekRows(page)).toHaveCount(3);
		await expect(week(page, 1)).toContainText('3 RIR');
		await expect(week(page, 3)).toContainText('Deload');
		await expect(page.getByLabel('Take last set to failure')).toBeVisible();
		await expect(page.getByLabel('Force RIR matching')).toBeVisible();
		await expect(page.getByText('Start overload percentage')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Add week' })).toBeVisible();
		await expect(cancelButton(page)).toBeVisible();
		await expect(saveButton(page)).toBeVisible();
		// None of the creation wizard
		await expect(page.getByLabel('Mesocycle duration')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Use suggested' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Previous' })).toHaveCount(0);
		// An unused block: no week is locked
		await expect(page.locator('[data-locked="true"]')).toHaveCount(0);
	});

	test('each progression label toggles its own switch', async ({ page, userData }) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1] });
		await openEditor(page, block.id);
		const lastSet = page.locator('#mesocycle-last-set-to-failure');
		const forceRIR = page.locator('#mesocycle-force-RIR-matching');
		await expect(lastSet).not.toBeChecked();
		await expect(forceRIR).not.toBeChecked();
		await page.getByLabel('Force RIR matching').click();
		await expect(forceRIR).toBeChecked();
		await expect(lastSet).not.toBeChecked();
		await page.getByLabel('Take last set to failure').click();
		await expect(lastSet).toBeChecked();
		await expect(forceRIR).toBeChecked();
	});

	test('Save changes the name, the weeks and the settings in one go, and goes back to the block', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1] });
		await openEditor(page, block.id);
		await page.getByLabel('Mesocycle name').fill('Renamed');
		await setWeek(page, 2, '4 RIR');
		await page.getByLabel('Take last set to failure').click();
		await page.locator('#mesocycle-force-RIR-matching').click();
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		// A successful Save goes back to the list
		await page.waitForURL('/mesocycles');
		await page.goto(`/mesocycles/${block.id}`);
		await expect(page.getByTestId('mesocycle-weekly-effort').locator('> *')).toHaveText([
			'W1: 3 RIR',
			'W2: 4 RIR',
			'W3: 1 RIR'
		]);
		const saved = await blockRow(block.id);
		expect([saved.name, saved.weeklyRIR, saved.lastSetToFailure, saved.forceRIRMatching]).toEqual([
			'Renamed',
			[3, 4, 1],
			true,
			true
		]);
	});
});

test.describe('adding and deleting weeks', () => {
	test('+ Add week adds exactly one week like the last one (a Deload copies as a Deload) and never touches the others', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 1, -1] });
		await openEditor(page, block.id);
		await page.getByRole('button', { name: 'Add week' }).click();
		await expect(weekRows(page)).toHaveCount(4);
		await expect(week(page, 4)).toContainText('Deload');
		// The weeks that were there are as they were (Week 3 is still the deload, not moved)
		await expect(week(page, 1)).toContainText('3 RIR');
		await expect(week(page, 2)).toContainText('1 RIR');
		await expect(week(page, 3)).toContainText('Deload');
		// A custom value is copied too
		await setWeek(page, 4, '0 RIR (failure)');
		await page.getByRole('button', { name: 'Add week' }).click();
		await expect(week(page, 5)).toContainText('0 RIR (failure)');
		await expect(weekRows(page)).toHaveCount(5);
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		expect((await blockRow(block.id)).weeklyRIR).toEqual([3, 1, -1, 0, 0]);
	});

	test('the trash icon removes that week and the later ones move up; the last week left has none', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1] });
		await openEditor(page, block.id);
		await page.getByRole('button', { name: 'Delete week 2' }).click();
		await expect(weekRows(page)).toHaveCount(3);
		await expect(week(page, 1)).toContainText('3 RIR');
		await expect(week(page, 2)).toContainText('1 RIR');
		await expect(week(page, 3)).toContainText('Deload');
		await page.getByRole('button', { name: 'Delete week 3' }).click();
		await page.getByRole('button', { name: 'Delete week 2' }).click();
		// Never zero weeks: no trash left on the only week
		await expect(weekRows(page)).toHaveCount(1);
		await expect(page.getByRole('button', { name: /Delete week/ })).toHaveCount(0);
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		expect((await blockRow(block.id)).weeklyRIR).toEqual([3]);
	});

	test('Add week stops at 52 weeks, and says so', async ({ page, userData }) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: Array(51).fill(2) });
		await openEditor(page, block.id);
		await page.getByRole('button', { name: 'Add week' }).click();
		await expect(weekRows(page)).toHaveCount(52);
		await expect(page.getByRole('button', { name: 'Add week' })).toBeDisabled();
		await expect(page.getByText('up to 52 weeks')).toBeVisible();
		// Weeks can still be removed
		await expect(page.getByRole('button', { name: 'Delete week 52' })).toBeVisible();
	});

	test('a block of more than 20 weeks is not cut short; New still stops at 20', async ({ page, userData }) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: Array(30).fill(2) });
		await openEditor(page, block.id);
		await expect(weekRows(page)).toHaveCount(30);
		await page.getByLabel('Mesocycle name').fill('Long block');
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		expect((await blockRow(block.id)).weeklyRIR).toHaveLength(30);
		await page.goto('/mesocycles/manage/basics');
		await expect(page.getByLabel('Mesocycle duration (weeks)')).toHaveAttribute('max', '20');
	});
});

test.describe('the draft', () => {
	test('Cancel throws every change away: nothing is saved, and it is not there on reopen, in New or in another block', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1] });
		const other = await prisma.mesocycle.create({
			data: {
				userId: userData.userId,
				name: 'Other block',
				weeklyRIR: [2, 2],
				startOverloadPercentage: 2.5,
				lastSetToFailure: false,
				forceRIRMatching: false
			}
		});
		await openEditor(page, block.id);
		await page.getByLabel('Mesocycle name').fill('Cancelled name');
		await setWeek(page, 1, '4 RIR');
		await page.getByRole('button', { name: 'Add week' }).click();
		await page.getByLabel('Take last set to failure').click();
		let saveCalls = 0;
		await page.route('**/trpc/mesocycles.editById*', (route) => {
			saveCalls++;
			return route.continue();
		});
		await cancelButton(page).click();
		await page.waitForURL(`/mesocycles/${block.id}`);
		expect(saveCalls).toBe(0);
		const saved = await blockRow(block.id);
		expect([saved.name, saved.weeklyRIR, saved.lastSetToFailure]).toEqual(['MyMeso', [3, 2, 1], false]);

		// Reopened: the saved values
		await page.getByLabel('mesocycle-options').click();
		await page.getByRole('menuitem', { name: 'Edit' }).click();
		await page.waitForURL(`/mesocycles/${block.id}/edit`);
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('MyMeso');
		await expect(weekRows(page)).toHaveCount(3);
		await expect(week(page, 1)).toContainText('3 RIR');
		await expect(page.getByLabel('Take last set to failure')).not.toBeChecked();

		// In New
		await page.goto('/mesocycles/manage/basics');
		await expect(page.getByRole('heading', { name: 'New mesocycle' })).toBeVisible();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('');
		// In another block
		await page.goto(`/mesocycles/${other.id}/edit`);
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Other block');
		await expect(weekRows(page)).toHaveCount(2);
	});

	test('Edit A, Cancel, Edit B: B shows its own values; a draft that was neither saved nor cancelled comes back for that block only', async ({
		page,
		userData
	}) => {
		const { block: a } = await seedBlock(userData.userId, { name: 'Block A', weeklyRIR: [3, 2] });
		const b = await prisma.mesocycle.create({
			data: {
				userId: userData.userId,
				name: 'Block B',
				weeklyRIR: [1, 1, 1],
				startOverloadPercentage: 2.5,
				lastSetToFailure: false,
				forceRIRMatching: false
			}
		});
		await openEditor(page, a.id);
		await page.getByLabel('Mesocycle name').fill('A changed');
		await cancelButton(page).click();
		await page.goto(`/mesocycles/${b.id}/edit`);
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Block B');
		await expect(weekRows(page)).toHaveCount(3);
		// Reloading B keeps what was typed (nothing saved yet); A, never saved, is untouched
		await page.getByLabel('Mesocycle name').fill('B typed');
		await page.reload();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('B typed');
		await page.goto(`/mesocycles/${a.id}/edit`);
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Block A');
		expect((await blockRow(b.id)).name).toBe('Block B');
	});

	test('a failed Save keeps the whole draft, says why, and Save works again; success clears it', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1] });
		await openEditor(page, block.id);
		await page.getByLabel('Mesocycle name').fill('Kept name');
		await setWeek(page, 3, 'Deload');
		await page.getByRole('button', { name: 'Add week' }).click();
		// The progression settings are part of the draft: both switches, and the overload slider (2.5% to 3.5%)
		await page.getByLabel('Take last set to failure').click();
		await page.getByLabel('Force RIR matching').click();
		await page.getByRole('slider').focus();
		for (let press = 0; press < 4; press++) await page.keyboard.press('ArrowRight');
		await expect(page.getByText('3.5%')).toBeVisible();
		const settingsKept = async () => {
			await expect(page.locator('#mesocycle-last-set-to-failure')).toBeChecked();
			await expect(page.locator('#mesocycle-force-RIR-matching')).toBeChecked();
			await expect(page.getByText('3.5%')).toBeVisible();
		};
		// Network failure
		await page.route('**/trpc/mesocycles.editById*', (route) => route.abort());
		await saveButton(page).click();
		await expect(page.getByTestId('edit-save-error')).toContainText("Couldn't save");
		await expect(page).toHaveURL(`/mesocycles/${block.id}/edit`);
		await expect(saveButton(page)).toBeEnabled();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Kept name');
		await expect(weekRows(page)).toHaveCount(4);
		await expect(week(page, 3)).toContainText('Deload');
		await settingsKept();
		expect((await blockRow(block.id)).name).toBe('MyMeso');
		// An unexpected error from the server: the same, nothing lost
		await page.unroute('**/trpc/mesocycles.editById*');
		await page.route('**/trpc/mesocycles.editById*', (route) =>
			route.fulfill({ status: 500, contentType: 'text/plain', body: 'Something broke' })
		);
		await saveButton(page).click();
		await expect(page.getByTestId('edit-save-error')).toBeVisible();
		await expect(saveButton(page)).toBeEnabled();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Kept name');
		await expect(weekRows(page)).toHaveCount(4);
		await settingsKept();
		expect((await blockRow(block.id)).name).toBe('MyMeso');
		// A refusal from the server (the name is too long): the message, the draft kept
		await page.unroute('**/trpc/mesocycles.editById*');
		await page.getByLabel('Mesocycle name').fill('x'.repeat(101));
		await saveButton(page).click();
		await expect(page.getByTestId('edit-save-error')).toBeVisible();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('x'.repeat(101));
		await expect(weekRows(page)).toHaveCount(4);
		await settingsKept();
		expect((await blockRow(block.id)).name).toBe('MyMeso');
		// Retry with a good name
		await page.getByLabel('Mesocycle name').fill('Kept name');
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		await page.waitForURL('/mesocycles');
		await page.goto(`/mesocycles/${block.id}`);
		const saved = await blockRow(block.id);
		expect(saved.weeklyRIR).toEqual([3, 2, -1, -1]);
		expect([saved.lastSetToFailure, saved.forceRIRMatching, saved.startOverloadPercentage]).toEqual([true, true, 3.5]);
		// Cleared: opened again it is the saved block
		await page.goto(`/mesocycles/${block.id}/edit`);
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Kept name');
	});

	test('while a Save is on its way nothing can be changed (name, weeks, Add, trash, switches, slider), so no edit is lost; a failure frees it all with the draft kept', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, 0] });
		await openEditor(page, block.id);
		await page.getByLabel('Mesocycle name').fill('Sent name');
		await page.getByRole('button', { name: 'Add week' }).click();
		await expect(weekRows(page)).toHaveCount(5);
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		gates.push(release);
		let fail = false;
		await page.route('**/trpc/mesocycles.editById*', async (route) => {
			await gate;
			if (fail) await route.fulfill({ status: 500, contentType: 'text/plain', body: 'Something broke' });
			else await route.continue();
		});
		await saveButton(page).click();
		// Everything that can change the draft is off, Cancel too; the request is not answered yet
		const controls = [
			page.getByLabel('Mesocycle name'),
			week(page, 4),
			week(page, 5),
			page.getByRole('button', { name: 'Add week' }),
			page.getByRole('button', { name: 'Delete week 5' }),
			page.locator('#mesocycle-last-set-to-failure'),
			page.locator('#mesocycle-force-RIR-matching'),
			cancelButton(page)
		];
		for (const control of controls) await expect(control).toBeDisabled();
		await expect(page.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
		// Pressing keys on the slider moves nothing: focus is put on it by the page itself, so the key goes where it would
		// for a person, and any error in delivering it fails the test instead of passing as "nothing moved"
		await page.getByRole('slider').evaluate((element) => (element as HTMLElement).focus());
		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
		await expect(page.getByText('2.5%')).toBeVisible();
		await expect(page).toHaveURL(`/mesocycles/${block.id}/edit`);
		// It fails: all of it is free again, and the draft is what it was
		fail = true;
		release();
		await expect(page.getByTestId('edit-save-error')).toBeVisible();
		for (const control of controls) await expect(control).toBeEnabled();
		await expect(page.getByRole('slider')).not.toHaveAttribute('aria-disabled', 'true');
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Sent name');
		await expect(weekRows(page)).toHaveCount(5);
		expect((await blockRow(block.id)).name).toBe('MyMeso');
		await page.getByLabel('Mesocycle name').fill('Edited after the failure');
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Edited after the failure');
	});

	test('a Save that goes through saves exactly what was on the screen when it was pressed', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, 0] });
		await openEditor(page, block.id);
		await page.getByLabel('Mesocycle name').fill('Sent name');
		await page.getByRole('button', { name: 'Add week' }).click();
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		gates.push(release);
		await page.route('**/trpc/mesocycles.editById*', async (route) => {
			await gate;
			await route.continue();
		});
		await saveButton(page).click();
		await expect(page.getByLabel('Mesocycle name')).toBeDisabled();
		release();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		await page.waitForURL('/mesocycles');
		const saved = await blockRow(block.id);
		expect([saved.name, saved.weeklyRIR]).toEqual(['Sent name', [3, 2, 1, 0, 0]]);
	});

	test('an edit kept by an older app version does not start a new block', async ({ page, userData }) => {
		await seedBlock(userData.userId);
		await page.addInitScript(() => {
			localStorage.setItem(
				'mesocycleRunes',
				JSON.stringify({
					mesocycle: {
						name: 'Left by an old edit',
						weeklyRIR: [1],
						startDate: null,
						endDate: null,
						startOverloadPercentage: 2.5,
						lastSetToFailure: true,
						forceRIRMatching: true
					},
					editingMesocycleId: 'cl00000000000000000000000',
					mesocycleCyclicSetChanges: []
				})
			);
		});
		await page.goto('/mesocycles/manage/basics');
		await expect(page.getByRole('heading', { name: 'New mesocycle' })).toBeVisible();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('');
	});
});

test.describe('locked weeks', () => {
	test('a block in Week 3: weeks 1 to 3 are locked (no change, no trash), later weeks are editable and deletable; Add stays', async ({
		page,
		userData
	}) => {
		// 16 days ago: day 16, Week 3
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, 0, -1], startedDaysAgo: 16 });
		await openEditor(page, block.id);
		for (const n of [1, 2, 3]) {
			await expect(weekRows(page).nth(n - 1)).toHaveAttribute('data-locked', 'true');
			await expect(week(page, n)).toBeDisabled();
			await expect(page.getByRole('button', { name: `Delete week ${n}` })).toHaveCount(0);
		}
		for (const n of [4, 5]) {
			await expect(weekRows(page).nth(n - 1)).toHaveAttribute('data-locked', 'false');
			await expect(week(page, n)).toBeEnabled();
			await expect(page.getByRole('button', { name: `Delete week ${n}` })).toBeVisible();
		}
		await expect(page.getByText('Weeks 1 to 3 are past or in progress')).toBeVisible();
		await page.getByRole('button', { name: 'Delete week 5' }).click();
		await setWeek(page, 4, '4 RIR');
		await page.getByRole('button', { name: 'Add week' }).click();
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		expect((await blockRow(block.id)).weeklyRIR).toEqual([3, 2, 1, 4, 4]);
	});

	test('a block paused by hand locks the weeks through the one it stood in', async ({ page, userData }) => {
		// Day 20 (Week 3), paused two days ago
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, 0, -1], startedDaysAgo: 20 });
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - 2 * DAY) } });
		await openEditor(page, block.id);
		await expect(page.getByTestId('edit-paused')).toContainText('Saving does not resume it');
		for (const n of [1, 2, 3]) await expect(week(page, n)).toBeDisabled();
		for (const n of [4, 5]) await expect(week(page, n)).toBeEnabled();
		await setWeek(page, 4, '4 RIR');
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		const saved = await blockRow(block.id);
		expect(saved.weeklyRIR).toEqual([3, 2, 1, 4, -1]);
		expect(saved.pauses.map((p) => p.resumedAt)).toEqual([null]);
	});

	test('a Save that comes after the week changed is refused, the draft kept, the locks refreshed, the protected week put back, then it saves', async ({
		page,
		userData
	}) => {
		// Day 16: Week 3. Week 4 is open when the editor opens...
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, 0, -1], startedDaysAgo: 16 });
		await openEditor(page, block.id);
		await expect(week(page, 4)).toBeEnabled();
		await page.getByLabel('Mesocycle name').fill('Edited while the week turned');
		await setWeek(page, 4, '4 RIR');
		// ...and becomes the current week before Save (as if midnight passed)
		await prisma.mesocycle.update({ where: { id: block.id }, data: { startDate: new Date(Date.now() - 22 * DAY) } });
		await saveButton(page).click();
		const error = page.getByTestId('edit-save-error');
		await expect(error).toContainText('Weeks 1 to 4 are past or in progress');
		// The draft is kept, nothing was saved, and the locks are as they are now
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Edited while the week turned');
		expect((await blockRow(block.id)).name).toBe('MyMeso');
		await expect(weekRows(page).nth(3)).toHaveAttribute('data-locked', 'true');
		await expect(week(page, 4)).toBeDisabled();
		// The protected week is put back as it was, and the rest of the draft still saves
		await page.getByRole('button', { name: 'Restore week 4' }).click();
		await expect(week(page, 4)).toContainText('0 RIR');
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		const saved = await blockRow(block.id);
		expect([saved.name, saved.weeklyRIR]).toEqual(['Edited while the week turned', [3, 2, 1, 0, -1]]);
	});

	test('a finished block cannot be edited: no Edit in its menu, and its editor page only says so', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { startedDaysAgo: 40, finished: true });
		await page.goto(`/mesocycles/${block.id}`);
		await page.getByLabel('mesocycle-options').click();
		await expect(page.getByRole('menuitem', { name: 'Clone' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0);
		await page.keyboard.press('Escape');
		await page.goto(`/mesocycles/${block.id}/edit`);
		await expect(page.getByTestId('edit-finished')).toBeVisible();
		await expect(saveButton(page)).toHaveCount(0);
		await expect(page.getByLabel('Mesocycle name')).toHaveCount(0);
	});
});

test.describe('New and Clone keep the creation wizard', () => {
	test('Clone opens the wizard with the block copied in, as a new block that is not started', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 1, 0], startedDaysAgo: 5, name: 'To clone' });
		// Paused, with a pause behind it too: none of it is copied
		await prisma.mesocyclePause.create({
			data: {
				mesocycleId: block.id,
				pausedAt: new Date(Date.now() - 4 * DAY),
				resumedAt: new Date(Date.now() - 3 * DAY)
			}
		});
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - DAY) } });
		await page.goto(`/mesocycles/${block.id}`);
		await page.getByLabel('mesocycle-options').click();
		await page.getByRole('menuitem', { name: 'Clone' }).click();
		await page.waitForURL('/mesocycles/manage/basics');
		await expect(page.getByRole('heading', { name: 'New mesocycle' })).toBeVisible();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('To clone');
		await expect(page.getByLabel('Mesocycle duration (weeks)')).toHaveValue('3');
		await page.getByLabel('Mesocycle name').fill('The clone');
		await page.getByRole('button', { name: 'Next' }).click();
		await page.waitForURL('/mesocycles/manage/progression');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Mesocycle created successfully' })).toBeVisible({
			timeout: 10000
		});
		const clone = await prisma.mesocycle.findFirstOrThrow({
			where: { userId: userData.userId, name: 'The clone' },
			include: { pauses: true }
		});
		// Not the original's dates, nor its pauses
		expect([clone.startDate, clone.endDate, clone.pauses.length]).toEqual([null, null, 0]);
		expect(clone.weeklyRIR).toEqual([3, 1, 0]);
	});
});

test.describe('Extend: a block past its planned weeks', () => {
	test('the start page pauses it where its plan ended, Extend opens the editor with the planned weeks locked; Save keeps it paused; Resume is a separate step', async ({
		page,
		userData
	}) => {
		// A 4-week block that started 40 days ago, never paused: its plan ended 12 days ago
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		await page.goto('/workouts');
		await page.getByLabel('create-workout').click();
		await page.getByPlaceholder('Type here').fill('80');
		await expect(page.getByText('Past its planned weeks')).toBeVisible();
		await expect.poll(async () => (await blockRow(block.id)).pauses.length).toBe(1);
		const [pause] = (await blockRow(block.id)).pauses;
		// Paused where the plan ended (midnight, 28 days after the start day), not when it was noticed
		const startDay = Math.floor(block.startDate!.getTime() / DAY);
		expect(pause.pausedAt.toISOString()).toBe(new Date((startDay + 28) * DAY).toISOString());
		expect(pause.resumedAt).toBeNull();
		expect((await blockRow(block.id)).endDate).toBeNull();

		await page.getByRole('button', { name: 'Extend' }).click();
		await page.waitForURL(`/mesocycles/${block.id}/edit`);
		await expect(page.getByTestId('edit-past-plan')).toContainText('It has run all its 4 planned weeks');
		for (const n of [1, 2, 3, 4]) {
			await expect(weekRows(page).nth(n - 1)).toHaveAttribute('data-locked', 'true');
			await expect(week(page, n)).toBeDisabled();
		}
		// The added week copies the last one (a deload) and can be changed
		await page.getByRole('button', { name: 'Add week' }).click();
		await expect(week(page, 5)).toContainText('Deload');
		await expect(week(page, 5)).toBeEnabled();
		await setWeek(page, 5, '2 RIR');
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		await page.waitForURL('/mesocycles');
		await page.goto(`/mesocycles/${block.id}`);
		// Saved, and still paused: saving did not resume it
		let saved = await blockRow(block.id);
		expect(saved.weeklyRIR).toEqual([3, 2, 1, -1, 2]);
		expect(saved.pauses.map((p) => p.resumedAt)).toEqual([null]);
		await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();

		// Opened again, Week 5 is still open (the pause is the end of the plan), and a Week 6 can be added
		await openEditor(page, block.id);
		await expect(week(page, 5)).toBeEnabled();
		await expect(week(page, 4)).toBeDisabled();
		await page.getByRole('button', { name: 'Add week' }).click();
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		await page.waitForURL('/mesocycles');
		await page.goto(`/mesocycles/${block.id}`);
		saved = await blockRow(block.id);
		expect(saved.weeklyRIR).toEqual([3, 2, 1, -1, 2, 2]);
		expect(saved.pauses.map((p) => p.resumedAt)).toEqual([null]);

		// Resume is its own step
		await page.getByRole('button', { name: 'Resume', exact: true }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Mesocycle resumed' })).toBeVisible({ timeout: 10000 });
		saved = await blockRow(block.id);
		expect(saved.pauses[0].resumedAt).not.toBeNull();
		// Resumed: Week 5, the first added week, is the week it is in
		await expect(page.locator('[data-current="true"]')).toHaveText('W5: 2 RIR');
	});

	test('on the block page, before it is extended: Extend and Finish block, no Resume; and a Resume sent anyway is refused', async ({
		page,
		userData
	}) => {
		const { caller, block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		await page.goto(`/mesocycles/${block.id}`);
		await expect(page.getByTestId('mesocycle-past-plan')).toBeVisible();
		await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Extend' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Finish block' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
		await expect(caller.mesocycles.resume({ id: block.id, timeZone: 'UTC' })).rejects.toThrow(/planned weeks/);
		expect((await blockRow(block.id)).pauses.map((p) => p.resumedAt)).toEqual([null]);
		await page.getByRole('link', { name: 'Extend' }).click();
		await page.waitForURL(`/mesocycles/${block.id}/edit`);
	});

	test('Finish block ends it: the pause is closed with it and nothing is left open', async ({ page, userData }) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		await page.goto('/workouts');
		await page.getByLabel('create-workout').click();
		await expect(page.getByText('Past its planned weeks')).toBeVisible();
		await expect.poll(async () => (await blockRow(block.id)).pauses.length).toBe(1);
		const before = await blockRow(block.id);
		// The pause is there and open before Finish; the empty list would also have "nothing open"
		expect(before.pauses[0].resumedAt).toBeNull();
		await page.getByRole('button', { name: 'Finish block' }).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		const saved = await blockRow(block.id);
		expect(saved.endDate).not.toBeNull();
		// The same row, closed at the moment the block ended; the plan itself untouched
		expect(saved.pauses).toHaveLength(1);
		expect(saved.pauses[0].id).toBe(before.pauses[0].id);
		expect(saved.pauses[0].pausedAt.toISOString()).toBe(before.pauses[0].pausedAt.toISOString());
		expect(saved.pauses[0].resumedAt?.toISOString()).toBe(saved.endDate!.toISOString());
		expect(saved.weeklyRIR).toEqual(before.weeklyRIR);
		expect(saved.startDate?.toISOString()).toBe(before.startDate?.toISOString());
	});

	test('a workout started after the plan ended is an ordinary workout, and the block shows "Past its planned weeks"', async ({
		page,
		userData
	}) => {
		const { caller, block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		const { workoutId } = await caller.workouts.create({
			timeZone: 'UTC',
			workoutData: {
				userBodyweight: 80,
				routineName: 'Pull A',
				startedAt: new Date(Date.now() - DAY),
				workoutOfMesocycle: { mesocycle: { id: block.id } }
			},
			workoutExercises: [{ ...rows, exerciseIndex: 0 }],
			workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
			workoutExercisesMiniSets: [[[]]]
		});
		expect(await prisma.workoutOfMesocycle.findFirst({ where: { workoutId } })).toBeNull();
		expect((await blockRow(block.id)).pauses).toHaveLength(1);
		await page.goto('/dashboard');
		await expect(page.getByText('Week 5 - paused')).toBeVisible();
	});
});

test.describe('a screen that is out of date', () => {
	test('Stop on a screen that saw the block running, after a pause landed elsewhere: refused, nothing ended, the pause stays open', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, 0, -1], startedDaysAgo: 10 });
		await page.goto(`/mesocycles/${block.id}`);
		await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
		await expect(page.getByTestId('mesocycle-paused-badge')).toHaveCount(0);
		// Another device paused it
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - 60 * 1000) } });
		await page.getByRole('button', { name: 'Stop', exact: true }).click();
		await expect(page.getByText('changed on another device')).toBeVisible();
		const saved = await blockRow(block.id);
		expect(saved.endDate).toBeNull();
		expect(saved.pauses.map((pause) => pause.resumedAt)).toEqual([null]);
		// The screen shows the block as it is now
		await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();
	});

	test('Stop on a screen that saw the block paused, after it was resumed elsewhere: refused, nothing ended', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, 0, -1], startedDaysAgo: 10 });
		const pause = await prisma.mesocyclePause.create({
			data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - DAY) }
		});
		await page.goto(`/mesocycles/${block.id}`);
		await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();
		await prisma.mesocyclePause.update({ where: { id: pause.id }, data: { resumedAt: new Date() } });
		await page.getByRole('button', { name: 'Stop', exact: true }).click();
		await page.getByRole('button', { name: 'Stop mesocycle' }).click();
		await expect(page.getByText('changed on another device')).toBeVisible();
		expect((await blockRow(block.id)).endDate).toBeNull();
		await expect(page.getByTestId('mesocycle-paused-badge')).toHaveCount(0);
	});

	test('Finish block on the start page, after the pause it showed was ended elsewhere: refused, nothing ended', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		// Paused where its plan ended
		const startDay = Math.floor(block.startDate!.getTime() / DAY);
		const pause = await prisma.mesocyclePause.create({
			data: { mesocycleId: block.id, pausedAt: new Date((startDay + 28) * DAY) }
		});
		await page.goto('/workouts');
		await page.getByLabel('create-workout').click();
		await expect(page.getByRole('button', { name: 'Finish block' })).toBeVisible();
		await prisma.mesocyclePause.update({ where: { id: pause.id }, data: { resumedAt: new Date() } });
		await page.getByRole('button', { name: 'Finish block' }).click();
		await expect(page.getByText('changed on another device')).toBeVisible();
		expect((await blockRow(block.id)).endDate).toBeNull();
		await expect(page).toHaveURL(/\/workouts\/manage\/start/);
	});
});

test.describe('the pause is made when these open', () => {
	test('the editor, opened straight on a block past its plan: the planned weeks are locked and the pause is there', async ({
		page,
		userData
	}) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		await page.goto(`/mesocycles/${block.id}/edit`);
		await expect(page.getByTestId('edit-past-plan')).toBeVisible();
		for (const n of [1, 2, 3, 4]) await expect(week(page, n)).toBeDisabled();
		expect((await blockRow(block.id)).pauses).toHaveLength(1);
		const startDay = Math.floor(block.startDate!.getTime() / DAY);
		expect((await blockRow(block.id)).pauses[0].pausedAt.toISOString()).toBe(
			new Date((startDay + 28) * DAY).toISOString()
		);
	});

	test('the list of mesocycles', async ({ page, userData }) => {
		const { block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		await page.goto('/mesocycles');
		await expect.poll(async () => (await blockRow(block.id)).pauses.length).toBe(1);
		expect((await blockRow(block.id)).endDate).toBeNull();
	});
});
