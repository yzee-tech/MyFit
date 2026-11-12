import { arrayAverage, averagePercentageChange } from '$lib/utils';
import type { Mesocycle, Workout, WorkoutExercise, WorkoutsOfMesocycle } from './types';
import { getExerciseVolume, getWorkoutVolume } from './workoutUtils';
import { muscleShares, WHOLE_BODY } from './muscleShares';

type GroupedExercisesByMuscleGroup = {
	muscleGroup: string;
	exercises: WorkoutExercise[];
}[];

export function groupExercisesByMuscleGroup(exercises: WorkoutExercise[]): GroupedExercisesByMuscleGroup {
	const groupedObject = Object.groupBy(
		// Cardio isn't a muscle, and whole body is no one muscle to rank against the others
		exercises.filter((ex) => ex.targetMuscleGroup !== 'Cardio' && ex.targetMuscleGroup !== WHOLE_BODY),
		({ targetMuscleGroup, customMuscleGroup }) => customMuscleGroup ?? targetMuscleGroup
	);
	return Object.entries(groupedObject).map(([muscleGroup, exercises]) => ({
		muscleGroup,
		exercises: exercises ?? []
	}));
}

type GroupedExercisesByName = {
	name: string;
	performances: WorkoutExercise[];
}[];

export function groupExercisesByName(exercises: WorkoutExercise[]): GroupedExercisesByName {
	return Object.entries(Object.groupBy(exercises, ({ name }) => name)).map(([name, exercises]) => ({
		name,
		performances: exercises ?? []
	}));
}

export function getAveragePercentageChangeOfExercisePerformances(
	performances: WorkoutExercise[],
	workoutsOfMesocycle: WorkoutsOfMesocycle
) {
	const exerciseVolumes = performances.map((p) => {
		const workout = workoutsOfMesocycle.find((wm) => wm.workoutId === p.workoutId)?.workout;
		return getExerciseVolume(p, workout?.userBodyweight as number);
	});
	return averagePercentageChange(exerciseVolumes);
}

export function generatePerformanceChangesPerMuscleGroup(workoutsOfMesocycle: WorkoutsOfMesocycle) {
	const allExercises = workoutsOfMesocycle.flatMap((wm) =>
		wm.workout.workoutExercises.map((exercise) => ({
			...exercise,
			name: `${exercise.name}|${wm.workout.routineName ?? ''}`
		}))
	);
	const groupedExercisesByMuscleGroup = groupExercisesByMuscleGroup(allExercises);

	const fullyGroupedExercises = groupedExercisesByMuscleGroup.map(({ muscleGroup, exercises }) => ({
		muscleGroup,
		exercises: groupExercisesByName(exercises)
	}));

	const performanceChangesPerMuscleGroups = fullyGroupedExercises.map(({ exercises, muscleGroup }) => ({
		muscleGroup,
		averagePercentageChange: arrayAverage(
			exercises.map(({ performances }) =>
				getAveragePercentageChangeOfExercisePerformances(performances, workoutsOfMesocycle)
			)
		)
	}));

	performanceChangesPerMuscleGroups.sort((a, b) => a.averagePercentageChange - b.averagePercentageChange);
	return performanceChangesPerMuscleGroups;
}

type GroupedWorkoutsBySplitDayName = {
	splitDayName: string;
	workouts: Workout[];
}[];

/** A mesocycle's workouts by the routine they were done from (its name at the time) */
export function groupWorkoutsBySplitDayName(workoutsOfMesocycle: WorkoutsOfMesocycle): GroupedWorkoutsBySplitDayName {
	const groupedObject = Object.groupBy(workoutsOfMesocycle, ({ workout }) => workout.routineName ?? '');

	return Object.entries(groupedObject).map(([routineName, workoutsOfMesocycle]) => ({
		splitDayName: routineName,
		workouts: (workoutsOfMesocycle ?? []).map((wm) => wm.workout)
	}));
}

export function generatePerformanceChangesPerSplitDay(mesocycle: Mesocycle) {
	const groupedWorkouts = groupWorkoutsBySplitDayName(mesocycle.workoutsOfMesocycle);

	const performanceChangesPerSplitDay = groupedWorkouts.map(({ splitDayName, workouts }) => ({
		splitDayName,
		averagePercentageChange: averagePercentageChange(workouts.map((workout) => getWorkoutVolume(workout)))
	}));
	performanceChangesPerSplitDay.sort((a, b) => a.averagePercentageChange - b.averagePercentageChange);

	return performanceChangesPerSplitDay;
}

/**
 * A block's sets per muscle, fewest first: a full set for an exercise's muscle group, half a set for
 * each muscle it also works. Whole body is left out: it's no one muscle to rank against the others
 */
export function getSetsPerformedPerMuscleGroup(workoutsOfMesocycle: WorkoutsOfMesocycle) {
	const totals = new Map<string, number>();
	for (const exercise of workoutsOfMesocycle.flatMap((wm) => wm.workout.workoutExercises)) {
		// Sets done: an old workout's skipped sets don't count, as on the Stats page
		const sets = exercise.sets.filter((set) => !set.skipped).length;
		for (const [muscleGroup, share] of Object.entries(muscleShares(exercise).muscles)) {
			if (muscleGroup === WHOLE_BODY) continue;
			totals.set(muscleGroup, (totals.get(muscleGroup) ?? 0) + sets * share);
		}
	}
	const setsPerformedPerMuscleGroup = [...totals.entries()].map(([muscleGroup, totalSets]) => ({
		muscleGroup,
		totalSets
	}));
	setsPerformedPerMuscleGroup.sort((a, b) => a.totalSets - b.totalSets);

	return setsPerformedPerMuscleGroup;
}

/** e.g. "1 routine" or "6 routines" */
export function formatRoutineCount(routines: readonly unknown[]) {
	const count = routines.length;
	return `${count} ${count === 1 ? 'routine' : 'routines'}`;
}
