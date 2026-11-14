import { test, expect, deleteUserData } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createMesocycle } from './commonFunctions';
import { seedTemplateSplitAndMeso } from '../support/blocks';

const prisma = new PrismaClient();

/**
 * The saved routines-and-block state, stripped of every database id and timestamp, so two ways of
 * building the same setup can be compared on what a real user gets, not on row identity
 */
async function snapshotSettings(userId: string) {
	const split = await prisma.exerciseSplit.findUnique({
		where: { userId },
		include: {
			exerciseSplitDays: {
				include: { exercises: { orderBy: { exerciseIndex: 'asc' } } },
				orderBy: { dayIndex: 'asc' }
			}
		}
	});
	const meso = await prisma.mesocycle.findFirst({
		where: { userId },
		include: { mesocycleCyclicSetChanges: true }
	});
	return JSON.parse(
		JSON.stringify({ split, meso }, (key, value) =>
			['id', 'userId', 'exerciseSplitId', 'exerciseSplitDayId', 'exerciseId', 'mesocycleId', 'startDate'].includes(key)
				? undefined
				: value
		)
	);
}

/**
 * Drift guard: seedTemplateSplitAndMeso copies the wizard's defaults (the weekly RIR list, the overload
 * percentage and the failure/RIR switches) so the slow tests don't spend their budget on setup clicks.
 * If the wizard's defaults change, this test fails instead of the seeded tests silently testing a setup
 * no real user gets.
 */
test('seeded setup matches the wizard: same routines and block settings', async ({ page, userData }) => {
	await createMesocycle(page);
	const wizard = await snapshotSettings(userData.userId);

	await deleteUserData(userData.userId);
	await seedTemplateSplitAndMeso(userData.userId);
	const seeded = await snapshotSettings(userData.userId);

	expect(seeded).toEqual(wizard);
});
