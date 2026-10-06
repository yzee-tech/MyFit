import { formatWorkoutClock } from '../../src/lib/utils/workoutLength';
import { test, expect } from '@playwright/test';

test("the workout panel's clock: seconds, minutes, then hours", () => {
	const start = new Date('2026-10-06T10:00:00Z');
	const after = (seconds: number) => new Date(start.getTime() + seconds * 1000);
	expect(formatWorkoutClock(start, after(0))).toBe('0:00');
	expect(formatWorkoutClock(start, after(52))).toBe('0:52');
	expect(formatWorkoutClock(start, after(12 * 60 + 34))).toBe('12:34');
	expect(formatWorkoutClock(start, after(3600 + 5 * 60 + 10))).toBe('1:05:10');
	// A clock a little behind the start never goes negative
	expect(formatWorkoutClock(start, after(-5))).toBe('0:00');
});
