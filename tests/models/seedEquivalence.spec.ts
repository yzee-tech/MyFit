import { test, expect, deleteUserData } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createMesocycle } from './commonFunctions';
import { seedRoutinesAndMesocycle } from './seed';

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
