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
		await page.waitForURL(`/mesocycles/${block.id}`);
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
		// Network failure
		await page.route('**/trpc/mesocycles.editById*', (route) => route.abort());
		await saveButton(page).click();
		await expect(page.getByTestId('edit-save-error')).toContainText("Couldn't save");
		await expect(page).toHaveURL(`/mesocycles/${block.id}/edit`);
		await expect(saveButton(page)).toBeEnabled();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Kept name');
		await expect(weekRows(page)).toHaveCount(4);
		await expect(week(page, 3)).toContainText('Deload');
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
		expect((await blockRow(block.id)).name).toBe('MyMeso');
		// A refusal from the server (the name is too long): the message, the draft kept
		await page.unroute('**/trpc/mesocycles.editById*');
		await page.getByLabel('Mesocycle name').fill('x'.repeat(101));
		await saveButton(page).click();
		await expect(page.getByTestId('edit-save-error')).toBeVisible();
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('x'.repeat(101));
		await expect(weekRows(page)).toHaveCount(4);
		expect((await blockRow(block.id)).name).toBe('MyMeso');
		// Retry with a good name
		await page.getByLabel('Mesocycle name').fill('Kept name');
		await saveButton(page).click();
		await expect(savedToast(page)).toBeVisible({ timeout: 10000 });
		await page.waitForURL(`/mesocycles/${block.id}`);
		expect((await blockRow(block.id)).weeklyRIR).toEqual([3, 2, -1, -1]);
		// Cleared: opened again it is the saved block
		await page.goto(`/mesocycles/${block.id}/edit`);
		await expect(page.getByLabel('Mesocycle name')).toHaveValue('Kept name');
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
		const startDay = Math.floor((Date.now() - 40 * DAY) / DAY);
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
		await page.waitForURL(`/mesocycles/${block.id}`);
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
		await page.waitForURL(`/mesocycles/${block.id}`);
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

	test('on the block page, before it is extended: Extend and Stop, no Resume; and a Resume sent anyway is refused', async ({
		page,
		userData
	}) => {
		const { caller, block } = await seedBlock(userData.userId, { weeklyRIR: [3, 2, 1, -1], startedDaysAgo: 40 });
		await page.goto(`/mesocycles/${block.id}`);
		await expect(page.getByTestId('mesocycle-past-plan')).toBeVisible();
		await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Extend' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
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
		await page.getByRole('button', { name: 'Finish block' }).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		const saved = await blockRow(block.id);
		expect(saved.endDate).not.toBeNull();
		expect(saved.pauses.filter((p) => p.resumedAt === null)).toHaveLength(0);
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
