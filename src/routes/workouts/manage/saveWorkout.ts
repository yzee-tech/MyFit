/**
 * Saving the workout in workoutRunes: shared by the finish page and the "Save your changes?" question
 * asked when leaving an edit of a past workout.
 */
import { trpc } from '$lib/trpc/client';
import type { RouterInputs } from '$lib/trpc/router';
import {
	browserTimeZone,
	convertExerciseDistances,
	convertExerciseLoads,
	type WorkoutExerciseInProgress
} from '$lib/utils/workoutUtils';
import { isCardioMeasure } from '$lib/utils/measure';
import { isLevelUnit } from '$lib/utils/weightUnits';
import { toast } from 'svelte-sonner';
import { workoutRunes } from './workoutRunes.svelte';

export type WorkoutSaveData = RouterInputs['workouts']['create'];

/**
 * The workout as the server takes it, loads in kg, distances in metres and skipped sets as zeros. A
 * cardio set carries its time and distance; its reps, weight and RIR are 0 (the level stays on a
 * machine with levels), so everything that reads those keeps working. Nothing (and a toast) without a
 * bodyweight; throws if a set is missing a number.
 */
export function buildWorkoutSaveData(): WorkoutSaveData | undefined {
	if (workoutRunes.workoutData === null || workoutRunes.workoutExercises === null) return;
	// Weights are entered in each exercise's unit and saved in kg; distances likewise, saved in metres
	const exercisesInKg = workoutRunes.workoutExercises.map((ex) =>
		convertExerciseDistances(convertExerciseLoads(ex, 'toKg'), 'toMeters', workoutRunes.measureOf(ex.name).distanceUnit)
	);
	const workoutExercisesSets = exercisesInKg.map((ex) => {
		const measure = workoutRunes.measureOf(ex.name).measure;
		const cardio = isCardioMeasure(measure);
		return ex.sets.map((_set, idx) => {
			// Ticks and which boxes were typed are for the workout screen only: the set schema is strict
			const { completed, chosen, suggested, hintBase, timeSeconds, distance, ...set } = _set;
			if (set.skipped) [set.reps, set.load, set.RIR] = [0, 0, 0];
			if (cardio && !set.skipped) {
				set.reps = 0;
				set.RIR = 0;
				if (!isLevelUnit(ex.weightUnit)) set.load = 0;
			}
			// A skipped cardio set keeps no numbers, like a skipped lift; an interval never has mini-sets
			if (cardio) set.miniSets = [];
			const cardioFields = cardio && !set.skipped ? { timeSeconds, distanceMeters: distance ?? null } : {};
			if (cardio && !set.skipped) {
				if (timeSeconds === undefined) throw new Error('Time is undefined');
				if (measure === 'DistanceTime' && distance === undefined) throw new Error('Distance is undefined');
			}
			return { ...set, ...cardioFields, setIndex: idx };
		});
	});
	const workoutExercisesMiniSets = workoutExercisesSets.map((sets) => sets.map((set) => set.miniSets));

	if (typeof workoutRunes.workoutData?.userBodyweight !== 'number') {
		toast.error('Invalid user bodyweight at start page');
		return;
	}
	const userBodyweight = workoutRunes.workoutData.userBodyweight;

	return {
		timeZone: browserTimeZone(),
		workoutData: {
			startedAt: workoutRunes.workoutData.startedAt,
			// A new workout ends at its last ticked set (none: when it's saved). An edit sends its own
			endedAt: workoutRunes.lastActivityAt ?? undefined,
			workoutOfMesocycle: workoutRunes.workoutData.workoutOfMesocycle,
			routineName: workoutRunes.workoutData.routineName ?? null,
			userBodyweight,
			note: workoutRunes.workoutData.note ?? undefined
		},
		workoutExercises: exercisesInKg.map((ex, idx) => {
			const { sets, ...exercise } = ex;
			return { ...exercise, exerciseIndex: idx };
		}),
		workoutExercisesSets: workoutExercisesSets.map((sets) =>
			sets.map((set) => {
				const { miniSets, ...rest } = set;
				if (rest.reps === undefined || rest.load === undefined || rest.RIR === undefined) {
					throw new Error('Rep, Load, or RIR is undefined');
				}
				return {
					...rest,
					reps: rest.reps as number,
					load: rest.load as number,
					RIR: rest.RIR as number
				};
			})
		),
		workoutExercisesMiniSets: workoutExercisesMiniSets.map((sets, exerciseIndex) =>
			sets.map((miniSets, setIndex) =>
				miniSets.map((_miniSet, miniSetIndex) => {
					const exercises = exercisesInKg as WorkoutExerciseInProgress[];
					const { completed, chosen, suggested, ...miniSet } = _miniSet;
					if (exercises[exerciseIndex].sets[setIndex].skipped) [miniSet.reps, miniSet.load, miniSet.RIR] = [0, 0, 0];

					if (miniSet.reps === undefined || miniSet.load === undefined || miniSet.RIR === undefined) {
						throw new Error('Rep, Load, or RIR is undefined');
					}
					return {
						...miniSet,
						reps: miniSet.reps as number,
						load: miniSet.load as number,
						RIR: miniSet.RIR as number,
						miniSetIndex
					};
				})
			)
		)
	};
}

/** Saves the past workout being edited (built from workoutRunes if not given); its message */
export async function saveWorkoutEdits(saveData = buildWorkoutSaveData()): Promise<string> {
	if (workoutRunes.editingWorkoutId === null) throw new Error('No past workout is being edited');
	if (saveData === undefined) throw new Error('Nothing to save');
	const { message } = await trpc().workouts.editById.mutate({
		id: workoutRunes.editingWorkoutId,
		endedAt: workoutRunes.workoutData?.endedAt as Date | string,
		data: saveData
	});
	return message;
}
