import { test, expect } from '@playwright/test';
import {
	BODY_AREAS,
	canBeSecondaryMuscle,
	canHaveSecondaryMuscles,
	formatSetCount,
	isBuiltInMuscleName,
	muscleShares,
	secondaryMusclesFor,
	secondaryMusclesProblem
} from '../../src/lib/utils/muscleShares';
import { periodStats, type StatsWorkout } from '../../src/lib/utils/stats';
import {
	generatePerformanceChangesPerMuscleGroup,
	getSetsPerformedPerMuscleGroup
} from '../../src/lib/utils/mesocycleUtils';
import { MuscleGroupSchema } from '../../src/lib/zodSchemas';
import type { MuscleGroup } from '@prisma/client';

/**
 * How sets count towards muscles: a full set for an exercise's muscle group, half a set for each
 * muscle it also works (two at most), and Whole body as its own line plus half a set per body area
 */

const noAreas = { Back: 0, Chest: 0, Core: 0, Shoulders: 0, Arms: 0, Legs: 0 };

test('a set counts in full for the muscle group and half for each muscle the exercise also works', () => {
	const bench = muscleShares({ targetMuscleGroup: 'Chest', secondaryMuscleGroups: ['Triceps', 'FrontDelts'] });
	expect(bench.muscles).toEqual({ Chest: 1, Triceps: 0.5, FrontDelts: 0.5 });
	expect(bench.areas).toEqual({ Chest: 1, Arms: 0.5, Shoulders: 0.5 });
	// None listed (every exercise before this, and the built-in ones): as it always counted
	expect(muscleShares({ targetMuscleGroup: 'Chest' })).toEqual({ muscles: { Chest: 1 }, areas: { Chest: 1 } });
	expect(muscleShares({ targetMuscleGroup: 'Chest', secondaryMuscleGroups: null }).muscles).toEqual({ Chest: 1 });
});

test('two secondary muscles in one body area add up to a full set for that area', () => {
	const rows = muscleShares({ targetMuscleGroup: 'Lats', secondaryMuscleGroups: ['Biceps', 'Forearms'] });
	expect(rows.muscles).toEqual({ Lats: 1, Biceps: 0.5, Forearms: 0.5 });
	expect(rows.areas).toEqual({ Back: 1, Arms: 1 });
	// A secondary in the muscle group's own area: one and a half for that area
	expect(muscleShares({ targetMuscleGroup: 'Quads', secondaryMuscleGroups: ['Glutes'] }).areas).toEqual({ Legs: 1.5 });
});

test('whole body is its own line with full sets, and half a set for each body area', () => {
	const burpees = muscleShares({ targetMuscleGroup: 'WholeBody' });
	expect(burpees.muscles).toEqual({ WholeBody: 1 });
	expect(burpees.areas).toEqual({ Back: 0.5, Chest: 0.5, Core: 0.5, Shoulders: 0.5, Arms: 0.5, Legs: 0.5 });
	// Secondaries that slipped onto one count nowhere: no single muscle changes
	expect(muscleShares({ targetMuscleGroup: 'WholeBody', secondaryMuscleGroups: ['Chest'] })).toEqual(burpees);
});

test('cardio counts nowhere, and a custom group under its own name with its secondaries', () => {
	expect(muscleShares({ targetMuscleGroup: 'Cardio', secondaryMuscleGroups: ['Quads'] })).toEqual({
		muscles: {},
		areas: {}
	});
	const soleus = muscleShares({
		targetMuscleGroup: 'Custom',
		customMuscleGroup: 'Soleus',
		secondaryMuscleGroups: ['Calves']
	});
	expect(soleus.muscles).toEqual({ Soleus: 1, Calves: 0.5 });
	// A custom group has no area; the muscle it also works does
	expect(soleus.areas).toEqual({ Legs: 0.5 });
});

test('stored secondaries that break the rules are ignored when counting', () => {
	// The muscle group itself, a repeat, a third one, and groups that are no one muscle
	const shares = muscleShares({
		targetMuscleGroup: 'Chest',
		secondaryMuscleGroups: ['Chest', 'Triceps', 'Triceps', 'Cardio', 'WholeBody', 'Custom', 'Abs', 'Lats']
	});
	expect(shares.muscles).toEqual({ Chest: 1, Triceps: 0.5, Abs: 0.5 });
});

