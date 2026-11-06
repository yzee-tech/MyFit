import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { endOfPlanBoundary, getBlockWeek, isBlockPaused } from '../../src/lib/utils/workoutUtils';
import { deleteTestUsers } from '../deleteTestUsers';

/**
 * A block that has run all its planned weeks pauses itself where its plan ended (never finishes by itself), on
 * the first step that names the phone's timezone or changes the block; a workout started after that is not part
 * of the block; an edit never changes a past or current week; Resume waits for another week
 */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

const DAY = 24 * 60 * 60 * 1000;
const SHANGHAI = 'Asia/Shanghai';
const rows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};
// A 5-week block (week 5 a deload) that started on Mon Sep 14 at 10:00 UTC: its plan ended at 00:00 UTC on Mon Oct 19,
// long before now
const OLD_START = new Date('2026-09-14T10:00:00Z');
const OLD_END = new Date('2026-10-19T00:00:00Z');
const PLAN = [3, 2, 1, 0, -1];

async function seedPerson(options: { startedAt?: Date | null; weeklyRIR?: number[]; endDate?: Date | null } = {}) {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `end-plan-${userId}@myfit.com` } });
	const caller = createCaller({ event: {} as never, userId });
	await prisma.exercise.create({ data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup } });
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...rows, exerciseIndex: 0, sets: 3 }]]
	});
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Block',
			weeklyRIR: options.weeklyRIR ?? PLAN,
			startDate: options.startedAt === undefined ? OLD_START : options.startedAt,
			endDate: options.endDate ?? null,
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	return { userId, caller, block };
}

const pausesOf = (mesocycleId: string) =>
	prisma.mesocyclePause.findMany({ where: { mesocycleId }, orderBy: { pausedAt: 'asc' } });
const blockOf = (id: string) => prisma.mesocycle.findUniqueOrThrow({ where: { id } });

function workoutOf(blockId: string, startedAt: Date, timeZone?: string) {
	return {
		...(timeZone === undefined ? {} : { timeZone }),
		workoutData: {
			userBodyweight: 80,
			routineName: 'Pull A',
			startedAt,
			workoutOfMesocycle: { mesocycle: { id: blockId } }
		},
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]]
	};
}

