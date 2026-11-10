import { test, expect } from '@playwright/test';
const MAX_LOAD_DROP = 0.1;
import {
	// MAX_LOAD_DROP,
	progressiveOverloadMagic,
	type ExerciseHistory,
	type PreviousPerformance,
	type ProgressionMode,
	type ProgressionPlan
} from '../../src/lib/utils/workoutUtils';
import type { WeightSetLike } from '../../src/lib/utils/weightSets';
import { testPlan, testRoutines, testSettings } from './data';

/**
 * The week's effort (reps in reserve) applied to last time's sets. "Barbell rows": 3 straight sets,
 * 10–15 reps, 2.5 kg steps. Week 1 of the test plan asks for 3 in reserve, week 4 for 2
 */
type TestSet = { reps: number; load: number; RIR: number; skipped?: boolean };
type Row = ProgressionPlan['exercises'][number];
type Options = {
	week?: number;
	mode?: ProgressionMode;
	settings?: Partial<ProgressionPlan['settings']>;
	row?: (row: Row) => void;
	weightSets?: WeightSetLike[];
	unit?: 'KG' | 'LB';
	bodyweight?: number;
};

function performance(sets: TestSet[], row: Row, unit: 'KG' | 'LB', bodyweight: number): PreviousPerformance {
	const { id, sets: _sets, ...exercise } = testRoutines[0].exercises.find((ex) => ex.name === 'Barbell rows')!;
	return {
		oldUserBodyweight: bodyweight,
		exercise: {
			...exercise,
			bodyweightFraction: row.bodyweightFraction ?? null,
			setType: row.setType,
			id: 'past-rows',
			weightUnit: unit,
			exerciseNote: null,
			workoutId: 'past-workout',
			sets: sets.map((set, setIndex) => ({
				skipped: false,
				...set,
				id: `set-${setIndex}`,
				setIndex,
				timeSeconds: null,
				distanceMeters: null,
				workoutExerciseId: 'past-rows',
				miniSets: []
			}))
		}
	};
}

/** The suggestion for Barbell rows from one past workout, as [reps, load in kg, RIR] per set */
function suggest(last: TestSet[], options: Options = {}) {
	const { week = 1, mode = 'normal', unit = 'KG', bodyweight = 100 } = options;
	const plan = testPlan();
	// No set to failure and no forced matching unless a test asks: one rule at a time
	plan.settings = { ...testSettings, lastSetToFailure: false, forceRIRMatching: false, ...options.settings };
	const row = plan.exercises.find((ex) => ex.name === 'Barbell rows')!;
	row.weightUnit = unit;
	options.row?.(row);
	const history: ExerciseHistory = { 'Barbell rows': [performance(last, row, unit, bodyweight)] };
	const output = progressiveOverloadMagic(plan, week, bodyweight, history, mode, options.weightSets ?? []);
	return output
		.find((ex) => ex.name === 'Barbell rows')!
		.sets.map((set) => [set.reps, set.load === undefined ? undefined : Math.round(set.load * 100) / 100, set.RIR]);
}

const same = (count: number, set: TestSet) => Array.from({ length: count }, () => ({ ...set }));
const fading = (load: number, RIR: number, ...reps: number[]) => reps.map((rep) => ({ reps: rep, load, RIR }));

test('welcome back at the bottom of the range: a lighter weight, in the range, at the easier effort', () => {
	// Was 12 × 60 kg to failure: the reserve the set already had was added back as reps
	expect(suggest(same(3, { reps: 10, load: 60, RIR: 2 }), { mode: 'welcomeBack' })).toEqual(
		same(3, { reps: 10, load: 57.5, RIR: 4 }).map((set) => [set.reps, set.load, set.RIR])
	);
});

test('welcome back with room in the range keeps the weight and takes a rep off, as before', () => {
	expect(suggest(fading(20, 3, 12, 12, 11), { mode: 'welcomeBack' })).toEqual([
		[11, 20, 4],
		[11, 20, 4],
		[10, 20, 4]
	]);
});

