/**
 * Helpers for saving My routines (ExerciseSplit, one per person), the one place routines live.
 * A mesocycle and its workouts use My routines and each workout's routineName (mesocycles used to
 * keep their own copy of the routines; it was dropped). A test fails if a second list is made.
 */
import { prisma } from '$lib/prisma';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * For transactions that save routines: a long list of routines takes a few queries per routine. If
 * it runs out, the whole transaction rolls back and the person is told to try again.
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

export { uniqueRoutineName } from '$lib/utils/routineNames';

/** Runs `work` in a transaction long enough to save a list of routines */
export function withRoutinesTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
	return prisma.$transaction(work, ROUTINES_TRANSACTION_OPTIONS);
}