test.describe('the pause that ends a plan', () => {
	test('is made where the plan ended, not when it was noticed; the block is not finished and its plan is untouched', async () => {
		const { caller, block } = await seedPerson();
		expect(await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: true });
		const pauses = await pausesOf(block.id);
		expect(pauses).toHaveLength(1);
		expect(pauses[0].pausedAt.toISOString()).toBe(OLD_END.toISOString());
		expect(pauses[0].resumedAt).toBeNull();
		const after = await blockOf(block.id);
		expect(after.endDate).toBeNull();
		expect(after.weeklyRIR).toEqual(PLAN);
		// Weeks later it is still at the end of its plan: Week 6 of a 5-week block, frozen
		expect(getBlockWeek(after.startDate!, new Date(), 'UTC', pauses)).toBe(6);
		expect(isBlockPaused(pauses)).toBe(true);
		// Again does nothing
		expect(await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: false });
		expect(await pausesOf(block.id)).toHaveLength(1);
	});

	test("the day is the request's: Shanghai's midnight, else UTC's", async () => {
		const shanghai = await seedPerson();
		await shanghai.caller.mesocycles.reconcileEndOfPlan({ timeZone: SHANGHAI });
		expect((await pausesOf(shanghai.block.id))[0].pausedAt.toISOString()).toBe(
			endOfPlanBoundary(OLD_START, [], 5, SHANGHAI)!.toISOString()
		);
		const none = await seedPerson();
		await none.caller.mesocycles.reconcileEndOfPlan({});
		expect((await pausesOf(none.block.id))[0].pausedAt.toISOString()).toBe(OLD_END.toISOString());
	});

	test('earlier closed pauses are taken out: the plan ends later by the days paused', async () => {
		const { caller, block } = await seedPerson();
		// Three midnights paused, long ago
		await prisma.mesocyclePause.create({
			data: {
				mesocycleId: block.id,
				pausedAt: new Date('2026-09-22T22:00:00Z'),
				resumedAt: new Date('2026-09-25T08:00:00Z')
			}
		});
		await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' });
		const pauses = await pausesOf(block.id);
		expect(pauses).toHaveLength(2);
		expect(pauses[1].pausedAt.toISOString()).toBe(new Date(OLD_END.getTime() + 3 * DAY).toISOString());
	});

	test('a block that is running, unused, finished or already paused is left alone', async () => {
		const running = await seedPerson({ startedAt: new Date(Date.now() - 10 * DAY) });
		expect(await running.caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: false });
		expect(await pausesOf(running.block.id)).toHaveLength(0);

		const unused = await seedPerson({ startedAt: null });
		expect(await unused.caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: false });

		const finished = await seedPerson({ endDate: new Date('2026-10-25T00:00:00Z') });
		expect(await finished.caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: false });
		expect(await pausesOf(finished.block.id)).toHaveLength(0);

		const manual = await seedPerson();
		const manualPause = await prisma.mesocyclePause.create({
			data: { mesocycleId: manual.block.id, pausedAt: new Date('2026-10-02T12:00:00Z') }
		});
		expect(await manual.caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: false });
		const pauses = await pausesOf(manual.block.id);
		expect(pauses.map((pause) => pause.id)).toEqual([manualPause.id]);
	});

	test('a pause made by hand after the plan ended is kept: no second pause overlaps it', async () => {
		const { caller, block } = await seedPerson();
		await prisma.mesocyclePause.create({
			data: {
				mesocycleId: block.id,
				pausedAt: new Date('2026-10-21T12:00:00Z'),
				resumedAt: new Date('2026-10-22T12:00:00Z')
			}
		});
		expect(await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: false });
		expect(await pausesOf(block.id)).toHaveLength(1);
	});

	test('a read that names no timezone does not make it; one that names it does; so does a manual Pause', async () => {
		const { caller, block } = await seedPerson();
		await caller.workouts.getTodaysWorkoutData();
		await caller.workouts.getTodaysWorkoutData(undefined);
		expect(await pausesOf(block.id)).toHaveLength(0);
		await caller.workouts.getTodaysWorkoutData({ timeZone: SHANGHAI });
		expect(await pausesOf(block.id)).toHaveLength(1);

		const other = await seedPerson();
		const message = await other.caller.mesocycles.pause({ id: other.block.id, timeZone: 'UTC' });
		// Paused where the plan ended, not now, and not twice
		expect(message).toEqual({ message: 'Mesocycle already paused' });
		const pauses = await pausesOf(other.block.id);
		expect(pauses).toHaveLength(1);
		expect(pauses[0].pausedAt.toISOString()).toBe(OLD_END.toISOString());
	});

	test('many steps at once make exactly one pause', async () => {
		const { caller, block } = await seedPerson();
		await Promise.all([
			caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' }),
			caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' }),
			caller.mesocycles.pause({ id: block.id, timeZone: 'UTC' }),
			caller.workouts.create(workoutOf(block.id, new Date('2026-10-05T10:00:00Z'), 'UTC')),
			caller.mesocycles.editById({
				id: block.id,
				timeZone: 'UTC',
				mesocycleData: {
					mesocycle: { ...(({ id, userId, exerciseSplitId, ...rest }) => rest)(block), weeklyRIR: [...PLAN, 1] },
					mesocycleCyclicSetChanges: []
				}
			})
		]);
		const pauses = await pausesOf(block.id);
		expect(pauses).toHaveLength(1);
		expect(pauses[0].pausedAt.toISOString()).toBe(OLD_END.toISOString());
	});

	test('Finish closes it with the block; nothing is left open and it is not made again', async () => {
		const { caller, block } = await seedPerson();
		await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' });
		const [open] = await pausesOf(block.id);
		const { endDate } = await caller.mesocycles.progressToNextStage({
			id: block.id,
			startDate: block.startDate,
			endDate: null,
			openPauseId: open.id
		});
		expect(endDate).not.toBeNull();
		const pauses = await pausesOf(block.id);
		expect(pauses).toHaveLength(1);
		expect(pauses[0].resumedAt).not.toBeNull();
		expect(await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: false });
		expect(await pausesOf(block.id)).toHaveLength(1);
	});
});

