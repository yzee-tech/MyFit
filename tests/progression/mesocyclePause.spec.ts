import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { getBlockWeek, isBlockPaused, isInPause } from '../../src/lib/utils/workoutUtils';
import { deleteTestUsers } from '../deleteTestUsers';
import { pgLocks } from '../support/pgLocks';

/**
 * Pausing a mesocycle: its week stands still while it is paused, past workouts keep the week they were done in,
 * pause and resume are safe to repeat, and a workout that doesn't count toward progression stays out of the
 * suggestions
 */

const { holderOf, untilBlockedOnHolder } = pgLocks(prisma);
const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

const SHANGHAI = 'Asia/Shanghai';
const DAY = 24 * 60 * 60 * 1000;
// A block that started on Oct 20 at 18:00 in Shanghai (10:00 UTC): Oct 27 is the first day of week 2
const START = new Date('2026-10-20T10:00:00Z');
const at = (isoLocalShanghai: string) => new Date(`${isoLocalShanghai}+08:00`);

test.describe('getBlockWeek with pauses', () => {
	test('no pauses is as before; a block paused in week 3 stays in week 3 however long it is paused', () => {
		expect(getBlockWeek(START, at('2026-11-05T09:00:00'), SHANGHAI)).toBe(3);
		const pauses = [{ pausedAt: at('2026-11-05T12:00:00'), resumedAt: null }];
		// Paused on Nov 5 (day 16, week 3); weeks later it is still week 3
		for (const day of ['2026-11-05T13:00:00', '2026-11-19T09:00:00', '2027-02-01T09:00:00']) {
			expect(getBlockWeek(START, at(day), SHANGHAI, pauses)).toBe(3);
		}
	});

	test('resuming continues in the same week: ten paused days are not counted', () => {
		const pauses = [{ pausedAt: at('2026-11-05T12:00:00'), resumedAt: at('2026-11-15T12:00:00') }];
		// Day 16 when paused (week 3); resumed Nov 15 with 10 paused days: Nov 15 is still day 16 of the block
		expect(getBlockWeek(START, at('2026-11-15T13:00:00'), SHANGHAI, pauses)).toBe(3);
		// Week 4 starts at day 21: Nov 20 here, where it would have been Nov 10 without the pause
		expect(getBlockWeek(START, at('2026-11-19T09:00:00'), SHANGHAI, pauses)).toBe(3);
		expect(getBlockWeek(START, at('2026-11-20T09:00:00'), SHANGHAI, pauses)).toBe(4);
		expect(getBlockWeek(START, at('2026-11-10T09:00:00'), SHANGHAI)).toBe(4);
	});

	test('pausing and resuming on the same day removes no days; each midnight crossed removes exactly one', () => {
		const sameDay = [{ pausedAt: at('2026-11-02T08:00:00'), resumedAt: at('2026-11-02T20:00:00') }];
		// No days lost: every day has the week it has without the pause (week 4 starts on Nov 10)
		for (const day of ['2026-11-02T21:00:00', '2026-11-09T09:00:00', '2026-11-10T09:00:00']) {
			expect(getBlockWeek(START, at(day), SHANGHAI, sameDay)).toBe(getBlockWeek(START, at(day), SHANGHAI));
		}
		expect(getBlockWeek(START, at('2026-11-09T09:00:00'), SHANGHAI, sameDay)).toBe(3);
		expect(getBlockWeek(START, at('2026-11-10T09:00:00'), SHANGHAI, sameDay)).toBe(4);
		// One midnight crossed removes exactly one day: week 4 starts one day later
		const overnight = [{ pausedAt: at('2026-11-02T22:00:00'), resumedAt: at('2026-11-03T08:00:00') }];
		expect(getBlockWeek(START, at('2026-11-10T09:00:00'), SHANGHAI, overnight)).toBe(3);
		expect(getBlockWeek(START, at('2026-11-11T09:00:00'), SHANGHAI, overnight)).toBe(4);
		// Three midnights crossed remove exactly three
		const threeNights = [{ pausedAt: at('2026-11-02T22:00:00'), resumedAt: at('2026-11-05T08:00:00') }];
		expect(getBlockWeek(START, at('2026-11-12T09:00:00'), SHANGHAI, threeNights)).toBe(3);
		expect(getBlockWeek(START, at('2026-11-13T09:00:00'), SHANGHAI, threeNights)).toBe(4);
	});

	test('a pause after the moment asked about is not counted: a past workout keeps the week it was done in', () => {
		const later = [{ pausedAt: at('2026-11-10T12:00:00'), resumedAt: at('2026-11-20T12:00:00') }];
		for (const day of ['2026-10-21T09:00:00', '2026-10-28T09:00:00', '2026-11-04T09:00:00', '2026-11-09T09:00:00']) {
			expect(getBlockWeek(START, at(day), SHANGHAI, later)).toBe(getBlockWeek(START, at(day), SHANGHAI));
		}
	});

	test('days are the phone timezone days: the same pause crosses a midnight in one timezone and not in another', () => {
		// Paused Nov 5 at 23:00 Shanghai, resumed Nov 6 at 01:00 Shanghai: one midnight there, but the same
		// afternoon in New York (10:00 to 12:00)
		const pauses = [{ pausedAt: at('2026-11-05T23:00:00'), resumedAt: at('2026-11-06T01:00:00') }];
		const now = at('2026-11-10T09:00:00');
		expect(getBlockWeek(START, now, SHANGHAI)).toBe(4);
		expect(getBlockWeek(START, now, SHANGHAI, pauses)).toBe(3);
		expect(getBlockWeek(START, now, 'America/New_York', pauses)).toBe(getBlockWeek(START, now, 'America/New_York'));
		// A missing or invalid timezone counts UTC days without throwing
		expect(() => getBlockWeek(START, now, 'Not/AZone', pauses)).not.toThrow();
		expect(getBlockWeek(START, now, undefined, pauses)).toBe(getBlockWeek(START, now, 'UTC', pauses));
	});

	test('a daylight saving change inside a pause removes whole local days, not 23 or 25 hours', () => {
		// New York clocks go back on Nov 1 2026. Paused Oct 31 20:00 EDT, resumed Nov 2 20:00 EST: 2 local days
		const started = new Date('2026-10-10T16:00:00Z');
		const pauses = [{ pausedAt: new Date('2026-11-01T00:00:00Z'), resumedAt: new Date('2026-11-03T01:00:00Z') }];
		const zone = 'America/New_York';
		const week = (iso: string, withPauses: boolean) =>
			getBlockWeek(started, new Date(iso), zone, withPauses ? pauses : undefined);
		// Week 6 starts at day 35: Nov 14 without the pause, two days later with it
		expect(week('2026-11-14T16:00:00Z', false)).toBe(6);
		expect(week('2026-11-14T16:00:00Z', true)).toBe(5);
		expect(week('2026-11-15T16:00:00Z', true)).toBe(5);
		expect(week('2026-11-16T16:00:00Z', true)).toBe(6);
	});

	test('isBlockPaused and isInPause', () => {
		const open = [{ pausedAt: '2026-11-05T00:00:00Z', resumedAt: null }];
		const closed = [{ pausedAt: '2026-11-05T00:00:00Z', resumedAt: '2026-11-08T00:00:00Z' }];
		expect(isBlockPaused(open)).toBe(true);
		expect(isBlockPaused(closed)).toBe(false);
		expect(isBlockPaused(undefined)).toBe(false);
		expect(isInPause(closed, new Date('2026-11-06T00:00:00Z'))).toBe(true);
		expect(isInPause(closed, new Date('2026-11-08T00:00:00Z'))).toBe(false);
		expect(isInPause(closed, new Date('2026-11-04T00:00:00Z'))).toBe(false);
		expect(isInPause(open, new Date('2027-01-01T00:00:00Z'))).toBe(true);
	});
});