test('which secondary muscles an exercise may have', () => {
	const problem = secondaryMusclesProblem;
	expect(problem('Chest', [])).toBeNull();
	expect(problem('Chest', null)).toBeNull();
	expect(problem('Chest', ['Triceps'])).toBeNull();
	expect(problem('Chest', ['Triceps', 'FrontDelts'])).toBeNull();
	expect(problem('Custom', ['Calves'])).toBeNull();
	expect(problem('Chest', ['Triceps', 'FrontDelts', 'Abs'])).toMatch(/2 secondary muscle groups at most/);
	expect(problem('Chest', ['Triceps', 'Triceps'])).toMatch(/twice/);
	expect(problem('Chest', ['Chest'])).toMatch(/can’t also be a secondary/);
	for (const notAMuscle of ['Cardio', 'Custom', 'WholeBody'] as const) {
		expect(problem('Chest', [notAMuscle])).toMatch(/single muscles/);
	}
	expect(problem('Cardio', ['Quads'])).toMatch(/cardio/);
	expect(problem('WholeBody', ['Quads'])).toMatch(/whole body/);
	// Nothing listed is fine for those two
	expect(problem('Cardio', [])).toBeNull();
	expect(problem('WholeBody', [])).toBeNull();

	expect(canHaveSecondaryMuscles('Chest')).toBe(true);
	expect(canHaveSecondaryMuscles('Custom')).toBe(true);
	expect(canHaveSecondaryMuscles('Cardio')).toBe(false);
	expect(canHaveSecondaryMuscles('WholeBody')).toBe(false);
	// Every single muscle but the muscle group itself can be picked
	const pickable = MuscleGroupSchema.options.filter((group) => canBeSecondaryMuscle(group, 'Chest'));
	expect(pickable).toHaveLength(MuscleGroupSchema.options.length - 4);
	expect(pickable).not.toContain('Chest');
	// Every pickable muscle has a body area, so the radar never loses a half set
	for (const muscle of pickable) {
		const { areas } = muscleShares({ targetMuscleGroup: 'Chest', secondaryMuscleGroups: [muscle] });
		expect(Object.values(areas).reduce((sum, share) => sum + share, 0)).toBe(1.5);
	}
});

test('a new muscle group keeps the secondaries that still fit it', () => {
	expect(secondaryMusclesFor('Chest', ['Triceps', 'FrontDelts'])).toEqual(['Triceps', 'FrontDelts']);
	// It became one of its own secondaries: that one goes, the other stays
	expect(secondaryMusclesFor('Triceps', ['Triceps', 'FrontDelts'])).toEqual(['FrontDelts']);
	expect(secondaryMusclesFor('WholeBody', ['Triceps'])).toEqual([]);
	expect(secondaryMusclesFor('Cardio', ['Triceps'])).toEqual([]);
	expect(secondaryMusclesFor('Chest', undefined)).toEqual([]);
});

test('a custom muscle group may not take a built-in name, whatever its capitals and spaces', () => {
	const builtIn = (name: string) => isBuiltInMuscleName(name, MuscleGroupSchema.options);
	for (const name of ['Whole body', 'whole  body', 'WHOLEBODY', ' Chest ', 'front delts', 'FrontDelts', 'cardio']) {
		expect(builtIn(name), name).toBe(true);
	}
	for (const name of ['Soleus', 'Upper chest', 'Whole body 2', 'Delts']) expect(builtIn(name), name).toBe(false);
});

test('a count of sets shows a half when there is one', () => {
	expect(formatSetCount(7)).toBe('7');
	expect(formatSetCount(7.5)).toBe('7.5');
	expect(formatSetCount(0)).toBe('0');
});

