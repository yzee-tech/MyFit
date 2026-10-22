import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';

/** Lists loaded page by page (from the last one's id): each item once, even when times are the same */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

const TIED = 25;

/** Someone with 25 workouts of barbell rows, all started at the same moment */
async function seedTiedWorkouts() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `pages-${userId}@myfit.com` } });
	const startedAt = new Date(Date.now() - 86400000);
	for (let idx = 0; idx < TIED; idx++) {
		await prisma.workout.create({
			data: {
				id: createId(),
				userId,
				userBodyweight: 80,
				startedAt,
				endedAt: startedAt,
				workoutExercises: {
					create: [
						{
							exerciseIndex: 0,
							name: 'Barbell rows',
							targetMuscleGroup: 'Lats',
							setType: 'Straight',
							repRangeStart: 8,
							repRangeEnd: 12,
							sets: { create: [{ setIndex: 0, reps: 10, load: 60, RIR: 2, skipped: false }] }
						}
					]
				}
			}
		});
	}
	return createCaller({ event: {} as never, userId });
}

/** Every page in turn, from the last item's id, until a page comes back short */
async function allPages(loadPage: (cursorId: string | undefined) => Promise<{ id: string }[]>) {
	const ids: string[] = [];
	for (let pages = 0; pages < 10; pages++) {
		const page = await loadPage(ids.at(-1));
		ids.push(...page.map((item) => item.id));
		if (page.length < 10) break;
	}
	return ids;
}

test('the Workouts list, page by page: every workout once when they started at the same moment', async () => {
	const caller = await seedTiedWorkouts();
	const ids = await allPages((cursorId) => caller.workouts.load({ cursorId }));
	expect(ids).toHaveLength(TIED);
	expect(new Set(ids).size).toBe(TIED);
});

test("an exercise's history, page by page: every time once when they started at the same moment", async () => {
	const caller = await seedTiedWorkouts();
	const ids = await allPages((cursorId) =>
		caller.workouts.getExerciseHistory({ exerciseName: 'Barbell rows', cursorId })
	);
	expect(ids).toHaveLength(TIED);
	expect(new Set(ids).size).toBe(TIED);
});
