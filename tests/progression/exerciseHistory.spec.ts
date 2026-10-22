import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { historyFromPerformances } from '../../src/lib/trpc/routes/workouts';

/** Which past performances feed suggestions, and that a workout only goes in one's own block */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

async function seedPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `history-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	const exercise = await prisma.exercise.create({
		data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup }
	});
	return { userId, caller, exercise };
}

/** Rows done `daysAgo`, every set at `load` */
async function doneRows(userId: string, exerciseId: string, daysAgo: number, load: number) {
	const startedAt = new Date(Date.now() - daysAgo * 86400000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: startedAt,
			workoutExercises: {
				create: [
					{
						...rows,
						exerciseIndex: 0,
						exerciseId,
						sets: { create: [0, 1, 2].map((setIndex) => ({ setIndex, reps: 12, load, RIR: 2, skipped: false })) }
					}
				]
			}
		}
	});
}

const suggest = (caller: ReturnType<typeof createCaller>) =>
	caller.workouts.suggestSets({
		exerciseName: rows.name,
		sets: 3,
		setType: rows.setType,
		repRangeStart: rows.repRangeStart,
		repRangeEnd: rows.repRangeEnd,
		weightUnit: 'KG',
		userBodyweight: 80
	});

test('suggestions and Last time come from the latest times done: workouts long before change nothing', async () => {
	// The same latest 8 for both; one also did it twice long before, much heavier
	const withOlder = await seedPerson();
	const latestOnly = await seedPerson();
	for (const person of [withOlder, latestOnly]) {
		for (let daysAgo = 1; daysAgo <= 8; daysAgo++) {
			await doneRows(person.userId, person.exercise.id, daysAgo, 40 + daysAgo);
		}
	}
	await doneRows(withOlder.userId, withOlder.exercise.id, 30, 200);
	await doneRows(withOlder.userId, withOlder.exercise.id, 31, 200);

	const [a, b] = await Promise.all([suggest(withOlder.caller), suggest(latestOnly.caller)]);
	const numbers = (sets: { reps?: number | null; load?: number | null; RIR?: number | null }[] | null | undefined) =>
		sets?.map(({ reps, load, RIR }) => [reps, load, RIR]);
	expect(numbers(a?.sets)).toEqual(numbers(b?.sets));
	expect(numbers(a?.sets)).toHaveLength(3);
	// Last time: the newest
	expect(a?.previous?.exercise.sets.map((set) => set.load)).toEqual([41, 41, 41]);
});

test('past performances: each once, the latest 8 of each name, oldest first', () => {
	const at = (day: number) => new Date(Date.UTC(2026, 0, day));
	const row = (id: string, name: string, day: number) => ({
		id,
		name,
		workout: { userBodyweight: 80, startedAt: at(day) }
	});
	const rowsDone = Array.from({ length: 10 }, (_, idx) => row(`r${idx + 1}`, 'Barbell rows', idx + 1));
	const history = historyFromPerformances([
		// Shuffled, a row twice (an exercise asked for twice), and another exercise
		...rowsDone.slice(5),
		row('r10', 'Barbell rows', 10),
		...rowsDone.slice(0, 5),
		row('c1', 'Cable rows', 3)
	]);
	expect(history['Barbell rows'].map((p) => p.exercise.id)).toEqual(['r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10']);
	expect(history['Cable rows'].map((p) => p.exercise.id)).toEqual(['c1']);
	expect(history['Barbell rows'][0]).toEqual({ exercise: { id: 'r3', name: 'Barbell rows' }, oldUserBodyweight: 80 });

	// Two exercises once done under the same name share one history
	const shared = historyFromPerformances([
		...Array.from({ length: 6 }, (_, idx) => row(`a${idx}`, 'Rows', idx * 2 + 1)),
		...Array.from({ length: 6 }, (_, idx) => row(`b${idx}`, 'Rows', idx * 2 + 2))
	]);
	expect(shared['Rows'].map((p) => p.exercise.id)).toEqual(['a2', 'b2', 'a3', 'b3', 'a4', 'b4', 'a5', 'b5']);
});

test("a new workout can't go in someone else's block", async () => {
	const owner = await seedPerson();
	const other = await seedPerson();
	const mesocycle = await prisma.mesocycle.create({
		data: {
			userId: owner.userId,
			name: 'Owner block',
			weeklyRIR: [3, 2, 1, 0],
			startDate: new Date(),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	await expect(
		other.caller.workouts.create({
			workoutData: {
				userBodyweight: 80,
				workoutOfMesocycle: { mesocycle: { id: mesocycle.id }, splitDayName: 'Pull', workoutStatus: null }
			},
			workoutExercises: [{ ...rows, exerciseIndex: 0 }],
			workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 40, RIR: 2, skipped: false }]],
			workoutExercisesMiniSets: [[[]]]
		})
	).rejects.toThrow('Block not found');
	expect(await prisma.workout.count({ where: { userId: other.userId } })).toBe(0);
	expect(await prisma.workoutOfMesocycle.count({ where: { mesocycleId: mesocycle.id } })).toBe(0);
});