test.describe('a workout saved after the plan ended', () => {
	test('started after it is an ordinary workout (and the pause is there); started before it keeps its block and week', async () => {
		const { caller, block } = await seedPerson();
		// Week 5 is the deload week: Oct 12 to Oct 18
		const before = await caller.workouts.create(workoutOf(block.id, new Date('2026-10-15T10:00:00Z'), 'UTC'));
		const after = await caller.workouts.create(workoutOf(block.id, new Date('2026-10-25T10:00:00Z'), 'UTC'));
		const inBlock = (id: string) => prisma.workoutOfMesocycle.findFirst({ where: { workoutId: id } });
		expect(await inBlock(before.workoutId)).not.toBeNull();
		expect(await inBlock(after.workoutId)).toBeNull();
		expect((await prisma.workout.findUniqueOrThrow({ where: { id: before.workoutId } })).isDeload).toBe(true);
		const pauses = await pausesOf(block.id);
		expect(pauses).toHaveLength(1);
		expect(pauses[0].pausedAt.toISOString()).toBe(OLD_END.toISOString());
		// A workout started at the very moment the plan ended is inside the pause: not the block's
		const atBoundary = await caller.workouts.create(workoutOf(block.id, OLD_END, 'UTC'));
		expect(await inBlock(atBoundary.workoutId)).toBeNull();
		// One started a moment before it is
		const justBefore = await caller.workouts.create(workoutOf(block.id, new Date(OLD_END.getTime() - 1000), 'UTC'));
		expect(await inBlock(justBefore.workoutId)).not.toBeNull();
	});

	test("the very first step being the save of a workout started after the plan ended: it is not the block's", async () => {
		const { caller, block } = await seedPerson();
		expect(await pausesOf(block.id)).toHaveLength(0);
		const { workoutId } = await caller.workouts.create(workoutOf(block.id, new Date('2026-10-25T10:00:00Z'), 'UTC'));
		expect(await prisma.workoutOfMesocycle.findFirst({ where: { workoutId } })).toBeNull();
		const pauses = await pausesOf(block.id);
		expect(pauses).toHaveLength(1);
		expect(pauses[0].pausedAt.toISOString()).toBe(OLD_END.toISOString());
	});

	test('a workout already linked to a week after the plan ended keeps its link; only the label it shows is worked out again', async () => {
		const { caller, block } = await seedPerson();
		// Saved (before this change) in what was then a Week 7, 9 days after the end
		const late = await prisma.workout.create({
			data: {
				userId: block.userId,
				startedAt: new Date('2026-10-28T10:00:00Z'),
				endedAt: new Date('2026-10-28T11:00:00Z'),
				routineName: 'Pull A',
				userBodyweight: 80,
				isDeload: false,
				countsForProgression: true,
				workoutOfMesocycle: { create: { mesocycleId: block.id } }
			}
		});
		const early = await prisma.workout.create({
			data: {
				userId: block.userId,
				startedAt: new Date('2026-10-02T10:00:00Z'),
				endedAt: new Date('2026-10-02T11:00:00Z'),
				routineName: 'Pull A',
				userBodyweight: 80,
				isDeload: false,
				countsForProgression: true,
				workoutOfMesocycle: { create: { mesocycleId: block.id } }
			}
		});
		const week = (at: Date, pauses: { pausedAt: Date; resumedAt: Date | null }[]) =>
			getBlockWeek(block.startDate!, at, 'UTC', pauses);
		expect(week(late.startedAt, [])).toBe(7);
		expect(week(early.startedAt, [])).toBe(3);
		await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' });
		const pauses = await pausesOf(block.id);
		// The one after the plan ended is at the end of it now; the one before keeps its week
		expect(week(late.startedAt, pauses)).toBe(6);
		expect(week(early.startedAt, pauses)).toBe(3);
		// Nothing about either workout was rewritten
		for (const workout of [late, early]) {
			const saved = await prisma.workout.findUniqueOrThrow({
				where: { id: workout.id },
				include: { workoutOfMesocycle: true }
			});
			expect(saved.workoutOfMesocycle?.mesocycleId).toBe(block.id);
			expect(saved.isDeload).toBe(false);
			expect(saved.countsForProgression).toBe(true);
		}
	});
});

