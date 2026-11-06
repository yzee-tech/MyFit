import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createCaller } from '../../src/lib/trpc/router';
import { createExercises, pickRoutine, saveWorkout } from './commonFunctions';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
test.use({ timezoneId: 'UTC' });

const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

/**
 * A 1-week block that started 8 days ago and was never paused: it has run all its planned weeks, and the page is
 * about to pause it where its plan ended. Finish must not be offered until the page has that answer
 */
async function seedOverdueBlock(userId: string) {
	const caller = createCaller({ event: {} as never, userId });
	await createExercises(userId, [rows.name]);
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const startDate = new Date(Date.now() - 8 * DAY);
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'OneWeekBlock',
			weeklyRIR: [3],
			startDate,
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	// Where its plan ended: the start of the UTC day 7 days in
	const boundary = new Date(Math.floor((startDate.getTime() + 7 * DAY) / DAY) * DAY);
	return { block, boundary };
}

const state = (id: string) => prisma.mesocycle.findUniqueOrThrow({ where: { id }, include: { pauses: true } });

const heldGates: Array<() => void> = [];
test.afterEach(() => {
	for (const release of heldGates.splice(0)) release();
});

/**
 * Holds every request matching `pattern` until `release()`. It is then let through, or, after `failOnRelease()`,
 * dropped as if the network failed
 */
async function hold(page: Page, pattern: string) {
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	// Let go when the test ends, however it ends, so nothing is left waiting
	heldGates.push(() => release());
	let fail = false;
	await page.route(pattern, async (route) => {
		await gate;
		if (fail) await route.abort();
		else await route.continue();
	});
	return {
		release: () => release(),
		failOnRelease: () => (fail = true)
	};
}

/**
 * The one pause that ends the plan: at the boundary, still open before Finish, and after it the same row closed at
 * the moment the block ended (an empty list satisfies "nothing is open", so the row itself is checked)
 */
async function expectBoundaryPause(blockId: string, boundary: Date, closed: boolean, sameRowAs?: string) {
	const { pauses, endDate } = await state(blockId);
	expect(pauses).toHaveLength(1);
	if (sameRowAs !== undefined) expect(pauses[0].id).toBe(sameRowAs);
	expect(pauses[0].pausedAt.toISOString()).toBe(boundary.toISOString());
	if (closed) {
		expect(endDate).not.toBeNull();
		expect(pauses[0].resumedAt?.toISOString()).toBe(endDate!.toISOString());
	} else {
		expect(pauses[0].resumedAt).toBeNull();
		expect(endDate).toBeNull();
	}
	return pauses[0].id;
}

/** The progression choice the workout in progress is saved with (what the exercises page and the save will use) */
const savedCountsForProgression = (page: Page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem('workoutRunes')!).workoutData.countsForProgression as boolean);

const START = '/workouts/manage/start';
const finishOnStart = (page: Page) => page.getByRole('button', { name: 'Finish block' });
// The block page: its button (the first one named so), and the confirmation a paused block asks for
const finishOnBlock = (page: Page) => page.getByRole('button', { name: 'Finish block' }).first();
const confirmFinish = async (page: Page) => {
	await finishOnBlock(page).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Finish block' }).click();
};