test('a normal week after falling short of the range: a lighter weight at the week’s effort, never to failure', () => {
	// Week planned at 3 in reserve. Was 12 × 60 kg at 0 in reserve
	expect(suggest(same(3, { reps: 8, load: 60, RIR: 3 }))).toEqual([
		[11, 57.5, 3],
		[11, 57.5, 3],
		[11, 57.5, 3]
	]);
	// Week planned at 2 in reserve. Was 10 × 60 kg at 0 in reserve
	expect(suggest(same(3, { reps: 7, load: 60, RIR: 2 }), { week: 4 })).toEqual([
		[10, 57.5, 2],
		[10, 57.5, 2],
		[10, 57.5, 2]
	]);
});

test('a normal week in the range keeps its weight: reps stop at the bottom of the range, never harder than last time', () => {
	const forced = { settings: { forceRIRMatching: true } };
	// A new block: last time to failure, this week 3 in reserve. The same as before this change
	expect(suggest(same(3, { reps: 12, load: 60, RIR: 0 }), forced)).toEqual(
		same(3, { reps: 10, load: 60, RIR: 3 }).map((set) => [set.reps, set.load, set.RIR])
	);
	expect(suggest(same(3, { reps: 10, load: 60, RIR: 0 }), forced)).toEqual(
		same(3, { reps: 10, load: 60, RIR: 1 }).map((set) => [set.reps, set.load, set.RIR])
	);
	// With reserve already: it is kept, not turned into reps (was 12 × 60 kg at 0 in reserve)
	expect(suggest(same(3, { reps: 10, load: 60, RIR: 2 }), forced)).toEqual(
		same(3, { reps: 10, load: 60, RIR: 3 }).map((set) => [set.reps, set.load, set.RIR])
	);
});

test('deload: reps come off at the same weight; out of reps, the reps stay and the weight comes off', () => {
	const heavy = (row: Row) => Object.assign(row, { repRangeStart: 1, repRangeEnd: 5 });
	// An ordinary deload is as before: same weight, half the sets, fewer reps
	expect(suggest(fading(20, 1, 12, 11, 10), { mode: 'deload' })).toEqual([
		[9, 20, 4],
		[8, 20, 4]
	]);
	// Heavy triples: was -1 × 140 kg and 0 × 140 kg
	expect(suggest(fading(140, 0, 3, 3, 2), { mode: 'deload', row: heavy })).toEqual([
		[3, 127.5, 4],
		[3, 127.5, 4]
	]);
	expect(suggest(same(3, { reps: 3, load: 140, RIR: 1 }), { mode: 'deload', row: heavy })).toEqual([
		[3, 130, 4],
		[3, 130, 4]
	]);
});

test('straight sets fading under the range keep their weight: only set 1 falling short lowers it', () => {
	// Week planned at 2 in reserve. Set 3 was pushed to 11 at 0 in reserve
	expect(suggest(fading(60, 2, 10, 9, 8), { week: 4 })).toEqual([
		[11, 60, 2],
		[10, 60, 2],
		[9, 60, 2]
	]);
	// Set 1 short: every set moves to the same lighter weight
	const lowered = suggest(fading(60, 2, 8, 8, 7), { week: 4 });
	expect(lowered.map((set) => set[1])).toEqual([57.5, 57.5, 57.5]);
	expect(lowered[0]).toEqual([11, 57.5, 2]);
	lowered.forEach((set) => expect(set[2]).toEqual(2));
});

test('independent sets each find their own weight, and a later set may end up the heavier one', () => {
	const independent = (row: Row) => Object.assign(row, { setType: 'V2' });
	expect(suggest(fading(60, 2, 10, 9, 8), { week: 4, row: independent })).toEqual([
		[11, 60, 2],
		[10, 60, 2],
		[11, 57.5, 2]
	]);
	// Set 2 fell short, set 3 did not: set 3 stays heavier than set 2
	const middle = suggest(
		[
			{ reps: 12, load: 60, RIR: 2 },
			{ reps: 7, load: 60, RIR: 2 },
			{ reps: 11, load: 60, RIR: 2 }
		],
		{ week: 4, row: independent }
	);
	expect(middle.map((set) => set[1])).toEqual([60, 57.5, 60]);
});

