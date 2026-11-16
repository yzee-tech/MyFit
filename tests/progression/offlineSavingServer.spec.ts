import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { createWorkoutSchema } from '../../src/lib/trpc/routes/workouts';
import { deleteTestUsers } from '../deleteTestUsers';
import { mesocycleDefaults, pullRows as rows } from '../support/blocks';

/**
 * A workout saved with no signal is sent later with its own id (clientId): sending it twice saves it once,
 * another account's id is refused, a block that is gone by then is told apart from a live save, and the
 * phone's end time stands however late it is sent
 */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function newPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `offline-${userId}@myfit.com` } });
	await prisma.exercise.create({ data: { userId, name: rows.name, targetMuscleGroup: rows.targetMuscleGroup } });
	return { userId, caller: createCaller({ event: {} as never, userId }) };
}

/** A workout of one set of rows, `extra` on top (a clientId, a block...) */
function request(startedAt: Date, extra: Record<string, unknown> = {}, workoutData: Record<string, unknown> = {}) {
	return {
		workoutData: { userBodyweight: 80, routineName: 'Pull A', startedAt, ...workoutData },
		workoutExercises: [{ ...rows, exerciseIndex: 0 }],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[]]],
		...extra
	};
}

const workoutsOf = (userId: string) => prisma.workout.findMany({ where: { userId }, orderBy: { startedAt: 'asc' } });

test('the same workout sent twice is saved once, and the second answer says so', async () => {
	const { userId, caller } = await newPerson();
	const clientId = createId();
	const first = await caller.workouts.create(request(new Date(Date.now() - HOUR), { clientId }));
	expect(first).toMatchObject({ workoutId: clientId, alreadySaved: false, savedOutsideBlock: false });
	// Sent again (its answer was lost): nothing is written, and what the second request says changes nothing
	const second = await caller.workouts.create(
		request(new Date(Date.now() - 2 * HOUR), { clientId }, { userBodyweight: 99 })
	);
	expect(second).toMatchObject({ workoutId: clientId, alreadySaved: true });
	const saved = await workoutsOf(userId);
	expect(saved.map((workout) => workout.id)).toEqual([clientId]);
	expect(saved[0].userBodyweight).toBe(80);
	expect(await prisma.workoutExercise.count({ where: { workoutId: clientId } })).toBe(1);
	expect(await prisma.workoutExerciseSet.count({ where: { workoutExercise: { workoutId: clientId } } })).toBe(1);
});

test('two sends of one workout at the same moment save it once', async () => {
	const { userId, caller } = await newPerson();
	const clientId = createId();
	const results = await Promise.all([
		caller.workouts.create(request(new Date(Date.now() - HOUR), { clientId })),
		caller.workouts.create(request(new Date(Date.now() - HOUR), { clientId }))
	]);
	// One wrote it; the other found it saved (and neither failed)
	expect(results.map((result) => result.workoutId)).toEqual([clientId, clientId]);
	expect(results.filter((result) => result.alreadySaved)).toHaveLength(1);
	expect((await workoutsOf(userId)).map((workout) => workout.id)).toEqual([clientId]);
	expect(await prisma.workoutExerciseSet.count({ where: { workoutExercise: { workoutId: clientId } } })).toBe(1);
});

test('another account’s workout id is refused in general words, and nothing of theirs is touched', async () => {
	const mine = await newPerson();
	const theirs = await newPerson();
	const clientId = createId();
	await theirs.caller.workouts.create(request(new Date(Date.now() - HOUR), { clientId }, { userBodyweight: 70 }));
	await expect(mine.caller.workouts.create(request(new Date(Date.now() - HOUR), { clientId }))).rejects.toMatchObject({
		code: 'CONFLICT',
		message: 'This workout can’t be saved'
	});
	expect(await workoutsOf(mine.userId)).toHaveLength(0);
	const theirWorkouts = await workoutsOf(theirs.userId);
	expect(theirWorkouts.map((workout) => [workout.id, workout.userBodyweight])).toEqual([[clientId, 70]]);
});

test('a workout sent without an id is saved as before, each time as a new one', async () => {
	const { userId, caller } = await newPerson();
	const at = new Date(Date.now() - HOUR);
	const a = await caller.workouts.create(request(at));
	const b = await caller.workouts.create(request(at));
	expect(a.workoutId).not.toBe(b.workoutId);
	expect(a).toMatchObject({ alreadySaved: false, savedOutsideBlock: false });
	expect(await workoutsOf(userId)).toHaveLength(2);
});

test('a bad id is refused, and so is a flag the server doesn’t know', async () => {
	const { caller } = await newPerson();
	await expect(caller.workouts.create(request(new Date(), { clientId: 'not an id' }))).rejects.toThrow();
	await expect(caller.workouts.create(request(new Date(), { ifBlockGone: 'dropIt' }))).rejects.toThrow();
});

async function blockFor(userId: string, startDate: Date, endDate: Date | null = null) {
	return prisma.mesocycle.create({
		data: { userId, name: 'Block', weeklyRIR: [3, 2, 1, 0, -1], startDate, endDate, ...mesocycleDefaults }
	});
}

