import { test, expect } from '@playwright/test';
import {
	BERGER_REPS_RATE,
	bestRecentEstimate,
	bestSetEstimate,
	canWarmUp,
	estimatedOneRepMax,
	warmUpPlan
} from '../../src/lib/utils/oneRepMax';
import { solveBergerFormula } from '../../src/lib/utils/workoutUtils';

type Set = { reps: number; load: number; RIR: number; skipped?: boolean };
const set = (load: number, reps: number, RIR = 0, skipped = false): Set => ({ load, reps, RIR, skipped });

test('estimated 1RM: 1 rep at RIR 0 is the load; each rep or rep in reserve is worth the same', () => {
	expect(estimatedOneRepMax(100, 1, 0)).toBeCloseTo(100.0, 2);
	expect(estimatedOneRepMax(100, 10, 0)).toBeCloseTo(126.59, 2);
	expect(estimatedOneRepMax(100, 8, 2)).toBeCloseTo(estimatedOneRepMax(100, 10, 0)!, 10);
	expect(estimatedOneRepMax(80, 8, 2)).toBeCloseTo(101.27, 2);
	// RIR missing counts as 0
	expect(estimatedOneRepMax(100, 10)).toBeCloseTo(126.59, 2);
	// The bodyweight share is part of what's lifted: pull-ups with no added weight count
	expect(estimatedOneRepMax(0, 1, 0, 64)).toBeCloseTo(64, 2);
	expect(estimatedOneRepMax(16, 1, 0, 64)).toBeCloseTo(80, 2);
	// Nothing lifted, or no reps
	expect(estimatedOneRepMax(0, 10, 0)).toBeNull();
	expect(estimatedOneRepMax(-70, 5, 0, 64)).toBeNull();
	expect(estimatedOneRepMax(100, 0, 0)).toBeNull();
});

test('a workout’s estimate: its best set done; mini-sets, skipped sets, levels and reps-only left out', () => {
	const sets = [set(80, 8, 2), set(80, 6, 1), set(100, 10, 0, true)];
	const weighted = { weightUnit: 'KG' as const, bodyweightFraction: null, sets };
	const best = bestSetEstimate(weighted, 80, false);
	expect(best?.estimateKg).toBeCloseTo(101.27, 2);
	expect(best?.set).toBe(sets[0]);

	// Mini-sets don't count, even a heavier one
	const withMini = { ...weighted, sets: [{ ...set(50, 5), miniSets: [set(200, 5)] }] };
	expect(bestSetEstimate(withMini, 80, false)?.estimateKg).toBeCloseTo(estimatedOneRepMax(50, 5)!, 6);

	// All skipped, or nothing lifted: none
	expect(bestSetEstimate({ ...weighted, sets: [set(80, 8, 2, true)] }, 80, false)).toBeNull();
	expect(bestSetEstimate({ ...weighted, sets: [set(0, 8, 2)] }, 80, false)).toBeNull();
	// Levels and reps-only (even with a load) have none
	expect(bestSetEstimate({ ...weighted, weightUnit: 'LEVEL' }, 80, false)).toBeNull();
	expect(bestSetEstimate(weighted, 80, true)).toBeNull();
	// Bodyweight: the share of that workout's bodyweight is added, with no added weight too
	const pullUps = { weightUnit: 'KG' as const, bodyweightFraction: 0.8, sets: [set(0, 1, 0)] };
	expect(bestSetEstimate(pullUps, 80, false)?.estimateKg).toBeCloseTo(64, 2);
});

test('the best of the last few: the highest, so a light day doesn’t lower it; all-skipped workouts give none', () => {
	const past = (startedAt: string, sets: Set[], repsOnly = false) => ({
		weightUnit: 'KG' as const,
		bodyweightFraction: null,
		sets,
		workout: { userBodyweight: 80, startedAt: new Date(startedAt) },
		exercise: { repsOnly }
	});
	const recent = [
		past('2026-10-20', [set(40, 8, 2)]),
		past('2026-10-17', [set(80, 8, 2)]),
		past('2026-10-14', [set(70, 8, 2)])
	];
	const best = bestRecentEstimate(recent);
	expect(best?.estimateKg).toBeCloseTo(101.27, 2);
	expect(best?.pastExercise).toBe(recent[1]);

	expect(bestRecentEstimate([past('2026-10-20', [set(80, 8, 2, true)])])).toBeNull();
	expect(bestRecentEstimate([past('2026-10-20', [set(80, 8, 2)], true)])).toBeNull();
	expect(bestRecentEstimate([])).toBeNull();
});

test('Warm up only for exercises with a weight: not levels, reps-only or bodyweight', () => {
	expect(canWarmUp({ weightUnit: 'KG', bodyweightFraction: null }, false)).toBe(true);
	expect(canWarmUp({ weightUnit: 'LB', bodyweightFraction: undefined }, false)).toBe(true);
	expect(canWarmUp({ weightUnit: 'LEVEL', bodyweightFraction: null }, false)).toBe(false);
	expect(canWarmUp({ weightUnit: 'KG', bodyweightFraction: null }, true)).toBe(false);
	expect(canWarmUp({ weightUnit: 'KG', bodyweightFraction: 0.8 }, false)).toBe(false);
});

test('warm-up sets: 40% → 80% and 10 → 3 reps; one set is 50% × 8; percentages to 0.1', () => {
	expect(warmUpPlan(3).map(({ reps, percentage }) => [reps, percentage])).toEqual([
		[10, 40],
		[7, 60],
		[3, 80]
	]);
	expect(warmUpPlan(4).map((row) => row.percentage)).toEqual([40, 53.3, 66.7, 80]);
	expect(warmUpPlan(4).map((row) => row.reps)).toEqual([10, 8, 5, 3]);
	expect(warmUpPlan(4)[1].fraction).toBeCloseTo(0.4 + 0.4 / 3, 10);
	expect(warmUpPlan(1)).toEqual([{ reps: 8, fraction: 0.5, percentage: 50 }]);
	expect(warmUpPlan(0)).toEqual([]);
});

test('the progression uses the same rep curve: one more rep at the same load is e^0.0262 more', () => {
	const sameLoad = { load: 100, RIR: 0, miniSets: [] };
	const overload = solveBergerFormula({
		variableToSolve: 'OverloadPercentage',
		knownValues: { bodyweightFraction: null, oldSet: { ...sameLoad, reps: 10 }, newSet: { ...sameLoad, reps: 11 } }
	});
	expect(overload).toBeCloseTo((Math.exp(BERGER_REPS_RATE) - 1) * 100, 6);
	const reps = solveBergerFormula({
		variableToSolve: 'NewReps',
		knownValues: {
			bodyweightFraction: null,
			oldSet: { ...sameLoad, reps: 10 },
			newSet: { ...sameLoad, reps: 0 },
			overloadPercentage: 0
		}
	});
	expect(reps).toBeCloseTo(10, 9);
});