test.describe('the start page: Finish waits until the page has the block as it is now', () => {
	test('Finish is off while the pause and the fresh read are on their way, then works', async ({ page, userData }) => {
		const { block, boundary } = await seedOverdueBlock(userData.userId);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		await page.goto(START);
		await expect(page.getByText('Past its planned weeks')).toBeVisible();
		await expect(finishOnStart(page)).toBeDisabled();
		// Nothing has been answered yet: no pause, the block is as it was
		expect((await state(block.id)).pauses).toHaveLength(0);
		fresh.release();
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		await expect(finishOnStart(page)).toBeEnabled();
		// The pause is really there, at the boundary, before Finish
		await expectBoundaryPause(block.id, boundary, false);
		const pauseId = (await state(block.id)).pauses[0].id;
		await finishOnStart(page).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		await expectBoundaryPause(block.id, boundary, true);
		// That same row was closed, and the plan was left as it was
		expect((await state(block.id)).pauses[0].id).toBe(pauseId);
		expect((await state(block.id)).weeklyRIR).toEqual(block.weeklyRIR);
		expect((await state(block.id)).startDate?.toISOString()).toBe(block.startDate?.toISOString());
	});

	test('the pause was made by another request first (the answer says nothing was created): Finish still names it', async ({
		page,
		userData
	}) => {
		const { block, boundary } = await seedOverdueBlock(userData.userId);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		await page.goto(START);
		await expect(finishOnStart(page)).toBeDisabled();
		// Another request makes the pause while this page's request is held
		const created = await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: boundary } });
		fresh.release();
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		await expect(finishOnStart(page)).toBeEnabled();
		await finishOnStart(page).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		// The row the other request made is the one Finish closed
		await expectBoundaryPause(block.id, boundary, true, created.id);
	});

	test('the read fails: an error and Try again, never a Finish that looks ready; Try again then works', async ({
		page,
		userData
	}) => {
		const { block, boundary } = await seedOverdueBlock(userData.userId);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		fresh.failOnRelease();
		await page.goto(START);
		await expect(finishOnStart(page)).toBeDisabled();
		fresh.release();
		await expect(page.getByRole('alert').filter({ hasText: "Couldn't check where its plan ended" })).toBeVisible();
		await expect(finishOnStart(page)).toBeDisabled();
		expect((await state(block.id)).endDate).toBeNull();
		await page.unroute('**/trpc/workouts.getTodaysWorkoutData*');
		await page.getByRole('button', { name: 'Try again' }).click();
		await expect(finishOnStart(page)).toBeEnabled();
		await expect(page.getByRole('alert').filter({ hasText: "Couldn't check where its plan ended" })).toHaveCount(0);
		const pauseId = await expectBoundaryPause(block.id, boundary, false);
		await finishOnStart(page).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		await expectBoundaryPause(block.id, boundary, true, pauseId);
	});
});

test.describe('the block page: the same', () => {
	test('Finish is off until both the pause request and the fresh read have answered, each held on its own', async ({
		page,
		userData
	}) => {
		const { block, boundary } = await seedOverdueBlock(userData.userId);
		const pause = await hold(page, '**/trpc/mesocycles.reconcileEndOfPlan*');
		const read = await hold(page, '**/trpc/mesocycles.findById*');
		await page.goto(`/mesocycles/${block.id}`);
		await expect(page.getByTestId('mesocycle-past-plan')).toBeVisible();
		await expect(finishOnBlock(page)).toBeDisabled();
		pause.release();
		// The pause is made, but the read of the block is still held: Finish stays off
		await expect.poll(async () => (await state(block.id)).pauses.length).toBe(1);
		await expectBoundaryPause(block.id, boundary, false);
		await expect(finishOnBlock(page)).toBeDisabled();
		read.release();
		await expect(page.getByTestId('mesocycle-paused-week')).toBeVisible();
		await expect(finishOnBlock(page)).toBeEnabled();
		const pauseId = (await state(block.id)).pauses[0].id;
		await confirmFinish(page);
		await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
		await expectBoundaryPause(block.id, boundary, true);
		expect((await state(block.id)).pauses[0].id).toBe(pauseId);
		expect((await state(block.id)).weeklyRIR).toEqual(block.weeklyRIR);
	});

	test('the pause was made by another request first (created: false): the block is read anyway and Finish works', async ({
		page,
		userData
	}) => {
		const { block, boundary } = await seedOverdueBlock(userData.userId);
		const pause = await hold(page, '**/trpc/mesocycles.reconcileEndOfPlan*');
		await page.goto(`/mesocycles/${block.id}`);
		await expect(finishOnBlock(page)).toBeDisabled();
		const created = await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: boundary } });
		pause.release();
		await expect(page.getByTestId('mesocycle-paused-week')).toBeVisible();
		await expect(finishOnBlock(page)).toBeEnabled();
		await confirmFinish(page);
		await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
		await expectBoundaryPause(block.id, boundary, true, created.id);
	});

	test('the read fails: an error and Try again, Finish stays off; Try again then works', async ({ page, userData }) => {
		const { block, boundary } = await seedOverdueBlock(userData.userId);
		const read = await hold(page, '**/trpc/mesocycles.findById*');
		read.failOnRelease();
		await page.goto(`/mesocycles/${block.id}`);
		await expect(finishOnBlock(page)).toBeDisabled();
		read.release();
		await expect(page.getByRole('alert').filter({ hasText: "Couldn't check where its plan ended" })).toBeVisible();
		await expect(finishOnBlock(page)).toBeDisabled();
		await page.unroute('**/trpc/mesocycles.findById*');
		await page.getByRole('button', { name: 'Try again' }).click();
		await expect(finishOnBlock(page)).toBeEnabled();
		const pauseId = await expectBoundaryPause(block.id, boundary, false);
		await confirmFinish(page);
		await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
		await expectBoundaryPause(block.id, boundary, true, pauseId);
	});
});

