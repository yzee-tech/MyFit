import {
	DELOAD_RIR,
	DELOAD_WEEK,
	formatWeekEffort,
	getBlockWeek,
	getRIRForWeek,
	isDeloadWeek,
	progressiveOverloadMagic,
	suggestWeeklyRIR,
	weeklyRIRFromWeeksPerRIR,
	createWorkoutExerciseInProgressFromMesocycleExerciseTemplate,
	switchExerciseUnit,
	getNextWeightHint,
	getExerciseVolume,
	allSetsAtMaxReps,
	type ExerciseHistory,
	type PreviousPerformance
} from '../../src/lib/utils/workoutUtils';
import {
	convertWeight,
	defaultWeightStep,
	formatWeight,
	fromKg,
	resolveExerciseUnit,
	roundWeight,
	snapToStep,
	toKg
} from '../../src/lib/utils/weightUnits';
import {
	availableWeightsFor,
	expandRange,
	formatWeightList,
	levelSetsFor,
	nextWeightUp,
	pickableWeightSets,
	normalizeWeights,
	type WeightSetLike
} from '../../src/lib/utils/weightSets';
import { test, expect } from '../fixtures';
import { testMesocycle } from './data';

test('progress first cycle, no changes', () => {
	const currentRIR = getRIRForWeek(testMesocycle.weeklyRIR, 1);

	for (let i = 0; i < testMesocycle.mesocycleExerciseSplitDays.length; i++) {
		const output = progressiveOverloadMagic(testMesocycle, 1, 100, i);

		// Check correct RIR
		output.forEach((exercise) => {
			const lastSetToFailure = exercise.lastSetToFailure ?? testMesocycle.lastSetToFailure;
			exercise.sets.forEach((set, idx) => {
				if (idx === exercise.sets.length - 1 && lastSetToFailure) {
					expect(set.RIR).toEqual(0);
					return;
				}
				expect(set.RIR).toEqual(currentRIR);
			});
		});

		const exercisesWithoutSets = testMesocycle.mesocycleExerciseSplitDays[i].mesocycleSplitDayExercises.map(
			(exercise) => {
				const { id, mesocycleExerciseSplitDayId, sets, ...rest } = exercise;
				return rest;
			}
		);
		const outputWithoutSets = output.map((exercise) => {
			const { sets, ...rest } = exercise;
			// Exercises without their own unit take the routine's (kg here)
			return { ...rest, weightUnit: rest.weightUnit === 'KG' ? null : rest.weightUnit };
		});

		// Make sure all values are correct
		expect(exercisesWithoutSets).toStrictEqual(outputWithoutSets);
	}
});

type TestSet = { reps: number; load: number; RIR: number };

/** A past performance of a test exercise, as the server would load it from any workout */
function performance(
	exerciseName: string,
	sets: TestSet[],
	userBodyweight = 100,
	weightUnit: 'KG' | 'LB' | 'LEVEL' = 'KG'
): PreviousPerformance {
	const template = testMesocycle.mesocycleExerciseSplitDays
		.flatMap((splitDay) => splitDay.mesocycleSplitDayExercises)
		.find((exercise) => exercise.name === exerciseName)!;
	const { id, mesocycleExerciseSplitDayId, sets: _sets, ...exercise } = template;
	return {
		oldUserBodyweight: userBodyweight,
		exercise: {
			...exercise,
			id: `past-${exerciseName}`,
			weightUnit,
			exerciseNote: null,
			workoutId: 'past-workout',
			sets: sets.map((set, setIndex) => ({
				...set,
				id: `set-${setIndex}`,
				setIndex,
				skipped: false,
				workoutExerciseId: `past-${exerciseName}`,
				miniSets: []
			}))
		}
	};
}

test('progression uses the last time an exercise was done, in any routine', () => {
	// Pull-ups: 5-15 reps, 3 sets, full bodyweight. Last done (somewhere else) at 10, 10, 9 reps
	const history: ExerciseHistory = {
		'Pull-ups': [
			performance('Pull-ups', [
				{ reps: 10, load: 0, RIR: 3 },
				{ reps: 10, load: 0, RIR: 3 },
				{ reps: 9, load: 0, RIR: 3 }
			])
		]
	};
	const output = progressiveOverloadMagic(testMesocycle, 1, 100, 0, history);
	const pullUps = output.find((exercise) => exercise.name === 'Pull-ups')!;

	// Same weight, and at least one set asks for more reps than last time
	pullUps.sets.forEach((set) => expect(set.load).toEqual(0));
	const oldReps = [10, 10, 9];
	expect(pullUps.sets.some((set, idx) => set.reps! > oldReps[idx])).toBe(true);
	pullUps.sets.forEach((set, idx) => expect(set.reps!).toBeGreaterThanOrEqual(oldReps[idx]));

	// Exercises without history stay blank
	const barbellRows = output.find((exercise) => exercise.name === 'Barbell rows')!;
	barbellRows.sets.forEach((set) => {
		expect(set.reps).toBeUndefined();
		expect(set.load).toBeUndefined();
	});
});

