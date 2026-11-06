import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createCaller } from '../../src/lib/trpc/router';
import { createExercises, pickRoutine, quickAdd, saveWorkout } from './commonFunctions';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

const HELP_ON = 'Workout used to calculate weights and reps progression.';
const HELP_OFF = 'Workout saved in history, but not used to calculate weights and reps progression.';

/**
 * A routine, and a block that started 12 days ago (week 2 of 6), paused or not. `overdue` makes it a 4-week block
 * that started 37 days ago with 8 days paused (a closed 4-day pause and the open one): week 5, past its plan
 */
async function seedBlock(userId: string, options: { paused?: boolean; overdue?: boolean } = {}) {
	const caller = createCaller({ event: {} as never, userId });
	await createExercises(userId, [rows.name]);
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'MyMeso',
			weeklyRIR: options.overdue ? [3, 2, 1, 0] : [3, 2, 2, 1, 0, -1],
			startDate: new Date(Date.now() - (options.overdue ? 37 : 12) * DAY),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	if (options.overdue) {
		await prisma.mesocyclePause.create({
			data: {
				mesocycleId: block.id,
				pausedAt: new Date(Date.now() - 30 * DAY),
				resumedAt: new Date(Date.now() - 26 * DAY)
			}
		});
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - 4 * DAY) } });
	} else if (options.paused) {
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - 2 * DAY) } });
	}
	return { caller, block };
}

const switchOf = (page: Page) => page.getByRole('switch', { name: 'Counts toward progression' });

async function openStartPage(page: Page) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
}

async function latestWorkout(userId: string) {
	return prisma.workout.findFirstOrThrow({
		where: { userId },
		orderBy: { startedAt: 'desc' },
		include: { workoutOfMesocycle: true }
	});
}

test('start page: the switch shows for a routine in an active block and for a blank workout, on by default', async ({
	page,
	userData
}) => {
	await seedBlock(userData.userId);
	await openStartPage(page);
	await pickRoutine(page, 'Pull A');
	await expect(switchOf(page)).toBeVisible();
	await expect(switchOf(page)).toBeChecked();
	await expect(page.getByTestId('counts-for-progression-help')).toHaveText(HELP_ON);
	await expect(page.getByTestId('start-week')).toContainText('Week 2 of 6');

	await pickRoutine(page, 'Blank workout');
	await expect(switchOf(page)).toBeVisible();
	await expect(switchOf(page)).toBeChecked();

	// Turned off: the wording says it is saved in history but not used
	await switchOf(page).click();
	await expect(switchOf(page)).not.toBeChecked();
	await expect(page.getByTestId('counts-for-progression-help')).toHaveText(HELP_OFF);
	await switchOf(page).click();
	await expect(page.getByTestId('counts-for-progression-help')).toHaveText(HELP_ON);
});

test('start page, no block at all: the switch is there for a blank workout, and a workout switched off is saved as not counting', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, ['Barbell bench press']);
	await openStartPage(page);
	await expect(switchOf(page)).toBeChecked();
	await switchOf(page).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await quickAdd(page, ['Barbell bench press']);
	await page.locator('[id="Barbell\\ bench\\ press-set-1-load"]').fill('60');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-reps"]').fill('10');
	await page.locator('[id="Barbell\\ bench\\ press-set-1-RIR"]').fill('2');
	await page.getByTestId('Barbell bench press-set-1-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);
	const saved = await latestWorkout(userData.userId);
	expect(saved.countsForProgression).toBe(false);
	// It shows in the list, tagged
	await expect(page.getByTestId('not-counted-tag')).toBeVisible();
});

