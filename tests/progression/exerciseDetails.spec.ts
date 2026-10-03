import { test, expect } from '../fixtures';
import { exerciseDetailsInput } from '../../src/lib/trpc/routes/exercises';

const details = {
	name: 'Sit-ups',
	targetMuscleGroup: 'Abs' as const,
	customMuscleGroup: null,
	note: null
};

test('reps only and a bodyweight share are one or the other, and a cap needs reps only', () => {
	// Both at once is refused, whichever was turned on last
	expect(
		exerciseDetailsInput.safeParse({ ...details, bodyweightFraction: 0.4, repsOnly: true, maxReps: null }).success
	).toBe(false);
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