test('the routine decides the number of sets, not the last performance', () => {
	const moreSets = progressiveOverloadMagic(testMesocycle, 1, 100, 0, {
		'Pull-ups': [performance('Pull-ups', Array(5).fill({ reps: 10, load: 0, RIR: 3 }))]
	});
	expect(moreSets.find((exercise) => exercise.name === 'Pull-ups')!.sets).toHaveLength(3);

	const fewerSets = progressiveOverloadMagic(testMesocycle, 1, 100, 0, {
		'Pull-ups': [performance('Pull-ups', [{ reps: 10, load: 0, RIR: 3 }])]
	});
	const pullUps = fewerSets.find((exercise) => exercise.name === 'Pull-ups')!;
	expect(pullUps.sets).toHaveLength(3);
	// Missing sets copy the last suggested set instead of staying blank
	pullUps.sets.forEach((set) => expect(set.reps).toBeDefined());
});

test('block weeks follow the calendar', () => {
	const start = new Date('2026-09-01T08:00:00Z');
	expect(getBlockWeek(start, new Date('2026-09-01T20:00:00Z'))).toEqual(1);
	expect(getBlockWeek(start, new Date('2026-09-07T20:00:00Z'))).toEqual(1);
	expect(getBlockWeek(start, new Date('2026-09-08T09:00:00Z'))).toEqual(2);
	expect(getBlockWeek(start, new Date('2026-09-29T09:00:00Z'))).toEqual(5);
});

test('RIR stays at the last week once a block runs past its length', () => {
	// 3 weeks at 3 RIR, 3 at 2, 3 at 1, 1 at 0 = 10 weeks
	expect(getRIRForWeek(testMesocycle.weeklyRIR, 1)).toEqual(3);
	expect(getRIRForWeek(testMesocycle.weeklyRIR, 10)).toEqual(0);
	expect(getRIRForWeek(testMesocycle.weeklyRIR, 12)).toEqual(0);
});

test('weekly plans: suggested plans and converting the old format', () => {
	expect(suggestWeeklyRIR(1)).toEqual([2]);
	expect(suggestWeeklyRIR(3)).toEqual([3, 2, 0]);
	expect(suggestWeeklyRIR(5)).toEqual([3, 2, 1, 0, DELOAD_WEEK]);
	// Old format: weeks per RIR level, done from the highest RIR down
	expect(weeklyRIRFromWeeksPerRIR([1, 3, 3, 3])).toEqual([3, 3, 3, 2, 2, 2, 1, 1, 1, 0]);
	expect(weeklyRIRFromWeeksPerRIR([2, 0, 1])).toEqual([2, 0, 0]);

	const plan = [3, 1, DELOAD_WEEK];
	expect(isDeloadWeek(plan, 3)).toBe(true);
	expect(getRIRForWeek(plan, 3)).toEqual(DELOAD_RIR);
	expect(formatWeekEffort(plan, 2)).toEqual('1 RIR');
	expect(formatWeekEffort(plan, 3)).toEqual('Deload');
});

test('deload: same weights and reps target as last time, half the sets, easy effort', () => {
	const lastTime = [
		{ reps: 12, load: 20, RIR: 1 },
		{ reps: 11, load: 20, RIR: 1 },
		{ reps: 10, load: 20, RIR: 0 }
	];
	const history: ExerciseHistory = { 'Barbell rows': [performance('Barbell rows', lastTime)] };
	const output = progressiveOverloadMagic(testMesocycle, 1, 100, 0, history, 'deload');
	const rows = output.find((exercise) => exercise.name === 'Barbell rows')!;

	expect(rows.sets).toHaveLength(2); // 3 sets in the routine, halved and rounded up
	rows.sets.forEach((set, idx) => {
		expect(set.load).toEqual(20);
		expect(set.RIR).toEqual(DELOAD_RIR);
		// Easier: fewer reps than last time, never more
		expect(set.reps!).toBeLessThanOrEqual(lastTime[idx].reps);
	});
});

test('welcome back: repeat last numbers with 1 extra RIR, no set to failure', () => {
	const lastTime = [
		{ reps: 12, load: 20, RIR: 3 },
		{ reps: 12, load: 20, RIR: 3 },
		{ reps: 11, load: 20, RIR: 3 }
	];
	const history: ExerciseHistory = { 'Barbell rows': [performance('Barbell rows', lastTime)] };
	// Week 1 of the test plan is 3 RIR, so welcome back asks for 4
	const output = progressiveOverloadMagic(testMesocycle, 1, 100, 0, history, 'welcomeBack');
	const rows = output.find((exercise) => exercise.name === 'Barbell rows')!;

	expect(rows.sets).toHaveLength(3);
	rows.sets.forEach((set, idx) => {
		expect(set.load).toEqual(20);
		expect(set.RIR).toEqual(4);
		expect(set.reps).toEqual(lastTime[idx].reps - 1);
	});

	// Normal progression from the same history pushes past last time instead
	const normal = progressiveOverloadMagic(testMesocycle, 1, 100, 0, history).find(
		(exercise) => exercise.name === 'Barbell rows'
	)!;
	expect(normal.sets.some((set, idx) => set.reps! > lastTime[idx].reps || set.load! > 20)).toBe(true);
});