const set = { reps: 10, load: 50, skipped: false, timeSeconds: null, distanceMeters: null, miniSets: [] };
function workout(exercises: [MuscleGroup, MuscleGroup[] | undefined, number][]): StatsWorkout {
	return {
		startedAt: new Date(2026, 10, 1, 9),
		endedAt: new Date(2026, 10, 1, 10),
		userBodyweight: 80,
		workoutExercises: exercises.map(([targetMuscleGroup, secondaryMuscleGroups, sets]) => ({
			targetMuscleGroup,
			customMuscleGroup: null,
			secondaryMuscleGroups,
			bodyweightFraction: null,
			weightUnit: 'KG',
			sets: Array.from({ length: sets }, () => ({ ...set }))
		}))
	} as unknown as StatsWorkout;
}

test('the Stats page counts halves per muscle and per area, and the Sets total stays whole sets', () => {
	const stats = periodStats([
		workout([
			['Chest', ['Triceps', 'FrontDelts'], 3],
			['Triceps', undefined, 2],
			['WholeBody', undefined, 4]
		])
	]);
	expect(stats.sets).toBe(9);
	expect(stats.setsByMuscle).toEqual({ Chest: 3, Triceps: 3.5, FrontDelts: 1.5, WholeBody: 4 });
	// Whole body: 4 sets × half a set in every area
	expect(stats.setsByArea).toEqual({ ...noAreas, Back: 2, Chest: 5, Core: 2, Shoulders: 3.5, Arms: 5.5, Legs: 2 });
	expect(Object.keys(stats.setsByArea)).toEqual([...BODY_AREAS]);
});

test('skipped sets count for no muscle, primary or secondary', () => {
	const done = workout([['Chest', ['Triceps'], 3]]);
	done.workoutExercises[0].sets[2].skipped = true;
	const stats = periodStats([done]);
	expect(stats.setsByMuscle).toEqual({ Chest: 2, Triceps: 1 });
	expect(stats.setsByArea).toEqual({ ...noAreas, Chest: 2, Arms: 1 });
});

test('a workout row without the field (older data in memory) counts as it always did', () => {
	const stats = periodStats([workout([['Lats', undefined, 2]])]);
	expect(stats.setsByMuscle).toEqual({ Lats: 2 });
	expect(stats.setsByArea).toEqual({ ...noAreas, Back: 2 });
});

type BlockData = Parameters<typeof getSetsPerformedPerMuscleGroup>[0];
function block(exercises: [string, MuscleGroup, MuscleGroup[], number][]): BlockData {
	return [
		{
			workoutId: 'w1',
			workout: {
				userBodyweight: 80,
				routineName: 'A',
				workoutExercises: exercises.map(([name, targetMuscleGroup, secondaryMuscleGroups, sets]) => ({
					name,
					workoutId: 'w1',
					targetMuscleGroup,
					customMuscleGroup: null,
					secondaryMuscleGroups,
					bodyweightFraction: null,
					weightUnit: 'KG',
					sets: Array.from({ length: sets }, () => ({ ...set }))
				}))
			}
		}
	] as unknown as BlockData;
}

test("a block's most and least sets count halves, and leave whole body out", () => {
	const data = block([
		['Bench', 'Chest', ['Triceps'], 4],
		['Curls', 'Biceps', [], 3],
		['Burpees', 'WholeBody', [], 10]
	]);
	// Fewest first; whole body's 10 sets would otherwise be "Most sets"
	expect(getSetsPerformedPerMuscleGroup(data)).toEqual([
		{ muscleGroup: 'Triceps', totalSets: 2 },
		{ muscleGroup: 'Biceps', totalSets: 3 },
		{ muscleGroup: 'Chest', totalSets: 4 }
	]);
	// Only whole body done: nothing to rank
	expect(getSetsPerformedPerMuscleGroup(block([['Burpees', 'WholeBody', [], 5]]))).toEqual([]);
});

test("a block's best and worst muscle go by each exercise's own muscle group, never whole body", () => {
	const data = block([
		['Bench', 'Chest', ['Triceps'], 4],
		['Burpees', 'WholeBody', [], 10]
	]);
	// Triceps is only a secondary here: bench press's progress is the chest's
	expect(generatePerformanceChangesPerMuscleGroup(data).map((row) => row.muscleGroup)).toEqual(['Chest']);
});
