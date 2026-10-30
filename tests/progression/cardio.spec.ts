import { test, expect } from '@playwright/test';
import {
	convertDistance,
	distanceStep,
	distanceUnitLabel,
	formatDistance,
	formatDuration,
	formatPace,
	fromMeters,
	isValidDistanceMeters,
	isValidTimeSeconds,
	M_PER_FT,
	M_PER_MI,
	paceDenominator,
	paceSeconds,
	parseDuration,
	roundDistance,
	toMeters
} from '../../src/lib/utils/distanceUnits';
import { formatPreviousSet } from '../../src/lib/utils/previousSet';
import { intervalsLabel, isCardioMeasure, measureOfSets, savedRowMeasure } from '../../src/lib/utils/measure';
import { canWarmUp } from '../../src/lib/utils/oneRepMax';
import { periodStats } from '../../src/lib/utils/stats';
import {
	comparablePerformances,
	convertExerciseDistances,
	progressiveOverloadMagic,
	type ExerciseHistory,
	type PreviousPerformance,
	type ProgressionPlan
} from '../../src/lib/utils/workoutUtils';
import { testSettings } from './data';

test('distances: stored in metres, shown in km, mi, m or ft, and back without drift', () => {
	expect(toMeters(5, 'KM')).toBe(5000);
	expect(toMeters(1, 'MI')).toBeCloseTo(M_PER_MI, 6);
	expect(toMeters(500, 'M')).toBe(500);
	expect(toMeters(100, 'FT')).toBeCloseTo(100 * M_PER_FT, 6);
	expect(roundDistance(fromMeters(5000, 'KM'))).toBe(5);
	expect(roundDistance(fromMeters(M_PER_MI * 3.1, 'MI'))).toBe(3.1);
	expect(roundDistance(fromMeters(30.48, 'FT'))).toBe(100);
	// Round trips in every unit land on the same number
	for (const unit of ['KM', 'MI', 'M', 'FT'] as const) {
		for (const value of [0.5, 2.25, 10, 1234.5]) {
			expect(roundDistance(fromMeters(toMeters(value, unit), unit))).toBe(value);
		}
	}
	expect(convertDistance(5, 'KM', 'MI')).toBe(3.107);
	expect(convertDistance(2000, 'M', 'KM')).toBe(2);
	expect(convertDistance(7, 'KM', 'KM')).toBe(7);
	expect(formatDistance(5200, 'KM')).toBe('5.2 km');
	expect(formatDistance(1609.344, 'MI')).toBe('1 mi');
	expect(distanceUnitLabel('M')).toBe('m');
	expect(distanceUnitLabel('FT')).toBe('ft');
	// Metres and feet are whole; km and miles to 10 m
	expect(distanceStep('M')).toBe(1);
	expect(distanceStep('KM')).toBe(0.01);
});

test('times: m:ss (h:mm:ss past the hour) out, and m:ss, h:mm:ss or minutes in', () => {
	expect(formatDuration(0)).toBe('0:00');
	expect(formatDuration(30)).toBe('0:30');
	expect(formatDuration(90)).toBe('1:30');
	expect(formatDuration(26 * 60)).toBe('26:00');
	expect(formatDuration(3661)).toBe('1:01:01');
	expect(formatDuration(59.6)).toBe('1:00');

	expect(parseDuration('26:00')).toBe(1560);
	expect(parseDuration('0:30')).toBe(30);
	expect(parseDuration(' 1:01:01 ')).toBe(3661);
	expect(parseDuration('90:00')).toBe(5400);
	// A bare number is minutes
	expect(parseDuration('30')).toBe(1800);
	expect(parseDuration('12.5')).toBe(750);
	// Not a time: seconds past 59, minutes past 59 with hours, words, nothing, zero
	expect(parseDuration('1:60')).toBeNull();
	expect(parseDuration('1:60:00')).toBeNull();
	expect(parseDuration('fast')).toBeNull();
	expect(parseDuration('')).toBeNull();
	expect(parseDuration('0:00')).toBeNull();
	expect(parseDuration('0')).toBeNull();
	// More than a day isn't a time either (the save would refuse it)
	expect(parseDuration('24:00:00')).toBe(86_400);
	expect(parseDuration('24:00:01')).toBeNull();
	expect(parseDuration('1500')).toBeNull();

	// Bounds: whole seconds from 1 to a day; metres over 0 up to 1,000 km
	expect(isValidTimeSeconds(1)).toBe(true);
	expect(isValidTimeSeconds(86_400)).toBe(true);
	expect(isValidTimeSeconds(86_401)).toBe(false);
	expect(isValidTimeSeconds(0)).toBe(false);
	expect(isValidTimeSeconds(1.5)).toBe(false);
	expect(isValidDistanceMeters(0.1)).toBe(true);
	expect(isValidDistanceMeters(1_000_000)).toBe(true);
	expect(isValidDistanceMeters(0)).toBe(false);
	expect(isValidDistanceMeters(1_000_001)).toBe(false);
	expect(isValidDistanceMeters(Infinity)).toBe(false);
});

