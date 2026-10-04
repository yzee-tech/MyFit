/**
 * The only code that writes a block's routines (MesocycleExerciseSplitDay / MesocycleExerciseTemplate).
 *
 * My routines (ExerciseSplit, one per person) is the one place routines are edited. A block keeps a
 * copy of them, a cache, because progression, the workout picker and history read routines from the
 * block. Two writers keep that cache right:
 *  - syncBlockFromRoutines: the active block's routines, rebuilt from My routines
 *  - relinkExerciseInBlocks: exercise upkeep (a rename, a merge, a deleted weight set) in other blocks
 * A test fails if anything outside this file writes those tables.
 */
import { prisma } from '$lib/prisma';
import { routineSetCount } from '$lib/utils/routineSets';
import { createId } from '@paralleldrive/cuid2';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * For transactions that save routines and sync the block: a long list of routines takes a few
 * queries per routine. If it runs out, the whole transaction rolls back (routines and block cache
 * both unchanged) and the person is told to try again.
 */
export const ROUTINES_TRANSACTION_OPTIONS = { timeout: 15000, maxWait: 5000 } as const;

export const MY_ROUTINES_NAME = 'My routines';

/** The person's routine list, created the first time it's needed */
export async function ensureMyRoutines(tx: Tx, userId: string): Promise<string> {
	const list = await tx.exerciseSplit.upsert({
		where: { userId },
		create: { name: MY_ROUTINES_NAME, userId },
		update: {},
		select: { id: true }
	});
	return list.id;
}

/** The block being trained now, if any */
export async function findActiveBlockId(tx: Tx, userId: string): Promise<string | null> {
	const block = await tx.mesocycle.findFirst({
		where: { userId, startDate: { not: null }, endDate: null },
		select: { id: true }
	});
	return block?.id ?? null;
}

export { uniqueRoutineName } from '$lib/utils/routineNames';

/**
 * Rebuilds a block's routines from My routines. The block's copy is only a cache: My routines is
 * the one place routines are edited, and progression, the workout picker and history read this
 * cache. Nothing else writes the cache's routines.
 *
 * - A routine is matched by its name before the edit (`renames`: new name → previous name), else
 *   its name; it gets My routines' exercises, sets, overrides and kg/lb choice, in place.
 * - A new routine is added after every existing one (max dayIndex + 1), so positions never change
 *   and past workouts (WorkoutOfMesocycle.splitDayIndex) stay with their routine.
 * - A routine no longer in My routines is hidden, never deleted, for the same reason; it comes back
 *   if a routine with that name does.
 * - Rest days (from the old fixed rotation) are left as they are.
 *
 * Syncs the active block, or `mesocycleId` (a block about to start); a finished block never.
 * Runs inside the caller's transaction, so routines and cache change together or not at all.
 */
export async function syncBlockFromRoutines(
	tx: Tx,
	userId: string,
	{ mesocycleId, renames }: { mesocycleId?: string; renames?: Map<string, string> } = {}
): Promise<void> {
	const block = await tx.mesocycle.findFirst({
		where: mesocycleId
			? { id: mesocycleId, userId, endDate: null }
			: { userId, startDate: { not: null }, endDate: null },
		select: {
			id: true,
			mesocycleExerciseSplitDays: {
				select: { id: true, name: true, dayIndex: true, isRestDay: true, hidden: true },
				orderBy: { dayIndex: 'asc' }
			}
		}
	});
	if (!block) return;

	const list = await tx.exerciseSplit.findUnique({
		where: { userId },
		select: {
			id: true,
			exerciseSplitDays: {
				where: { isRestDay: false },
				orderBy: { dayIndex: 'asc' },
				include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
			}
		}
	});

	// Visible routines first, so a name shared with a hidden one finds the visible one
	const blockRoutines = block.mesocycleExerciseSplitDays
		.filter((routine) => !routine.isRestDay)
		.sort((a, b) => Number(a.hidden) - Number(b.hidden) || a.dayIndex - b.dayIndex);
	const matched = new Set<string>();
	let nextDayIndex = Math.max(-1, ...block.mesocycleExerciseSplitDays.map((routine) => routine.dayIndex)) + 1;

	for (const routine of list?.exerciseSplitDays ?? []) {
		const findUnmatched = (name: string | undefined) =>
			name === undefined
				? undefined
				: blockRoutines.find((blockRoutine) => blockRoutine.name === name && !matched.has(blockRoutine.id));
		const target = findUnmatched(renames?.get(routine.name)) ?? findUnmatched(routine.name);

		let routineId: string;
		if (target) {
			matched.add(target.id);
			routineId = target.id;
			await tx.mesocycleExerciseSplitDay.update({
				where: { id: target.id },
				data: { name: routine.name, weightUnit: routine.weightUnit, hidden: false }
			});
			await tx.mesocycleExerciseTemplate.deleteMany({ where: { mesocycleExerciseSplitDayId: target.id } });
		} else {
			routineId = createId();
			await tx.mesocycleExerciseSplitDay.create({
				data: {
					id: routineId,
					name: routine.name,
					dayIndex: nextDayIndex++,
					isRestDay: false,
					weightUnit: routine.weightUnit,
					mesocycleId: block.id
				}
			});
		}
		await tx.mesocycleExerciseTemplate.createMany({
			data: routine.exercises.map(({ id, exerciseSplitDayId, sets, ...exercise }) => ({
				...exercise,
				sets: routineSetCount(sets),
				mesocycleExerciseSplitDayId: routineId
			}))
		});
	}

	const gone = blockRoutines.filter((routine) => !matched.has(routine.id) && !routine.hidden);
	if (gone.length > 0) {
		await tx.mesocycleExerciseSplitDay.updateMany({
			where: { id: { in: gone.map((routine) => routine.id) } },
			data: { hidden: true }
		});
	}
	if (list) await tx.mesocycle.update({ where: { id: block.id }, data: { exerciseSplitId: list.id } });
}

