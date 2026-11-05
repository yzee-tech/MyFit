import { test, expect, deleteUserData } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createMesocycle, createTemplateExerciseSplit } from './commonFunctions';
import { seedRoutines, seedRoutinesAndMesocycle } from './seed';

const prisma = new PrismaClient();

/**
 * The seed helpers stand in for the pages, so the rows they leave must be the rows the pages leave: made
 * once through the pages, once by the helpers, and compared
 */

/** Everything the setup leaves in the database for a user, without ids and the moments it ran */
async function snapshotOf(userId: string) {
	const withoutIds = <T extends Record<string, unknown>>(row: T) => {
		const copy: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(row)) if (key !== 'id' && !key.endsWith('Id')) copy[key] = value;
		return copy;
	};
	const list = await prisma.exerciseSplit.findUniqueOrThrow({
		where: { userId },
		include: {
			exerciseSplitDays: {
				orderBy: { dayIndex: 'asc' },
				include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
			}
		}
	});
	const exercises = await prisma.exercise.findMany({ where: { userId }, orderBy: { name: 'asc' } });
	const blocks = await prisma.mesocycle.findMany({
		where: { userId },
		include: { mesocycleCyclicSetChanges: true, pauses: true }
	});
	const exerciseNameOf = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
	return {
		list: withoutIds({ name: list.name }),
		routines: list.exerciseSplitDays.map((day) => ({
			...withoutIds(day),
			name: day.name,
			exercises: day.exercises.map((template) => ({
				...withoutIds(template),
				exercise: template.exerciseId ? exerciseNameOf.get(template.exerciseId) : null
			}))
		})),
		exercises: exercises.map(withoutIds),
		blocks: blocks.map((block) => ({
			...withoutIds(block),
			// Started within a minute of the check, not a fixed moment
			startedJustNow: !!block.startDate && Math.abs(Date.now() - block.startDate.getTime()) < 60_000,
			startDate: undefined,
			usesMyRoutines: block.exerciseSplitId === list.id,
			mesocycleCyclicSetChanges: block.mesocycleCyclicSetChanges.map(withoutIds),
			pauses: block.pauses.map(withoutIds)
		}))
	};
}

test('the seed helpers leave the same rows as setting up through the pages', async ({ page, userData }) => {
	const userId = userData.userId;

	await page.goto('/exercise-splits');
	await createMesocycle(page);
	const throughThePages = await snapshotOf(userId);

	await deleteUserData(userId);
	await seedRoutinesAndMesocycle(userId);
	const seeded = await snapshotOf(userId);

	// A real check, not two empty snapshots: the 6 routines and one running block are there
	expect(throughThePages.routines).toHaveLength(6);
	expect(throughThePages.blocks).toHaveLength(1);
	expect(throughThePages.blocks[0].startedJustNow).toBe(true);
	expect(seeded).toEqual(throughThePages);

	// And the app shows it as it shows the block made through the pages
	await page.goto('/mesocycles');
	await expect(page.getByRole('link', { name: 'MyMeso Active' }).first()).toBeVisible();
	await page.goto('/exercise-splits');
	await expect(page.getByTestId('routine-card-name')).toHaveText([
		'Pull A',
		'Push A',
		'Legs A',
		'Pull B',
		'Push B',
		'Legs B'
	]);
});

test('seeding the template again adds the routines after the ones there, a taken name getting “(2)”, like the page', async ({
	page,
	userData
}) => {
	const userId = userData.userId;

	await page.goto('/exercise-splits');
	await createTemplateExerciseSplit(page);
	await createTemplateExerciseSplit(page);
	const throughThePages = await snapshotOf(userId);

	await deleteUserData(userId);
	await seedRoutines(userId);
	await seedRoutines(userId);
	const seeded = await snapshotOf(userId);

	// 12 routines: the second six named "Pull A (2)" and so on, in order after the first six
	expect(throughThePages.routines.map((routine) => routine.name)).toEqual([
		'Pull A',
		'Push A',
		'Legs A',
		'Pull B',
		'Push B',
		'Legs B',
		'Pull A (2)',
		'Push A (2)',
		'Legs A (2)',
		'Pull B (2)',
		'Push B (2)',
		'Legs B (2)'
	]);
	expect(seeded).toEqual(throughThePages);
});

test('a seeded block moved to a past start is the block the pages make, moved the same way', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	// As weekPlumbing's tests do it: the block exists, then its start is set to a moment in the past
	const STARTED = new Date('2026-10-20T10:00:00Z');
	const backdate = () =>
		prisma.mesocycle.updateMany({
			where: { userId },
			data: { startDate: STARTED, endDate: null, weeklyRIR: [3, 2, 2, 1, 0, -1] }
		});

	await page.goto('/exercise-splits');
	await createMesocycle(page);
	await backdate();
	const throughThePages = await snapshotOf(userId);

	await deleteUserData(userId);
	await seedRoutinesAndMesocycle(userId);
	await backdate();
	const seeded = await snapshotOf(userId);

	// A real check: the start really is the past moment, on a block that is not just started
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { userId } });
	expect(block.startDate?.toISOString()).toBe(STARTED.toISOString());
	expect(throughThePages.blocks[0].startedJustNow).toBe(false);
	expect(block.weeklyRIR).toEqual([3, 2, 2, 1, 0, -1]);
	expect(seeded).toEqual(throughThePages);
});
