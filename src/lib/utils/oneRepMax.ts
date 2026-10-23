/**
 * Estimated one rep max, from the same rep curve the progression uses (Berger): each rep done or in
 * reserve is worth e^0.0262 of the load. Normalised so 1 rep with nothing in reserve is the load itself
 */
import { isLevelUnit } from './weightUnits';
import type { WeightUnit } from './prismaEnums';

/** How much a rep (done or in reserve) is worth on the curve: 131/5000, shared with the progression */
export const BERGER_REPS_RATE = 131 / 5000;

/**
 * kg the set could be done once with: (load + the bodyweight share) × e^(0.0262 × (reps + RIR − 1)).
 * None for no reps, or nothing to lift (help bigger than the bodyweight share)
 */
export function estimatedOneRepMax(loadKg: number, reps: number, RIR = 0, bodyweightShareKg = 0): number | null {
	const total = loadKg + bodyweightShareKg;
	if (total <= 0 || reps < 1) return null;
	return total * Math.exp(BERGER_REPS_RATE * (reps + RIR - 1));
}

type EstimateSet = { reps: number; load: number; RIR: number; skipped?: boolean };

/**
 * A workout's estimate: its best set done (main sets; mini-sets left out), in kg, with that set.
 * None for levels and reps-only exercises, which have no weight to estimate
 */
export function bestSetEstimate<S extends EstimateSet>(
	workoutExercise: { weightUnit?: WeightUnit | null; bodyweightFraction?: number | null; sets: S[] },
	userBodyweightKg: number,
	repsOnly: boolean
): { estimateKg: number; set: S } | null {
	if (repsOnly || isLevelUnit(workoutExercise.weightUnit)) return null;
	const share = (workoutExercise.bodyweightFraction ?? 0) * userBodyweightKg;
	let best: { estimateKg: number; set: S } | null = null;
	for (const set of workoutExercise.sets) {
		if (set.skipped) continue;
		const estimateKg = estimatedOneRepMax(set.load, set.reps, set.RIR, share);
		if (estimateKg !== null && (best === null || estimateKg > best.estimateKg)) best = { estimateKg, set };
	}
	return best;
}

type PastExercise<S extends EstimateSet> = {
	weightUnit?: WeightUnit | null;
	bodyweightFraction?: number | null;
	sets: S[];
	workout: { userBodyweight: number; startedAt: Date | string };
	exercise?: { repsOnly: boolean } | null;
};

/**
 * The highest workout estimate of these past workouts (the caller passes the last few), so one light day
 * doesn't lower it. A workout with nothing to estimate (all skipped) still takes its place. None if none has one
 */
export function bestRecentEstimate<S extends EstimateSet, E extends PastExercise<S>>(pastExercises: E[]) {
	let best: { estimateKg: number; set: S; pastExercise: E } | null = null;
	for (const pastExercise of pastExercises) {
		const estimate = bestSetEstimate(
			pastExercise,
			pastExercise.workout.userBodyweight,
			pastExercise.exercise?.repsOnly ?? false
		);
		if (estimate && (best === null || estimate.estimateKg > best.estimateKg)) best = { ...estimate, pastExercise };
	}
	return best;
}

/** Warm up only works from a weight: not for levels, reps-only or bodyweight exercises */
export function canWarmUp(
	exercise: { weightUnit?: WeightUnit | null; bodyweightFraction?: number | null },
	repsOnly: boolean
) {
	return !repsOnly && !isLevelUnit(exercise.weightUnit) && typeof exercise.bodyweightFraction !== 'number';
}

/**
 * Warm-up sets before the work sets: 40% → 80% of the one rep max, reps 10 → 3. One set alone is 50% × 8.
 * The percentage to 0.1, for showing
 */
export function warmUpPlan(totalSets: number): { reps: number; fraction: number; percentage: number }[] {
	if (totalSets < 1) return [];
	if (totalSets === 1) return [{ reps: 8, fraction: 0.5, percentage: 50 }];
	return Array.from({ length: totalSets }, (_, i) => {
		const step = i / (totalSets - 1);
		const fraction = 0.4 + 0.4 * step;
		return { reps: Math.round(10 - 7 * step), fraction, percentage: Number((fraction * 100).toFixed(1)) };
	});
}
