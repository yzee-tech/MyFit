import { test, expect } from '@playwright/test';
import {
	getExerciseVolume,
	getSetVolume,
	progressiveOverloadMagic,
	type ExerciseHistory,
	type PreviousPerformance
} from '../../src/lib/utils/workoutUtils';
import { testMesocycle } from './data';

type TestSet = { reps: number; load: number; RIR: number; miniSets?: { reps: number; load: number; RIR: number }[] };

/** A past performance of one of the test block's exercises */
function performance(name: string, sets: TestSet[], daysAgo: number, userBodyweight = 80): PreviousPerformance {
	const template = testMesocycle.mesocycleExerciseSplitDays
		.flatMap((splitDay) => splitDay.mesocycleSplitDayExercises)
		.find((exercise) => exercise.name === name)!;
	const { id, mesocycleExerciseSplitDayId, sets: _sets, ...exercise } = template;
	return {
		oldUserBodyweight: userBodyweight,
		exercise: {
			...exercise,
			id: `past-${name}-${daysAgo}`,
			weightUnit: 'KG',
			exerciseNote: null,
			workoutId: `past-${daysAgo}`,
			sets: sets.map((set, setIndex) => ({
				reps: set.reps,
				load: set.load,
				RIR: set.RIR,
				id: `set-${daysAgo}-${setIndex}`,
				setIndex,
				skipped: false,
				workoutExerciseId: `past-${name}-${daysAgo}`,
				miniSets: (set.miniSets ?? []).map((miniSet, miniSetIndex) => ({
					...miniSet,
					id: `mini-${daysAgo}-${setIndex}-${miniSetIndex}`,
					miniSetIndex,
					workoutExerciseSetId: `set-${daysAgo}-${setIndex}`
				}))
			}))
		}
	};
}

const s = (reps: number, load: number, RIR: number, miniSets?: TestSet['miniSets']): TestSet => ({
	reps,
	load,
	RIR,
	miniSets
});

/** Pull A's suggestions (week 1, 80 kg) after the given history */
function pullA(history: ExerciseHistory) {
	const block = structuredClone(testMesocycle);
	block.lastSetToFailure = false;
	return progressiveOverloadMagic(block, 1, 80, 0, history).map((exercise) => ({
		name: exercise.name,
		sets: exercise.sets.map((set) => [set.reps, set.load, set.RIR])
	}));
}

// Weighted exercises, two past sessions each with uneven drop-offs (and mini-sets on curls)
const weightedHistory: ExerciseHistory = {
	'Barbell rows': [
		performance('Barbell rows', [s(12, 60, 2), s(11, 60, 2), s(9, 60, 2)], 7),
		performance('Barbell rows', [s(13, 60, 2), s(10, 60, 2), s(10, 60, 1)], 3)
	],
	'Dumbbell bicep curls': [
		performance('Dumbbell bicep curls', [s(15, 12, 2), s(13, 12, 1, [s(4, 12, 0)]), s(11, 12, 1)], 7),
		performance('Dumbbell bicep curls', [s(16, 12, 2), s(12, 12, 1, [s(5, 12, 0)]), s(12, 12, 0)], 3)
	],
	'Face pulls': [
		performance('Face pulls', [s(20, 25, 3), s(18, 25, 2), s(15, 25, 2)], 7),
		performance('Face pulls', [s(21, 25, 3), s(17, 25, 2), s(16, 25, 1)], 3)
	]
};

test('progression: exercises without a bodyweight share get the same suggestions as before the volume fix', () => {
	// Recorded with the formula as it was: the bodyweight share is 0 for these, so nothing changes
	expect(pullA(weightedHistory).filter((exercise) => exercise.name !== 'Pull-ups')).toEqual([
		{
			name: 'Barbell rows',
			sets: [
				[13, 60, 3],
				[10, 60, 3],
				[11, 60, 1]
			]
		},
		{
			name: 'Dumbbell bicep curls',
			sets: [
				[16, 12, 3],
				[11, 12, 3],
				[10, 12, 3]
			]
		},
		{
			name: 'Face pulls',
			sets: [
				[22, 25, 3],
				[17, 25, 3],
				[15, 25, 3]
			]
		}
	]);
});

test('progression: pull-ups at bodyweight see their drop-offs, so the extra rep goes where the set dropped most', () => {
	// Getting stronger, but last time set 3 dropped off much more than usual (6 after 9)
	const history: ExerciseHistory = {
		'Pull-ups': [
			performance('Pull-ups', [s(8, 0, 3), s(7, 0, 3), s(6, 0, 3)], 14),
			performance('Pull-ups', [s(9, 0, 3), s(8, 0, 3), s(7, 0, 3)], 7),
			performance('Pull-ups', [s(10, 0, 3), s(9, 0, 3), s(6, 0, 3)], 3)
		]
	};
	const pullUps = pullA(history).find((exercise) => exercise.name === 'Pull-ups')!;
	// Set 3 gets the extra rep. Before the fix every drop-off counted as 0 at bodyweight, so it went
	// to set 2 by order: 11, 10, 6
	expect(pullUps.sets).toEqual([
		[11, 0, 3],
		[9, 0, 3],
		[7, 0, 3]
	]);
});

test('volume: reps × (load + bodyweight share), mini-sets too; reps in reserve, levels and skipped sets count 0', () => {
	const bw = 80;
	// Weighted: 15 × 10 kg (2 in reserve don't count)
	expect(getSetVolume(s(15, 10, 2), bw, null)).toEqual(150);
	// Pull-ups: 10 × 80 kg; with a 20 kg plate: 8 × 100; assisted by 20 kg: 10 × 60
	expect(getSetVolume(s(10, 0, 2), bw, 1)).toEqual(800);
	expect(getSetVolume(s(8, 20, 1), bw, 1)).toEqual(800);
	expect(getSetVolume(s(10, -20, 1), bw, 1)).toEqual(600);
	// More help than bodyweight never goes below 0
	expect(getSetVolume(s(10, -100, 1), bw, 1)).toEqual(0);
	// Push-ups at 65%: 10 × 52
	expect(getSetVolume(s(10, 0, 1), bw, 0.65)).toBeCloseTo(520);
	// Mini-sets add the same way: 12 × 10 + 4 × 10 + 3 × 10
	expect(getSetVolume(s(12, 10, 0, [s(4, 10, 0), s(3, 10, 0)]), bw, null)).toEqual(190);

	const exercise = (weightUnit: 'KG' | 'LEVEL', sets: (TestSet & { skipped?: boolean })[]) => ({
		weightUnit,
		bodyweightFraction: null,
		sets
	});
	expect(getExerciseVolume(exercise('KG', [s(10, 20, 2), { ...s(10, 20, 2), skipped: true }]), bw)).toEqual(200);
	expect(getExerciseVolume(exercise('LEVEL', [s(10, 7, 2)]), bw)).toEqual(0);
});
