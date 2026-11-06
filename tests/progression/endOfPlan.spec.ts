import { test, expect } from '@playwright/test';
import {
	blockActiveDays,
	endOfPlanBoundary,
	getBlockWeek,
	isPastPlannedWeeks,
	lockedWeekCount
} from '../../src/lib/utils/workoutUtils';

/**
 * The end of a block's plan: the moment its days reach 7 for each planned week (the start of that calendar day
 * in the phone's timezone), the weeks locked while it is running or paused, and when a block is past its plan
 */

const SHANGHAI = 'Asia/Shanghai';
// A block that started on Oct 20 at 18:00 in Shanghai (10:00 UTC)
const START = new Date('2026-10-20T10:00:00Z');
const at = (isoLocalShanghai: string) => new Date(`${isoLocalShanghai}+08:00`);

test.describe('endOfPlanBoundary', () => {
	test('is the start of the day the 35th day is reached: midnight of Nov 24 in Shanghai, however late the block started', () => {
		const boundary = endOfPlanBoundary(START, [], 5, SHANGHAI);
		expect(boundary?.toISOString()).toBe(at('2026-11-24T00:00:00').toISOString());
		// The last moment before it is still Week 5; at it the block is in a Week 6 that does not exist
		const justBefore = new Date(boundary!.getTime() - 1);
		expect(blockActiveDays(START, justBefore, SHANGHAI)).toBe(34);
		expect(getBlockWeek(START, justBefore, SHANGHAI)).toBe(5);
		expect(blockActiveDays(START, boundary!, SHANGHAI)).toBe(35);
		expect(getBlockWeek(START, boundary!, SHANGHAI)).toBe(6);
	});

	test('a pause begun at the boundary freezes the block there for good: weeks later it is still at 35 days, Week 6', () => {
		const boundary = endOfPlanBoundary(START, [], 5, SHANGHAI)!;
		const pauses = [{ pausedAt: boundary, resumedAt: null }];
		for (const day of ['2026-11-24T00:00:01', '2026-11-27T09:00:00', '2027-02-01T09:00:00']) {
			expect(blockActiveDays(START, at(day), SHANGHAI, pauses)).toBe(35);
			expect(getBlockWeek(START, at(day), SHANGHAI, pauses)).toBe(6);
		}
	});

	test('earlier closed pauses are taken out: three midnights paused make the plan end three days later', () => {
		// Paused Nov 2 at 22:00, resumed Nov 5 at 08:00: three midnights crossed
		const pauses = [{ pausedAt: at('2026-11-02T22:00:00'), resumedAt: at('2026-11-05T08:00:00') }];
		const boundary = endOfPlanBoundary(START, pauses, 5, SHANGHAI)!;
		expect(boundary.toISOString()).toBe(at('2026-11-27T00:00:00').toISOString());
		expect(blockActiveDays(START, new Date(boundary.getTime() - 1), SHANGHAI, pauses)).toBe(34);
		expect(blockActiveDays(START, boundary, SHANGHAI, pauses)).toBe(35);
	});

	test('a pause begun after the moment is not counted: the boundary is where the block stood', () => {
		const later = [{ pausedAt: at('2026-12-10T12:00:00'), resumedAt: at('2026-12-20T12:00:00') }];
		expect(endOfPlanBoundary(START, later, 5, SHANGHAI)?.toISOString()).toBe(at('2026-11-24T00:00:00').toISOString());
	});

	test('the days are the timezone days: New York ends its Nov 24 five hours after UTC would, across the clocks going back', () => {
		// 18:00 in Shanghai is 05:00 on the same day in New York (Oct 20): the 35th day is Nov 24 there too, and the
		// clocks went back on Nov 1 in between: midnight is 05:00 UTC
		const boundary = endOfPlanBoundary(START, [], 5, 'America/New_York');
		expect(boundary?.toISOString()).toBe('2026-11-24T05:00:00.000Z');
		// And in UTC (a missing, invalid or over-long timezone counts UTC days)
		expect(endOfPlanBoundary(START, [], 5)?.toISOString()).toBe('2026-11-24T00:00:00.000Z');
		expect(endOfPlanBoundary(START, [], 5, 'Not/AZone')?.toISOString()).toBe('2026-11-24T00:00:00.000Z');
		expect(endOfPlanBoundary(START, [], 5, 'x'.repeat(80))?.toISOString()).toBe('2026-11-24T00:00:00.000Z');
		expect(endOfPlanBoundary(START, [], 5, null)?.toISOString()).toBe('2026-11-24T00:00:00.000Z');
	});

	test('a day with no midnight (the clocks jump from 00:00 to 01:00) starts at its first instant', () => {
		// Cairo moved its clocks forward at midnight on Fri Apr 24 2026: that day starts at 01:00 (22:00 UTC the day before)
		const start = new Date('2026-03-20T08:00:00Z');
		const boundary = endOfPlanBoundary(start, [], 5, 'Africa/Cairo');
		expect(boundary?.toISOString()).toBe('2026-04-23T22:00:00.000Z');
		expect(blockActiveDays(start, new Date(boundary!.getTime() - 1), 'Africa/Cairo')).toBe(34);
		expect(blockActiveDays(start, boundary!, 'Africa/Cairo')).toBe(35);
	});

	test('a block of one week and one that is not readable', () => {
		expect(endOfPlanBoundary(START, [], 1, SHANGHAI)?.toISOString()).toBe(at('2026-10-27T00:00:00').toISOString());
		expect(endOfPlanBoundary('not a date', [], 5, SHANGHAI)).toBeNull();
		expect(endOfPlanBoundary(START, [], 0, SHANGHAI)).toBeNull();
	});
});