const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

async function seedPerson(options: { started?: boolean } = {}) {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `pause-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	const other = createCaller({ event: {} as never, userId: createId() });
	await prisma.exercise.create({ data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup } });
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Block',
			weeklyRIR: [3, 2, 2, 1, 0, -1],
			startDate: options.started === false ? null : new Date(Date.now() - 12 * DAY),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	return { userId, caller, other, block };
}

const openPauses = (mesocycleId: string) => prisma.mesocyclePause.findMany({ where: { mesocycleId, resumedAt: null } });

test.describe('pause and resume on the server', () => {
	test('pausing is safe to repeat: a second pause, even at the same time, leaves one open pause', async () => {
		const { caller, block } = await seedPerson();
		await Promise.all([caller.mesocycles.pause(block.id), caller.mesocycles.pause(block.id)]);
		await caller.mesocycles.pause(block.id);
		expect(await openPauses(block.id)).toHaveLength(1);
		expect(await prisma.mesocyclePause.count({ where: { mesocycleId: block.id } })).toBe(1);
	});

	test('the database itself refuses a second open pause for a block, but allows a closed one', async () => {
		const { block } = await seedPerson();
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date() } });
		const refused = await prisma.mesocyclePause
			.create({ data: { mesocycleId: block.id, pausedAt: new Date() } })
			.then(
				() => null,
				(error: unknown) => error as { code?: string; meta?: { target?: string[] } }
			);
		// It is the one-open-pause index on mesocycleId that refused it, not an id collision or another rule
		expect(refused).toMatchObject({ code: 'P2002', meta: { target: ['mesocycleId'] } });
		await prisma.mesocyclePause.create({
			data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - DAY), resumedAt: new Date(Date.now() - DAY / 2) }
		});
		expect(await prisma.mesocyclePause.count({ where: { mesocycleId: block.id } })).toBe(2);
	});

	test('resuming ends the open pause; resuming a block that is not paused does nothing', async () => {
		const { caller, block } = await seedPerson();
		const never = await caller.mesocycles.resume(block.id);
		expect(never.message).toBe('Mesocycle was not paused');
		await caller.mesocycles.pause(block.id);
		await caller.mesocycles.resume(block.id);
		await caller.mesocycles.resume(block.id);
		const pauses = await prisma.mesocyclePause.findMany({ where: { mesocycleId: block.id } });
		expect(pauses).toHaveLength(1);
		expect(pauses[0].resumedAt).not.toBeNull();
		// It can be paused again after a resume
		await caller.mesocycles.pause(block.id);
		expect(await openPauses(block.id)).toHaveLength(1);
	});

	test('only the owner can pause or resume; a block that is not started or is finished cannot be paused', async () => {
		const { caller, other, block } = await seedPerson();
		await expect(other.mesocycles.pause(block.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await expect(other.mesocycles.resume(block.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await caller.mesocycles.pause(block.id);
		await expect(other.mesocycles.resume(block.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
		expect(await openPauses(block.id)).toHaveLength(1);

		const unstarted = await seedPerson({ started: false });
		await expect(unstarted.caller.mesocycles.pause(unstarted.block.id)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
		const finished = await seedPerson();
		await prisma.mesocycle.update({ where: { id: finished.block.id }, data: { endDate: new Date() } });
		await expect(finished.caller.mesocycles.pause(finished.block.id)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
	});

	test('stopping a paused block closes the pause with it, and the pauses come with the block when it is read', async () => {
		const { caller, block } = await seedPerson();
		await caller.mesocycles.pause(block.id);
		const stopped = await caller.mesocycles.progressToNextStage({
			id: block.id,
			startDate: block.startDate,
			endDate: null
		});
		expect(await openPauses(block.id)).toHaveLength(0);
		const pause = await prisma.mesocyclePause.findFirstOrThrow({ where: { mesocycleId: block.id } });
		expect(pause.resumedAt?.getTime()).toBe(stopped.endDate?.getTime());
		const read = await caller.mesocycles.findById(block.id);
		expect(read?.pauses).toHaveLength(1);
	});

	test('deleting a block deletes its pauses', async () => {
		const { caller, block } = await seedPerson();
		await caller.mesocycles.pause(block.id);
		await caller.mesocycles.deleteById(block.id);
		expect(await prisma.mesocyclePause.count({ where: { mesocycleId: block.id } })).toBe(0);
	});
	test('a pause that arrives while a stop is in flight waits for it, then is refused: no open pause is left on the finished block', async () => {
		const { caller, block } = await seedPerson();
		const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		let pausing: Promise<unknown> = Promise.resolve();
		try {
			// A stop that has taken the block's lock and set its end date, but has not committed yet
			await prisma.$transaction(
				async (tx) => {
					await tx.$queryRaw`SELECT id FROM "Mesocycle" WHERE id = ${block.id} FOR UPDATE`;
					await tx.mesocycle.update({ where: { id: block.id }, data: { endDate: new Date() } });
					// The pause starts now: it must wait for the lock, not read the block as it was
					const holder = await holderOf(block.id);
					pausing = caller.mesocycles.pause(block.id).then(
						() => 'paused',
						(error) => error
					);
					// The pause is seen waiting for this transaction's lock, not guessed to be there after a delay
					await untilBlockedOnHolder(holder);
				},
				{ timeout: 15000, maxWait: 5000 }
			);
			const result = await Promise.race([pausing, sleep(10000).then(() => 'timed out waiting for the pause')]);
			expect(result).toMatchObject({ code: 'BAD_REQUEST' });
			expect(await openPauses(block.id)).toHaveLength(0);
		} finally {
			// A failing run must not leave the lock held or the pause hanging
			await Promise.race([pausing, sleep(5000)]);
		}
	});

	test('a stop that arrives while a pause is in flight waits for it, then closes that pause too: no open pause is left on the finished block', async () => {
		const { caller, block } = await seedPerson();
		const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		let stopped = false;
		let stopping: Promise<unknown> = Promise.resolve();
		let stoppedWhileHeld: boolean | undefined;
		try {
			// A pause that has taken the block's lock and made its pause, but has not committed yet
			await prisma.$transaction(
				async (tx) => {
					await tx.$queryRaw`SELECT id FROM "Mesocycle" WHERE id = ${block.id} FOR UPDATE`;
					await tx.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date() } });
					const holder = await holderOf(block.id);
					stopping = caller.mesocycles
						.progressToNextStage({ id: block.id, startDate: block.startDate, endDate: null })
						.then(() => (stopped = true));
					// The stop is seen waiting for this transaction's lock; only then is "has it run ahead?" a real question
					await untilBlockedOnHolder(holder);
					stoppedWhileHeld = stopped;
				},
				{ timeout: 15000, maxWait: 5000 }
			);
			await Promise.race([stopping, sleep(10000)]);
			// The stop did not run ahead of the pause; afterwards it closed that pause with the block
			expect(stoppedWhileHeld).toBe(false);
			expect(stopped).toBe(true);
			expect(await openPauses(block.id)).toHaveLength(0);
			expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id: block.id } })).endDate).not.toBeNull();
		} finally {
			await Promise.race([stopping, sleep(5000)]);
		}
	});

	test('a resume and a pause at the same moment leave at most one open pause, and a closed one for the resume', async () => {
		const { caller, block } = await seedPerson();
		await caller.mesocycles.pause(block.id);
		for (let round = 0; round < 4; round++) {
			await Promise.all([caller.mesocycles.resume(block.id), caller.mesocycles.pause(block.id)]);
			expect((await openPauses(block.id)).length).toBeLessThanOrEqual(1);
		}
		await caller.mesocycles.resume(block.id);
		expect(await openPauses(block.id)).toHaveLength(0);
	});
});

function workoutOf(options: {
	blockId?: string | null;
	startedAt: Date;
	load?: number;
	countsForProgression?: boolean;
}) {
	return {
		workoutData: {
			userBodyweight: 80,
			routineName: 'Pull A',
			startedAt: options.startedAt,
			...(options.countsForProgression === undefined ? {} : { countsForProgression: options.countsForProgression }),
			...(options.blockId ? { workoutOfMesocycle: { mesocycle: { id: options.blockId } } } : {})
		},
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: options.load ?? 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	};
}

test.describe('workouts in a paused block', () => {
	test('a workout started while the block was paused is saved outside the block; one started before the pause is kept', async () => {
		const { caller, block } = await seedPerson();
		const beforePause = new Date(Date.now() - 3 * DAY);
		const pausedAt = new Date(Date.now() - 2 * DAY);
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt } });
		const before = await caller.workouts.create(workoutOf({ blockId: block.id, startedAt: beforePause }));
		const during = await caller.workouts.create(
			workoutOf({ blockId: block.id, startedAt: new Date(Date.now() - DAY) })
		);
		expect(await prisma.workoutOfMesocycle.count({ where: { workoutId: before.workoutId } })).toBe(1);
		expect(await prisma.workoutOfMesocycle.count({ where: { workoutId: during.workoutId } })).toBe(0);
		// After a resume, a new workout is part of the block again
		await caller.mesocycles.resume(block.id);
		const after = await caller.workouts.create(workoutOf({ blockId: block.id, startedAt: new Date() }));
		expect(await prisma.workoutOfMesocycle.count({ where: { workoutId: after.workoutId } })).toBe(1);
		// Block stats and the dashboard's block workouts hold only the linked ones
		const inBlock = await caller.mesocycles.findById(block.id);
		expect(inBlock?.workoutsOfMesocycle.map((row) => row.workoutId).sort()).toEqual(
			[before.workoutId, after.workoutId].sort()
		);
	});

	test('a paused block gives ordinary workouts: no block week or deload, and the data names the pauses', async () => {
		const { caller, block } = await seedPerson();
		// Week 6 would be a deload week: paused in week 1, a long time ago
		await prisma.mesocycle.update({ where: { id: block.id }, data: { startDate: new Date(Date.now() - 36 * DAY) } });
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - 30 * DAY) } });
		const today = await caller.workouts.getTodaysWorkoutData();
		expect(today.activeBlock?.mesocycle.pauses).toHaveLength(1);
		const exercises = await caller.workouts.getWorkoutExercisesWithPreviousData({
			userBodyweight: 80,
			routineName: 'Pull A',
			useActiveMesocycle: true,
			timeZone: SHANGHAI
		});
		expect(exercises.todaysWorkoutExercises).toHaveLength(1);
		// Not deload (it would halve the sets to 2)
		expect(exercises.todaysWorkoutExercises[0].sets.length).toBe(3);
	});

	test('a past workout keeps its week label after the block is paused later (the pauses come with it)', async () => {
		const { caller, block } = await seedPerson();
		const done = await caller.workouts.create(
			workoutOf({ blockId: block.id, startedAt: new Date(Date.now() - 6 * DAY) })
		);
		await caller.mesocycles.pause(block.id);
		const workout = await caller.workouts.findById(done.workoutId);
		const mesocycle = workout?.workoutOfMesocycle?.mesocycle;
		expect(mesocycle?.pauses).toHaveLength(1);
		const when = new Date(workout!.startedAt);
		expect(getBlockWeek(mesocycle!.startDate!, when, 'UTC', mesocycle!.pauses)).toBe(
			getBlockWeek(mesocycle!.startDate!, when, 'UTC')
		);
	});
});

test.describe('counts toward progression', () => {
	/** The last time as the suggestions show it, in kg */
	async function previousLoad(caller: ReturnType<typeof createCaller>) {
		const suggestion = await caller.workouts.suggestSets({
			exerciseName: rows.name,
			sets: 3,
			setType: rows.setType,
			repRangeStart: rows.repRangeStart,
			repRangeEnd: rows.repRangeEnd,
			weightUnit: 'KG',
			userBodyweight: 80,
			timeZone: SHANGHAI
		});
		return suggestion?.previous?.exercise.sets[0].load ?? null;
	}

	test('a workout switched off stays out of the suggestions and the Previous column, and the switch can be flipped back', async () => {
		const { caller } = await seedPerson();
		await caller.workouts.create(workoutOf({ startedAt: new Date(Date.now() - 5 * DAY), load: 40 }));
		const trainer = await caller.workouts.create(
			workoutOf({ startedAt: new Date(Date.now() - 2 * DAY), load: 60, countsForProgression: false })
		);
		expect(await previousLoad(caller)).toBe(40);
		// Still in the history list
		const row = await prisma.workout.findUniqueOrThrow({ where: { id: trainer.workoutId } });
		expect(row.countsForProgression).toBe(false);
		await caller.workouts.setCountsForProgression({ id: trainer.workoutId, countsForProgression: true });
		expect(await previousLoad(caller)).toBe(60);
		await caller.workouts.setCountsForProgression({ id: trainer.workoutId, countsForProgression: false });
		expect(await previousLoad(caller)).toBe(40);
	});

	test('a payload without the field saves as counting; only the owner can flip it', async () => {
		const { caller, other } = await seedPerson();
		const saved = await caller.workouts.create(workoutOf({ startedAt: new Date(Date.now() - DAY) }));
		expect((await prisma.workout.findUniqueOrThrow({ where: { id: saved.workoutId } })).countsForProgression).toBe(
			true
		);
		await expect(
			other.workouts.setCountsForProgression({ id: saved.workoutId, countsForProgression: false })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('editing a workout with the field absent (an older app) keeps what was saved; the field flips it both ways', async () => {
		const { caller } = await seedPerson();
		const startedAt = new Date(Date.now() - 3 * DAY);
		const created = await caller.workouts.create(workoutOf({ startedAt, countsForProgression: false }));
		const edit = (countsForProgression?: boolean) =>
			caller.workouts.editById({
				id: created.workoutId,
				data: workoutOf({ startedAt, countsForProgression }),
				endedAt: new Date(startedAt.getTime() + 3600000)
			});
		const saved = async () =>
			(await prisma.workout.findUniqueOrThrow({ where: { id: created.workoutId } })).countsForProgression;
		await edit(undefined);
		expect(await saved()).toBe(false);
		await edit(true);
		expect(await saved()).toBe(true);
		await edit(undefined);
		expect(await saved()).toBe(true);
		await edit(false);
		expect(await saved()).toBe(false);
	});

	test('a workout switched off still counts in the history procedure and the workout list', async () => {
		const { caller } = await seedPerson();
		const startedAt = new Date(Date.now() - DAY);
		await caller.workouts.create(workoutOf({ startedAt, countsForProgression: false }));
		const history = await caller.workouts.getExerciseHistory({ exerciseName: rows.name });
		expect(JSON.stringify(history)).toContain('Barbell rows');
		const list = await caller.workouts.load({});
		expect(list).toHaveLength(1);
		expect(list[0].countsForProgression).toBe(false);
	});
});
