import { test, expect } from '@playwright/test';
import { clearLoads, convertSuggestedLoads, type WorkoutExerciseInProgress } from '../../src/lib/utils/workoutUtils';
import { convertWeight, roundWeight } from '../../src/lib/utils/weightUnits';

type SetInProgress = WorkoutExerciseInProgress['sets'][number];

const miniSet = (load: number) => ({ reps: 4, load, RIR: 0, completed: true });
const set = (more: Partial<SetInProgress> = {}): SetInProgress => ({
	reps: 8,
	load: 60,
	RIR: 2,
	completed: true,
	skipped: false,
	miniSets: [miniSet(55)],
	...more
});

test('convertSuggestedLoads: only the remembered weight is converted; other sets and fields are untouched', () => {
	const sets = [
		set({ suggested: { load: 60, reps: 10, RIR: 2 }, hintBase: { load: 60, reps: 10, RIR: 2 } }),
		set({ suggested: { reps: 9 } }),
		set()
	];
	const converted = convertSuggestedLoads(sets, (load) => roundWeight(convertWeight(load, 'KG', 'LB')));
	expect(converted[0].suggested).toEqual({ load: 132.28, reps: 10, RIR: 2 });
	// Everything else on the set, including the hint start and the live weight, is left alone
	expect(converted[0].load).toBe(60);
	expect(converted[0].hintBase).toEqual({ load: 60, reps: 10, RIR: 2 });
	expect(converted[1]).toBe(sets[1]);
	expect(converted[2]).toBe(sets[2]);
	// The input is not changed
	expect(sets[0].suggested?.load).toBe(60);
});

test('clearLoads (the kind of load changed): no weight, not done, no remembered weight or hint start; reps and RIR memory stay', () => {
	const cleared = clearLoads(
		set({ suggested: { load: 8, reps: 10, RIR: 2 }, hintBase: { load: 8, reps: 10, RIR: 2 } })
	);
	expect(cleared.load).toBeUndefined();
	expect(cleared.completed).toBe(false);
	expect(cleared.suggested).toEqual({ reps: 10, RIR: 2 });
	expect('hintBase' in cleared).toBe(false);
	expect(cleared.reps).toBe(8);
	// A set with nothing remembered gets nothing added
	expect('suggested' in clearLoads(set())).toBe(false);
	// A mini-set (no memory fields) loses its weight and its tick
	const clearedMini = clearLoads(miniSet(55));
	expect(clearedMini.load).toBeUndefined();
	expect(clearedMini.completed).toBe(false);
	expect(clearedMini.reps).toBe(4);
});