test('down sets lower one at a time, and never leave a later set heavier than the one before it', () => {
	const down = (row: Row) => Object.assign(row, { setType: 'Down', changeType: 'AbsoluteLoad', changeAmount: 5 });
	// Set 2 fell short at 55 kg and goes to 52.5 kg: still above set 3's 50 kg
	expect(
		suggest(
			[
				{ reps: 10, load: 60, RIR: 3 },
				{ reps: 7, load: 55, RIR: 3 },
				{ reps: 10, load: 50, RIR: 3 }
			],
			{ row: down }
		).map((set) => set[1])
	).toEqual([60, 52.5, 50]);
	// Set 1 fell short and passes under set 2: set 2 comes down to it
	const crossed = suggest(
		[
			{ reps: 5, load: 60, RIR: 3 },
			{ reps: 12, load: 57.5, RIR: 3 },
			{ reps: 12, load: 50, RIR: 3 }
		],
		{ row: down }
	);
	expect(crossed[0][1]).toEqual(55);
	expect(crossed[1][1]).toEqual(55);
	expect(crossed[2][1]).toEqual(50);
});

test('a session lowers a weight by a tenth at most: short of the range, the reps stay under it at the easier effort', () => {
	// 10 reps at 4 in reserve would need 80 kg
	expect(suggest(same(3, { reps: 5, load: 100, RIR: 0 }), { mode: 'welcomeBack' })).toEqual(
		same(3, { reps: 5, load: 90, RIR: 4 }).map((set) => [set.reps, set.load, set.RIR])
	);
});

test('a gym’s weights: the next one down when it lands in the range, none when the gap is too big', () => {
	const plates = (weights: number[]): WeightSetLike[] => [{ id: 'gym', name: 'Gym', unit: 'KG', weights }];
	const linked = (row: Row) => Object.assign(row, { weightSetId: 'gym' });
	// 55 kg: about 12 reps at 3 in reserve
	expect(suggest(same(3, { reps: 8, load: 60, RIR: 3 }), { row: linked, weightSets: plates([40, 55, 60]) })[0]).toEqual(
		[12, 55, 3]
	);
	// Only 40 kg below: far past the top of the range there, so the weight stays, at the week's effort
	expect(suggest(same(3, { reps: 8, load: 60, RIR: 3 }), { row: linked, weightSets: plates([40, 60]) })[0]).toEqual([
		9, 60, 3
	]);
});

test('an exercise in lb comes down by its 5 lb step', () => {
	const [reps, loadKg, RIR] = suggest(same(3, { reps: 8, load: 100 * 0.45359237, RIR: 3 }), { unit: 'LB' })[0];
	expect(Math.round((loadKg as number) / 0.45359237)).toEqual(95);
	expect(reps).toBeGreaterThanOrEqual(10);
	expect(RIR).toEqual(3);
});

test('bodyweight exercises: added weight comes off down to none, never into help; with none, the reps go under the range', () => {
	const pullUps = (row: Row) => Object.assign(row, { bodyweightFraction: 1, repRangeStart: 5, repRangeEnd: 12 });
	expect(suggest(same(3, { reps: 5, load: 10, RIR: 1 }), { mode: 'welcomeBack', row: pullUps })[0]).toEqual([
		5, 2.5, 4
	]);
	expect(suggest(same(3, { reps: 5, load: 0, RIR: 1 }), { mode: 'welcomeBack', row: pullUps })[0]).toEqual([2, 0, 4]);
});

test('help already used can become more help', () => {
	const assisted = (row: Row) => Object.assign(row, { bodyweightFraction: 1, repRangeStart: 8, repRangeEnd: 12 });
	const [reps, load, RIR] = suggest(same(3, { reps: 6, load: -20, RIR: 3 }), { row: assisted })[0];
	expect(load as number).toBeLessThan(-20);
	expect(reps).toBeGreaterThanOrEqual(8);
	expect(RIR).toEqual(3);
});