test('weight units: conversion, steps and which unit an exercise uses', () => {
	expect(roundWeight(fromKg(toKg(30, 'LB'), 'LB'))).toEqual(30);
	expect(convertWeight(100, 'KG', 'LB')).toEqual(220.46);
	expect(convertWeight(45, 'LB', 'KG')).toEqual(20.41);
	expect(snapToStep(13.61, 2.5)).toEqual(12.5);
	expect(snapToStep(88.18, 5)).toEqual(90);
	expect(defaultWeightStep('KG')).toEqual(2.5);
	expect(defaultWeightStep('LB')).toEqual(5);
	// Exercise's own unit wins, then the routine's, then the one picked for the workout
	expect(resolveExerciseUnit('LB', 'KG', 'KG')).toEqual('LB');
	expect(resolveExerciseUnit(null, 'KG', 'LB')).toEqual('KG');
	expect(resolveExerciseUnit(null, 'ASK', 'LB')).toEqual('LB');
});

test('history in lb, exercise now in kg: suggestion moves to real kg weights, same effort', () => {
	// Last time: 90 lb (stored as kg) × 12, 12, 11 in lb; today the routine is in kg
	const lastTime = [
		{ reps: 12, load: toKg(90, 'LB'), RIR: 3 },
		{ reps: 12, load: toKg(90, 'LB'), RIR: 3 },
		{ reps: 11, load: toKg(90, 'LB'), RIR: 3 }
	];
	const history: ExerciseHistory = { 'Barbell rows': [performance('Barbell rows', lastTime, 100, 'LB')] };
	const output = progressiveOverloadMagic(testMesocycle, 1, 100, 0, history);
	const rows = output.find((exercise) => exercise.name === 'Barbell rows')!;

	expect(rows.weightUnit).toEqual('KG');
	rows.sets.forEach((set) => {
		// 90 lb = 40.8 kg, which isn't a real kg weight: on 2.5 kg steps it's 40 kg
		expect(fromKg(set.load!, 'KG') % 2.5).toBeCloseTo(0);
		expect(set.load!).toBeCloseTo(40);
	});
	// Slightly lighter than last time, so at least as many reps
	expect(rows.sets[0].reps!).toBeGreaterThanOrEqual(12);
});

test('switching an exercise to lb mid-workout: done sets keep their weight, the rest snap', () => {
	const exercise = testMesocycle.mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find(
		(ex) => ex.name === 'Barbell rows'
	)!;
	const inProgress = createWorkoutExerciseInProgressFromMesocycleExerciseTemplate({ ...exercise, sets: 2 });
	inProgress.sets[0] = { ...inProgress.sets[0], reps: 12, load: 40, RIR: 2, completed: true };
	inProgress.sets[1] = { ...inProgress.sets[1], reps: 12, load: 40, RIR: 2, completed: false };

	const inLb = switchExerciseUnit(inProgress, 'LB', 100);
	expect(inLb.weightUnit).toEqual('LB');
	expect(inLb.sets[0].load).toEqual(88.18); // exactly what was lifted
	expect(inLb.sets[0].reps).toEqual(12);
	expect(inLb.sets[1].load).toEqual(90); // next real lb weight
	expect(inLb.sets[1].reps!).toBeLessThanOrEqual(12); // a touch heavier, so not more reps
});

// Weight sets: the building gym's dumbbells go 5–10 kg by 1, then 14 and 20
const buildingDumbbells: WeightSetLike = {
	id: 'building-db',
	name: 'Building – Dumbbells',
	unit: 'KG',
	weights: [5, 6, 7, 8, 9, 10, 14, 20]
};

/** The test block with Barbell rows at 8–12 reps using a weight set, no set to failure */
function blockWithWeightSet(weightSetId: string | null = buildingDumbbells.id) {
	const block = structuredClone(testMesocycle);
	block.lastSetToFailure = false;
	const rows = block.mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find((ex) => ex.name === 'Barbell rows')!;
	Object.assign(rows, { repRangeStart: 8, repRangeEnd: 12, weightSetId });
	return block;
}

function rowsSuggestion(lastTime: TestSet[], weightSets: WeightSetLike[]) {
	const history: ExerciseHistory = { 'Barbell rows': [performance('Barbell rows', lastTime)] };
	const output = progressiveOverloadMagic(blockWithWeightSet(), 1, 100, 0, history, 'normal', weightSets);
	return output.find((exercise) => exercise.name === 'Barbell rows')!;
}

const sets = (load: number, ...reps: number[]) => reps.map((r) => ({ reps: r, load, RIR: 3 }));

test('weight sets: building, formatting and which weights an exercise can use', () => {
	expect(expandRange(5, 10, 1)).toEqual([5, 6, 7, 8, 9, 10]);
	expect(expandRange(2.5, 10, 2.5)).toEqual([2.5, 5, 7.5, 10]);
	expect(expandRange(10, 5, 1)).toEqual([]);
	expect(normalizeWeights([14, 5, 5, 20, 0, 6.001])).toEqual([5, 6, 14, 20]);
	expect(formatWeightList(buildingDumbbells.weights)).toEqual('5–10 by 1, 14, 20');
	expect(nextWeightUp(buildingDumbbells.weights, 10)).toEqual(14);
	expect(nextWeightUp(buildingDumbbells.weights, 20)).toBeNull();

	const weightSets = [buildingDumbbells];
	expect(availableWeightsFor({ weightSetId: 'building-db', weightUnit: 'KG' }, weightSets)).toEqual(
		buildingDumbbells.weights
	);
	// Only in the set's own unit, and only if it exists
	expect(availableWeightsFor({ weightSetId: 'building-db', weightUnit: 'LB' }, weightSets)).toBeNull();
	expect(availableWeightsFor({ weightSetId: 'gone', weightUnit: 'KG' }, weightSets)).toBeNull();
	expect(availableWeightsFor({ weightSetId: null, weightUnit: 'KG' }, weightSets)).toBeNull();
	// A kg routine's exercise takes its weight set's unit; "ask each time" uses the gym's
	expect(resolveExerciseUnit(null, 'KG', 'KG', 'LB')).toEqual('LB');
	expect(resolveExerciseUnit(null, 'ASK', 'KG', 'LB')).toEqual('KG');
	expect(resolveExerciseUnit('KG', 'LB', 'LB', 'LB')).toEqual('KG');
});