test('start page, block paused: "Week 2 - paused", the switch starts off with the paused wording, and the workout is saved outside the block', async ({
	page,
	userData
}) => {
	await seedBlock(userData.userId, { paused: true });
	await openStartPage(page);
	await expect(page.getByTestId('start-week')).toHaveText('Week 2 - paused');
	await pickRoutine(page, 'Pull A');
	await expect(switchOf(page)).not.toBeChecked();
	await expect(page.getByTestId('counts-for-progression-help')).toHaveText(
		`${HELP_OFF} Off since mesocycle is paused.`
	);
	// No deload banner or block settings for a paused block
	await expect(page.getByText('Deload week')).toHaveCount(0);

	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	for (const set of [1, 2, 3]) {
		await page.locator(`[id="Barbell\\ rows-set-${set}-load"]`).fill('50');
		await page.locator(`[id="Barbell\\ rows-set-${set}-reps"]`).fill('12');
		await page.locator(`[id="Barbell\\ rows-set-${set}-RIR"]`).fill('2');
		await page.getByTestId(`Barbell rows-set-${set}-action`).click();
	}
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);
	const saved = await latestWorkout(userData.userId);
	expect(saved.workoutOfMesocycle).toBeNull();
	expect(saved.countsForProgression).toBe(false);
	expect(saved.routineName).toBe('Pull A');
});

test('start page, block paused: the switch can be turned on, and that workout counts (and is still outside the block)', async ({
	page,
	userData
}) => {
	await seedBlock(userData.userId, { paused: true });
	await openStartPage(page);
	await pickRoutine(page, 'Blank workout');
	await expect(switchOf(page)).not.toBeChecked();
	await switchOf(page).click();
	await expect(page.getByTestId('counts-for-progression-help')).toHaveText(HELP_ON);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await quickAdd(page, ['Barbell rows']);
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('60');
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('10');
	await page.locator('[id="Barbell\\ rows-set-1-RIR"]').fill('2');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);
	const saved = await latestWorkout(userData.userId);
	expect(saved.countsForProgression).toBe(true);
	expect(saved.workoutOfMesocycle).toBeNull();
});

test('mesocycle page: Pause, "Week 2 - paused", Resume, and Stop on a paused block asks first and closes the pause', async ({
	page,
	userData
}) => {
	const { block } = await seedBlock(userData.userId);
	await page.goto(`/mesocycles/${block.id}`);
	await expect(page.getByTestId('mesocycle-paused-badge')).toHaveCount(0);

	// All three buttons share one compact size: 92 x 30
	const pauseBtn = page.getByRole('button', { name: 'Pause', exact: true });
	const stopBtn = page.getByRole('button', { name: 'Stop', exact: true });
	const expectCompact = async (btn: ReturnType<typeof page.getByRole>) => {
		const box = await btn.boundingBox();
		expect(Math.round(box!.width)).toBe(92);
		expect(Math.round(box!.height)).toBe(30);
		// Its icon keeps its full square size (no flex-shrink)
		const icon = await btn.locator('svg').first().boundingBox();
		expect(icon!.width).toBeGreaterThan(14);
		expect(Math.abs(icon!.width - icon!.height)).toBeLessThanOrEqual(1);
	};
	for (const btn of [pauseBtn, stopBtn]) {
		await expectCompact(btn);
	}

	await pauseBtn.click();
	const resumeBtn = page.getByRole('button', { name: 'Resume', exact: true });
	await expectCompact(resumeBtn);
	await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();
	await expect(page.getByTestId('mesocycle-paused-week')).toHaveText('Week 2 - paused');
	expect(await prisma.mesocyclePause.count({ where: { mesocycleId: block.id, resumedAt: null } })).toBe(1);

	await page.getByRole('button', { name: 'Resume', exact: true }).click();
	await expect(page.getByTestId('mesocycle-paused-badge')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
	expect(await prisma.mesocyclePause.count({ where: { mesocycleId: block.id, resumedAt: null } })).toBe(0);

	// Paused again: Stop says what it does before it does it
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();
	await page.getByRole('button', { name: 'Stop', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toContainText('Stopping ends the block and closes the pause.');
	expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id: block.id } })).endDate).toBeNull();
	await dialog.getByRole('button', { name: 'Stop mesocycle' }).click();
	await expect(page.getByText('Completed')).toBeVisible();
	const pauses = await prisma.mesocyclePause.findMany({ where: { mesocycleId: block.id } });
	expect(pauses).toHaveLength(2);
	expect(pauses.every((pause) => pause.resumedAt !== null)).toBe(true);
	// A block that is not paused stops straight away, with no question
});