test.describe('editing a block', () => {
	const settingsOf = (block: Awaited<ReturnType<typeof blockOf>>, weeklyRIR: number[]) => ({
		mesocycle: {
			name: block.name,
			weeklyRIR,
			startOverloadPercentage: block.startOverloadPercentage,
			lastSetToFailure: block.lastSetToFailure,
			forceRIRMatching: block.forceRIRMatching
		},
		mesocycleCyclicSetChanges: []
	});
	// In Week 3 now (day 16 of the block, counted in UTC days)
	const inWeekThree = () =>
		seedPerson({ startedAt: new Date(Date.now() - 16 * DAY), weeklyRIR: [3, 2, 1, 0, -1, 2, 1] });

	test('weeks 1 to 3 of a block in Week 3 cannot be changed or removed; later weeks can', async () => {
		const { caller, block } = await inWeekThree();
		const edit = (weeklyRIR: number[]) =>
			caller.mesocycles.editById({ id: block.id, timeZone: 'UTC', mesocycleData: settingsOf(block, weeklyRIR) });
		await expect(edit([4, 2, 1, 0, -1, 2, 1])).rejects.toThrow(/Weeks 1 to 3 are past or in progress/);
		await expect(edit([3, 2, 0, 0, -1, 2, 1])).rejects.toThrow(/can't be changed or removed/);
		await expect(edit([3, 2])).rejects.toThrow(/Weeks 1 to 3/);
		// Nothing was saved by the refused edits
		expect((await blockOf(block.id)).weeklyRIR).toEqual([3, 2, 1, 0, -1, 2, 1]);
		// Weeks 4 on can be changed, added and removed
		await edit([3, 2, 1, 3, 3, 2, 1, 0]);
		expect((await blockOf(block.id)).weeklyRIR).toEqual([3, 2, 1, 3, 3, 2, 1, 0]);
		await edit([3, 2, 1]);
		expect((await blockOf(block.id)).weeklyRIR).toEqual([3, 2, 1]);
	});

	test('the name and settings can be changed whatever the weeks', async () => {
		const { caller, block } = await inWeekThree();
		const edit = settingsOf(block, [3, 2, 1, 0, -1, 2, 1]);
		await caller.mesocycles.editById({
			id: block.id,
			timeZone: 'UTC',
			mesocycleData: { ...edit, mesocycle: { ...edit.mesocycle, name: 'Renamed', startOverloadPercentage: 5 } }
		});
		const saved = await blockOf(block.id);
		expect([saved.name, saved.startOverloadPercentage]).toEqual(['Renamed', 5]);
	});

	test('an unused block is free to change; a finished block cannot be changed; 52 weeks is the most', async () => {
		const unused = await seedPerson({ startedAt: null });
		await unused.caller.mesocycles.editById({
			id: unused.block.id,
			mesocycleData: settingsOf(unused.block, [1, 1, 1])
		});
		expect((await blockOf(unused.block.id)).weeklyRIR).toEqual([1, 1, 1]);
		await unused.caller.mesocycles.editById({
			id: unused.block.id,
			mesocycleData: settingsOf(unused.block, Array(52).fill(2))
		});
		await expect(
			unused.caller.mesocycles.editById({
				id: unused.block.id,
				mesocycleData: settingsOf(unused.block, Array(53).fill(2))
			})
		).rejects.toThrow();
		await expect(
			unused.caller.mesocycles.editById({ id: unused.block.id, mesocycleData: settingsOf(unused.block, []) })
		).rejects.toThrow();

		const finished = await seedPerson({ endDate: new Date('2026-10-25T00:00:00Z') });
		await expect(
			finished.caller.mesocycles.editById({
				id: finished.block.id,
				mesocycleData: settingsOf(finished.block, [...PLAN, 1])
			})
		).rejects.toThrow(/finished mesocycle cannot be changed/);
		expect((await blockOf(finished.block.id)).weeklyRIR).toEqual(PLAN);
	});

	test("one person's block is not another's to change", async () => {
		const { block } = await seedPerson({ startedAt: null });
		const stranger = createCaller({ event: {} as never, userId: createId() });
		await expect(
			stranger.mesocycles.editById({ id: block.id, mesocycleData: settingsOf(block, [1, 1]) })
		).rejects.toThrow();
		expect((await blockOf(block.id)).weeklyRIR).toEqual(PLAN);
	});

	test('a block paused at the end of its plan: add weeks and save, again and again; the pause stays open; the planned weeks stay locked', async () => {
		const { caller, block } = await seedPerson();
		const edit = (weeklyRIR: number[]) =>
			caller.mesocycles.editById({ id: block.id, timeZone: 'UTC', mesocycleData: settingsOf(block, weeklyRIR) });
		// The first step makes the pause where the plan ended, then the edit is judged against it
		await edit([...PLAN, -1]);
		let pauses = await pausesOf(block.id);
		expect(pauses).toHaveLength(1);
		expect(pauses[0].resumedAt).toBeNull();
		expect((await blockOf(block.id)).weeklyRIR).toEqual([...PLAN, -1]);
		// Week 6 can still be changed after the save, and a Week 7 added
		await edit([...PLAN, 1]);
		await edit([...PLAN, 1, 0]);
		expect((await blockOf(block.id)).weeklyRIR).toEqual([...PLAN, 1, 0]);
		// The five planned weeks stay as they were
		await expect(edit([3, 2, 1, 0, 0, 1, 0])).rejects.toThrow(/Weeks 1 to 5/);
		await expect(edit([3, 2, 1, 0])).rejects.toThrow(/Weeks 1 to 5/);
		// The added weeks can be removed again, back to the plan
		await edit(PLAN);
		expect((await blockOf(block.id)).weeklyRIR).toEqual(PLAN);
		pauses = await pausesOf(block.id);
		// Still one pause, still open: saving never resumes
		expect(pauses).toHaveLength(1);
		expect(pauses[0].resumedAt).toBeNull();
	});
});

test.describe('Resume and Finish', () => {
	test('a block at the end of its plan is not resumed until it has another week; then it is, and Week 6 is current', async () => {
		const { caller, block } = await seedPerson();
		await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' });
		const [open] = await pausesOf(block.id);
		await expect(caller.mesocycles.resume({ id: block.id, timeZone: 'UTC', openPauseId: open.id })).rejects.toThrow(
			/Extend it with another week first, or finish it/
		);
		// Still paused, and the string form an older app sends is refused the same way
		await expect(caller.mesocycles.resume(block.id)).rejects.toThrow(/planned weeks/);
		expect((await pausesOf(block.id))[0].resumedAt).toBeNull();

		await caller.mesocycles.editById({
			id: block.id,
			timeZone: 'UTC',
			mesocycleData: {
				mesocycle: {
					name: block.name,
					weeklyRIR: [...PLAN, 1],
					startOverloadPercentage: block.startOverloadPercentage,
					lastSetToFailure: block.lastSetToFailure,
					forceRIRMatching: block.forceRIRMatching
				},
				mesocycleCyclicSetChanges: []
			}
		});
		// Saving did not resume it
		expect((await pausesOf(block.id))[0].resumedAt).toBeNull();
		expect(await caller.mesocycles.resume({ id: block.id, timeZone: 'UTC', openPauseId: open.id })).toEqual({
			message: 'Mesocycle resumed'
		});
		const pauses = await pausesOf(block.id);
		expect(pauses[0].resumedAt).not.toBeNull();
		// Resumed now: Week 6, the added week, is the week it is in
		const week = getBlockWeek(block.startDate!, new Date(), 'UTC', pauses);
		expect(week).toBe(6);
	});

	test('a tap from an old screen is refused: the pause it saw is not the one open', async () => {
		const { caller, block } = await seedPerson({ startedAt: new Date(Date.now() - 10 * DAY) });
		await caller.mesocycles.pause(block.id);
		const [first] = await pausesOf(block.id);
		await caller.mesocycles.resume({ id: block.id, openPauseId: first.id });
		await caller.mesocycles.pause(block.id);
		const second = (await pausesOf(block.id)).find((pause) => pause.resumedAt === null)!;
		expect(second.id).not.toBe(first.id);
		// An old screen still showing the first pause open
		await expect(caller.mesocycles.resume({ id: block.id, openPauseId: first.id })).rejects.toThrow(
			/changed on another device/
		);
		// A screen that saw it unpaused cannot resume or finish it either
		await expect(caller.mesocycles.resume({ id: block.id, openPauseId: null })).rejects.toThrow(
			/changed on another device/
		);
		await expect(
			caller.mesocycles.progressToNextStage({
				id: block.id,
				startDate: block.startDate,
				endDate: null,
				openPauseId: first.id
			})
		).rejects.toThrow(/changed on another device/);
		expect((await blockOf(block.id)).endDate).toBeNull();
		expect((await pausesOf(block.id)).find((pause) => pause.id === second.id)?.resumedAt).toBeNull();
		// The right one works; the string form an older app sends still works
		await caller.mesocycles.resume({ id: block.id, openPauseId: second.id });
		expect((await pausesOf(block.id)).every((pause) => pause.resumedAt !== null)).toBe(true);
		await caller.mesocycles.pause(block.id);
		await caller.mesocycles.resume(block.id);
		await caller.mesocycles.progressToNextStage({ id: block.id, startDate: block.startDate, endDate: null });
		expect((await blockOf(block.id)).endDate).not.toBeNull();
	});
});
