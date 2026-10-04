import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { syncBlockFromRoutines } from '../../src/lib/server/blockCache';

/**
 * A block's routines are a cache of My routines. Only src/lib/server/blockCache.ts writes them:
 * syncBlockFromRoutines for the active block, relinkExerciseInBlocks for exercise upkeep elsewhere.
 */

const srcDir = path.join(process.cwd(), 'src');
const blockCacheFile = path.join(srcDir, 'lib', 'server', 'blockCache.ts');

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) return name === 'zodSchemas' ? [] : sourceFiles(full);
		return /\.(ts|js|svelte)$/.test(name) ? [full] : [];
	});
}

const WRITE = '(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)';
const blockTableWrite = new RegExp(`\\b(mesocycleExerciseSplitDay|mesocycleExerciseTemplate)\\.${WRITE}\\b`);
const nestedBlockWrite = new RegExp(
	`\\b(mesocycleExerciseSplitDays|mesocycleSplitDayExercises)\\s*:\\s*\\{\\s*${WRITE.slice(0, -1)}|set|connect)\\b`
);
const routineRowDelete = /\bmesocycleExerciseSplitDay\.(delete|deleteMany)\b/;
const listCreate = /\bexerciseSplit\.(create|createMany)\b|\bexerciseSplits?\s*:\s*\{\s*create/;

test('nothing outside blockCache.ts writes a block’s routines, or makes a second routine list', () => {
	const offenders: string[] = [];
	for (const file of sourceFiles(srcDir)) {
		const text = readFileSync(file, 'utf8');
		const relative = path.relative(process.cwd(), file);
		if (file !== blockCacheFile && (blockTableWrite.test(text) || nestedBlockWrite.test(text))) {
			offenders.push(`${relative}: writes MesocycleExerciseSplitDay / MesocycleExerciseTemplate`);
		}
		// Workouts point at a block routine by its position: its row is never deleted, not even by the sync
		if (routineRowDelete.test(text)) offenders.push(`${relative}: deletes a block routine row`);
		// One list per person: only ensureMyRoutines (an upsert) makes it
		if (listCreate.test(text)) offenders.push(`${relative}: creates an ExerciseSplit`);
	}
	expect(offenders).toEqual([]);
});

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

/** A person with My routines, an active block and a finished block that share an exercise */
async function seedPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `guardrail-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	const exercise = (name: string) => prisma.exercise.create({ data: { userId, name, targetMuscleGroup: 'Chest' } });
	const [bench, benchTypo, dips] = await Promise.all([
		exercise('Bench press'),
		exercise('Bench pres'),
		exercise('Dips')
	]);
	const weightSet = await prisma.weightSet.create({
		data: { userId, name: 'Hotel dumbbells', unit: 'KG', weights: [5, 10, 15] }
	});
	const entry = (
		ex: { id: string; name: string },
		exerciseIndex: number,
		extra: { sets?: number; weightSetId?: string; overloadPercentage?: number } = {}
	) => ({
		exerciseId: ex.id,
		name: ex.name,
		exerciseIndex,
		targetMuscleGroup: 'Chest' as const,
		setType: 'Straight' as const,
		repRangeStart: 8,
		repRangeEnd: 12,
		sets: 3,
		...extra
	});
	await prisma.exerciseSplit.create({
		data: {
			userId,
			name: 'My routines',
			exerciseSplitDays: {
				create: [
					{
						name: 'Push A',
						dayIndex: 0,
						isRestDay: false,
						exercises: {
							create: [
								entry(benchTypo, 0, { sets: 3, weightSetId: weightSet.id }),
								entry(dips, 1, { sets: 2, overloadPercentage: 5 })
							]
						}
					}
				]
			}
		}
	});
	const block = (name: string, finished: boolean) =>
		prisma.mesocycle.create({
			data: {
				userId,
				name,
				weeklyRIR: [3, 2, 1],
				startDate: new Date(Date.now() - (finished ? 90 : 7) * 86400000),
				endDate: finished ? new Date(Date.now() - 60 * 86400000) : null,
				startOverloadPercentage: 2.5,
				lastSetToFailure: false,
				forceRIRMatching: false,
				mesocycleExerciseSplitDays: {
					create: [
						{
							name: 'Push A',
							dayIndex: 0,
							isRestDay: false,
							mesocycleSplitDayExercises: {
								create: [
									entry(benchTypo, 0, { sets: 3, weightSetId: weightSet.id }),
									entry(bench, 1, { sets: 3 }),
									entry(dips, 2, { sets: 2 })
								]
							}
						}
					]
				}
			},
			select: { id: true }
		});
	const [active, finished] = [await block('Now', false), await block('Before', true)];
	return { userId, caller, bench, benchTypo, dips, weightSet, active, finished };
}

const blockRows = (mesocycleId: string) =>
	prisma.mesocycleExerciseTemplate.findMany({
		where: { mesocycleExerciseSplitDay: { mesocycleId } },
		orderBy: { exerciseIndex: 'asc' },
		select: { id: true, exerciseId: true, name: true, weightSetId: true, sets: true, exerciseIndex: true }
	});

/** The active block's cache as a fresh sync from My routines would leave it */
async function expectActiveMatchesFreshSync(userId: string, mesocycleId: string) {
	const shape = async () => (await blockRows(mesocycleId)).map(({ id, ...row }) => row);
	const now = await shape();
	await prisma.$transaction((tx) => syncBlockFromRoutines(tx, userId));
	expect(now).toEqual(await shape());
	const routines = await prisma.exerciseSplitDay.findMany({
		where: { exerciseSplit: { userId } },
		include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
	});
	expect(now.map((row) => row.name)).toEqual(routines[0].exercises.map((exercise) => exercise.name));
}

test('exercise upkeep: the active block follows My routines, a finished block changes only those columns', async () => {
	const { userId, caller, bench, benchTypo, dips, weightSet, active, finished } = await seedPerson();
	const finishedBefore = await blockRows(finished.id);

	// Rename
	await caller.exercises.update({
		id: dips.id,
		details: {
			name: 'Weighted dips',
			targetMuscleGroup: 'Chest',
			customMuscleGroup: null,
			bodyweightFraction: null,
			note: null,
			repsOnly: false,
			maxReps: null
		}
	});
	await expectActiveMatchesFreshSync(userId, active.id);
	let finishedRows = await blockRows(finished.id);
	expect(finishedRows.map((row) => row.id)).toEqual(finishedBefore.map((row) => row.id));
	expect(finishedRows.map((row) => row.name)).toEqual(['Bench pres', 'Bench press', 'Weighted dips']);

	// Merge the misspelling into the real one: finished rows are relinked, never deleted
	await caller.exercises.merge({ fromId: benchTypo.id, intoId: bench.id });
	await expectActiveMatchesFreshSync(userId, active.id);
	finishedRows = await blockRows(finished.id);
	expect(finishedRows.map((row) => row.id)).toEqual(finishedBefore.map((row) => row.id));
	expect(finishedRows.map((row) => [row.exerciseId, row.name])).toEqual([
		[bench.id, 'Bench press'],
		[bench.id, 'Bench press'],
		[dips.id, 'Weighted dips']
	]);

	// A deleted weight set: unlinked everywhere, rows kept
	await caller.weightSets.delete(weightSet.id);
	await expectActiveMatchesFreshSync(userId, active.id);
	finishedRows = await blockRows(finished.id);
	expect(finishedRows.map((row) => row.id)).toEqual(finishedBefore.map((row) => row.id));
	expect(finishedRows.every((row) => row.weightSetId === null)).toBe(true);

	// Archive (it has no workouts here, so it's deleted): the finished block keeps the entry, unlinked
	await caller.exercises.delete(dips.id);
	await expectActiveMatchesFreshSync(userId, active.id);
	finishedRows = await blockRows(finished.id);
	expect(finishedRows.map((row) => row.id)).toEqual(finishedBefore.map((row) => row.id));
	expect(finishedRows.map((row) => [row.exerciseId, row.name])).toEqual([
		[bench.id, 'Bench press'],
		[bench.id, 'Bench press'],
		[null, 'Weighted dips']
	]);
	expect(finishedRows.map((row) => [row.sets, row.exerciseIndex])).toEqual(
		finishedBefore.map((row) => [row.sets, row.exerciseIndex])
	);
});

test('the sync never deletes a block routine: removed ones hide, come back by name, new ones go at the end', async () => {
	const { userId, caller, active } = await seedPerson();
	const exercise = await prisma.exercise.findFirstOrThrow({ where: { userId, name: 'Dips' } });
	const plan = (name: string) => [
		{
			name: exercise.name,
			exerciseIndex: 0,
			targetMuscleGroup: 'Chest' as const,
			setType: 'Straight' as const,
			repRangeStart: 8,
			repRangeEnd: 12,
			sets: 3,
			note: name
		}
	];
	const days = () =>
		prisma.mesocycleExerciseSplitDay.findMany({
			where: { mesocycleId: active.id },
			orderBy: { dayIndex: 'asc' },
			select: { id: true, name: true, dayIndex: true, hidden: true }
		});
	const [push] = await days();
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: new Date(),
			endedAt: new Date(),
			workoutOfMesocycle: { create: { mesocycleId: active.id, splitDayIndex: push.dayIndex, workoutStatus: null } }
		}
	});

	// Reorder, add Pull A and Legs, remove nothing
	await caller.exerciseSplits.save({
		routines: [
			{ name: 'Legs', weightUnit: 'KG' },
			{ name: 'Push A', weightUnit: 'KG', previousName: 'Push A' },
			{ name: 'Pull A', weightUnit: 'KG' }
		],
		routineExercises: [plan('legs'), plan('push'), plan('pull')]
	});
	expect(await days()).toEqual([
		{ id: push.id, name: 'Push A', dayIndex: 0, hidden: false },
		{ id: expect.any(String), name: 'Legs', dayIndex: 1, hidden: false },
		{ id: expect.any(String), name: 'Pull A', dayIndex: 2, hidden: false }
	]);

	// Push A removed: hidden, still at 0, so its past workout still names it
	await caller.exerciseSplits.save({
		routines: [
			{ name: 'Legs', weightUnit: 'KG', previousName: 'Legs' },
			{ name: 'Pull A', weightUnit: 'KG', previousName: 'Pull A' }
		],
		routineExercises: [plan('legs'), plan('pull')]
	});
	const afterRemove = await days();
	expect(afterRemove[0]).toEqual({ id: push.id, name: 'Push A', dayIndex: 0, hidden: true });
	const pastWorkout = await prisma.workoutOfMesocycle.findFirstOrThrow({ where: { mesocycleId: active.id } });
	expect(afterRemove.find((day) => day.dayIndex === pastWorkout.splitDayIndex)?.name).toBe('Push A');

	// Push A back by name: the same row shows again; a renamed routine keeps its row too
	await caller.exerciseSplits.save({
		routines: [
			{ name: 'Legs day', weightUnit: 'KG', previousName: 'Legs' },
			{ name: 'Pull A', weightUnit: 'KG', previousName: 'Pull A' },
			{ name: 'Push A', weightUnit: 'KG' }
		],
		routineExercises: [plan('legs'), plan('pull'), plan('push again')]
	});
	const final = await days();
	expect(final.map(({ name, dayIndex, hidden }) => [name, dayIndex, hidden])).toEqual([
		['Push A', 0, false],
		['Legs day', 1, false],
		['Pull A', 2, false]
	]);
	expect(final[0].id).toBe(push.id);
	expect(final[1].id).toBe(afterRemove[1].id);
});