test('pace: per km, per mile, per 500 m for metres, per 100 ft; nothing without a distance and a time', () => {
	expect(paceDenominator('KM')).toEqual({ meters: 1000, label: '/km' });
	expect(paceDenominator('MI').label).toBe('/mi');
	expect(paceDenominator('M')).toEqual({ meters: 500, label: '/500m' });
	expect(paceDenominator('FT').label).toBe('/100ft');
	// 5 km in 26:00 is 5:12 /km
	expect(formatPace(1560, 5000, 'KM')).toBe('5:12 /km');
	// 2000 m rowed in 8:00 is 2:00 per 500 m
	expect(formatPace(480, 2000, 'M')).toBe('2:00 /500m');
	expect(formatPace(1560, 5000, 'MI')).toBe('8:22 /mi');
	expect(paceSeconds(1560, 5000, 'KM')).toBe(312);
	// No divide by zero or "NaN /km": nothing is shown until both are in
	expect(formatPace(0, 5000, 'KM')).toBeNull();
	expect(formatPace(1560, 0, 'KM')).toBeNull();
	expect(formatPace(null, 5000, 'KM')).toBeNull();
	expect(formatPace(1560, undefined, 'KM')).toBeNull();
	expect(paceSeconds(100, 0, 'KM')).toBeNull();
});

test('the "Previous" column for cardio: a time, a level and a time, a distance and a time', () => {
	const time = { measure: 'Time', distanceUnit: null } as const;
	const distance = { measure: 'DistanceTime', distanceUnit: 'KM' } as const;
	const set = { reps: 0, load: 0, RIR: 0, skipped: false, timeSeconds: 1560, distanceMeters: 5000 };
	expect(formatPreviousSet(set, 'weight', time)).toBe('26:00');
	expect(formatPreviousSet({ ...set, load: 8, timeSeconds: 30 }, 'level', time)).toBe('L8 · 0:30');
	expect(formatPreviousSet(set, 'weight', distance)).toBe('5 km · 26:00');
	expect(formatPreviousSet(set, 'weight', { measure: 'DistanceTime', distanceUnit: 'MI' })).toBe('3.107 mi · 26:00');
	expect(
		formatPreviousSet({ ...set, load: 5, timeSeconds: 480, distanceMeters: 2000 }, 'level', {
			measure: 'DistanceTime',
			distanceUnit: 'M'
		})
	).toBe('L5 · 2000 m · 8:00');
	expect(formatPreviousSet({ ...set, skipped: true }, 'weight', distance)).toBe('–');
	expect(formatPreviousSet(undefined, 'weight', distance)).toBe('–');
	// Reps sets read as before
	expect(formatPreviousSet({ reps: 10, load: 60, skipped: false }, 'weight')).toBe('60 × 10');
});

