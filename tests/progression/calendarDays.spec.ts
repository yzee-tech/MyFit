import { test, expect } from '@playwright/test';
import { createId } from '@paralleldrive/cuid2';
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { describeDates, nextDay, parseLocalDay } from '../../src/lib/utils/calendarDays';
import { deleteTestUsers } from '../deleteTestUsers';

/** The calendar's days: a month's workouts from the server, and days from the page link */

const createdUserIds: string[] = [];
test.afterAll(async () => {
	await deleteTestUsers(prisma, { id: { in: createdUserIds } });
});

async function seedPerson() {
	const userId = createId();
	createdUserIds.push(userId);
	await prisma.user.create({ data: { id: userId, email: `calendar-${userId}@myfit.com` } });
	return { userId, caller: createCaller({ event: {} as never, userId }) };
}

test('a month’s workouts: done ones only (not a block’s skipped days), when and their routine, one person’s', async () => {
	const { userId, caller } = await seedPerson();
	const other = await seedPerson();
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Block',
			weeklyRIR: [3, 2],
			startDate: new Date('2026-10-01T00:00:00Z'),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	const workout = (who: string, at: string, routineName: string | null, skipped = false) =>
		prisma.workout.create({
			data: {
				userId: who,
				userBodyweight: 80,
				startedAt: new Date(at),
				endedAt: new Date(at),
				routineName,
				...(skipped && { workoutOfMesocycle: { create: { mesocycleId: block.id, workoutStatus: 'Skipped' } } })
			}
		});
	await workout(userId, '2026-10-02T10:00:00Z', 'Push A');
	await workout(userId, '2026-10-03T10:00:00Z', null);
	await workout(userId, '2026-10-04T10:00:00Z', 'Legs A', true);
	await workout(userId, '2026-11-02T10:00:00Z', 'Pull A');
	await workout(other.userId, '2026-10-05T10:00:00Z', 'Theirs');

	const october = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-11-01T00:00:00Z') };
	const days = await caller.workouts.monthDays(october);
	expect(days.map(({ routineName }) => routineName)).toEqual(['Push A', null]);
	expect(days[0]).toEqual({ startedAt: new Date('2026-10-02T10:00:00Z'), routineName: 'Push A' });

	// A month at most, in order
	await expect(caller.workouts.monthDays({ from: october.from, to: new Date('2026-11-03T00:00:00Z') })).rejects.toThrow(
		'At most a month'
	);
	await expect(caller.workouts.monthDays({ from: october.to, to: october.from })).rejects.toThrow(
		'from must be before to'
	);
});

test('days in the page link: real days only, at local midnight; a pick ends at the next midnight', () => {
	const day = parseLocalDay('2026-10-16')!;
	expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([2026, 9, 16, 0]);
	for (const bad of ['2026-02-30', '2026-13-01', '2026-10-16T00:00', '16/10/2026', '', null]) {
		expect(parseLocalDay(bad)).toBeNull();
	}
	// The month's end and the year's end roll over
	expect(nextDay(parseLocalDay('2026-10-31')!)).toEqual(parseLocalDay('2026-11-01'));
	expect(nextDay(parseLocalDay('2026-12-31')!)).toEqual(parseLocalDay('2027-01-01'));
	// A span reads with the month once when it can
	const now = parseLocalDay('2026-10-22')!;
	expect(describeDates(parseLocalDay('2026-10-01')!, parseLocalDay('2026-10-14')!, now)).toBe('Oct 1 – 14');
	expect(describeDates(parseLocalDay('2026-09-28')!, parseLocalDay('2026-10-01')!, now)).toBe('Sep 28 – Oct 1');
});
