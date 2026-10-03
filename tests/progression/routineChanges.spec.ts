import { test, expect } from '../fixtures';
import { routineChanges, ownUnit, type RoutinePlanExercise } from '../../src/lib/utils/routineChanges';
import { DEFAULT_SETS, routineSetCount } from '../../src/lib/utils/routineSets';

const exercise = (name: string, extra: Partial<RoutinePlanExercise> = {}): RoutinePlanExercise => ({
	exerciseId: `id-${name}`,
	name,
	sets: 3,
	setType: 'Straight',
	repRangeStart: 8,
	repRangeEnd: 12,
	...extra
});
const kg = { routineUnit: 'KG' as const, deload: false };
const routine = [exercise('Pull-ups'), exercise('Barbell rows'), exercise('Face pulls')];

test('no changes: nothing listed, however "nothing" is stored', () => {
	const sameButStoredDifferently = [
		exercise('Pull-ups', { note: '', changeType: null, topRepRangeStart: null, weightUnit: 'KG', weightSetId: null }),
		exercise('Barbell rows', { note: '   ', changeAmount: undefined, overloadPercentage: null }),
		// Load change and top-set ranges only matter for set types that use them
		exercise('Face pulls', { changeType: 'Percentage', changeAmount: 10, topRepRangeStart: 6, topRepRangeEnd: 8 })
	];
	expect(routineChanges(routine, sameButStoredDifferently, kg)).toEqual([]);
});

test('lists what changed in the plan: exercises, order, sets, set type, ranges, note, weights, unit, overrides', () => {
	const workout = [
		exercise('Barbell rows', { sets: 4, repRangeStart: 10, repRangeEnd: 15 }),
		exercise('Pull-ups', { setType: 'Down', changeType: 'AbsoluteLoad', changeAmount: 5, note: 'slow' }),
		exercise('Sit-ups', { sets: 2 }),
		exercise('Face pulls', { weightSetId: 'hotel', weightUnit: 'LB', overloadPercentage: 3 })
	];
	expect(routineChanges(routine, workout, kg)).toEqual([
		'Added: Sit-ups',
		'Order of exercises changed',
		'Barbell rows: 4 sets (routine: 3)',
		'Barbell rows: 10–15 reps (routine: 8–12)',
		'Pull-ups: Down sets (routine: Straight sets)',
		'Pull-ups: routine note',
		'Face pulls: weights available',
		'Face pulls: in lb (routine: kg)',
		'Face pulls: progression overrides'
	]);
	expect(routineChanges(routine, [exercise('Pull-ups'), exercise('Barbell rows')], kg)).toEqual([
		'Removed: Face pulls'
	]);
});

test('never compares what was lifted or the per-workout gym; deload weeks ignore set counts', () => {
	// Reps, loads, RIR and bodyweight aren't part of the plan at all; the same weights in another unit
	// only count when the exercise switched unit
	expect(
		routineChanges(
			routine,
			routine.map((ex) => ({ ...ex, weightUnit: 'KG' })),
			kg
		)
	).toEqual([]);
	// "Ask each time" routines pick a unit and gym per workout
	const atAGym = routine.map((ex) => ({ ...ex, weightUnit: 'LB' as const, weightSetId: 'hotel' }));
	expect(routineChanges(routine, atAGym, { routineUnit: 'ASK', deload: false })).toEqual([]);
	// Levels follow the weight set, not a unit choice
	expect(ownUnit('LEVEL', 'KG')).toBeNull();
	// A deload halves the sets on purpose
	const halved = routine.map((ex) => ({ ...ex, sets: 2 }));
	expect(routineChanges(routine, halved, { routineUnit: 'KG', deload: true })).toEqual([]);
	expect(routineChanges(routine, halved, kg)).toHaveLength(3);
	// The same exercise renamed on the Exercises page is still the same exercise
	expect(routineChanges(routine, [{ ...routine[0], name: 'Chin-ups' }, routine[1], routine[2]], kg)).toEqual([]);
});

test('a routine exercise without a set count has the usual 3', () => {
	expect(DEFAULT_SETS).toEqual(3);
	expect(routineSetCount(null)).toEqual(3);
	expect(routineSetCount(undefined)).toEqual(3);
	expect(routineSetCount(0)).toEqual(3);
	expect(routineSetCount(5)).toEqual(5);
});