test('weight sets: a big jump means staying at the weight and adding reps, with a next-weight note', () => {
	// 10 kg × 12, 12, 11: 14 kg would only be about 6 reps, under the 8-rep minimum
	const rows = rowsSuggestion(sets(10, 12, 12, 11), [buildingDumbbells]);
	rows.sets.forEach((set) => expect(set.load).toEqual(10));
	expect(rows.sets.map((set) => set.reps)).toEqual([13, 13, 12]); // past the top of the range is fine

	const hint = getNextWeightHint(rows, buildingDumbbells.weights, 100);
	expect(hint).toEqual({ currentWeight: 10, nextWeight: 14, moreReps: 8 });
	// No note while still inside the rep range, or without a weight set
	expect(
		getNextWeightHint(rowsSuggestion(sets(10, 9, 9, 9), [buildingDumbbells]), buildingDumbbells.weights, 100)
	).toBeNull();
	expect(getNextWeightHint(rows, null, 100)).toBeNull();
});

test('weight sets: moves up to the next weight once it keeps the reps in range', () => {
	// 10 kg × 21 is about the same effort as 14 kg × 8
	const rows = rowsSuggestion(sets(10, 21, 21, 21), [buildingDumbbells]);
	rows.sets.forEach((set) => {
		expect(set.load).toEqual(14);
		expect(set.reps!).toBeGreaterThanOrEqual(8);
	});
	expect(getNextWeightHint(rows, buildingDumbbells.weights, 100)).toBeNull();
});

test('weight sets: a weight the gym lacks becomes one it has, with reps adjusted', () => {
	// Last time 14 kg somewhere else; this hotel only has 12 and 16 kg
	const hotel: WeightSetLike = { ...buildingDumbbells, weights: [12, 16] };
	const rows = rowsSuggestion(sets(14, 8, 8, 8), [hotel]);
	rows.sets.forEach((set) => {
		expect(set.load).toEqual(12);
		expect(set.reps!).toBeGreaterThan(8); // lighter, so more reps for the same effort
	});

	// Between two weights, the one that keeps the reps in the 8–12 range wins over the nearest:
	// 9.4 kg is nearest 9 kg, but that would be too many reps; 10 kg keeps them in range
	const tenOrNine = rowsSuggestion(sets(9.4, 11, 11, 11), [{ ...buildingDumbbells, weights: [9, 10] }]);
	tenOrNine.sets.forEach((set) => {
		expect(set.load).toEqual(10);
		expect(set.reps!).toBeGreaterThanOrEqual(8);
		expect(set.reps!).toBeLessThanOrEqual(12);
	});
});

test('weight sets: switching units uses the weight set in the new unit', () => {
	const exercise = blockWithWeightSet('club-db').mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find(
		(ex) => ex.name === 'Barbell rows'
	)!;
	const clubDumbbells: WeightSetLike = { id: 'club-db', name: 'Club', unit: 'LB', weights: [80, 95, 110] };
	const inProgress = createWorkoutExerciseInProgressFromMesocycleExerciseTemplate({ ...exercise, sets: 1 });
	inProgress.sets[0] = { ...inProgress.sets[0], reps: 10, load: 40, RIR: 2, completed: false };

	// 40 kg = 88.2 lb: not on 5 lb steps here, but one of the club's weights
	const inLb = switchExerciseUnit(inProgress, 'LB', 100, [clubDumbbells]);
	expect([80, 95]).toContain(inLb.sets[0].load);
});

test('weight sets: an assisted machine counts help as a negative load, and less help is the next step', () => {
	const assist: WeightSetLike = {
		id: 'assist',
		name: 'Assist',
		unit: 'KG',
		weights: [5, 10, 15, 20],
		isAssistance: true
	};
	expect(availableWeightsFor({ weightSetId: 'assist', weightUnit: 'KG' }, [assist])).toEqual([-20, -15, -10, -5]);

	// Assisted pull-ups at 20 kg of help, past the top of the 8–12 range: next is 15 kg of help
	const block = blockWithWeightSet('assist');
	const rows = block.mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find((ex) => ex.name === 'Barbell rows')!;
	rows.bodyweightFraction = 1;
	const history: ExerciseHistory = {
		'Barbell rows': [performance('Barbell rows', sets(-20, 15, 15, 15), 100)]
	};
	history['Barbell rows'][0].exercise.bodyweightFraction = 1;
	const output = progressiveOverloadMagic(block, 1, 100, 0, history, 'normal', [assist]);
	const suggestion = output.find((exercise) => exercise.name === 'Barbell rows')!;
	suggestion.sets.forEach((set) => expect(set.load).toEqual(-15));
});

