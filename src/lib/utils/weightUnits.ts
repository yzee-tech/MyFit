/**
 * Weights are always stored and calculated in kg. These helpers convert at the edges: what
 * is shown and typed in a workout, and what is sent to and from the server.
 */
import type { RoutineWeightUnit, WeightUnit } from './prismaEnums';

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
	if (from === to) return value;
	return roundWeight(fromKg(toKg(value, from), to));
}

/** Smallest usual jump between weights when an exercise has no weight step of its own */
export function defaultWeightStep(unit: WeightUnit): number {
	return unit === 'LB' ? 5 : 2.5;
}

/** Nearest weight on the unit's steps, e.g. 13.6 kg → 12.5 kg with 2.5 kg steps */
export function snapToStep(value: number, step: number): number {
	if (step <= 0) return value;
	return roundWeight(Math.round(value / step) * step);
}

export function unitLabel(unit: WeightUnit): string {
	return unit === 'LB' ? 'lb' : 'kg';
}

/** e.g. "30 lb" for 13.61 kg */
export function formatWeight(kg: number, unit: WeightUnit): string {
	return `${roundWeight(fromKg(kg, unit))} ${unitLabel(unit)}`;
}

/**
 * The unit an exercise is shown in: its own override; else, for routines used at many gyms, the
 * unit chosen for this workout; else its weight set's unit, else its routine's unit
 */
export function resolveExerciseUnit(
	exerciseUnit: WeightUnit | null | undefined,
	routineUnit: RoutineWeightUnit,
	sessionUnit: WeightUnit,
	weightSetUnit?: WeightUnit
): WeightUnit {
	if (exerciseUnit) return exerciseUnit;
	if (routineUnit === 'ASK') return sessionUnit;
	return weightSetUnit ?? routineUnit;
}
