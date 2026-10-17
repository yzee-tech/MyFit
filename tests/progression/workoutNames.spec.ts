import { test, expect } from '@playwright/test';
import { blankWorkoutName, workoutName } from '../../src/lib/utils/workoutNames';

test('a blank workout is named after the time it started', () => {
	const at = (hours: number, minutes: number) => new Date(2026, 9, 17, hours, minutes);
	const names = [
		[at(4, 59), 'Evening workout'],
		[at(5, 0), 'Morning workout'],
		[at(11, 59), 'Morning workout'],
		[at(12, 0), 'Noon workout'],
		[at(13, 59), 'Noon workout'],
		[at(14, 0), 'Afternoon workout'],
		[at(16, 59), 'Afternoon workout'],
		[at(17, 0), 'Evening workout'],
		[at(23, 30), 'Evening workout']
	] as const;
	for (const [time, name] of names) expect(blankWorkoutName(time), time.toTimeString()).toBe(name);
});

test('a workout from a routine keeps its name', () => {
	expect(workoutName({ routineName: 'Pull A', startedAt: new Date(2026, 9, 17, 7) })).toBe('Pull A');
	expect(workoutName({ routineName: null, startedAt: new Date(2026, 9, 17, 7) })).toBe('Morning workout');
});
