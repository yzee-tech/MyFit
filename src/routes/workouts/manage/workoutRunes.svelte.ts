import { page } from '$app/stores';
import { get } from 'svelte/store';
import type { WeightSetLike } from '$lib/utils/weightSets';
import type { WeightUnit } from '$lib/utils/prismaEnums';
import { isLevelUnit } from '$lib/utils/weightUnits';
import type { MesocycleExerciseTemplateWithoutIdsOrIndex } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import type { RouterOutputs } from '$lib/trpc/router';
import { trpc } from '$lib/trpc/client';
import {
	type WorkoutExerciseInProgress,
	convertExerciseLoads,
	createWorkoutExerciseInProgressFromMesocycleExerciseTemplate
} from '$lib/utils/workoutUtils';
import type { Prisma } from '@prisma/client';
import type { FullWorkoutWithMesoData } from '../[workoutId]/+page.server';

export type PreviousWorkoutData =
	RouterOutputs['workouts']['getWorkoutExercisesWithPreviousData']['previousWorkoutData'];

function createWorkoutRunes() {
	let workoutData: RouterOutputs['workouts']['getTodaysWorkoutData'] | null = $state(null);
	let workoutExercises: WorkoutExerciseInProgress[] | null = $state(null);
	let editingWorkoutId: string | null = $state(null);
	let previousWorkoutData: PreviousWorkoutData = $state(null);

	let editingExerciseIndex: number | undefined = $state();
	let editingExercise: MesocycleExerciseTemplateWithoutIdsOrIndex | undefined = $state();

	let exerciseHistorySheetOpen = $state(false);
	let exerciseHistorySheetName: string | undefined = $state();
	let exerciseWarmUpDialogOpen = $state(false);
	let exerciseWarmUpDialogExercise: WorkoutExerciseInProgress | undefined = $state();

	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('workoutRunes');
		if (savedState) ({ workoutData, workoutExercises, previousWorkoutData } = JSON.parse(savedState));
	}

	function saveStoresToLocalStorage() {
		localStorage.setItem(
			'workoutRunes',
			JSON.stringify({ workoutData, workoutExercises, editingWorkoutId, previousWorkoutData })
		);
	}

	function resetStores() {
		workoutData = null;
		workoutExercises = null;
		editingWorkoutId = null;
		previousWorkoutData = null;
		saveStoresToLocalStorage();
	}

	function exerciseNameExists(exerciseName: string, exceptIndex?: number) {
		if (!workoutExercises) return;
		const exercise = workoutExercises.find((ex, idx) => ex.name === exerciseName && idx !== exceptIndex);
		return exercise !== undefined;
	}

	function addExercise(exercise: MesocycleExerciseTemplateWithoutIdsOrIndex) {
		if (workoutExercises === null) return false;
		if (exerciseNameExists(exercise.name)) return false;
		// New exercises use their own weight set, else the gym's picked for this workout; and start in
		// that weight set's unit, else the unit picked for this workout (or the home unit)
		const weightSetId = exercise.weightSetId ?? workoutData?.sessionWeightSetId ?? null;
		const weightSets: WeightSetLike[] = get(page).data.weightSets ?? [];
		const weightSetUnit = weightSets.find((weightSet) => weightSet.id === weightSetId)?.unit;
		const weightUnit = weightSetUnit ?? workoutData?.sessionWeightUnit ?? workoutData?.homeWeightUnit ?? 'KG';
		workoutExercises.push({
			...createWorkoutExerciseInProgressFromMesocycleExerciseTemplate(exercise),
			weightUnit,
			weightSetId
		});
		saveStoresToLocalStorage();
		suggestSetsFromLastTime(exercise.name);
		return true;
	}

	/** Fills an exercise added during the workout with suggestions from the last times it was done */
	async function suggestSetsFromLastTime(exerciseName: string) {
		const exercise = workoutExercises?.find((ex) => ex.name === exerciseName);
		const userBodyweight = workoutData?.userBodyweight;
		if (!exercise || typeof userBodyweight !== 'number' || exercise.sets.length === 0) return;
		try {
			const suggested = await trpc().workouts.suggestSets.query({
				exerciseName,
				sets: exercise.sets.length,
				setType: exercise.setType,
				repRangeStart: exercise.repRangeStart,
				repRangeEnd: exercise.repRangeEnd,
				topRepRangeStart: exercise.topRepRangeStart,
				topRepRangeEnd: exercise.topRepRangeEnd,
				changeType: exercise.changeType,
				changeAmount: exercise.changeAmount,
				weightUnit: exercise.weightUnit ?? 'KG',
				weightSetId: exercise.weightSetId,
				userBodyweight
			});
			// Only if it's still there and nothing has been entered yet
			const current = workoutExercises?.find((ex) => ex.name === exerciseName);
			const untouched = current?.sets.every((set) => set.reps === undefined && set.load === undefined);
			if (!suggested || !current || !untouched) return;
			current.sets = suggested;
			saveStoresToLocalStorage();
		} catch (error) {
			console.error('Failed to suggest sets:', error);
		}
	}

	function editExercise(exercise: MesocycleExerciseTemplateWithoutIdsOrIndex) {
		if (!editingExercise || editingExerciseIndex === undefined || workoutExercises === null) return false;
		if (exerciseNameExists(exercise.name, editingExerciseIndex)) return false;
		const current = workoutExercises[editingExerciseIndex];
		// Switching between a machine's levels and weights: the loads so far mean something else
		const weightSets: WeightSetLike[] = get(page).data.weightSets ?? [];
		const weightSetUnit = weightSets.find((weightSet) => weightSet.id === exercise.weightSetId)?.unit;
		const kindChanged = isLevelUnit(weightSetUnit) !== isLevelUnit(current.weightUnit);
		const weightUnit = kindChanged
			? (weightSetUnit ?? workoutData?.sessionWeightUnit ?? workoutData?.homeWeightUnit ?? 'KG')
			: current.weightUnit;
		const sets = kindChanged
			? current.sets.map((set) => ({ ...set, load: undefined, completed: false }))
			: current.sets;
		workoutExercises[editingExerciseIndex] = {
			...createWorkoutExerciseInProgressFromMesocycleExerciseTemplate(exercise, sets),
			weightUnit
		};
		saveStoresToLocalStorage();
		return true;
	}

	function setEditingExercise(exercise: WorkoutExerciseInProgress | undefined) {
		if (exercise === undefined) {
			editingExercise = undefined;
		} else {
			const { sets, ...restOfTheExercise } = exercise;
			editingExerciseIndex = workoutExercises?.findIndex((ex) => ex.name === exercise.name);
			editingExercise = { ...restOfTheExercise, sets: sets.length };
		}
	}

	function deleteExercise(exerciseIdx: number) {
		if (workoutExercises === null) return;
		workoutExercises.splice(exerciseIdx, 1);
		saveStoresToLocalStorage();
	}

	function openExerciseHistorySheet(exerciseName: string) {
		exerciseHistorySheetName = exerciseName;
		exerciseHistorySheetOpen = true;
	}

	function openExerciseWarmupDialog(exercise: WorkoutExerciseInProgress) {
		if (workoutExercises === null) return;
		exerciseWarmUpDialogOpen = true;
		exerciseWarmUpDialogExercise = exercise;
	}

	function copyExerciseSetNumbersFromHistory(
		exerciseFromHistory: Prisma.WorkoutExerciseGetPayload<{
			include: { sets: { include: { miniSets: true } } };
		}>
	) {
		const exerciseToEdit = workoutExercises?.find((ex) => ex.name === exerciseHistorySheetName);
		if (!exerciseToEdit) return;
		// Levels and weights don't mix: copy only reps and RIR
		const sameKindOfLoad = isLevelUnit(exerciseFromHistory.weightUnit) === isLevelUnit(exerciseToEdit.weightUnit);
		// History is stored in kg; copy it in the unit this exercise is shown in
		exerciseFromHistory = convertExerciseLoads(
			{ ...exerciseFromHistory, weightUnit: exerciseToEdit.weightUnit ?? 'KG' },
			'toDisplay'
		);

		for (let i = 0; i < exerciseToEdit.sets.length; i++) {
			if (!exerciseFromHistory.sets[i]) break;
			const { workoutExerciseId, ...historySet } = exerciseFromHistory.sets[i];
			exerciseToEdit.sets[i] = {
				...historySet,
				load: sameKindOfLoad ? historySet.load : exerciseToEdit.sets[i].load,
				completed: false,
				miniSets: historySet.miniSets.map((miniSet) => {
					const { id, workoutExerciseSetId, ...restOfTheMiniSet } = miniSet;
					return { ...restOfTheMiniSet, completed: false };
				})
			};
		}

		exerciseHistorySheetOpen = false;
	}

	function loadWorkout(workout: FullWorkoutWithMesoData, homeWeightUnit: WeightUnit) {
		editingWorkoutId = workout.id;
		workoutData = {
			startedAt: workout.startedAt,
			endedAt: workout.endedAt,
			userBodyweight: workout.userBodyweight,
			workoutExercises: [],
			note: workout.note,
			homeWeightUnit
		};
		// Saved loads are in kg; show them in the unit each exercise was done in
		workoutExercises = workout.workoutExercises.map((ex) => {
			const { id, workoutId, ...exercise } = convertExerciseLoads(ex, 'toDisplay');
			return {
				...exercise,
				sets: ex.sets.map((set) => {
					const { id, workoutExerciseId, ...rest } = set;
					return {
						...rest,
						completed: true,
						miniSets: set.miniSets.map((miniSet) => {
							const { id, workoutExerciseSetId, ...rest } = miniSet;
							return { ...rest, completed: true };
						})
					};
				})
			};
		});
		saveStoresToLocalStorage();
	}

	return {
		get workoutData() {
			return workoutData;
		},
		set workoutData(value) {
			workoutData = value;
		},
		get workoutExercises() {
			return workoutExercises;
		},
		set workoutExercises(value) {
			workoutExercises = value;
			saveStoresToLocalStorage();
		},
		get editingExercise() {
			return editingExercise;
		},
		set editingExercise(value) {
			editingExercise = value;
		},
		get editingWorkoutId() {
			return editingWorkoutId;
		},
		set editingWorkoutId(value) {
			editingWorkoutId = value;
		},
		get previousWorkoutData() {
			return previousWorkoutData;
		},
		set previousWorkoutData(value) {
			previousWorkoutData = value;
			saveStoresToLocalStorage();
		},
		get exerciseHistorySheetName() {
			return exerciseHistorySheetName;
		},
		set exerciseHistorySheetName(value) {
			exerciseHistorySheetName = value;
		},
		get exerciseHistorySheetOpen() {
			return exerciseHistorySheetOpen;
		},
		set exerciseHistorySheetOpen(value) {
			exerciseHistorySheetOpen = value;
		},
		get exerciseWarmUpDialogOpen() {
			return exerciseWarmUpDialogOpen;
		},
		set exerciseWarmUpDialogOpen(value) {
			exerciseWarmUpDialogOpen = value;
		},
		get exerciseWarmUpDialogExercise() {
			return exerciseWarmUpDialogExercise;
		},
		set exerciseWarmUpDialogExercise(value) {
			exerciseWarmUpDialogExercise = value;
		},
		saveStoresToLocalStorage,
		resetStores,
		addExercise,
		setEditingExercise,
		editExercise,
		deleteExercise,
		loadWorkout,
		openExerciseHistorySheet,
		openExerciseWarmupDialog,
		copyExerciseSetNumbersFromHistory
	};
}

export const workoutRunes = createWorkoutRunes();