test('mesocycle page: stopping a block that is not paused needs no confirmation', async ({ page, userData }) => {
	const { block } = await seedBlock(userData.userId);
	await page.goto(`/mesocycles/${block.id}`);
	await page.getByRole('button', { name: 'Stop', exact: true }).click();
	await expect(page.getByText('Completed')).toBeVisible();
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('dashboard: a paused block reads "Week 2 - paused"', async ({ page, userData }) => {
	await seedBlock(userData.userId, { paused: true });
	await page.goto('/dashboard');
	await expect(page.getByText('Week 2 - paused')).toBeVisible();
	// A paused block has no effort target in force: no effort chip on the card
	await expect(page.getByTestId('dashboard-effort-chip')).toHaveCount(0);
});

test('dashboard: a block that is not paused keeps its effort chip', async ({ page, userData }) => {
	await seedBlock(userData.userId);
	await page.goto('/dashboard');
	await expect(page.getByText('Week 2 of 6')).toBeVisible();
	await expect(page.getByTestId('dashboard-effort-chip')).toHaveCount(1);
});

test('a block past its planned weeks and paused is "Week 5 - paused" on the dashboard, never "Block finished"', async ({
	page,
	userData
}) => {
	await seedBlock(userData.userId, { overdue: true });
	await page.goto('/dashboard');
	await expect(page.getByText('Week 5 - paused')).toBeVisible();
	await expect(page.getByText('Block finished')).toHaveCount(0);
	await expect(page.getByTestId('dashboard-effort-chip')).toHaveCount(0);
});

test('a block past its planned weeks that is not paused is paused where its plan ended when the dashboard opens', async ({
	page,
	userData
}) => {
	const { block } = await seedBlock(userData.userId, { overdue: true });
	await prisma.mesocyclePause.deleteMany({ where: { mesocycleId: block.id } });
	await page.goto('/dashboard');
	// 37 days, no pause: it is past its 4 weeks, so the phone has it paused where the plan ended: Week 5, stood still
	await expect(page.getByText('Week 5 - paused')).toBeVisible();
	await expect(page.getByText('Block finished')).toHaveCount(0);
	const pauses = await prisma.mesocyclePause.findMany({ where: { mesocycleId: block.id } });
	expect(pauses).toHaveLength(1);
	expect(pauses[0].resumedAt).toBeNull();
	// Where the plan ended (the 28th day after the start day), not now
	const startDay = Math.floor((Date.now() - 37 * DAY) / DAY);
	const planEnd = new Date((startDay + 28) * DAY);
	const zoneOffset = new Date().getTimezoneOffset() * 60 * 1000;
	expect(Math.abs(pauses[0].pausedAt.getTime() - (planEnd.getTime() + zoneOffset))).toBeLessThan(DAY);
	expect(Date.now() - pauses[0].pausedAt.getTime()).toBeGreaterThan(5 * DAY);
	await openStartPage(page);
	await expect(page.getByText('Past its planned weeks')).toBeVisible();
	await expect(page.getByText('Block finished')).toHaveCount(0);
});

test('a block past its planned weeks and paused: the mesocycle page and the start page say "Week 5 - paused" and do not claim it is finished', async ({
	page,
	userData
}) => {
	const { block } = await seedBlock(userData.userId, { overdue: true });
	await page.goto(`/mesocycles/${block.id}`);
	await expect(page.getByTestId('mesocycle-paused-badge')).toBeVisible();
	await expect(page.getByTestId('mesocycle-paused-week')).toHaveText('Week 5 - paused');
	// No week of the plan is highlighted: it is past them all
	await expect(page.locator('[data-current="true"]')).toHaveCount(0);

	await openStartPage(page);
	await pickRoutine(page, 'Pull A');
	await expect(page.getByTestId('start-week')).toHaveText('Week 5 - paused');
	// The card keeps its actions (finishing is still right for an overdue block) but not the claim
	await expect(page.getByText('Block finished')).toHaveCount(0);
	await expect(page.getByText('Past its planned weeks')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Finish block' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Extend' })).toBeVisible();
});