// Levels: a hotel chest press that shows levels 1–10 instead of weights
const hotelChestPress: WeightSetLike = {
	id: 'hotel-levels',
	name: 'Hotel – Chest press',
	unit: 'LEVEL',
	weights: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
};

/** Barbell rows on the level machine, 10–15 reps, steady effort (RIR 3 every week) unless a plan is given */
function levelSuggestion(
	history: PreviousPerformance[],
	setType: 'Straight' | 'Down' = 'Straight',
	plan: { weeklyRIR: number[]; week: number } = { weeklyRIR: [3], week: 1 }
) {
	const block = blockWithWeightSet(hotelChestPress.id);
	block.weeklyRIR = plan.weeklyRIR;
	const rows = block.mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find((ex) => ex.name === 'Barbell rows')!;
	Object.assign(rows, { repRangeStart: 10, repRangeEnd: 15, weightUnit: 'LEVEL', setType, changeType: null });
	const output = progressiveOverloadMagic(block, plan.week, 100, 0, { 'Barbell rows': history }, 'normal', [
		hotelChestPress
	]);
	return output.find((exercise) => exercise.name === 'Barbell rows')!;
}
const levelSets = (level: number, ...reps: number[]) => sets(level, ...reps);
const levelPerformance = (lastTime: TestSet[]) => performance('Barbell rows', lastTime, 100, 'LEVEL');

test('levels: which unit, how they show, and they never convert', () => {
	expect(resolveExerciseUnit(null, 'KG', 'KG', 'LEVEL')).toEqual('LEVEL');
	expect(resolveExerciseUnit('LB', 'KG', 'KG', 'LEVEL')).toEqual('LEVEL');
	expect(resolveExerciseUnit(null, 'ASK', 'LB', 'LEVEL')).toEqual('LEVEL');
	expect(formatWeight(7, 'LEVEL')).toEqual('Level 7');
	expect(convertWeight(7, 'LEVEL', 'LB')).toEqual(7);
	expect(defaultWeightStep('LEVEL')).toEqual(1);
	expect(availableWeightsFor({ weightSetId: 'hotel-levels', weightUnit: 'LEVEL' }, [hotelChestPress])).toEqual(
		hotelChestPress.weights
	);
});

test('levels: a rep more each time, up to the top of the rep range', () => {
	const rows = levelSuggestion([levelPerformance(levelSets(7, 12, 13, 12))]);
	expect(rows.weightUnit).toEqual('LEVEL');
	rows.sets.forEach((set) => expect(set.load).toEqual(7));
	expect(rows.sets.map((set) => set.reps)).toEqual([13, 14, 13]);
	// No next-weight note: levels don't use the weight formula
	expect(getNextWeightHint(rows, hotelChestPress.weights, 100)).toBeNull();
});

test('levels: once every set reaches the top, the next level at the bottom of the range', () => {
	const rows = levelSuggestion([levelPerformance(levelSets(7, 15, 15, 15))]);
	rows.sets.forEach((set) => {
		expect(set.load).toEqual(8);
		expect(set.reps).toEqual(10);
	});

	// Sets sharing a level wait until they're all at the top
	const waiting = levelSuggestion([levelPerformance(levelSets(7, 15, 15, 14))]);
	waiting.sets.forEach((set) => expect(set.load).toEqual(7));
	expect(waiting.sets.map((set) => set.reps)).toEqual([15, 15, 15]);
});

test('levels: at the highest level, reps keep going up', () => {
	const rows = levelSuggestion([levelPerformance(levelSets(10, 15, 15, 15))]);
	rows.sets.forEach((set) => {
		expect(set.load).toEqual(10);
		expect(set.reps).toEqual(16);
	});
});

test('levels: only compared with level sessions, and never with weights', () => {
	// Done on a weight stack last time, on levels before that: the level session is the one used
	const rows = levelSuggestion([
		levelPerformance(levelSets(5, 11, 11, 11)),
		performance('Barbell rows', sets(40, 10, 10, 10))
	]);
	rows.sets.forEach((set) => expect(set.load).toEqual(5));
	expect(rows.sets.map((set) => set.reps)).toEqual([12, 12, 12]);

	// Only weights before: nothing to go on, so the sets start blank
	const blank = levelSuggestion([performance('Barbell rows', sets(40, 10, 10, 10))]);
	blank.sets.forEach((set) => expect(set.load).toBeUndefined());

	// And a weights exercise ignores level sessions
	const history: ExerciseHistory = { 'Barbell rows': [levelPerformance(levelSets(7, 12, 12, 12))] };
	const weights = progressiveOverloadMagic(blockWithWeightSet(null), 1, 100, 0, history);
	weights.find((exercise) => exercise.name === 'Barbell rows')!.sets.forEach((set) => expect(set.load).toBeUndefined());

	// Levels don't count towards kg volume
	expect(getExerciseVolume(levelPerformance(levelSets(7, 12, 12, 12)).exercise, 100)).toEqual(0);
	expect(getExerciseVolume(performance('Barbell rows', sets(40, 10)).exercise, 100)).toBeGreaterThan(0);
});

