/**
 * What a workout changed about its routine's plan, for the "Update routine?" prompt. Only the plan
 * is compared: which exercises, their order, sets, set type, rep ranges, load change, routine note,
 * weights available, kg/lb choice and progression overrides. What was lifted (reps, loads, RIR),
 * bodyweight, notes about the workout or the exercise itself are never compared.
 */
import type { ChangeType, RoutineWeightUnit, SetType, WeightUnit } from './prismaEnums';
import { isLevelUnit } from './weightUnits';
import { convertCamelCaseToNormal } from '../utils';

export type RoutinePlanExercise = {
	exerciseId?: string | null;
	name: string;
	sets: number;
	setType: SetType;
	repRangeStart: number;
	repRangeEnd: number;
	topRepRangeStart?: number | null;
	topRepRangeEnd?: number | null;
	changeType?: ChangeType | null;
	changeAmount?: number | null;
	note?: string | null;
	weightSetId?: string | null;
	weightUnit?: WeightUnit | null;
	overloadPercentage?: number | null;
	lastSetToFailure?: boolean | null;
	forceRIRMatching?: boolean | null;
	minimumWeightChange?: number | null;
};

export type RoutineChangeOptions = {
	/** The routine's own unit; "ask each time" routines pick a unit and gym per workout */
	routineUnit: RoutineWeightUnit;
	/** A deload halves the sets on purpose, so set counts aren't compared */
	deload: boolean;
};

const blank = <T>(value: T | null | undefined): T | null =>
	value === undefined || value === null || (typeof value === 'string' && value.trim() === '') ? null : value;

/** The exercise's own unit, when it differs from the routine's (levels follow the weight set) */
export function ownUnit(unit: WeightUnit | null | undefined, routineUnit: RoutineWeightUnit): WeightUnit | null {
	if (!unit || routineUnit === 'ASK' || isLevelUnit(unit) || unit === routineUnit) return null;
	return unit;
}

/** One exercise's plan, with "nothing" written the same way everywhere */
function plan(exercise: RoutinePlanExercise, options: RoutineChangeOptions) {
	const hasLoadChange = ['Drop', 'Down', 'MyorepMatchDown'].includes(exercise.setType);
	const hasTopSet = exercise.setType === 'TopBackoff';
	const perWorkoutGym = options.routineUnit === 'ASK';
	return {
		sets: exercise.sets,
		setType: exercise.setType,
		repRange: `${exercise.repRangeStart}–${exercise.repRangeEnd}`,
		topRange: hasTopSet ? `${blank(exercise.topRepRangeStart)}–${blank(exercise.topRepRangeEnd)}` : null,
		loadChange: hasLoadChange ? `${blank(exercise.changeType)} ${blank(exercise.changeAmount)}` : null,
		note: blank(exercise.note?.trim()),
		weightSetId: perWorkoutGym ? null : blank(exercise.weightSetId),
		unit: ownUnit(exercise.weightUnit, options.routineUnit),
		overrides: [
			blank(exercise.overloadPercentage),
			blank(exercise.lastSetToFailure),
			blank(exercise.forceRIRMatching),
			blank(exercise.minimumWeightChange)
		].join('|')
	};
}

const sameExercise = (a: RoutinePlanExercise, b: RoutinePlanExercise) =>
	a.exerciseId && b.exerciseId ? a.exerciseId === b.exerciseId : a.name === b.name;

/** An exercise's unit by name: its own, else the routine's */
const unitName = (unit: WeightUnit | null, routineUnit: RoutineWeightUnit) => {
	const shown = unit ?? routineUnit;
	return shown === 'LB' ? 'lb' : shown === 'KG' ? 'kg' : 'the unit picked each workout';
};

/** Human-readable differences between a routine and a workout done from it; empty when none */
export function routineChanges(
	routine: RoutinePlanExercise[],
	workout: RoutinePlanExercise[],
	options: RoutineChangeOptions
): string[] {
	const changes: string[] = [];
	const added = workout.filter((ex) => !routine.some((old) => sameExercise(old, ex)));
	const removed = routine.filter((old) => !workout.some((ex) => sameExercise(old, ex)));
	added.forEach((ex) => changes.push(`Added: ${ex.name}`));
	removed.forEach((ex) => changes.push(`Removed: ${ex.name}`));

	const kept = workout.filter((ex) => routine.some((old) => sameExercise(old, ex)));
	const keptInRoutineOrder = routine.filter((old) => kept.some((ex) => sameExercise(old, ex)));
	if (kept.some((ex, idx) => !sameExercise(ex, keptInRoutineOrder[idx]))) changes.push('Order of exercises changed');

	for (const ex of kept) {
		const old = routine.find((candidate) => sameExercise(candidate, ex))!;
		const [before, after] = [plan(old, options), plan(ex, options)];
		if (!options.deload && before.sets !== after.sets) {
			changes.push(`${ex.name}: ${after.sets} ${after.sets === 1 ? 'set' : 'sets'} (routine: ${before.sets})`);
		}
		if (before.setType !== after.setType) {
			changes.push(
				`${ex.name}: ${convertCamelCaseToNormal(after.setType)} sets (routine: ${convertCamelCaseToNormal(before.setType)} sets)`
			);
		}
		if (before.repRange !== after.repRange) {
			changes.push(`${ex.name}: ${after.repRange} reps (routine: ${before.repRange})`);
		}
		if (before.setType === after.setType && before.topRange !== after.topRange) {
			changes.push(`${ex.name}: top set ${after.topRange} reps (routine: ${before.topRange})`);
		}
		if (before.setType === after.setType && before.loadChange !== after.loadChange) {
			changes.push(`${ex.name}: load change between sets`);
		}
		if (before.note !== after.note) changes.push(`${ex.name}: routine note`);
		if (before.weightSetId !== after.weightSetId) changes.push(`${ex.name}: weights available`);
		if (before.unit !== after.unit) {
			changes.push(
				`${ex.name}: in ${unitName(after.unit, options.routineUnit)} (routine: ${unitName(before.unit, options.routineUnit)})`
			);
		}
		if (before.overrides !== after.overrides) changes.push(`${ex.name}: progression overrides`);
	}
	return changes;
}