test.describe('what the start page shows once the automatic pause has been applied', () => {
	const switchOf = (page: Page) => page.getByRole('switch', { name: 'Counts toward progression' });
	const openStart = async (page: Page) => {
		await page.goto('/workouts');
		await page.getByLabel('create-workout').click();
		await page.getByPlaceholder('Type here').fill('80');
	};

	test('the progression switch is off for the now-paused block, and an ordinary workout is saved as not counting', async ({
		page,
		userData
	}) => {
		await seedOverdueBlock(userData.userId);
		await openStart(page);
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		await pickRoutine(page, 'Pull A');
		await expect(switchOf(page)).not.toBeChecked();
		await expect(page.getByTestId('counts-for-progression-help')).toContainText('Off since mesocycle is paused.');
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
		const saved = await prisma.workout.findFirstOrThrow({
			where: { userId: userData.userId },
			orderBy: { startedAt: 'desc' },
			include: { workoutOfMesocycle: true }
		});
		expect(saved.countsForProgression).toBe(false);
		expect(saved.workoutOfMesocycle).toBeNull();
	});

	test('a bodyweight typed while the page was still settling is kept (a guard for typed values, not for the progression choice)', async ({
		page,
		userData
	}) => {
		await seedOverdueBlock(userData.userId);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		await page.goto('/workouts');
		await page.getByLabel('create-workout').click();
		await page.getByPlaceholder('Type here').fill('85');
		fresh.release();
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		await expect(page.getByPlaceholder('Type here')).toHaveValue('85');
	});

	test('a switch the person turned off and on again while the page was settling stays on once the block is paused', async ({
		page,
		userData
	}) => {
		await seedOverdueBlock(userData.userId);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		await openStart(page);
		// Not paused yet, so the switch starts on
		await expect(switchOf(page)).toBeChecked();
		await switchOf(page).click();
		await expect(switchOf(page)).not.toBeChecked();
		await switchOf(page).click();
		await expect(switchOf(page)).toBeChecked();
		fresh.release();
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		// A paused block turns an untouched switch off (the first test); this one was moved by the person
		await expect(switchOf(page)).toBeChecked();
	});

	/**
	 * A workout begun with the switch on, in the block's only week, and kept on this device; then its plan ends, with
	 * nothing having paused the block yet
	 */
	const beginWorkoutThenEndPlan = async (page: Page, blockId: string) => {
		await prisma.mesocycle.update({ where: { id: blockId }, data: { startDate: new Date(Date.now() - 3 * DAY) } });
		await openStart(page);
		await pickRoutine(page, 'Pull A');
		await expect(switchOf(page)).toBeChecked();
		await page.getByRole('button', { name: 'Next' }).click();
		await page.waitForURL(/\/workouts\/manage\/exercises/);
		// The workout is in progress for the start page only once what the exercises page loads has been saved:
		// the exercises (they arrive after the URL changes), the choice stored with the workout, and not editing
		await expect
			.poll(() =>
				page.evaluate(() => {
					const saved = JSON.parse(localStorage.getItem('workoutRunes') ?? 'null');
					return (
						(saved?.workoutExercises?.length ?? 0) > 0 &&
						saved?.workoutData?.countsForProgression === true &&
						(saved?.editingWorkoutId ?? null) === null
					);
				})
			)
			.toBe(true);
		await prisma.mesocycle.update({ where: { id: blockId }, data: { startDate: new Date(Date.now() - 8 * DAY) } });
	};

	test('a workout already in progress keeps the choice it was saved with when the page learns the block is paused', async ({
		page,
		userData
	}) => {
		const { block } = await seedOverdueBlock(userData.userId);
		await beginWorkoutThenEndPlan(page, block.id);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		try {
			await page.goto(START);
			// In progress is real (not the page without a workout), and nothing has paused the block yet
			await expect(page.getByRole('button', { name: 'Continue workout' })).toBeVisible();
			await expect(switchOf(page)).toBeChecked();
			expect((await state(block.id)).pauses).toHaveLength(0);
		} finally {
			fresh.release();
		}
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		expect((await state(block.id)).pauses).toHaveLength(1);
		// A paused block alone would switch it off: it is on because the workout was saved on
		await expect(switchOf(page)).toBeChecked();
		// Continue keeps it: what is saved for the workout is still on
		await page.getByRole('button', { name: 'Continue workout' }).click();
		await page.waitForURL(/\/workouts\/manage\/exercises/);
		expect(await savedCountsForProgression(page)).toBe(true);
	});

	test('a workout already in progress: a switch the person turns off while the page is settling stays off', async ({
		page,
		userData
	}) => {
		const { block } = await seedOverdueBlock(userData.userId);
		await beginWorkoutThenEndPlan(page, block.id);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		try {
			await page.goto(START);
			await expect(page.getByRole('button', { name: 'Continue workout' })).toBeVisible();
			// The stored choice, until the person moves the switch; nothing has paused the block yet
			await expect(switchOf(page)).toBeChecked();
			expect((await state(block.id)).pauses).toHaveLength(0);
			await switchOf(page).click();
			await expect(switchOf(page)).not.toBeChecked();
		} finally {
			fresh.release();
		}
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		expect((await state(block.id)).pauses).toHaveLength(1);
		// The fresh answer for the paused block does not undo what the person just chose over what was stored
		await expect(switchOf(page)).not.toBeChecked();
		// And Continue saves that choice for the workout, not the one it was stored with before
		await page.getByRole('button', { name: 'Continue workout' }).click();
		await page.waitForURL(/\/workouts\/manage\/exercises/);
		expect(await savedCountsForProgression(page)).toBe(false);
	});
});

test('the block page: the pause request itself fails: an error and Try again, Finish stays off; Try again then works', async ({
	page,
	userData
}) => {
	const { block, boundary } = await seedOverdueBlock(userData.userId);
	const pause = await hold(page, '**/trpc/mesocycles.reconcileEndOfPlan*');
	pause.failOnRelease();
	await page.goto(`/mesocycles/${block.id}`);
	await expect(finishOnBlock(page)).toBeDisabled();
	pause.release();
	await expect(page.getByRole('alert').filter({ hasText: "Couldn't check where its plan ended" })).toBeVisible();
	await expect(finishOnBlock(page)).toBeDisabled();
	expect((await state(block.id)).pauses).toHaveLength(0);
	await page.unroute('**/trpc/mesocycles.reconcileEndOfPlan*');
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(finishOnBlock(page)).toBeEnabled();
	const pauseId = await expectBoundaryPause(block.id, boundary, false);
	await confirmFinish(page);
	await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
	await expectBoundaryPause(block.id, boundary, true, pauseId);
});
