/**
 * Weight sets: the weights a gym actually has, e.g. dumbbells 5–10 kg by 1, then 14 and 20.
 * Weights in a set are in its own unit and sorted ascending.
 */
import type { WeightUnit } from './prismaEnums';
import { roundWeight } from './weightUnits';

export type WeightSetLike = {
	id: string;
	name: string;
	unit: WeightUnit;
	weights: number[];
	/** An assisted machine's settings: each weight is help, logged as a negative load */
	isAssistance?: boolean;
	/**
	 * A machine's levels, made from its exercise's settings (never stored): the exercise's name. Such an
	 * exercise always uses them, whatever weight set it's linked to
	 */
	levelsOf?: string;
};

/** The step between a machine's levels: whole levels, or half levels too */
export const LEVEL_STEPS = [1, 0.5] as const;

type ExerciseLevels = {
	id: string;
	name: string;
	levelsFrom: number | null;
	levelsTo: number | null;
	levelStep: number | null;
};

/** The levels of each exercise that's a machine with levels, e.g. 1–20 by 1 */
export function levelSetsFor(exercises: ExerciseLevels[]): WeightSetLike[] {
	return exercises.flatMap((exercise) => {
		const { levelsFrom, levelsTo, levelStep } = exercise;
		if (levelsFrom === null || levelsTo === null || levelStep === null) return [];
		const weights = expandRange(levelsFrom, levelsTo, levelStep);
		if (weights.length === 0) return [];
		return [{ id: `levels:${exercise.id}`, name: exercise.name, unit: 'LEVEL' as const, weights, levelsOf: exercise.name }];
	});
}

/** An exercise's machine levels, if it has them */
export function levelSetOf(exerciseName: string | undefined, weightSets: WeightSetLike[]): WeightSetLike | undefined {
	return exerciseName === undefined ? undefined : weightSets.find((set) => set.levelsOf === exerciseName);
}

/** The weight sets someone picks from: a gym's weights, not a machine's levels */
export function pickableWeightSets(weightSets: WeightSetLike[]): WeightSetLike[] {
	return weightSets.filter((set) => set.levelsOf === undefined && set.unit !== 'LEVEL');
}

export const MAX_WEIGHTS_PER_SET = 200;

/** Every weight from `from` to `to` (inclusive), `step` apart */
export function expandRange(from: number, to: number, step: number): number[] {
	if (!(step > 0) || to < from) return [];
	const count = Math.floor((to - from) / step + 1e-9) + 1;
	return Array.from({ length: Math.min(count, MAX_WEIGHTS_PER_SET) }, (_, idx) => roundWeight(from + idx * step));
}

/** Rounded, positive, without duplicates, lightest first */
export function normalizeWeights(weights: number[]): number[] {
	const cleaned = weights.filter((weight) => Number.isFinite(weight) && weight > 0).map(roundWeight);
	return [...new Set(cleaned)].sort((a, b) => a - b).slice(0, MAX_WEIGHTS_PER_SET);
}

/**
 * The weights an exercise can use, in its unit, or null for standard steps. A weight set only
 * applies while the exercise is shown in the set's unit.
 */
export function availableWeightsFor(
	exercise: { name?: string; weightSetId?: string | null; weightUnit?: WeightUnit | null },
	weightSets: WeightSetLike[]
): number[] | null {
	// A machine with levels always uses its own levels
	const levels = levelSetOf(exercise.name, weightSets);
	if (levels) return exercise.weightUnit === 'LEVEL' ? levels.weights : null;
	if (!exercise.weightSetId) return null;
	const weightSet = weightSets.find((set) => set.id === exercise.weightSetId);
	if (!weightSet || weightSet.weights.length === 0) return null;
	if (weightSet.unit !== (exercise.weightUnit ?? 'KG')) return null;
	// Help counts against you: 20 kg of help is a load of -20, and less help is the next step up
	if (weightSet.isAssistance) return weightSet.weights.map((weight) => -weight).sort((a, b) => a - b);
	return weightSet.weights;
}

const EPSILON = 1e-6;

/** The next heavier weight that exists, or null at the top of the set */
export function nextWeightUp(weights: number[], value: number): number | null {
	return weights.find((weight) => weight > value + EPSILON) ?? null;
}

/** The closest weights at or below, and at or above, a value */
export function weightsAround(weights: number[], value: number): { below: number | null; above: number | null } {
	const below = weights.findLast((weight) => weight <= value + EPSILON) ?? null;
	const above = weights.find((weight) => weight >= value - EPSILON) ?? null;
	return { below, above };
}

/** e.g. "5–10 by 1, 14, 20" */
export function formatWeightList(weights: number[]): string {
	const parts: string[] = [];
	let idx = 0;
	while (idx < weights.length) {
		// Grow a run of 3+ weights with the same gap into a range
		let end = idx;
		const gap = weights[idx + 1] - weights[idx];
		while (end + 1 < weights.length && Math.abs(weights[end + 1] - weights[end] - gap) < EPSILON) end++;
		if (end - idx >= 2) {
			parts.push(`${weights[idx]}–${weights[end]} by ${roundWeight(gap)}`);
			idx = end + 1;
		} else {
			parts.push(`${weights[idx]}`);
			idx++;
		}
	}
	return parts.join(', ');
}
