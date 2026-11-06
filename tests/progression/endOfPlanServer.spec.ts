import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { endOfPlanBoundary, getBlockWeek, isBlockPaused } from '../../src/lib/utils/workoutUtils';
import { lifecycleTestHooks } from '../../src/lib/server/blockLifecycle';
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

	test('a workout already linked to a week after the plan ended keeps its stored rows exactly; only the label it shows is worked out again', async () => {
		const { caller, block } = await seedPerson();
		// Workouts saved (before this change) in what was then a Week 7 (9 days after the end) and a Week 3, each with
		// a note, exercises and sets, and linked to the block
		const save = async (startedAt: Date, note: string, countsForProgression: boolean) => {
			const { workoutId } = await caller.workouts.create({
				...workoutOf(block.id, startedAt, 'UTC'),
				workoutData: {
					userBodyweight: 81.5,
					routineName: 'Pull A',
					startedAt,
					note,
					countsForProgression
				}
			});
			// Linked as the old app did it, whatever the day
			await prisma.workoutOfMesocycle.create({ data: { workoutId, mesocycleId: block.id } });
			return workoutId;
		};
		const lateId = await save(new Date('2026-10-28T10:00:00Z'), 'a note on the late one', true);
		const earlyId = await save(new Date('2026-10-02T10:00:00Z'), 'a note on the early one', false);
		const snapshotOf = (id: string) =>
			prisma.workout.findUniqueOrThrow({
				where: { id },
				include: {
					workoutOfMesocycle: true,
					workoutExercises: {
						orderBy: { id: 'asc' },
						include: { sets: { orderBy: { id: 'asc' }, include: { miniSets: true } } }
					}
				}
			});
		const lateBefore = await snapshotOf(lateId);
		const earlyBefore = await snapshotOf(earlyId);
		expect(lateBefore.workoutOfMesocycle?.mesocycleId).toBe(block.id);
		expect(lateBefore.workoutExercises[0].sets).toHaveLength(1);
		const week = (at: Date, pauses: { pausedAt: Date; resumedAt: Date | null }[]) =>
			getBlockWeek(block.startDate!, at, 'UTC', pauses);
		expect(week(lateBefore.startedAt, [])).toBe(7);
		expect(week(earlyBefore.startedAt, [])).toBe(3);
		// (The saves above made the pause already: take it away, as the legacy block had none, and make it again)
		await prisma.mesocyclePause.deleteMany({ where: { mesocycleId: block.id } });
		expect(await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' })).toEqual({ created: true });
		const pauses = await pausesOf(block.id);
		// The one after the plan ended is at the end of it now; the one before keeps its week
		expect(week(lateBefore.startedAt, pauses)).toBe(6);
		expect(week(earlyBefore.startedAt, pauses)).toBe(3);
		// Every stored row of both is as it was: link, isDeload, countsForProgression, values, note, times, routine name
		expect(await snapshotOf(lateId)).toEqual(lateBefore);
		expect(await snapshotOf(earlyId)).toEqual(earlyBefore);
		expect(earlyBefore.countsForProgression).toBe(false);
		expect(lateBefore.note).toBe('a note on the late one');
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

test.describe('a workout save holds the block until the workout is written', () => {
	/** Holds a save still between the decision about its block and its write, and says when it has got there */
	function holdBeforeWrite() {
		let release!: () => void;
		const released = new Promise<void>((resolve) => (release = resolve));
		let reached!: () => void;
		const atHold = new Promise<void>((resolve) => (reached = resolve));
		lifecycleTestHooks.beforeWorkoutWrite = async () => {
			reached();
			await released;
		};
		return { release, atHold };
	}
	test.afterEach(() => {
		lifecycleTestHooks.beforeWorkoutWrite = undefined;
	});

	test('a Finish sent while a workout save is between deciding and writing waits, and the workout is written into the block first', async () => {
		const { caller, block } = await seedPerson({
			startedAt: new Date(Date.now() - 10 * DAY),
			weeklyRIR: [3, 2, 1, 0, -1]
		});
		const { release, atHold } = holdBeforeWrite();
		const saving = caller.workouts.create(workoutOf(block.id, new Date(Date.now() - 2 * DAY), 'UTC'));
		await atHold;
		let finished = false;
		const finishing = caller.mesocycles
			.progressToNextStage({ id: block.id, startDate: block.startDate, endDate: null })
			.then((result) => {
				finished = true;
				return result;
			});
		// The save has decided the workout is the block's and has not written it: the Finish cannot land here
		await new Promise((resolve) => setTimeout(resolve, 500));
		expect(finished).toBe(false);
		expect((await blockOf(block.id)).endDate).toBeNull();
		release();
		const { workoutId } = await saving;
		await finishing;
		// Written into the block, then the block finished: never a link onto a block finished in between
		expect(await prisma.workoutOfMesocycle.findFirst({ where: { workoutId, mesocycleId: block.id } })).not.toBeNull();
		expect((await blockOf(block.id)).endDate).not.toBeNull();
	});

	test('the same for an edit that moves a workout to another day', async () => {
		const { caller, block } = await seedPerson({
			startedAt: new Date(Date.now() - 10 * DAY),
			weeklyRIR: [3, 2, 1, 0, -1]
		});
		const { workoutId } = await caller.workouts.create(workoutOf(block.id, new Date(Date.now() - 3 * DAY), 'UTC'));
		const moved = new Date(Date.now() - 2 * DAY);
		const { release, atHold } = holdBeforeWrite();
		const editing = caller.workouts.editById({
			id: workoutId,
			data: workoutOf(block.id, moved, 'UTC'),
			endedAt: new Date(moved.getTime() + 3600000)
		});
		await atHold;
		let finished = false;
		const finishing = caller.mesocycles
			.progressToNextStage({ id: block.id, startDate: block.startDate, endDate: null })
			.then((result) => {
				finished = true;
				return result;
			});
		await new Promise((resolve) => setTimeout(resolve, 500));
		expect(finished).toBe(false);
		release();
		await editing;
		await finishing;
		expect(await prisma.workoutOfMesocycle.findFirst({ where: { workoutId, mesocycleId: block.id } })).not.toBeNull();
		expect((await blockOf(block.id)).endDate).not.toBeNull();
	});

	test('a save that fails writes nothing, and makes no pause either', async () => {
		const { caller, block } = await seedPerson();
		lifecycleTestHooks.beforeWorkoutWrite = async () => {
			throw new Error('the write failed');
		};
		await expect(
			caller.workouts.create(workoutOf(block.id, new Date('2026-10-25T10:00:00Z'), 'UTC'))
		).rejects.toThrow();
		expect(await pausesOf(block.id)).toHaveLength(0);
		expect(await prisma.workout.count({ where: { userId: block.userId } })).toBe(0);
	});
});

test.describe('Finish, Save and manual pauses together', () => {
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

	test('Finish and a Save at once: the block ends with nothing left open, and no Save lands on a finished block', async () => {
		const { caller, block } = await seedPerson();
		const results = await Promise.allSettled([
			caller.mesocycles.progressToNextStage({ id: block.id, startDate: block.startDate, endDate: null }),
			caller.mesocycles.editById({ id: block.id, timeZone: 'UTC', mesocycleData: settingsOf(block, [...PLAN, 1]) })
		]);
		expect(results[0].status).toBe('fulfilled');
		const saved = await blockOf(block.id);
		expect(saved.endDate).not.toBeNull();
		expect((await pausesOf(block.id)).filter((pause) => pause.resumedAt === null)).toHaveLength(0);
		// Either the Save went first (the plan has its extra week) or it was refused: never half of one
		expect([PLAN.length, PLAN.length + 1]).toContain(saved.weeklyRIR.length);
		if (results[1].status === 'rejected') expect(saved.weeklyRIR).toEqual(PLAN);
		// A Save after Finish is refused for certain
		await expect(
			caller.mesocycles.editById({ id: block.id, timeZone: 'UTC', mesocycleData: settingsOf(block, [...PLAN, 0, 0]) })
		).rejects.toThrow(/finished mesocycle cannot be changed/);
	});

	test('a block paused by hand locks the week it was paused in, and the weeks before it', async () => {
		// Day 20 (Week 3), paused two days ago on day 18
		const { caller, block } = await seedPerson({
			startedAt: new Date(Date.now() - 20 * DAY),
			weeklyRIR: [3, 2, 1, 0, -1]
		});
		await prisma.mesocyclePause.create({ data: { mesocycleId: block.id, pausedAt: new Date(Date.now() - 2 * DAY) } });
		const edit = (weeklyRIR: number[]) =>
			caller.mesocycles.editById({ id: block.id, timeZone: 'UTC', mesocycleData: settingsOf(block, weeklyRIR) });
		await expect(edit([3, 2, 0, 0, -1])).rejects.toThrow(/Weeks 1 to 3/);
		await edit([3, 2, 1, 4, 4, 4]);
		expect((await blockOf(block.id)).weeklyRIR).toEqual([3, 2, 1, 4, 4, 4]);
		// Still paused by hand: saving does not resume it
		expect((await pausesOf(block.id)).map((pause) => pause.resumedAt)).toEqual([null]);
	});

	test('editing a workout from the block to a start after the plan ended keeps its link, and does not fail', async () => {
		const { caller, block } = await seedPerson();
		const { workoutId } = await caller.workouts.create(workoutOf(block.id, new Date('2026-10-05T10:00:00Z'), 'UTC'));
		const later = new Date('2026-10-26T10:00:00Z');
		await caller.workouts.editById({
			id: workoutId,
			data: workoutOf(block.id, later, 'UTC'),
			endedAt: new Date(later.getTime() + 3600000)
		});
		expect(await prisma.workoutOfMesocycle.findFirst({ where: { workoutId } })).not.toBeNull();
		expect(await pausesOf(block.id)).toHaveLength(1);
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

test.describe('Start and Finish read the block, not the screen', () => {
	const startedAndFinished = async () => {
		const { caller, block, userId } = await seedPerson({ startedAt: null });
		const started = await caller.mesocycles.progressToNextStage({ id: block.id, startDate: null, endDate: null });
		const finished = await caller.mesocycles.progressToNextStage({
			id: block.id,
			startDate: started.startDate,
			endDate: null,
			openPauseId: null
		});
		return { caller, block, userId, started, finished };
	};

	test('a Start from a screen that saw the block unused, after another device started and finished it, changes nothing and reattaches no routines', async () => {
		const { caller, block, finished } = await startedAndFinished();
		const before = await blockOf(block.id);
		expect(before.endDate).not.toBeNull();
		expect(before.exerciseSplitId).toBeNull();
		await expect(
			caller.mesocycles.progressToNextStage({ id: block.id, startDate: null, endDate: null })
		).rejects.toThrow(/changed on another device/);
		const after = await blockOf(block.id);
		expect(after.startDate?.toISOString()).toBe(before.startDate?.toISOString());
		expect(after.endDate?.toISOString()).toBe(finished.endDate?.toISOString());
		expect(after.exerciseSplitId).toBeNull();
	});

	test('a Start from a screen that saw the block unused, after another device only started it, is refused and the start date stays', async () => {
		const { caller, block } = await seedPerson({ startedAt: null });
		const first = await caller.mesocycles.progressToNextStage({ id: block.id, startDate: null, endDate: null });
		await expect(
			caller.mesocycles.progressToNextStage({ id: block.id, startDate: null, endDate: null })
		).rejects.toThrow(/changed on another device/);
		expect((await blockOf(block.id)).startDate?.toISOString()).toBe(first.startDate?.toISOString());
	});

	test('a repeated or old Finish is refused and the first end date stays (the old screen saw no pause, and still says so)', async () => {
		const { caller, block, started, finished } = await startedAndFinished();
		for (const openPauseId of [null, undefined]) {
			await expect(
				caller.mesocycles.progressToNextStage({
					id: block.id,
					startDate: started.startDate,
					endDate: null,
					openPauseId
				})
			).rejects.toThrow(/changed on another device/);
		}
		expect((await blockOf(block.id)).endDate?.toISOString()).toBe(finished.endDate?.toISOString());
	});

	test('a Finish for a block that was never started is refused', async () => {
		const { caller, block } = await seedPerson({ startedAt: null });
		await expect(
			caller.mesocycles.progressToNextStage({ id: block.id, startDate: new Date(), endDate: null, openPauseId: null })
		).rejects.toThrow(/changed on another device/);
		const after = await blockOf(block.id);
		expect([after.startDate, after.endDate]).toEqual([null, null]);
	});

	test('two Finishes at once: one ends the block, the other is refused, and the end date is the first one', async () => {
		const { caller, block } = await seedPerson();
		const finish = () =>
			caller.mesocycles.progressToNextStage({
				id: block.id,
				startDate: block.startDate,
				endDate: null,
				timeZone: 'UTC'
			});
		const results = await Promise.allSettled([finish(), finish()]);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		const winner = results.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<
			Awaited<ReturnType<typeof finish>>
		>;
		expect((await blockOf(block.id)).endDate?.toISOString()).toBe(winner.value.endDate?.toISOString());
		expect((await pausesOf(block.id)).filter((pause) => pause.resumedAt === null)).toHaveLength(0);
	});

	test("someone else's block is not found", async () => {
		const { block } = await seedPerson({ startedAt: null });
		const { caller: other } = await seedPerson();
		await expect(
			other.mesocycles.progressToNextStage({ id: block.id, startDate: null, endDate: null })
		).rejects.toThrow(/not found/i);
	});
});

test.describe("a workout is the block's only if it began inside the block", () => {
	const linked = async (workoutId: string) =>
		(await prisma.workoutOfMesocycle.findFirst({ where: { workoutId } })) !== null;

	test("at the Finish instant and after it: ordinary; during the pause: ordinary; before Finish, saved late: the block's", async () => {
		const { caller, block } = await seedPerson();
		await caller.mesocycles.reconcileEndOfPlan({ timeZone: 'UTC' });
		const { endDate } = await caller.mesocycles.progressToNextStage({
			id: block.id,
			startDate: block.startDate,
			endDate: null,
			timeZone: 'UTC'
		});
		expect(endDate).not.toBeNull();
		const end = endDate!;
		const save = async (startedAt: Date) =>
			(await caller.workouts.create(workoutOf(block.id, startedAt, 'UTC'))).workoutId;
		expect(await linked(await save(end))).toBe(false);
		expect(await linked(await save(new Date(end.getTime() + 3600000)))).toBe(false);
		// Inside the pause the plan's end left, before Finish
		expect(await linked(await save(new Date('2026-10-25T10:00:00Z')))).toBe(false);
		// Began in the deload week, saved after Finish
		const late = await save(new Date('2026-10-15T10:00:00Z'));
		expect(await linked(late)).toBe(true);
		expect((await prisma.workout.findUniqueOrThrow({ where: { id: late } })).isDeload).toBe(true);
		// Nothing about the block moved
		expect((await blockOf(block.id)).endDate?.toISOString()).toBe(end.toISOString());
	});

	test('before the block started, or on a block never started: ordinary', async () => {
		const { caller, block } = await seedPerson();
		const early = await caller.workouts.create(workoutOf(block.id, new Date(OLD_START.getTime() - DAY), 'UTC'));
		expect(await linked(early.workoutId)).toBe(false);
		const exactly = await caller.workouts.create(workoutOf(block.id, OLD_START, 'UTC'));
		expect(await linked(exactly.workoutId)).toBe(true);
		const unused = await seedPerson({ startedAt: null });
		const unusedSave = await unused.caller.workouts.create(workoutOf(unused.block.id, new Date(), 'UTC'));
		expect(await linked(unusedSave.workoutId)).toBe(false);
	});

	test('a screen that still shows the block running, after another device finished it: the workout is not linked', async () => {
		const { caller, block } = await seedPerson({
			startedAt: new Date(Date.now() - 10 * DAY),
			weeklyRIR: [3, 2, 1, 0, -1]
		});
		await caller.mesocycles.progressToNextStage({ id: block.id, startDate: block.startDate, endDate: null });
		const { workoutId } = await caller.workouts.create(workoutOf(block.id, new Date(Date.now() + 60000), 'UTC'));
		expect(await linked(workoutId)).toBe(false);
	});

	// A block finished before this release, never paused where its plan ended (planned weeks ran Sep 14 to Oct 19)
	const legacyFinished = (endDate: Date) => seedPerson({ endDate });

	test("a finished block that was never paused at its plan end: a new save after that place is ordinary, before it the block's", async () => {
		const { caller, block } = await legacyFinished(new Date('2026-11-01T00:00:00Z'));
		expect(await pausesOf(block.id)).toHaveLength(0);
		const before = await caller.workouts.create(workoutOf(block.id, new Date('2026-10-15T10:00:00Z'), 'UTC'));
		const after = await caller.workouts.create(workoutOf(block.id, new Date('2026-10-25T10:00:00Z'), 'UTC'));
		expect(await linked(before.workoutId)).toBe(true);
		expect(await linked(after.workoutId)).toBe(false);
		// Nothing is written to a finished block to decide it
		expect(await pausesOf(block.id)).toHaveLength(0);
	});

	test('editing a start keeps the link whatever the bounds say, and the deload comes from the calendar', async () => {
		// Finished mid-way through the deload week (Oct 14); Oct 16 is after it
		const { caller, block } = await legacyFinished(new Date('2026-10-14T00:00:00Z'));
		const { workoutId } = await caller.workouts.create(workoutOf(block.id, new Date('2026-10-05T10:00:00Z'), 'UTC'));
		expect(await linked(workoutId)).toBe(true);
		const later = new Date('2026-10-16T10:00:00Z');
		await caller.workouts.editById({
			id: workoutId,
			data: workoutOf(block.id, later, 'UTC'),
			endedAt: new Date(later.getTime() + 3600000)
		});
		expect(await linked(workoutId)).toBe(true);
		const saved = await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } });
		const stored = await blockOf(block.id);
		// Oct 16 is in Week 5, the deload week, by the calendar: not forced off because it is after the end
		expect(saved.isDeload).toBe(true);
		expect(getBlockWeek(stored.startDate!, later, 'UTC', [])).toBe(5);
		// And moved past the place the plan ended: still linked, the calendar still decides
		const muchLater = new Date('2026-10-26T10:00:00Z');
		await caller.workouts.editById({
			id: workoutId,
			data: workoutOf(block.id, muchLater, 'UTC'),
			endedAt: new Date(muchLater.getTime() + 3600000)
		});
		expect(await linked(workoutId)).toBe(true);
	});
});