test('levels: an easier week after going up a level stays at the bottom of the range, at that week’s effort', () => {
	// Last time level 7 × 15 at RIR 2; this week's plan is RIR 3
	const rows = levelSuggestion(
		[levelPerformance(levelSets(7, 15, 15, 15).map((set) => ({ ...set, RIR: 2 })))],
		'Straight',
		{ weeklyRIR: [2, 3], week: 2 }
	);
	rows.sets.forEach((set) => {
		expect(set.load).toEqual(8);
		expect(set.reps).toEqual(10);
		expect(set.RIR).toEqual(3);
	});

	// Still on the same level, the easier week takes a rep off
	const same = levelSuggestion(
		[levelPerformance(levelSets(7, 12, 12, 12).map((set) => ({ ...set, RIR: 2 })))],
		'Straight',
		{ weeklyRIR: [2, 3], week: 2 }
	);
	expect(same.sets.map((set) => [set.load, set.reps, set.RIR])).toEqual([
		[7, 12, 3],
		[7, 12, 3],
		[7, 12, 3]
	]);
});

test('levels: sets the routine no longer has don’t hold back the next level', () => {
	// Did 4 sets last time, the 4th short of the top; the routine now has 3
	const history = [levelPerformance([...levelSets(7, 15, 15, 15), { reps: 12, load: 7, RIR: 3 }])];
	const rows = levelSuggestion(history);
	expect(rows.sets).toHaveLength(3);
	rows.sets.forEach((set) => {
		expect(set.load).toEqual(8);
		expect(set.reps).toEqual(10);
	});
});

test('levels: down sets move up together, keeping their gaps', () => {
	const downSets = (levels: number[], reps: number[]) =>
		levelPerformance(levels.map((level, idx) => ({ reps: reps[idx], load: level, RIR: 3 })));
	const shape = (rows: ReturnType<typeof levelSuggestion>) => rows.sets.map((set) => [set.load, set.reps]);

	// Only the last set is at the top: it waits, the others get a rep more
	expect(shape(levelSuggestion([downSets([8, 7, 6], [10, 12, 15])], 'Down'))).toEqual([
		[8, 11],
		[7, 13],
		[6, 15]
	]);
	// All at the top: each one level up, back at the bottom of the range
	expect(shape(levelSuggestion([downSets([8, 7, 6], [15, 15, 15])], 'Down'))).toEqual([
		[9, 10],
		[8, 10],
		[7, 10]
	]);
	// The first set is on the highest level: none move up, reps keep going up
	expect(shape(levelSuggestion([downSets([10, 9, 8], [15, 15, 15])], 'Down'))).toEqual([
		[10, 16],
		[9, 16],
		[8, 16]
	]);
});

// Reps only: Barbell rows at 8–12 reps, no set to failure, steady effort (RIR 3 every week)
function repsOnlySuggestion(
	history: PreviousPerformance[],
	options: {
		repsOnly?: Map<string, number | null>;
		weightSetId?: string | null;
		weightSets?: WeightSetLike[];
		plan?: { weeklyRIR: number[]; week: number };
		mode?: 'normal' | 'deload' | 'welcomeBack';
		routineSets?: number;
	} = {}
) {
	const block = blockWithWeightSet(options.weightSetId ?? null);
	block.weeklyRIR = options.plan?.weeklyRIR ?? [3];
	const rows = block.mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find((ex) => ex.name === 'Barbell rows')!;
	if (options.routineSets) rows.sets = options.routineSets;
	const output = progressiveOverloadMagic(
		block,
		options.plan?.week ?? 1,
		100,
		0,
		{ 'Barbell rows': history },
		options.mode ?? 'normal',
		options.weightSets ?? [],
		options.repsOnly ?? new Map()
	);
	return output.find((exercise) => exercise.name === 'Barbell rows')!;
}
const repsOnlyRows = (maxReps: number | null = null) => new Map([['Barbell rows', maxReps]]);
const shapeOf = (ex: { sets: { load?: number; reps?: number }[] }) => ex.sets.map((set) => [set.load, set.reps]);

test('reps only: past the top of the range, more reps at the same load, where normally the load goes up', () => {
	const history = [performance('Barbell rows', sets(40, 13, 13, 13))];
	// Normally: past 12 reps, the load goes up
	const normal = repsOnlySuggestion(history);
	normal.sets.forEach((set) => expect(set.load!).toBeGreaterThan(40));
	// Reps only: same 40 kg, a rep more on every set
	const repsOnly = repsOnlySuggestion(history, { repsOnly: repsOnlyRows() });
	expect(shapeOf(repsOnly)).toEqual([
		[40, 14],
		[40, 14],
		[40, 14]
	]);
	// No next-weight note either, where there would be one otherwise (10 kg × 13, next is 14 kg)
	const nearTop = repsOnlySuggestion([performance('Barbell rows', sets(10, 12, 12, 11))], {
		repsOnly: repsOnlyRows(),
		weightSetId: buildingDumbbells.id,
		weightSets: [buildingDumbbells]
	});
	expect(getNextWeightHint(nearTop, buildingDumbbells.weights, 100, false)).not.toBeNull();
	expect(getNextWeightHint(nearTop, buildingDumbbells.weights, 100, true)).toBeNull();
});

test('reps only: plain sit-ups at load 0 keep going up in reps (no weight, no NaN)', () => {
	const history = [performance('Barbell rows', sets(0, 20, 20, 19))];
	const situps = repsOnlySuggestion(history, { repsOnly: repsOnlyRows() });
	expect(shapeOf(situps)).toEqual([
		[0, 21],
		[0, 21],
		[0, 20]
	]);
	situps.sets.forEach((set) => expect(Number.isFinite(set.reps)).toBe(true));
});

