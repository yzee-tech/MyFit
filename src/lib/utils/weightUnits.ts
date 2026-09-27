/**
 * Weights are always stored and calculated in kg. These helpers convert at the edges: what
 * is shown and typed in a workout, and what is sent to and from the server.
 */
import type { RoutineWeightUnit, WeightUnit } from './prismaEnums';

/** kg or lb; LEVEL is a machine's level number, not a weight, so it never converts */
export type MassUnit = Exclude<WeightUnit, 'LEVEL'>;

export function isLevelUnit(unit: WeightUnit | null | undefined): unit is 'LEVEL' {
	return unit === 'LEVEL';
}

export const KG_PER_LB = 0.45359237;

export function toKg(value: number, unit: WeightUnit): number {
	return unit === 'LB' ? value * KG_PER_LB : value;
}

export function fromKg(kg: number, unit: WeightUnit): number {
	return unit === 'LB' ? kg / KG_PER_LB : kg;
}

/** Rounds away floating point noise from conversions, e.g. 29.999999 lb → 30 */
export function roundWeight(value: number): number {
	return Math.round(value * 100) / 100;
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
	if (from === to || isLevelUnit(from) || isLevelUnit(to)) return value;
	return roundWeight(fromKg(toKg(value, from), to));
}

/** Smallest usual jump between weights when an exercise has no weight step of its own */
export function defaultWeightStep(unit: WeightUnit): number {
	if (isLevelUnit(unit)) return 1;
	return unit === 'LB' ? 5 : 2.5;
}

/** Nearest weight on the unit's steps, e.g. 13.6 kg → 12.5 kg with 2.5 kg steps */
export function snapToStep(value: number, step: number): number {
	if (step <= 0) return value;
	return roundWeight(Math.round(value / step) * step);
}

export function unitLabel(unit: WeightUnit): string {
	if (isLevelUnit(unit)) return 'level';
	return unit === 'LB' ? 'lb' : 'kg';
}

/** What the load box is called, e.g. "Load (lb)" or "Level" */
export function loadLabel(unit: WeightUnit): string {
	return isLevelUnit(unit) ? 'Level' : `Load (${unitLabel(unit)})`;
}

/** e.g. "30 lb" for 13.61 kg, or "Level 7" */
export function formatWeight(kg: number, unit: WeightUnit): string {
	if (isLevelUnit(unit)) return `Level ${roundWeight(kg)}`;
	return `${roundWeight(fromKg(kg, unit))} ${unitLabel(unit)}`;
}

/**
 * The unit an exercise is shown in: levels, if its weight set is a machine's levels; else its own
 * override; else, for routines used at many gyms, the unit chosen for this workout; else its
 * weight set's unit, else its routine's unit
 */
export function resolveExerciseUnit(
	exerciseUnit: WeightUnit | null | undefined,
	routineUnit: RoutineWeightUnit,
	sessionUnit: WeightUnit,
	weightSetUnit?: WeightUnit
): WeightUnit {
	if (isLevelUnit(weightSetUnit)) return 'LEVEL';
	if (exerciseUnit && !isLevelUnit(exerciseUnit)) return exerciseUnit;
	if (routineUnit === 'ASK') return sessionUnit;
	return weightSetUnit ?? routineUnit;
}