test.describe('isPastPlannedWeeks', () => {
	test('is true from the end of the plan, for a paused block however long ago; a longer plan is not past', () => {
		const boundary = endOfPlanBoundary(START, [], 5, SHANGHAI)!;
		const paused = [{ pausedAt: boundary, resumedAt: null }];
		expect(isPastPlannedWeeks(START, new Date(boundary.getTime() - 1), SHANGHAI, [], 5)).toBe(false);
		expect(isPastPlannedWeeks(START, boundary, SHANGHAI, [], 5)).toBe(true);
		expect(isPastPlannedWeeks(START, at('2027-03-01T09:00:00'), SHANGHAI, paused, 5)).toBe(true);
		// Given a sixth week, the same pause is not past the plan: Resume is allowed
		expect(isPastPlannedWeeks(START, at('2027-03-01T09:00:00'), SHANGHAI, paused, 6)).toBe(false);
	});
});

test.describe('lockedWeekCount', () => {
	// Day 0 is Tuesday Oct 20: Week 3 starts on day 14 (Nov 3), its second day is Nov 4
	const day = (n: number) => new Date(at('2026-10-20T20:00:00').getTime() + n * 24 * 60 * 60 * 1000);
	const pausedOn = (n: number) => [{ pausedAt: day(n), resumedAt: null }];

	test('a running block locks the weeks through the one it is in', () => {
		expect(lockedWeekCount(START, day(0), SHANGHAI, [], 5)).toBe(1);
		expect(lockedWeekCount(START, day(6), SHANGHAI, [], 5)).toBe(1);
		expect(lockedWeekCount(START, day(7), SHANGHAI, [], 5)).toBe(2);
		expect(lockedWeekCount(START, day(16), SHANGHAI, [], 5)).toBe(3);
		// Past its plan: all of it
		expect(lockedWeekCount(START, day(60), SHANGHAI, [], 5)).toBe(5);
	});

	test('a block paused part-way through a week locks that week; the second day of Week 3 locks Week 3', () => {
		expect(lockedWeekCount(START, day(30), SHANGHAI, pausedOn(16), 5)).toBe(3);
		expect(lockedWeekCount(START, day(30), SHANGHAI, pausedOn(15), 5)).toBe(3);
		expect(lockedWeekCount(START, day(30), SHANGHAI, pausedOn(20), 5)).toBe(3);
		expect(lockedWeekCount(START, day(30), SHANGHAI, pausedOn(21), 5)).toBe(3);
		expect(lockedWeekCount(START, day(40), SHANGHAI, pausedOn(22), 5)).toBe(4);
	});

	test('the known deviation: paused on the first day of a week leaves that week open until Resume', () => {
		// Day 14 is the first day of Week 3 (14 days run): ceil(14 / 7) = 2 weeks locked
		expect(lockedWeekCount(START, day(30), SHANGHAI, pausedOn(14), 5)).toBe(2);
		// Resumed, it is running again and Week 3 is the current week: locked
		const resumed = [{ pausedAt: day(14), resumedAt: day(20) }];
		expect(lockedWeekCount(START, day(20), SHANGHAI, resumed, 5)).toBe(3);
	});

	test('a block paused at the end of its plan locks the planned weeks and no later one, however often it is extended', () => {
		const boundary = endOfPlanBoundary(START, [], 5, SHANGHAI)!;
		const paused = [{ pausedAt: boundary, resumedAt: null }];
		const later = at('2026-12-30T09:00:00');
		expect(lockedWeekCount(START, later, SHANGHAI, paused, 5)).toBe(5);
		// Extended to 6, then 7 weeks: still 5 locked, the added weeks are open
		expect(lockedWeekCount(START, later, SHANGHAI, paused, 6)).toBe(5);
		expect(lockedWeekCount(START, later, SHANGHAI, paused, 7)).toBe(5);
		// Resumed with the sixth week: Week 6 is now the current week and locks; Week 7 stays open
		const resumed = [{ pausedAt: boundary, resumedAt: at('2026-12-01T10:00:00') }];
		expect(lockedWeekCount(START, at('2026-12-01T11:00:00'), SHANGHAI, resumed, 7)).toBe(6);
	});
});