test('nothing lower to go to: never under one rep, and never more than could be done last time', () => {
	const pullUps = (row: Row) => Object.assign(row, { bodyweightFraction: 1, repRangeStart: 5, repRangeEnd: 12 });
	// 2 reps to failure, week at 3 in reserve with matching forced: was -1 reps
	const forced = suggest(same(3, { reps: 1, load: 0, RIR: 0 }), { row: pullUps, settings: { forceRIRMatching: true } });
	forced.forEach(([reps, , RIR]) => {
		expect(reps).toBeGreaterThanOrEqual(1);
		expect((reps as number) + (RIR as number)).toBeLessThanOrEqual(2);
	});
	const deload = suggest(same(3, { reps: 2, load: 0, RIR: 0 }), { mode: 'deload', row: pullUps });
	deload.forEach(([reps, load, RIR]) => {
		expect(load).toEqual(0);
		expect(reps).toEqual(1);
		expect(RIR).toEqual(1);
	});
});

test('set 1 skipped last time: the first set with numbers decides', () => {
	const output = suggest([
		{ reps: 0, load: 0, RIR: 0, skipped: true },
		{ reps: 8, load: 60, RIR: 3 },
		{ reps: 8, load: 60, RIR: 3 }
	]);
	expect(output.slice(1)).toEqual([
		[11, 57.5, 3],
		[11, 57.5, 3]
	]);
});

test('every mode, 20,000 histories: whole reps of one or more, and an easy session never asks for more than last time', () => {
	let seed = 20261110;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	const int = (from: number, to: number) => from + Math.floor(random() * (to - from + 1));
	const pick = <T>(values: T[]) => values[int(0, values.length - 1)];
	const problems: string[] = [];
	for (let run = 0; run < 20000; run++) {
		const setType = pick(['Straight', 'Straight', 'V2', 'Down', 'TopBackoff', 'Myorep'] as const);
		const share = pick([null, null, null, 1, 0.65]);
		const mode = pick(['normal', 'deload', 'welcomeBack'] as const);
		const load = share === null ? pick([2.5, 20, 60, 100, 140]) : pick([0, 0, 5, 20]);
		const last = Array.from({ length: int(1, 5) }, () => ({ reps: int(1, 20), load, RIR: int(0, 4) }));
		const options: Options = {
			week: int(1, 10),
			mode,
			settings: { lastSetToFailure: random() < 0.5, forceRIRMatching: random() < 0.5 },
			row: (row) => Object.assign(row, { setType, bodyweightFraction: share, sets: int(1, 4) }),
			bodyweight: 80
		};
		const output = suggest(last, options);
		// Plain checks, one expect at the end: 20,000 runs of expect would take minutes
		const fail = (rule: string) => {
			if (problems.length < 5)
				problems.push(
					`${rule}: ${JSON.stringify({ setType, share, mode, options: { ...options, row: undefined }, last, output })}`
				);
		};
		const lifted = (kg: number) => kg + (share ?? 0) * 80;
		output.forEach(([reps, newLoad, RIR], idx) => {
			if (reps === undefined) return;
			if (!Number.isInteger(reps) || reps < 1) fail('reps are whole and at least 1');
			if (!Number.isInteger(RIR) || (RIR as number) < 0) fail('RIR is whole and not negative');
			if (typeof newLoad !== 'number' || !Number.isFinite(newLoad)) return fail('the load is a number');
			const before = last[idx];
			if (!before) return;
			// One step (2.5 kg) is always allowed, so the cap is checked from the second step on
			const dropped = lifted(before.load) - lifted(newLoad);
			if (dropped > 2.5 + 1e-6 && lifted(newLoad) < lifted(before.load) * (1 - MAX_LOAD_DROP) - 1e-6) {
				fail('a weight comes down by a tenth at most');
			}
			if (mode === 'normal') return;
			if (newLoad > before.load + 1e-9) fail('an easy session never adds weight');
			if (newLoad === before.load && reps + (RIR as number) > before.reps + before.RIR) {
				fail('an easy session at the same weight never asks for more than last time');
			}
		});
	}
	expect(problems).toEqual([]);
});