test('its block deleted meanwhile: a workout sent late is saved outside any block and says so; a live save is refused', async () => {
	const { userId, caller } = await newPerson();
	const block = await blockFor(userId, new Date(Date.now() - 10 * DAY));
	await prisma.mesocycle.delete({ where: { id: block.id } });
	const inBlock = { workoutOfMesocycle: { mesocycle: { id: block.id } } };
	const startedAt = new Date(Date.now() - 2 * DAY);

	// Without the flag, as ever
	await expect(caller.workouts.create(request(startedAt, { clientId: createId() }, inBlock))).rejects.toMatchObject({
		code: 'NOT_FOUND',
		message: 'Block not found'
	});
	expect(await workoutsOf(userId)).toHaveLength(0);

	const clientId = createId();
	const sent = await caller.workouts.create(request(startedAt, { clientId, ifBlockGone: 'saveOutsideBlock' }, inBlock));
	expect(sent).toMatchObject({ workoutId: clientId, savedOutsideBlock: true, alreadySaved: false });
	const saved = await prisma.workout.findUniqueOrThrow({
		where: { id: clientId },
		include: { workoutOfMesocycle: true }
	});
	expect(saved.workoutOfMesocycle).toBeNull();
	expect(saved.routineName).toBe('Pull A');
});

test('a block Finished after the workout started still has it when it is sent late; one started after the Finish is ordinary', async () => {
	const { userId, caller } = await newPerson();
	// Started 10 days ago, Finished a day ago
	const block = await blockFor(userId, new Date(Date.now() - 10 * DAY), new Date(Date.now() - DAY));
	const inBlock = { workoutOfMesocycle: { mesocycle: { id: block.id } } };

	const before = createId();
	const sentLate = await caller.workouts.create(
		request(new Date(Date.now() - 3 * DAY), { clientId: before, ifBlockGone: 'saveOutsideBlock' }, inBlock)
	);
	expect(sentLate.savedOutsideBlock).toBe(false);
	const insideBlock = await prisma.workoutOfMesocycle.findMany({ where: { workoutId: before } });
	expect(insideBlock.map((link) => link.mesocycleId)).toEqual([block.id]);

	// A workout that started after the block was Finished was never part of it
	const after = createId();
	await caller.workouts.create(
		request(new Date(Date.now() - 6 * HOUR), { clientId: after, ifBlockGone: 'saveOutsideBlock' }, inBlock)
	);
	expect(await prisma.workoutOfMesocycle.findMany({ where: { workoutId: after } })).toHaveLength(0);
	expect(await prisma.workout.count({ where: { id: after } })).toBe(1);
});

test('the end time the phone fixed is kept however late the workout is sent', async () => {
	const { caller } = await newPerson();
	const startedAt = new Date(Date.now() - 6 * HOUR);
	const endedAt = new Date(startedAt.getTime() + 52 * 60 * 1000);
	const clientId = createId();
	await caller.workouts.create(request(startedAt, { clientId }, { endedAt }));
	const saved = await prisma.workout.findUniqueOrThrow({ where: { id: clientId } });
	// Sent six hours on, it is 52 minutes long, not six hours
	expect(saved.endedAt.getTime() - saved.startedAt.getTime()).toBe(52 * 60 * 1000);

	// Without an end time (a request that never had one) the server can only say "now": the reason the phone always sends its own
	const noEnd = createId();
	await caller.workouts.create(request(startedAt, { clientId: noEnd }));
	const late = await prisma.workout.findUniqueOrThrow({ where: { id: noEnd } });
	expect(late.endedAt.getTime() - late.startedAt.getTime()).toBeGreaterThan(5 * HOUR);
});

test('a request queued by this version of the app still parses: the create input only ever grows with optional fields', () => {
	// Frozen: a workout as the phone stores it while it waits (dates as text). If this stops parsing, a workout
	// waiting on someone's phone would be refused after an app update: make the change additive instead
	const queued = {
		clientId: 'tz4a98xxat96iws9zmbrgj3a',
		timeZone: 'Asia/Shanghai',
		workoutData: {
			startedAt: '2026-11-13T01:12:00.000Z',
			endedAt: '2026-11-13T02:04:00.000Z',
			routineName: 'Pull A',
			userBodyweight: 80,
			countsForProgression: true,
			workoutOfMesocycle: { mesocycle: { id: 'cm25sw3zs000y10xylyd9zcgv' }, splitDayName: 'Pull A' }
		},
		workoutExercises: [
			{
				name: 'Barbell rows',
				targetMuscleGroup: 'Traps',
				customMuscleGroup: null,
				bodyweightFraction: null,
				setType: 'Straight',
				repRangeStart: 10,
				repRangeEnd: 15,
				weightUnit: 'KG',
				exerciseNote: null,
				exerciseIndex: 0
			}
		],
		workoutExercisesSets: [[{ setIndex: 0, reps: 12, load: 42.5, RIR: 2, skipped: false }]],
		workoutExercisesMiniSets: [[[{ miniSetIndex: 0, reps: 4, load: 40, RIR: 1 }]]]
	};
	const parsed = createWorkoutSchema.safeParse(queued);
	expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
	// With the flag a late send adds, and without either new field
	expect(createWorkoutSchema.safeParse({ ...queued, ifBlockGone: 'saveOutsideBlock' }).success).toBe(true);
	const { clientId: _clientId, ...older } = queued;
	expect(createWorkoutSchema.safeParse(older).success).toBe(true);
});
