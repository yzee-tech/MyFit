import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { deleteTestUsers } from '../deleteTestUsers';

/**
 * Mesocycles used to keep a copy of the routines (MesocycleExerciseSplitDay / MesocycleExerciseTemplate,
 * and each workout's splitDayIndex into it). Nothing reads or writes that copy any more: mesocycles and
 * workouts use My routines and Workout.routineName. The tables stay, frozen, until they're dropped.
 */

const srcDir = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) return name === 'zodSchemas' ? [] : sourceFiles(full);
		return /\.(ts|js|svelte)$/.test(name) ? [full] : [];
	});
}

// Data access only, not names: a model (prisma.x. / tx.x.), a relation key in an include, select or
// where, or a splitDayIndex value written. Accepting splitDayIndex in an input schema (z.…) is fine
const copyModelAccess = /\b(mesocycleExerciseSplitDay|mesocycleExerciseTemplate)\./;
const copyRelationKey = /\b(mesocycleExerciseSplitDays?|mesocycleSplitDayExercises|mesocycleExerciseTemplates)\s*:/;
const splitDayIndexValue = /\bsplitDayIndex\s*:(?!\s*z\.)/;
const routineRowDelete = /\bmesocycleExerciseSplitDay\.(delete|deleteMany)\b/;
const listCreate = /\bexerciseSplit\.(create|createMany)\b|\bexerciseSplits?\s*:\s*\{\s*create/;

test('nothing reads or writes the mesocycle copy of the routines, or makes a second routine list', () => {
	const offenders: string[] = [];
	for (const file of sourceFiles(srcDir)) {
		const text = readFileSync(file, 'utf8');
		const relative = path.relative(process.cwd(), file);
		if (copyModelAccess.test(text) || copyRelationKey.test(text)) {
			offenders.push(`${relative}: reads or writes MesocycleExerciseSplitDay / MesocycleExerciseTemplate`);
		}
		if (splitDayIndexValue.test(text)) offenders.push(`${relative}: writes or selects splitDayIndex`);
		// Kept from when workouts pointed at copy rows: a routine row is never deleted
		if (routineRowDelete.test(text)) offenders.push(`${relative}: deletes a mesocycle routine row`);
		// One list per person: only ensureMyRoutines (an upsert) makes it
		if (listCreate.test(text)) offenders.push(`${relative}: creates an ExerciseSplit`);
	}
	expect(offenders).toEqual([]);
});

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
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

const copyRows = (mesocycleId: string) =>
	prisma.mesocycleExerciseTemplate.findMany({
		where: { mesocycleExerciseSplitDay: { mesocycleId } },
		orderBy: { exerciseIndex: 'asc' }
	});
const copyRoutines = (mesocycleId: string) =>
	prisma.mesocycleExerciseSplitDay.findMany({ where: { mesocycleId }, orderBy: { dayIndex: 'asc' } });

test('saving routines, exercise upkeep and a new mesocycle leave the frozen copy as it was', async () => {
	const { userId, caller, bench, benchTypo, dips, weightSet, active, finished } = await seedPerson();
	const before = {
		activeRows: await copyRows(active.id),
		finishedRows: await copyRows(finished.id),
		activeRoutines: await copyRoutines(active.id),
		finishedRoutines: await copyRoutines(finished.id)
	};
	const now = async () => ({
		activeRows: await copyRows(active.id),
		finishedRows: await copyRows(finished.id),
		activeRoutines: await copyRoutines(active.id),
		finishedRoutines: await copyRoutines(finished.id)
	});

	// My routines saved: renamed, reordered, a routine added
	await caller.exerciseSplits.save({
		routines: [
			{ name: 'Legs', weightUnit: 'KG' },
			{ name: 'Push day', weightUnit: 'KG', previousName: 'Push A' }
		],
		routineExercises: [
			[
				{
					name: dips.name,
					exerciseIndex: 0,
					targetMuscleGroup: 'Chest',
					setType: 'Straight',
					repRangeStart: 8,
					repRangeEnd: 12,
					sets: 4
				}
			],
			[
				{
					name: bench.name,
					exerciseIndex: 0,
					targetMuscleGroup: 'Chest',
					setType: 'Straight',
					repRangeStart: 6,
					repRangeEnd: 10,
					sets: 5
				}
			]
		]
	});
	// A rename on the Exercises page, and a deleted weight set
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
	await caller.weightSets.delete(weightSet.id);
	expect(await now()).toEqual(before);

	// A new mesocycle gets no copy at all
	await caller.mesocycles.create({
		mesocycle: {
			name: 'Next',
			weeklyRIR: [3, 2, 1],
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		},
		mesocycleCyclicSetChanges: [],
		startImmediately: false
	});
	const next = await prisma.mesocycle.findFirstOrThrow({ where: { userId, name: 'Next' } });
	expect(await copyRoutines(next.id)).toEqual([]);

	// A merge deletes the exercise merged away: only its copy rows go, by the database's cascade
	await caller.exercises.merge({ fromId: benchTypo.id, intoId: bench.id });
	const afterMerge = await now();
	const withoutTypo = (rows: { exerciseId: string | null }[]) => rows.filter((row) => row.exerciseId !== benchTypo.id);
	expect(afterMerge.activeRows).toEqual(withoutTypo(before.activeRows));
	expect(afterMerge.finishedRows).toEqual(withoutTypo(before.finishedRows));
	expect(afterMerge.activeRoutines).toEqual(before.activeRoutines);
	expect(afterMerge.finishedRoutines).toEqual(before.finishedRoutines);
});