test('a saved row is measured by its own sets: distance, time, or reps; all skipped reads reps', () => {
	const done = (fields: object) => ({ skipped: false, ...fields });
	expect(measureOfSets([done({ timeSeconds: 60, distanceMeters: 500 })])).toBe('DistanceTime');
	expect(measureOfSets([done({ timeSeconds: 60 }), done({ timeSeconds: 60, distanceMeters: 500 })])).toBe(
		'DistanceTime'
	);
	expect(measureOfSets([done({ timeSeconds: 60 })])).toBe('Time');
	expect(measureOfSets([done({ timeSeconds: 60, distanceMeters: null })])).toBe('Time');
	expect(measureOfSets([done({})])).toBe('Reps');
	expect(measureOfSets([done({ timeSeconds: null, distanceMeters: null })])).toBe('Reps');
	// A skipped set says nothing; a row with every set skipped is inert
	expect(measureOfSets([{ skipped: true, timeSeconds: 60, distanceMeters: 500 }])).toBe('Reps');
	expect(measureOfSets([{ skipped: true, timeSeconds: 60 }, done({ timeSeconds: 30 })])).toBe('Time');
	expect(measureOfSets([])).toBe('Reps');

	expect(isCardioMeasure('Time')).toBe(true);
	expect(isCardioMeasure('DistanceTime')).toBe(true);
	expect(isCardioMeasure('Reps')).toBe(false);
	expect(isCardioMeasure(undefined)).toBe(false);
	expect(intervalsLabel(1)).toBe('1 interval');
	expect(intervalsLabel(8)).toBe('8 intervals');

	// How a saved row shows: its own measure, in the exercise's distance unit now (km by default)
	const cardio = { Run: { measure: 'DistanceTime', distanceUnit: 'MI' } } as const;
	expect(savedRowMeasure('Run', [done({ timeSeconds: 60, distanceMeters: 500 })], cardio)).toEqual({
		measure: 'DistanceTime',
		distanceUnit: 'MI'
	});
	expect(savedRowMeasure('Old run', [done({ timeSeconds: 60, distanceMeters: 500 })], cardio)).toEqual({
		measure: 'DistanceTime',
		distanceUnit: 'KM'
	});
	expect(savedRowMeasure('Plank', [done({ timeSeconds: 60 })], cardio)).toEqual({
		measure: 'Time',
		distanceUnit: null
	});
	expect(savedRowMeasure('Run', [done({})], cardio)).toEqual({ measure: 'Reps', distanceUnit: null });

	// Warm up is for weights: never for cardio, whatever its zero-filled load says
	expect(canWarmUp({ weightUnit: 'KG', bodyweightFraction: null }, false)).toBe(true);
	expect(canWarmUp({ weightUnit: 'KG', bodyweightFraction: null }, false, 'Time')).toBe(false);
	expect(canWarmUp({ weightUnit: 'KG', bodyweightFraction: null }, false, 'DistanceTime')).toBe(false);
});

/** A cardio exercise as a routine has it; its rep range is kept but means nothing */
function cardioExercise(name: string, sets: number, weightUnit: 'KG' | 'LEVEL' = 'KG') {
	return {
		name,
		targetMuscleGroup: 'Cardio' as const,
		customMuscleGroup: null,
		bodyweightFraction: null,
		sets,
		setType: 'V2' as const,
		repRangeStart: 8,
		repRangeEnd: 15,
		changeType: null,
		changeAmount: null,
		note: null,
		overloadPercentage: null,
		lastSetToFailure: null,
		forceRIRMatching: null,
		minimumWeightChange: null,
		topRepRangeStart: null,
		topRepRangeEnd: null,
		weightUnit,
		weightSetId: null,
		exerciseId: null
	};
}

type PastSet = { timeSeconds?: number | null; distanceMeters?: number | null; load?: number; skipped?: boolean };

/** Last time's row of an exercise, with cardio or reps sets */
function performance(name: string, sets: PastSet[], weightUnit: 'KG' | 'LEVEL' = 'KG'): PreviousPerformance {
	const { sets: _sets, exerciseId, ...exercise } = cardioExercise(name, sets.length, weightUnit);
	return {
		oldUserBodyweight: 80,
		exercise: {
			...exercise,
			id: `past-${name}`,
			exerciseIndex: 0,
			exerciseNote: null,
			workoutId: 'past-workout',
			exerciseId,
			sets: sets.map((set, setIndex) => ({
				id: `set-${setIndex}`,
				setIndex,
				workoutExerciseId: `past-${name}`,
				reps: set.timeSeconds == null ? 10 : 0,
				load: set.load ?? 0,
				RIR: set.timeSeconds == null ? 2 : 0,
				skipped: set.skipped ?? false,
				timeSeconds: set.timeSeconds ?? null,
				distanceMeters: set.distanceMeters ?? null,
				miniSets: []
			}))
		}
	};
}

const cardioPlan = (exercises: ProgressionPlan['exercises']): ProgressionPlan => ({
	settings: testSettings,
	exercises
});