test('reps only: the load is never snapped to a weight set or to the steps of a new unit', () => {
	// 11 kg isn't one of the building's dumbbells (10 and 14 are), but it stays 11 kg
	const withWeightSet = repsOnlySuggestion([performance('Barbell rows', sets(11, 10, 10, 10))], {
		repsOnly: repsOnlyRows(),
		weightSetId: buildingDumbbells.id,
		weightSets: [buildingDumbbells]
	});
	expect(shapeOf(withWeightSet)).toEqual([
		[11, 11],
		[11, 11],
		[11, 11]
	]);
	// Done in lb last time (30 lb = 13.61 kg), in kg now: the exact same weight, not 12.5 kg
	const lb30 = toKg(30, 'LB');
	const unitChanged = repsOnlySuggestion([performance('Barbell rows', sets(lb30, 10, 10, 10), 100, 'LB')], {
		repsOnly: repsOnlyRows()
	});
	unitChanged.sets.forEach((set) => expect(set.load).toEqual(lb30));
});

test('reps only: the routine decides the number of sets, and added sets get the rep too', () => {
	const rows = repsOnlySuggestion([performance('Barbell rows', sets(10, 10, 10, 10))], {
		repsOnly: repsOnlyRows(),
		routineSets: 4
	});
	expect(shapeOf(rows)).toEqual([
		[10, 11],
		[10, 11],
		[10, 11],
		[10, 11]
	]);
});

test('reps only: max reps caps suggestions, even in a harder week; without a cap they keep going', () => {
	const at15 = [performance('Barbell rows', sets(0, 15, 15, 15))];
	expect(shapeOf(repsOnlySuggestion(at15, { repsOnly: repsOnlyRows(15) }))).toEqual([
		[0, 15],
		[0, 15],
		[0, 15]
	]);
	expect(shapeOf(repsOnlySuggestion(at15, { repsOnly: repsOnlyRows() }))).toEqual([
		[0, 16],
		[0, 16],
		[0, 16]
	]);
	// A harder week (RIR 3 → 1) doesn't add extra reps on top of the one, and never past the cap
	const harder = { weeklyRIR: [3, 1], week: 2 };
	const at14 = [performance('Barbell rows', sets(0, 14, 14, 14))];
	expect(shapeOf(repsOnlySuggestion(at14, { repsOnly: repsOnlyRows(), plan: harder }))).toEqual([
		[0, 15],
		[0, 15],
		[0, 15]
	]);
	expect(shapeOf(repsOnlySuggestion(at14, { repsOnly: repsOnlyRows(14), plan: harder }))).toEqual([
		[0, 14],
		[0, 14],
		[0, 14]
	]);
	// A cap below the routine's range (8–12) wins: 6 reps, not 10
	const capBelowRange = repsOnlySuggestion([performance('Barbell rows', sets(0, 9, 9, 9))], {
		repsOnly: repsOnlyRows(6)
	});
	capBelowRange.sets.forEach((set) => expect(set.reps).toEqual(6));
});

test('reps only: deload and welcome back repeat last time at an easier effort, same load', () => {
	const history = [performance('Barbell rows', sets(10, 12, 12, 12))];
	const deload = repsOnlySuggestion(history, { repsOnly: repsOnlyRows(), mode: 'deload' });
	expect(deload.sets).toHaveLength(2);
	deload.sets.forEach((set) => {
		expect(set.load).toEqual(10);
		expect(set.reps).toEqual(11); // RIR 3 → 4
	});
	const welcomeBack = repsOnlySuggestion(history, { repsOnly: repsOnlyRows(), mode: 'welcomeBack' });
	expect(shapeOf(welcomeBack)).toEqual([
		[10, 11],
		[10, 11],
		[10, 11]
	]);
});

test('reps only: a level exercise keeps its own rule; the at-max check', () => {
	// Reps only doesn't stop a level machine going up a level
	const levels = levelSuggestion([levelPerformance(levelSets(7, 15, 15, 15))]);
	const block = blockWithWeightSet(hotelChestPress.id);
	block.weeklyRIR = [3];
	const rows = block.mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find((ex) => ex.name === 'Barbell rows')!;
	Object.assign(rows, { repRangeStart: 10, repRangeEnd: 15, weightUnit: 'LEVEL' });
	const withRepsOnly = progressiveOverloadMagic(
		block,
		1,
		100,
		0,
		{ 'Barbell rows': [levelPerformance(levelSets(7, 15, 15, 15))] },
		'normal',
		[hotelChestPress],
		repsOnlyRows(15)
	).find((exercise) => exercise.name === 'Barbell rows')!;
	expect(shapeOf(withRepsOnly)).toEqual(shapeOf(levels));
	expect(withRepsOnly.sets[0].load).toEqual(8);

	const ex = (...reps: number[]) => ({ sets: reps.map((r) => ({ reps: r, skipped: false })) });
	expect(allSetsAtMaxReps(ex(30, 30, 30), 30)).toBe(true);
	expect(allSetsAtMaxReps(ex(30, 30, 28), 30)).toBe(false);
	expect(allSetsAtMaxReps(ex(30, 30, 30), null)).toBe(false);
});

