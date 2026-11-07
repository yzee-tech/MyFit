import type { PrismaClient } from '@prisma/client';

/**
 * Seeing, in the scratch database itself, that a request is waiting for a block's row lock, instead of guessing from
 * elapsed time. A request that has been "held" for 500 ms may simply not have arrived yet
 */
export function pgLocks(prisma: Pick<PrismaClient, '$queryRaw'>) {
	/**
	 * The transaction that holds this block's row lock right now: the one whose id is on the row as its locker. The test's
	 * own holding transaction has taken the lock before this is called, so the id is there; none means the hold is not
	 * what it should be, which fails the test as a setup failure
	 */
	const holderOf = async (blockId: string) => {
		const [row] = await prisma.$queryRaw<
			{ holder: string }[]
		>`SELECT xmax::text AS holder FROM "Mesocycle" WHERE id = ${blockId}`;
		if (!row || row.holder === '0') throw new Error('setup failure: no transaction holds the block');
		return row.holder;
	};

	/**
	 * Sessions that are waiting for exactly that transaction to end, and are asking for a row lock on a block: tied to
	 * this held transaction, so another worker's lock waits cannot count
	 */
	const waitingOnHolder = async (holder: string) =>
		Number(
			(
				await prisma.$queryRaw<{ n: bigint }[]>`
					SELECT count(*) AS n FROM pg_locks l
					JOIN pg_stat_activity a ON a.pid = l.pid
					WHERE l.locktype = 'transactionid' AND l.transactionid = ${holder}::text::xid AND NOT l.granted
					AND a.query LIKE '%FROM "Mesocycle"%FOR UPDATE%'`
			)[0].n
		);

	/** Fails the test (a setup failure, not a pass) if the competitor never gets as far as waiting on the holder */
	const untilBlockedOnHolder = async (holder: string) => {
		const limit = Date.now() + 10000;
		while ((await waitingOnHolder(holder)) < 1) {
			if (Date.now() > limit) throw new Error('setup failure: the competing request never waited for the lock');
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
	};

	return { holderOf, untilBlockedOnHolder };
}