test('Extend on the start page opens the block in its editor, plan loaded as saved, the planned weeks locked', async ({
	page,
	userData
}) => {
	const { block } = await seedBlock(userData.userId, { overdue: true });
	await openStartPage(page);
	await expect(page.getByText('Past its planned weeks')).toBeVisible();
	await page.getByRole('button', { name: 'Extend' }).click();
	await page.waitForURL(`/mesocycles/${block.id}/edit`);
	// The block's own settings are loaded, not a fresh suggestion: its week 4 is 0 RIR, a suggested 4-week plan ends in a deload
	await expect(page.getByLabel('Mesocycle name')).toHaveValue('MyMeso');
	await expect(page.getByTestId('edit-weeks').locator('li')).toHaveCount(4);
	await expect(page.getByLabel('Week 1 effort')).toContainText('3 RIR');
	await expect(page.getByLabel('Week 4 effort')).toContainText('0 RIR');
	await expect(page.getByLabel('Week 4 effort')).toBeDisabled();
});

test('Extend that cannot load the block says so, can be retried, and opens it once it loads', async ({
	page,
	userData
}) => {
	const { block } = await seedBlock(userData.userId, { overdue: true });
	await openStartPage(page);
	await expect(page.getByText('Past its planned weeks')).toBeVisible();
	await page.route('**/trpc/mesocycles.findById*', (route) => route.abort());
	await page.getByRole('button', { name: 'Extend' }).click();
	await page.waitForURL(`/mesocycles/${block.id}/edit`);
	await expect(
		page.getByText("Couldn't open the block for editing. Check your connection and try again.")
	).toBeVisible();
	// Nothing to edit until the block is there; the way back and the retry are
	await expect(page.getByLabel('Mesocycle name')).toHaveCount(0);
	await page.unroute('**/trpc/mesocycles.findById*');
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(page.getByLabel('Mesocycle name')).toHaveValue('MyMeso');
});

test('the detail page switch turns a saved workout off and on, with the tag in the list and on the page', async ({
	page,
	userData
}) => {
	const { caller } = await seedBlock(userData.userId);
	const { workoutId } = await caller.workouts.create({
		workoutData: { userBodyweight: 80, routineName: null, startedAt: new Date(Date.now() - DAY) },
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	});
	await page.goto(`/workouts/${workoutId}`);
	await expect(switchOf(page)).toBeChecked();
	await expect(page.getByTestId('not-counted-tag')).toHaveCount(0);
	await switchOf(page).click();
	await expect(page.getByTestId('not-counted-tag')).toBeVisible();
	await expect(page.getByTestId('counts-for-progression-help')).toHaveText(HELP_OFF);
	await expect
		.poll(async () => (await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } })).countsForProgression)
		.toBe(false);

	await page.goto('/workouts');
	await expect(page.getByTestId('not-counted-tag')).toBeVisible();
	await page.getByRole('link', { name: /Not counted/ }).click();
	await expect(switchOf(page)).not.toBeChecked();
	await switchOf(page).click();
	await expect(page.getByTestId('not-counted-tag')).toHaveCount(0);
	await expect
		.poll(async () => (await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } })).countsForProgression)
		.toBe(true);
});

test('editing a workout that does not count keeps it off', async ({ page, userData }) => {
	const { caller } = await seedBlock(userData.userId);
	const { workoutId } = await caller.workouts.create({
		workoutData: {
			userBodyweight: 80,
			routineName: null,
			startedAt: new Date(Date.now() - DAY),
			countsForProgression: false
		},
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	});
	await page.goto(`/workouts/${workoutId}`);
	await page.getByLabel('workout-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises\?editing/);
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('7');
	await page.getByTestId('Barbell rows-set-1-action').click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/workouts');
	const saved = await prisma.workout.findUniqueOrThrow({
		where: { id: workoutId },
		include: { workoutExercises: { include: { sets: true } } }
	});
	// The edit went through, and the choice stayed
	expect(saved.workoutExercises[0].sets[0].reps).toBe(7);
	expect(saved.countsForProgression).toBe(false);
});
