import { test, expect, deleteUserData, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { pickRoutine, saveWorkout } from './commonFunctions';
import { seedLoggedWorkout, seedRoutinesAndMesocycle } from './seed';

const prisma = new PrismaClient();

/**
 * seedLoggedWorkout stands in for logging a workout through the pages, so the rows it leaves must be the ones
 * the pages leave: logged once through the pages, once by the helper, and compared. The routine's other
 * exercises are deleted in the workout and three sets of Barbell rows are logged, as in the tests that use it
 */

const ROWS = [
	{ reps: 13, load: 40, RIR: 3 },
	{ reps: 13, load: 40, RIR: 3 },
	{ reps: 12, load: 40, RIR: 0 }
];

// The page fills in 4 reps in reserve for a deload week
const DELOAD_ROWS = [
	{ reps: 13, load: 40, RIR: 4 },
	{ reps: 13, load: 40, RIR: 4 }
];

/** Pull A with only Barbell rows, three sets, saved from the pages */
async function logThroughThePages(page: Page, options?: { notCounted?: boolean; deload?: boolean }) {
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('100');
	await pickRoutine(page, 'Pull A');
	if (options?.notCounted) await page.getByRole('switch', { name: 'Counts toward progression' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	for (const exercise of ['Pull-ups', 'Dumbbell bicep curls', 'Face pulls']) {
		await page.getByTestId(`${exercise}-menu-button`).click();
		await page.getByRole('menuitem', { name: 'Delete' }).click();
	}
	await page.locator('[id="Barbell\\ rows-set-1-reps"]').fill('13');
	await page.locator('[id="Barbell\\ rows-set-2-reps"]').fill('13');
	// A deload week has half the sets
	const sets = options?.deload ? [1, 2] : [1, 2, 3];
	if (!options?.deload) await page.locator('[id="Barbell\\ rows-set-3-reps"]').fill('12');
	await page.locator('[id="Barbell\\ rows-set-1-load"]').fill('40');
	for (const set of sets) await page.getByTestId(`Barbell rows-set-${set}-action`).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await saveWorkout(page);
}

/** Everything a saved workout holds, without ids; its moments as how far they are from the check */
async function workoutSnapshot(userId: string) {
	const withoutIds = <T extends Record<string, unknown>>(row: T) => {
		const copy: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(row)) if (key !== 'id' && !key.endsWith('Id')) copy[key] = value;
		return copy;
	};
	const workout = await prisma.workout.findFirstOrThrow({
		where: { userId },
		include: {
			workoutOfMesocycle: true,
			workoutExercises: {
				orderBy: { exerciseIndex: 'asc' },
				include: { sets: { orderBy: { setIndex: 'asc' }, include: { miniSets: true } } }
			}
		}
	});
	const block = await prisma.mesocycle.findFirst({ where: { userId } });
	const exercises = await prisma.exercise.findMany({ where: { userId }, orderBy: { name: 'asc' } });
	return {
		routineName: workout.routineName,
		userBodyweight: workout.userBodyweight,
		note: workout.note,
		isDeload: workout.isDeload,
		countsForProgression: workout.countsForProgression,
		inTheRunningBlock: !!block && workout.workoutOfMesocycle?.mesocycleId === block.id,
		startedJustNow: Math.abs(Date.now() - workout.startedAt.getTime()) < 120_000,
		endsWithinAMinuteOfStart: workout.endedAt.getTime() - workout.startedAt.getTime() < 60_000,
		exercises: workout.workoutExercises.map((exercise) => ({
			...withoutIds(exercise),
			workout: undefined,
			linkedTo: exercises.find((row) => row.id === exercise.exerciseId)?.name ?? null,
			sets: exercise.sets.map((set) => ({ ...withoutIds(set), miniSets: set.miniSets.map(withoutIds) }))
		})),
		exerciseRows: exercises.map(withoutIds)
	};
}

async function bothWays(
	userId: string,
	setUp: () => Promise<void>,
	through: () => Promise<void>,
	seed: () => Promise<unknown>
) {
	await setUp();
	await through();
	const throughThePages = await workoutSnapshot(userId);
	await deleteUserData(userId);
	await setUp();
	await seed();
	return { throughThePages, seeded: await workoutSnapshot(userId) };
}

test('a seeded workout is the one the pages save: routine name, block, sets, exercise rows', async ({
	page,
	userData
}) => {
	const { userId } = userData;
	const { throughThePages, seeded } = await bothWays(
		userId,
		() => seedRoutinesAndMesocycle(userId).then(() => undefined),
		() => logThroughThePages(page),
		() => seedLoggedWorkout(userId, { routineName: 'Pull A', exercises: { 'Barbell rows': ROWS } })
	);
	// A real check: the workout is in the block, from Pull A, not deload, counting, with its 3 sets
	expect(throughThePages.routineName).toBe('Pull A');
	expect(throughThePages.inTheRunningBlock).toBe(true);
	expect(throughThePages.isDeload).toBe(false);
	expect(throughThePages.countsForProgression).toBe(true);
	expect(throughThePages.startedJustNow).toBe(true);
	expect(throughThePages.exercises).toHaveLength(1);
	expect(throughThePages.exercises[0].sets).toHaveLength(3);
	expect(seeded).toEqual(throughThePages);
});

test('a seeded workout in a deload week is a deload workout, like one saved from the pages', async ({
	page,
	userData
}) => {
	const { userId } = userData;
	const { throughThePages, seeded } = await bothWays(
		userId,
		async () => {
			await seedRoutinesAndMesocycle(userId);
			// The block's only week is a deload week (as the deload test does)
			await prisma.mesocycle.updateMany({ where: { userId }, data: { weeklyRIR: [-1] } });
		},
		() => logThroughThePages(page, { deload: true }),
		() => seedLoggedWorkout(userId, { routineName: 'Pull A', exercises: { 'Barbell rows': DELOAD_ROWS } })
	);
	expect(throughThePages.isDeload).toBe(true);
	expect(throughThePages.exercises[0].sets).toHaveLength(2);
	expect(seeded).toEqual(throughThePages);
});

test('a seeded workout that does not count says so, like the start page switch', async ({ page, userData }) => {
	const { userId } = userData;
	const { throughThePages, seeded } = await bothWays(
		userId,
		() => seedRoutinesAndMesocycle(userId).then(() => undefined),
		() => logThroughThePages(page, { notCounted: true }),
		() =>
			seedLoggedWorkout(userId, {
				routineName: 'Pull A',
				exercises: { 'Barbell rows': ROWS },
				countsForProgression: false
			})
	);
	expect(throughThePages.countsForProgression).toBe(false);
	expect(seeded).toEqual(throughThePages);
});

test.describe('in the phone’s time zone', () => {
	// Shanghai: the block's week 6 (a deload) starts on Nov 24 there while it is still Nov 23 in UTC
	test.use({ timezoneId: 'Asia/Shanghai' });
	const NOW = new Date('2026-11-23T17:00:00Z');

	test('the start sets the deload week by the phone’s days: the page and the helper agree, and UTC would not', async ({
		page,
		userData
	}) => {
		const { userId } = userData;
		const setUp = async () => {
			await seedRoutinesAndMesocycle(userId);
			// A 6-week block, week 6 a deload, started Oct 20 at 18:00 in Shanghai
			await prisma.mesocycle.updateMany({
				where: { userId },
				data: { weeklyRIR: [3, 2, 2, 1, 0, -1], startDate: new Date('2026-10-20T10:00:00Z') }
			});
		};
		await page.clock.setFixedTime(NOW);
		await setUp();
		await logThroughThePages(page, { deload: true });
		const throughThePages = await prisma.workout.findFirstOrThrow({ where: { userId } });
		expect(throughThePages.startedAt.toISOString()).toBe(NOW.toISOString());
		expect(throughThePages.isDeload).toBe(true);

		const seed = async (timeZone: string) => {
			await deleteUserData(userId);
			await setUp();
			return seedLoggedWorkout(userId, {
				routineName: 'Pull A',
				exercises: { 'Barbell rows': ROWS },
				startedAt: NOW,
				timeZone
			});
		};
		expect((await seed('Asia/Shanghai')).isDeload).toBe(true);
		expect((await seed('UTC')).isDeload).toBe(false);
	});
});