/** Exercise upkeep that blocks' copies follow */
export type ExerciseChange =
	/** New details for an exercise (a rename, a muscle group…) */
	| {
			kind: 'details';
			exerciseId: string;
			data: Partial<{
				name: string;
				targetMuscleGroup: Prisma.MesocycleExerciseTemplateUpdateManyMutationInput['targetMuscleGroup'];
				customMuscleGroup: string | null;
				bodyweightFraction: number | null;
			}>;
	  }
	/** One exercise merged into another: its entries now point at the other, with its details */
	| {
			kind: 'merge';
			fromId: string;
			into: {
				exerciseId: string;
				name: string;
				targetMuscleGroup: Prisma.MesocycleExerciseTemplateUpdateManyMutationInput['targetMuscleGroup'];
				customMuscleGroup: string | null;
				bodyweightFraction: number | null;
			};
	  }
	/** The exercise is deleted: entries keep their name and settings without the link */
	| { kind: 'unlink'; exerciseId: string }
	/** A weight set is deleted: exercises using it go back to standard steps */
	| { kind: 'weightSetDeleted'; weightSetId: string };

/**
 * Applies exercise upkeep to blocks' copies other than the active block, whose copy follows My
 * routines through syncBlockFromRoutines instead. Only those columns change: no routine or exercise
 * entry is added, removed or reordered, so a finished block stays a faithful record.
 *
 * `activeBlockId` is required so the exclusion can't be forgotten: pass null when there is none.
 */
export async function relinkExerciseInBlocks(
	tx: Tx,
	change: ExerciseChange,
	{ activeBlockId }: { activeBlockId: string | null }
): Promise<void> {
	const notActive: Prisma.MesocycleExerciseTemplateWhereInput =
		activeBlockId === null ? {} : { mesocycleExerciseSplitDay: { mesocycleId: { not: activeBlockId } } };
	switch (change.kind) {
		case 'details':
			await tx.mesocycleExerciseTemplate.updateMany({
				where: { exerciseId: change.exerciseId, ...notActive },
				data: change.data
			});
			break;
		case 'merge':
			await tx.mesocycleExerciseTemplate.updateMany({
				where: { exerciseId: change.fromId, ...notActive },
				data: change.into
			});
			break;
		case 'unlink':
			await tx.mesocycleExerciseTemplate.updateMany({
				where: { exerciseId: change.exerciseId, ...notActive },
				data: { exerciseId: null }
			});
			break;
		case 'weightSetDeleted':
			await tx.mesocycleExerciseTemplate.updateMany({
				where: { weightSetId: change.weightSetId, ...notActive },
				data: { weightSetId: null }
			});
			break;
	}
}

/** Runs `work` in a transaction that also syncs the active block from My routines */
export function withRoutinesTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
	return prisma.$transaction(work, ROUTINES_TRANSACTION_OPTIONS);
}
