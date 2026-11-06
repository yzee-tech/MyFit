/**
 * A block's life: the pauses that stop its weeks, and the pause that ends its plan.
 *
 * A block that has run all its planned weeks pauses itself at the moment the plan ended, so it stays there
 * (Past its planned weeks) however long it is left, and it is never finished by itself. Every server step that
 * reads or changes a block's pauses or weeks takes the block's row lock first and sees the same state.
 */
import { prisma } from '$lib/prisma';
import type { Prisma } from '@prisma/client';
import {
	endOfPlanBoundary,
	getBlockWeek,
	isBlockPaused,
	isDeloadWeek,
	isInPause,
	isPastPlannedWeeks
} from '$lib/utils/workoutUtils';

type Tx = Prisma.TransactionClient;

/**
 * Takes the block's row lock until the transaction ends. Pausing, resuming, stopping, editing and the pause
 * that ends a plan all write the block's end date, pauses or weeks, so they wait for each other here; a plain
 * transaction would not do that (each would read the block as it was before the other committed). A block is
 * always locked first, so two of them never wait on each other in a circle
 */
export async function lockMesocycle(tx: Tx, userId: string, mesocycleId: string) {
	await tx.$queryRaw`SELECT id FROM "Mesocycle" WHERE id = ${mesocycleId} AND "userId" = ${userId} FOR UPDATE`;
}

/**
 * Pauses a block at the moment its plan ended, if it has run all its planned weeks and is neither paused nor
 * finished; does nothing otherwise, so it is safe to call on every step. The pause is stamped where the plan
 * ended, never when it was noticed, so the weeks after it are not counted; the days are the timezone's
 * (the request's; UTC when it names none). Takes the block's lock. Returns whether it made the pause
 *
 * A block with a pause that begins after its plan ended (one made by hand in the past) is left as it is:
 * that pause is kept, and a second one would overlap it and count its days twice
 */
export async function reconcileEndOfPlanInTx(
	tx: Tx,
	userId: string,
	mesocycleId: string,
	timeZone?: string | null,
	now: Date = new Date()
): Promise<boolean> {
	await lockMesocycle(tx, userId, mesocycleId);
	const block = await tx.mesocycle.findFirst({
		where: { id: mesocycleId, userId },
		select: { startDate: true, endDate: true, weeklyRIR: true, pauses: { select: { pausedAt: true, resumedAt: true } } }
	});
	if (!block?.startDate || block.endDate || isBlockPaused(block.pauses)) return false;
	const plannedWeeks = block.weeklyRIR.length;
	if (!isPastPlannedWeeks(block.startDate, now, timeZone, block.pauses, plannedWeeks)) return false;
	const boundary = endOfPlanBoundary(block.startDate, block.pauses, plannedWeeks, timeZone);
	if (!boundary || boundary.getTime() > now.getTime()) return false;
	if (block.pauses.some((pause) => new Date(pause.pausedAt).getTime() >= boundary.getTime())) return false;
	await tx.mesocyclePause.create({ data: { mesocycleId, pausedAt: boundary } });
	return true;
}

/**
 * The same for the person's started, unfinished block (there is at most one), for steps that have no
 * transaction of their own. A look without the lock first, so a block that needs nothing is not locked
 */
export async function reconcileActiveBlock(userId: string, timeZone?: string | null, now: Date = new Date()) {
	const block = await prisma.mesocycle.findFirst({
		where: { userId, startDate: { not: null }, endDate: null },
		select: { id: true, startDate: true, weeklyRIR: true, pauses: { select: { pausedAt: true, resumedAt: true } } }
	});
	if (!block?.startDate || isBlockPaused(block.pauses)) return false;
	if (!isPastPlannedWeeks(block.startDate, now, timeZone, block.pauses, block.weeklyRIR.length)) return false;
	return prisma.$transaction((tx) => reconcileEndOfPlanInTx(tx, userId, block.id, timeZone, now));
}

/**
 * Test seam: a workout save calls `beforeWorkoutWrite` after its block and week are decided and before the workout
 * is written, so a test can hold that moment still and show a Finish cannot land in it. Nothing sets it in the app
 */
export const lifecycleTestHooks: { beforeWorkoutWrite?: () => Promise<void> } = {};

/**
 * For a workout being saved or moved: whether it belongs to the block (a workout started while the block was
 * paused is an ordinary one) and whether it fell in a deload week. The block is locked and its plan-end pause
 * made first, in the caller's transaction, which goes on to write the workout: a workout started after the plan
 * ended is never counted into a week that does not exist, and nothing changes the block between the decision and
 * the write. `found` is false when the block is not the person's
 */
export async function blockMembershipForWorkoutInTx(
	tx: Tx,
	userId: string,
	mesocycleId: string,
	startedAt: Date,
	timeZone: string | undefined
): Promise<{ found: boolean; inBlock: boolean; isDeload: boolean }> {
	await reconcileEndOfPlanInTx(tx, userId, mesocycleId, timeZone);
	const block = await tx.mesocycle.findFirst({
		where: { id: mesocycleId, userId },
		select: { startDate: true, weeklyRIR: true, pauses: { select: { pausedAt: true, resumedAt: true } } }
	});
	const decision = block
		? {
				found: true,
				inBlock: !isInPause(block.pauses, startedAt),
				isDeload: block.startDate
					? isDeloadWeek(block.weeklyRIR, getBlockWeek(block.startDate, startedAt, timeZone, block.pauses))
					: false
			}
		: { found: false, inBlock: false, isDeload: false };
	return decision;
}