test('cardio suggestions repeat last time: time, distance and level, never a rep, a weight or a deload', () => {
	const run = cardioExercise('Run', 2);
	const bike = cardioExercise('Bike', 3, 'LEVEL');
	const history: ExerciseHistory = {
		Run: [
			performance('Run', [{ timeSeconds: 1500, distanceMeters: 5000 }]),
			performance('Run', [
				{ timeSeconds: 1560, distanceMeters: 5000 },
				{ timeSeconds: 600, distanceMeters: 2000 }
			])
		],
		Bike: [
			performance(
				'Bike',
				[
					{ timeSeconds: 30, load: 8 },
					{ timeSeconds: 30, load: 9 },
					{ timeSeconds: 30, load: 9 }
				],
				'LEVEL'
			)
		]
	};
	const measures = new Map([
		['Run', 'DistanceTime' as const],
		['Bike', 'Time' as const]
	]);

	for (const mode of ['normal', 'deload', 'welcomeBack'] as const) {
		const [runToday, bikeToday] = progressiveOverloadMagic(
			cardioPlan([run, bike]),
			1,
			80,
			history,
			mode,
			[],
			new Map(),
			measures
		);
		// The same intervals as last time (in metres here: shown in the exercise's unit later), nothing added
		expect(runToday.sets.map((set) => [set.timeSeconds, set.distance])).toEqual([
			[1560, 5000],
			[600, 2000]
		]);
		// No reps, weight or effort suggested: those are zero-filled when the set is ticked
		expect(
			runToday.sets.every((set) => set.reps === undefined && set.load === undefined && set.RIR === undefined)
		).toBe(true);
		// A machine's level comes along; a deload week doesn't cut the intervals
		expect(bikeToday.sets.map((set) => [set.timeSeconds, set.load])).toEqual([
			[30, 8],
			[30, 9],
			[30, 9]
		]);
		expect(bikeToday.sets).toHaveLength(3);
	}
});

test('the routine decides the number of intervals; a skipped interval starts empty, extra ones copy the last', () => {
	const history: ExerciseHistory = {
		Run: [
			performance('Run', [
				{ timeSeconds: 300, distanceMeters: 1000, skipped: true },
				{ timeSeconds: 600, distanceMeters: 2000 }
			])
		]
	};
	const measures = new Map([['Run', 'DistanceTime' as const]]);
	const suggest = (intervals: number) =>
		progressiveOverloadMagic(
			cardioPlan([cardioExercise('Run', intervals)]),
			1,
			80,
			history,
			'normal',
			[],
			new Map(),
			measures
		)[0];
	const four = suggest(4);
	expect(four.sets).toHaveLength(4);
	// The skipped interval is to fill in again (as a skipped set of a lift is); extra intervals copy the last one
	expect(four.sets[0]).toMatchObject({ skipped: false, timeSeconds: undefined, distance: undefined });
	expect(four.sets[1]).toMatchObject({ timeSeconds: 600, distance: 2000, skipped: false });
	expect(four.sets.slice(2).every((set) => set.timeSeconds === 600 && set.distance === 2000 && !set.skipped)).toBe(
		true
	);
	expect(suggest(1).sets).toHaveLength(1);
});

test('a reps history never drives a cardio suggestion, nor the reverse; first time, nothing is suggested', () => {
	const repsRows = [performance('Rows', [{}, {}, {}])];
	const runRows = [performance('Run', [{ timeSeconds: 1560, distanceMeters: 5000 }])];
	const timeRows = [performance('Plank', [{ timeSeconds: 60 }])];
	// Only rows measured the same way compare
	expect(comparablePerformances(repsRows, 'KG', 'Reps')).toHaveLength(1);
	expect(comparablePerformances(repsRows, 'KG', 'Time')).toHaveLength(0);
	expect(comparablePerformances(runRows, 'KG', 'DistanceTime')).toHaveLength(1);
	expect(comparablePerformances(runRows, 'KG', 'Time')).toHaveLength(0);
	expect(comparablePerformances(runRows, 'KG', 'Reps')).toHaveLength(0);
	expect(comparablePerformances(timeRows, 'KG', 'Time')).toHaveLength(1);
	// Levels still only compare with levels
	expect(comparablePerformances(runRows, 'LEVEL', 'DistanceTime')).toHaveLength(0);
	// The default is reps, as every caller from before cardio expects
	expect(comparablePerformances(repsRows, 'KG')).toHaveLength(1);

	// A cardio exercise whose history is reps rows (impossible once measures are fixed, but legacy-safe): empty boxes
	const measures = new Map([['Rows', 'Time' as const]]);
	const [fromReps] = progressiveOverloadMagic(
		cardioPlan([cardioExercise('Rows', 2)]),
		1,
		80,
		{ Rows: repsRows },
		'normal',
		[],
		new Map(),
		measures
	);
	expect(fromReps.sets.every((set) => set.timeSeconds === undefined && set.reps === undefined)).toBe(true);
	// First time ever: empty boxes, like a strength exercise done for the first time
	const [first] = progressiveOverloadMagic(
		cardioPlan([cardioExercise('Run', 2)]),
		1,
		80,
		{},
		'normal',
		[],
		new Map(),
		new Map([['Run', 'DistanceTime' as const]])
	);
	expect(first.sets).toHaveLength(2);
	expect(first.sets.every((set) => set.timeSeconds === undefined && set.distance === undefined)).toBe(true);
	// A reps exercise's cardio rows (the reverse) are ignored too: no suggestion, and no rep progression from them
	const [repsFromRun] = progressiveOverloadMagic(cardioPlan([cardioExercise('Run', 2)]), 1, 80, { Run: runRows });
	expect(repsFromRun.sets.every((set) => set.reps === undefined && set.timeSeconds === undefined)).toBe(true);
});

