import { test, expect } from '../fixtures';
import { exerciseDetailsInput } from '../../src/lib/trpc/routes/exercises';
import { weekInput } from '../../src/lib/trpc/routes/stats';

const details = {
	name: 'Sit-ups',
	targetMuscleGroup: 'Abs' as const,
	customMuscleGroup: null,
	note: null
};

test('reps only can keep a bodyweight share, and a cap needs reps only', () => {
	// Both at once (e.g. push-ups): only reps suggested, the share still counts in volume
	expect(
		exerciseDetailsInput.parse({ ...details, bodyweightFraction: 0.4, repsOnly: true, maxReps: 13 })
	).toMatchObject({ repsOnly: true, maxReps: 13, bodyweightFraction: 0.4 });
	// Reps only, without bodyweight: fine, with its cap
	const repsOnly = exerciseDetailsInput.parse({ ...details, bodyweightFraction: null, repsOnly: true, maxReps: 30 });
	expect(repsOnly).toMatchObject({ repsOnly: true, maxReps: 30, bodyweightFraction: null });
	// A bodyweight share, without reps only: fine, and any cap is dropped
	const bodyweight = exerciseDetailsInput.parse({ ...details, bodyweightFraction: 0.4, repsOnly: false, maxReps: 30 });
	expect(bodyweight).toMatchObject({ repsOnly: false, maxReps: null, bodyweightFraction: 0.4 });
	// Older clients that don't send them: reps only off
	expect(exerciseDetailsInput.parse({ ...details, bodyweightFraction: null })).toMatchObject({
		repsOnly: false,
		maxReps: null
	});
});

test('the dashboard week query takes a week at most, from before to', () => {
	const from = new Date(2026, 9, 18);
	const to = new Date(2026, 9, 25);
	expect(weekInput.safeParse({ from, to }).success).toBe(true);
	// Sent as strings (as JSON would): still dates
	expect(weekInput.safeParse({ from: from.toISOString(), to: to.toISOString() }).success).toBe(true);
	expect(weekInput.safeParse({ from: to, to: from }).success).toBe(false);
	expect(weekInput.safeParse({ from, to: new Date(2026, 10, 30) }).success).toBe(false);
	expect(weekInput.safeParse({ from: 'not a date', to }).success).toBe(false);
	expect(weekInput.safeParse({ from, to, extra: 1 }).success).toBe(false);
});
