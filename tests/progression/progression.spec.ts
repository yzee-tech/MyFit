import {
	getBlockWeek,
	getRIRForWeek,
	progressiveOverloadMagic,
	type ExerciseHistory,
	type PreviousPerformance
} from '../../src/lib/utils/workoutUtils';
import { test, expect } from '../fixtures';
import { testMesocycle } from './data';

test('progress first cycle, no changes', () => {
	const currentRIR = getRIRForWeek(testMesocycle.RIRProgression, 1);

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
			return rest;
		});

		// Make sure all values are correct
		expect(exercisesWithoutSets).toStrictEqual(outputWithoutSets);
	}
});

type TestSet = { reps: number; load: number; RIR: number };

/** A past performance of a test exercise, as the server would load it from any workout */
function performance(exerciseName: string, sets: TestSet[], userBodyweight = 100): PreviousPerformance {
	const template = testMesocycle.mesocycleExerciseSplitDays
		.flatMap((splitDay) => splitDay.mesocycleSplitDayExercises)
		.find((exercise) => exercise.name === exerciseName)!;
	const { id, mesocycleExerciseSplitDayId, sets: _sets, ...exercise } = template;
	return {
		oldUserBodyweight: userBodyweight,
		exercise: {
			...exercise,
			id: `past-${exerciseName}`,
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
	// [1, 3, 3, 3]: 3 weeks at 3 RIR, 3 at 2, 3 at 1, 1 at 0 = 10 weeks
	expect(getRIRForWeek(testMesocycle.RIRProgression, 1)).toEqual(3);
	expect(getRIRForWeek(testMesocycle.RIRProgression, 10)).toEqual(0);
	expect(getRIRForWeek(testMesocycle.RIRProgression, 12)).toEqual(0);
});