test('distances convert between metres and the shown unit; sets without one pass through', () => {
	const ex = { sets: [{ distance: 5000 }, { distance: undefined }, { distance: 2500 }] };
	expect(convertExerciseDistances(ex, 'toDisplay', 'KM').sets.map((set) => set.distance)).toEqual([5, undefined, 2.5]);
	expect(convertExerciseDistances(ex, 'toDisplay', 'M').sets.map((set) => set.distance)).toEqual([
		5000,
		undefined,
		2500
	]);
	expect(convertExerciseDistances({ sets: [{ distance: 3.1 }] }, 'toMeters', 'MI').sets[0].distance).toBeCloseTo(
		4988.97,
		2
	);
	// No unit (a reps exercise): km, which never applies as its sets have no distance
	expect(convertExerciseDistances({ sets: [{}] }, 'toMeters', null).sets).toEqual([{}]);
});

test('stats: cardio intervals count as sets done, but not toward any muscle or area; volume adds nothing', () => {
	const set = (fields: object) => ({ reps: 0, load: 0, RIR: 0, skipped: false, miniSets: [], ...fields });
	const workout = {
		startedAt: new Date('2026-10-01T10:00:00Z'),
		endedAt: new Date('2026-10-01T11:00:00Z'),
		userBodyweight: 80,
		workoutExercises: [
			{
				targetMuscleGroup: 'Lats' as const,
				customMuscleGroup: null,
				bodyweightFraction: null,
				weightUnit: 'KG' as const,
				sets: [set({ reps: 10, load: 60, RIR: 2 }), set({ reps: 10, load: 60, RIR: 2 })]
			},
			{
				targetMuscleGroup: 'Cardio' as const,
				customMuscleGroup: null,
				bodyweightFraction: null,
				weightUnit: 'KG' as const,
				sets: [set({ timeSeconds: 1560, distanceMeters: 5000 }), set({ timeSeconds: 600, distanceMeters: 2000 })]
			},
			// A plank: a time exercise in a muscle group still counts its sets under that muscle
			{
				targetMuscleGroup: 'Abs' as const,
				customMuscleGroup: null,
				bodyweightFraction: null,
				weightUnit: 'KG' as const,
				sets: [set({ timeSeconds: 60 }), set({ timeSeconds: 60, skipped: true })]
			}
		]
	};
	const stats = periodStats([workout]);
	expect(stats.sets).toBe(5);
	expect(stats.volume).toBe(1200);
	expect(stats.setsByMuscle).toEqual({ Lats: 2, Abs: 1 });
	expect(stats.setsByArea).toEqual({ Back: 2, Chest: 0, Core: 1, Shoulders: 0, Arms: 0, Legs: 0 });
});

test('mesocycle muscle totals exclude Cardio but preserve timed exercises assigned to a muscle', async () => {
	const { getSetsPerformedPerMuscleGroup, generatePerformanceChangesPerMuscleGroup } = await import(
		'../../src/lib/utils/mesocycleUtils'
	);
	const strength = performance('Rows', [{}]).exercise;
	strength.targetMuscleGroup = 'Lats';
	const timed = performance('Plank', [{ timeSeconds: 60 }]).exercise;
	timed.targetMuscleGroup = 'Abs';
	const cardio = performance('Run', [{ timeSeconds: 600, distanceMeters: 2000 }]).exercise;
	const data = [
		{
			workoutId: 'past-workout',
			workout: { userBodyweight: 80, routineName: 'Mixed', workoutExercises: [strength, timed, cardio] }
		}
	] as Parameters<typeof getSetsPerformedPerMuscleGroup>[0];
	expect(getSetsPerformedPerMuscleGroup(data)).toEqual([
		{ muscleGroup: 'Lats', totalSets: 1 },
		{ muscleGroup: 'Abs', totalSets: 1 }
	]);
	expect(
		generatePerformanceChangesPerMuscleGroup(data)
			.map((row) => row.muscleGroup)
			.sort()
	).toEqual(['Abs', 'Lats']);
	const cardioOnly = [{ ...data[0], workout: { ...data[0].workout, workoutExercises: [cardio] } }];
	expect(getSetsPerformedPerMuscleGroup(cardioOnly)).toEqual([]);
	expect(generatePerformanceChangesPerMuscleGroup(cardioOnly)).toEqual([]);
});
