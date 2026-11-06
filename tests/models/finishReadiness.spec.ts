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

/** Holds every request to this procedure until `release()`; `answer` says how to let it go */
async function hold(page: Page, pattern: string) {
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	let fail = false;
	let calls = 0;
	await page.route(pattern, async (route) => {
		calls++;
		await gate;
		if (fail) await route.abort();
		else await route.continue();
	});
	return {
		release: () => release(),
		failOnRelease: () => (fail = true),
		calls: () => calls
	};
}

const START = '/workouts/manage/start';
const finishOnStart = (page: Page) => page.getByRole('button', { name: 'Finish block' });

test.describe('the start page: Finish waits until the page has the block as it is now', () => {
	test('Finish is off while the pause and the fresh read are on their way, then works', async ({ page, userData }) => {
		const { block } = await seedOverdueBlock(userData.userId);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		await page.goto(START);
		await expect(page.getByText('Past its planned weeks')).toBeVisible();
		await expect(finishOnStart(page)).toBeDisabled();
		// Nothing has been answered yet: no pause, the block is as it was
		expect((await state(block.id)).pauses).toHaveLength(0);
		fresh.release();
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		await expect(finishOnStart(page)).toBeEnabled();
		await finishOnStart(page).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		const after = await state(block.id);
		expect(after.endDate).not.toBeNull();
		expect(after.pauses.filter((pause) => pause.resumedAt === null)).toHaveLength(0);
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
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: boundary } });
		fresh.release();
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		await expect(finishOnStart(page)).toBeEnabled();
		await finishOnStart(page).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		const after = await state(block.id);
		expect(after.endDate).not.toBeNull();
		expect(after.pauses).toHaveLength(1);
		expect(after.pauses[0].resumedAt).not.toBeNull();
	});

	test('the read fails: an error and Try again, never a Finish that looks ready; Try again then works', async ({
		page,
		userData
	}) => {
		const { block } = await seedOverdueBlock(userData.userId);
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
		await finishOnStart(page).click();
		await page.waitForURL(/\/mesocycles\/[a-zA-Z0-9]+(\?completion)/);
		expect((await state(block.id)).endDate).not.toBeNull();
	});
});

test.describe('the block page: the same', () => {
	const finishOnBlock = (page: Page) => page.getByRole('button', { name: 'Finish block' }).first();
	const confirmFinish = async (page: Page) => {
		await finishOnBlock(page).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Finish block' }).click();
	};

	test('Finish is off until both the pause request and the fresh read have answered, each held on its own', async ({
		page,
		userData
	}) => {
		const { block } = await seedOverdueBlock(userData.userId);
		const pause = await hold(page, '**/trpc/mesocycles.reconcileEndOfPlan*');
		const read = await hold(page, '**/trpc/mesocycles.findById*');
		await page.goto(`/mesocycles/${block.id}`);
		await expect(page.getByTestId('mesocycle-past-plan')).toBeVisible();
		await expect(finishOnBlock(page)).toBeDisabled();
		pause.release();
		// The pause is made, but the read of the block is still held: Finish stays off
		await expect.poll(async () => (await state(block.id)).pauses.length).toBe(1);
		await expect(finishOnBlock(page)).toBeDisabled();
		read.release();
		await expect(page.getByTestId('mesocycle-paused-week')).toBeVisible();
		await expect(finishOnBlock(page)).toBeEnabled();
		await confirmFinish(page);
		await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
		const after = await state(block.id);
		expect(after.pauses.filter((p) => p.resumedAt === null)).toHaveLength(0);
	});

	test('the pause was made by another request first (created: false): the block is read anyway and Finish works', async ({
		page,
		userData
	}) => {
		const { block, boundary } = await seedOverdueBlock(userData.userId);
		const pause = await hold(page, '**/trpc/mesocycles.reconcileEndOfPlan*');
		await page.goto(`/mesocycles/${block.id}`);
		await expect(finishOnBlock(page)).toBeDisabled();
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: boundary } });
		pause.release();
		await expect(page.getByTestId('mesocycle-paused-week')).toBeVisible();
		await expect(finishOnBlock(page)).toBeEnabled();
		await confirmFinish(page);
		await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
		const after = await state(block.id);
		expect(after.pauses).toHaveLength(1);
		expect(after.pauses[0].resumedAt).not.toBeNull();
	});

	test('the read fails: an error and Try again, Finish stays off; Try again then works', async ({ page, userData }) => {
		const { block } = await seedOverdueBlock(userData.userId);
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
		await confirmFinish(page);
		await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
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

	test('what was typed while the page was still settling is kept', async ({ page, userData }) => {
		await seedOverdueBlock(userData.userId);
		const fresh = await hold(page, '**/trpc/workouts.getTodaysWorkoutData*');
		await page.goto('/workouts');
		await page.getByLabel('create-workout').click();
		await page.getByPlaceholder('Type here').fill('85');
		fresh.release();
		await expect(page.getByText(/and it is paused/)).toBeVisible();
		await expect(page.getByPlaceholder('Type here')).toHaveValue('85');
	});
});

test('the block page: the pause request itself fails: an error and Try again, Finish stays off; Try again then works', async ({
	page,
	userData
}) => {
	const { block } = await seedOverdueBlock(userData.userId);
	const pause = await hold(page, '**/trpc/mesocycles.reconcileEndOfPlan*');
	pause.failOnRelease();
	await page.goto(`/mesocycles/${block.id}`);
	const finish = page.getByRole('button', { name: 'Finish block' }).first();
	await expect(finish).toBeDisabled();
	pause.release();
	await expect(page.getByRole('alert').filter({ hasText: "Couldn't check where its plan ended" })).toBeVisible();
	await expect(finish).toBeDisabled();
	expect((await state(block.id)).pauses).toHaveLength(0);
	await page.unroute('**/trpc/mesocycles.reconcileEndOfPlan*');
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(finish).toBeEnabled();
	await finish.click();
	await page.getByRole('dialog').getByRole('button', { name: 'Finish block' }).click();
	await expect.poll(async () => (await state(block.id)).endDate !== null).toBe(true);
});
