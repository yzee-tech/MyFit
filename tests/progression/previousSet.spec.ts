import { formatHintLoad, formatPreviousSet } from '../../src/lib/utils/previousSet';
import { solveBergerFormula } from '../../src/lib/utils/workoutUtils';
import { test, expect } from '@playwright/test';

test('the "Previous" column: weights, bodyweight, levels, reps only, and none', () => {
	const set = (load: number, reps: number, skipped = false) => ({ load, reps, skipped });
	expect(formatPreviousSet(set(60, 10), 'weight')).toBe('60 × 10');
	expect(formatPreviousSet(set(62.5, 8), 'weight')).toBe('62.5 × 8');
	expect(formatPreviousSet(set(10, 8), 'bodyweight')).toBe('+10 × 8');
	expect(formatPreviousSet(set(0, 8), 'bodyweight')).toBe('BW × 8');
	expect(formatPreviousSet(set(-20, 8), 'bodyweight')).toBe('−20 × 8');
	expect(formatPreviousSet(set(5, 10), 'level')).toBe('L5 × 10');
	expect(formatPreviousSet(set(0, 12), 'repsOnly')).toBe('12');
	expect(formatPreviousSet(set(0, 0, true), 'weight')).toBe('–');
	expect(formatPreviousSet(undefined, 'weight')).toBe('–');
});

test('the reps hint: its weight in words, and the formula behind it', () => {
	expect(formatHintLoad(70, 'kg', 'weight')).toBe('70 kg');
	expect(formatHintLoad(20, 'kg', 'bodyweight')).toBe('+20 kg');
	expect(formatHintLoad(0, 'kg', 'bodyweight')).toBe('bodyweight');
	expect(formatHintLoad(-20, 'lb', 'bodyweight')).toBe('−20 lb');

	// 60 kg × 10 at 2 RIR, moved to 70 kg: about 4 reps at the same effort (Berger's table)
	const reps = solveBergerFormula({
		variableToSolve: 'NewReps',
		knownValues: {
			oldSet: { reps: 10, load: 60, RIR: 2, miniSets: [] },
			newSet: { load: 70, RIR: 2, miniSets: [] },
			oldUserBodyweight: 100,
			newUserBodyweight: 100,
			bodyweightFraction: null,
			overloadPercentage: 0
		}
	});
	expect(Math.round(reps)).toBe(4);
});