test('levels set on the exercise: its levels apply whatever weight set it has, and are never picked as a set', () => {
	const [press] = levelSetsFor([{ id: 'e1', name: 'Chest press', levelsFrom: 1, levelsTo: 4, levelStep: 0.5 }]);
	expect(press).toMatchObject({ unit: 'LEVEL', weights: [1, 1.5, 2, 2.5, 3, 3.5, 4], levelsOf: 'Chest press' });
	expect(levelSetsFor([{ id: 'e2', name: 'Curls', levelsFrom: null, levelsTo: null, levelStep: null }])).toEqual([]);
	const weightSets = [buildingDumbbells, press];
	const pressExercise = { name: 'Chest press', weightSetId: buildingDumbbells.id };
	expect(availableWeightsFor({ ...pressExercise, weightUnit: 'LEVEL' }, weightSets)).toEqual(press.weights);
	expect(availableWeightsFor({ ...pressExercise, weightUnit: 'KG' }, weightSets)).toBeNull();
	expect(
		availableWeightsFor({ name: 'Curls', weightSetId: buildingDumbbells.id, weightUnit: 'KG' }, weightSets)
	).toEqual(buildingDumbbells.weights);
	expect(pickableWeightSets(weightSets)).toEqual([buildingDumbbells]);
});

// Myo-rep match: Barbell rows at 10–20 reps, 3 sets, steady effort (RIR 1 every week)
type MatchSet = TestSet & { miniSets?: number[] };
function myorepMatchSuggestion(lastTime: MatchSet[], weightSets: WeightSetLike[] = []) {
	const block = blockWithWeightSet(weightSets[0]?.id ?? null);
	block.weeklyRIR = [1];
	const rows = block.mesocycleExerciseSplitDays[0].mesocycleSplitDayExercises.find((ex) => ex.name === 'Barbell rows')!;
	Object.assign(rows, { repRangeStart: 10, repRangeEnd: 20, setType: 'MyorepMatch', sets: lastTime.length });
	const past = performance('Barbell rows', lastTime);
	past.exercise.setType = 'MyorepMatch';
	past.exercise.sets.forEach((set, setIdx) => {
		set.miniSets = (lastTime[setIdx].miniSets ?? []).map((reps, miniSetIndex) => ({
			id: `mini-${setIdx}-${miniSetIndex}`,
			miniSetIndex,
			reps,
			load: set.load,
			RIR: 1,
			workoutExerciseSetId: set.id
		}));
	});
	const output = progressiveOverloadMagic(block, 1, 100, 0, { 'Barbell rows': [past] }, 'normal', weightSets);
	return output.find((exercise) => exercise.name === 'Barbell rows')!;
}
const matchSet = (reps: number, ...miniSets: number[]): MatchSet => ({ reps, load: 40, RIR: 1, miniSets });

test('myo-rep match: set 1 past the top and every match in 3 mini-sets or fewer: all up a weight together', () => {
	// 22 reps on set 1; the match sets got there in 3 and 2 mini-sets
	const lastTime = [matchSet(22), matchSet(12, 4, 3, 3), matchSet(13, 5, 4)];
	const rows = myorepMatchSuggestion(lastTime);
	expect(rows.sets.map((set) => set.load)).toEqual([42.5, 42.5, 42.5]);
	// Set 1 fewer reps at the heavier weight, still in range; the match sets start fresh, to match it
	expect(rows.sets[0].reps).toBeLessThan(22);
	expect(rows.sets[0].reps).toBeGreaterThanOrEqual(10);
	rows.sets.forEach((set) => expect(set.miniSets).toEqual([]));
	rows.sets.slice(1).forEach((set) => expect(set.reps).toBeLessThanOrEqual(rows.sets[0].reps!));

	// With a gym's dumbbells: the next one it has, for every set
	const dumbbells: WeightSetLike = { id: 'db', name: 'DBs', unit: 'KG', weights: [36, 40, 45, 50] };
	expect(myorepMatchSuggestion(lastTime, [dumbbells]).sets.map((set) => set.load)).toEqual([45, 45, 45]);
});

test('myo-rep match: a match set taking 4 mini-sets, or not matching, keeps the weight', () => {
	const fourMiniSets = myorepMatchSuggestion([matchSet(22), matchSet(12, 3, 3, 2, 2), matchSet(13, 5, 4)]);
	expect(fourMiniSets.sets.map((set) => set.load)).toEqual([40, 40, 40]);
	const notMatched = myorepMatchSuggestion([matchSet(22), matchSet(12, 4, 3), matchSet(13, 5, 4)]);
	expect(notMatched.sets.map((set) => set.load)).toEqual([40, 40, 40]);
});

test('myo-rep match: set 1 not past the top of the range keeps the weight, even with quick matches', () => {
	const rows = myorepMatchSuggestion([matchSet(20), matchSet(15, 5), matchSet(14, 6)]);
	expect(rows.sets.map((set) => set.load)).toEqual([40, 40, 40]);
	// Only set 1 counts: a match set's main part past the top doesn't move it on its own
	const bigMatch = myorepMatchSuggestion([matchSet(18), matchSet(21), matchSet(19)]);
	expect(bigMatch.sets.map((set) => set.load)).toEqual([40, 40, 40]);
});
