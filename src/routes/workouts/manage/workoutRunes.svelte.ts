import { browserTimeZone, clearLoads, convertSuggestedLoads, hintBaseOf, withHintBase } from '$lib/utils/workoutUtils';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { levelSetOf, machineSetOf, type WeightSetLike } from '$lib/utils/weightSets';
import type { WeightUnit } from '$lib/utils/prismaEnums';
import { convertWeight, isLevelUnit } from '$lib/utils/weightUnits';
import { canWarmUp } from '$lib/utils/oneRepMax';
import type { RoutineExerciseTemplate } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import type { RouterOutputs } from '$lib/trpc/router';
import { trpc } from '$lib/trpc/client';
import {
	type WorkoutExerciseInProgress,
	type WorkoutExerciseWithSets,
	convertExerciseLoads,
	createWorkoutExerciseInProgressFromRoutineExercise
} from '$lib/utils/workoutUtils';
import type { Prisma } from '@prisma/client';
import type { FullWorkoutWithMesoData } from '../[workoutId]/+page.server';

/** Where a saved workout that couldn't be opened is kept */
const WORKOUT_BACKUP_KEY = 'workoutRunes:backup';

export type PreviousWorkoutData =
	RouterOutputs['workouts']['getWorkoutExercisesWithPreviousData']['previousWorkoutData'];

function createWorkoutRunes() {
	let workoutData: RouterOutputs['workouts']['getTodaysWorkoutData'] | null = $state(null);
	let workoutExercises: WorkoutExerciseInProgress[] | null = $state(null);
	let editingWorkoutId: string | null = $state(null);
	let previousWorkoutData: PreviousWorkoutData = $state(null);
	/** A failed routine load can retry its empty placeholder; null history alone is not a failure. */
	let suggestionsFailed = $state(false);
	/** This workout's reps-only exercises by name, with their rep cap (null for none) */
	let repsOnly: Record<string, number | null> = $state({});
	/** When a set was last ticked: a new workout ends there, not when it's saved */
	let lastActivityAt: string | null = $state(null);
	/** A past workout being edited, as loaded: leaving the edit asks to save only if it changed */
	let editSnapshot: string | null = $state(null);

	let editingExerciseIndex: number | undefined = $state();
	let editingExercise: RoutineExerciseTemplate | undefined = $state();

	let exerciseHistorySheetOpen = $state(false);
	let exerciseHistorySheetName: string | undefined = $state();
	// The exercise being replaced (a past workout's), while its picker is open
	let replacingExerciseIdx: number | null = $state(null);
	let exerciseWarmUpDialogOpen = $state(false);
	let exerciseWarmUpDialogExercise: WorkoutExerciseInProgress | undefined = $state();

	/** A saved workout couldn't be opened (kept as a backup): told once the page is up */
	let savedWorkoutUnreadable = false;
	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('workoutRunes');
		if (savedState) {
			try {
				const saved = JSON.parse(savedState);
				// A workout needs its details and its list of exercises (either may be null between workouts)
				if (typeof saved !== 'object' || saved === null || !('workoutData' in saved)) throw new Error();
				if (saved.workoutData !== null && !Array.isArray(saved.workoutExercises)) throw new Error();
				({
					workoutData,
					workoutExercises,
					editingWorkoutId = null,
					editSnapshot = null,
					previousWorkoutData,
					suggestionsFailed = false,
					repsOnly = {},
					lastActivityAt = null
				} = saved);
			} catch {
				// Never thrown away silently: kept as it was, under another key, and the person told
				localStorage.setItem(WORKOUT_BACKUP_KEY, savedState);
				localStorage.removeItem('workoutRunes');
				savedWorkoutUnreadable = true;
			}
		}
	}

	function saveStoresToLocalStorage() {
		// A breaking change to this shape (a field renamed, removed or retyped) needs a versioned key
		// (workoutRunes:v2) and the old one moved over on load: a reload (like the automatic update) must
		// never lose a workout in progress. An optional field read with a default (like a set's `chosen`)
		// doesn't
		localStorage.setItem(
			'workoutRunes',
			JSON.stringify({
				workoutData,
				workoutExercises,
				editingWorkoutId,
				editSnapshot,
				previousWorkoutData,
				suggestionsFailed,
				repsOnly,
				lastActivityAt
			})
		);
	}

	function resetStores() {
		workoutData = null;
		workoutExercises = null;
		editingWorkoutId = null;
		editSnapshot = null;
		previousWorkoutData = null;
		suggestionsFailed = false;
		repsOnly = {};
		lastActivityAt = null;
		saveStoresToLocalStorage();
	}

	/**
	 * What an edit can change, to compare with the edit as loaded. Numbers are rounded to 0.01, so a
	 * bodyweight that went kg → lb → kg on the way doesn't count as a change
	 */
	function editFingerprint() {
		const { userBodyweight, note, startedAt, endedAt } = workoutData ?? {};
		return JSON.stringify({ userBodyweight, note: note ?? null, startedAt, endedAt, workoutExercises }, (_, value) =>
			typeof value === 'number' ? Math.round(value * 100) / 100 : value
		);
	}

	/** Editing a past workout, and it's changed since it was loaded */
	function hasUnsavedEdits() {
		return editingWorkoutId !== null && editSnapshot !== null && editFingerprint() !== editSnapshot;
	}

	/** A set (or mini-set) was just ticked */
	function markActivity() {
		lastActivityAt = new Date().toISOString();
		saveStoresToLocalStorage();
	}

	/** Looks up which of these exercises are reps only (e.g. when editing a past workout) */
	async function loadRepsOnly(exerciseNames: string[]) {
		// The answer belongs to this edit: if the workout was discarded or replaced meanwhile, it is dropped
		const askedFor = editingWorkoutId;
		try {
			const exercises = await trpc().exercises.forPicker.query();
			if (editingWorkoutId !== askedFor) return;
			for (const exercise of exercises) {
				if (exerciseNames.includes(exercise.name)) setRepsOnly(exercise.name, exercise);
			}
		} catch (error) {
			console.error('Failed to load reps-only settings:', error);
		}
	}

	/** Remembers whether an exercise is reps only (and its cap) */
	function setRepsOnly(exerciseName: string, settings: { repsOnly: boolean; maxReps: number | null }) {
		const { [exerciseName]: _, ...others } = repsOnly;
		repsOnly = settings.repsOnly ? { ...others, [exerciseName]: settings.maxReps } : others;
		saveStoresToLocalStorage();
	}

	function exerciseNameExists(exerciseName: string, exceptIndex?: number) {
		if (!workoutExercises) return;
		const exercise = workoutExercises.find((ex, idx) => ex.name === exerciseName && idx !== exceptIndex);
		return exercise !== undefined;
	}

	function addExercise(exercise: RoutineExerciseTemplate) {
		if (workoutExercises === null) return false;
		if (exerciseNameExists(exercise.name)) return false;
		// New exercises use their own weight set, else the gym's picked for this workout; and start in
		// that weight set's unit, else the unit picked for this workout (or the home unit)
		// A machine with levels always logs its own levels
		const weightSets: WeightSetLike[] = get(page).data.weightSets ?? [];
		// A machine with its own weights always uses them, in its unit
		const levels = levelSetOf(exercise.name, weightSets);
		const machine = machineSetOf(exercise.name, weightSets);
		const weightSetId = levels || machine ? null : (exercise.weightSetId ?? workoutData?.sessionWeightSetId ?? null);
		const weightSetUnit = levels
			? 'LEVEL'
			: (machine?.unit ?? weightSets.find((weightSet) => weightSet.id === weightSetId)?.unit);
		const weightUnit = weightSetUnit ?? workoutData?.sessionWeightUnit ?? workoutData?.homeWeightUnit ?? 'KG';
		workoutExercises.push({
			...createWorkoutExerciseInProgressFromRoutineExercise(exercise),
			weightUnit,
			weightSetId
		});
		suggestionsFailed = false;
		saveStoresToLocalStorage();
		suggestSetsFromLastTime(exercise.name);
		return true;
	}

	/** The last time an exercise added during the workout was done, for its "Previous" column */
	function addPreviousExercise(exercise: WorkoutExerciseWithSets, userBodyweight: number) {
		const others = previousWorkoutData?.exercises.filter((ex) => ex.name !== exercise.name) ?? [];
		previousWorkoutData = {
			exercises: [...others, exercise],
			userBodyweight: previousWorkoutData?.userBodyweight ?? userBodyweight
		};
		saveStoresToLocalStorage();
	}

	/** Fills an exercise added during the workout with suggestions from the last times it was done */
	async function suggestSetsFromLastTime(exerciseName: string) {
		const exercise = workoutExercises?.find((ex) => ex.name === exerciseName);
		const userBodyweight = workoutData?.userBodyweight;
		if (!exercise || typeof userBodyweight !== 'number' || exercise.sets.length === 0) return;
		// The answer belongs to this workout: if it was discarded or replaced meanwhile, it is dropped
		const startedMs = new Date(workoutData?.startedAt ?? NaN).getTime();
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
				userBodyweight,
				timeZone: browserTimeZone(),
				now: new Date().toISOString()
			});
			if (!suggested) return;
			if (workoutData === null || new Date(workoutData.startedAt).getTime() !== startedMs) return;
			setRepsOnly(exerciseName, suggested);
			if (suggested.previous) addPreviousExercise(suggested.previous.exercise, suggested.previous.userBodyweight);
			// Only if it's still there and nothing has been entered yet
			const current = workoutExercises?.find((ex) => ex.name === exerciseName);
			const untouched = current?.sets.every((set) => set.reps === undefined && set.load === undefined);
			if (!suggested.sets || !current || !untouched) return;
			// The hint starts from these final numbers: none until the weight changes (and none at all in a past
			// workout, where the hint is off)
			current.sets = editingWorkoutId === null ? withHintBase(suggested.sets) : suggested.sets;
			saveStoresToLocalStorage();
		} catch (error) {
			console.error('Failed to suggest sets:', error);
		}
	}

	function editExercise(exercise: RoutineExerciseTemplate) {
		if (!editingExercise || editingExerciseIndex === undefined || workoutExercises === null) return false;
		if (exerciseNameExists(exercise.name, editingExerciseIndex)) return false;
		const current = workoutExercises[editingExerciseIndex];
		// Switching between a machine's levels and weights: the loads so far mean something else
		const weightSets: WeightSetLike[] = get(page).data.weightSets ?? [];
		const machine = machineSetOf(exercise.name, weightSets);
		const weightSetUnit = levelSetOf(exercise.name, weightSets)
			? 'LEVEL'
			: (machine?.unit ?? weightSets.find((weightSet) => weightSet.id === exercise.weightSetId)?.unit);
		const kindChanged = isLevelUnit(weightSetUnit) !== isLevelUnit(current.weightUnit);
		// A machine with weights is shown in its own unit (it can't be switched, so it's set here)
		const weightUnit =
			kindChanged || machine
				? (weightSetUnit ?? workoutData?.sessionWeightUnit ?? workoutData?.homeWeightUnit ?? 'KG')
				: current.weightUnit;
		const inUnit = (load: number | undefined) =>
			load === undefined ? undefined : convertWeight(load, current.weightUnit ?? 'KG', weightUnit ?? 'KG');
		const sets = kindChanged
			? // Levels and weights don't mix: nothing of the old kind's loads stays, mini-sets and memory included
				current.sets.map((set) => ({ ...clearLoads(set), miniSets: set.miniSets.map(clearLoads) }))
			: convertSuggestedLoads(
					current.sets.map((set) => ({
						...set,
						load: inUnit(set.load),
						...(set.hintBase ? { hintBase: { ...set.hintBase, load: inUnit(set.hintBase.load)! } } : {}),
						miniSets: set.miniSets.map((miniSet) => ({ ...miniSet, load: inUnit(miniSet.load) }))
					})),
					(load) => inUnit(load)!
				);
		workoutExercises[editingExerciseIndex] = {
			...createWorkoutExerciseInProgressFromRoutineExercise(exercise, sets),
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

	/**
	 * A past workout's exercise logged as the wrong one: it becomes `exercise` (its name, muscle group,
	 * bodyweight share and note), keeping what was logged (its sets, set type, rep range, load change,
	 * routine note and settings). No weight set: a past workout doesn't record its gym, and the old one
	 * was the old exercise's (a machine's levels come from the exercise itself). Between levels and
	 * weights the loads mean something else: they're cleared and those sets un-ticked. 'taken' if the
	 * workout has that exercise already
	 */
	function replaceExercise(
		exerciseIdx: number,
		exercise: {
			name: string;
			targetMuscleGroup: WorkoutExerciseInProgress['targetMuscleGroup'];
			customMuscleGroup: string | null;
			bodyweightFraction: number | null;
			note: string | null;
		}
	): 'replaced' | 'loadsCleared' | 'taken' {
		if (workoutExercises === null || !workoutExercises[exerciseIdx]) return 'taken';
		if (exerciseNameExists(exercise.name, exerciseIdx)) return 'taken';
		const current = workoutExercises[exerciseIdx];
		const weightSets: WeightSetLike[] = get(page).data.weightSets ?? [];
		const levels = Boolean(levelSetOf(exercise.name, weightSets));
		const kindChanged = levels !== isLevelUnit(current.weightUnit);
		workoutExercises[exerciseIdx] = {
			...current,
			// The save links it to its exercise by name
			name: exercise.name,
			targetMuscleGroup: exercise.targetMuscleGroup,
			customMuscleGroup: exercise.customMuscleGroup,
			bodyweightFraction: exercise.bodyweightFraction,
			exerciseNote: exercise.note,
			weightSetId: null,
			...(kindChanged && {
				weightUnit: levels ? 'LEVEL' : (workoutData?.sessionWeightUnit ?? workoutData?.homeWeightUnit ?? 'KG'),
				sets: current.sets.map((set) => ({ ...clearLoads(set), miniSets: set.miniSets.map(clearLoads) }))
			})
		};
		saveStoresToLocalStorage();
		return kindChanged ? 'loadsCleared' : 'replaced';
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
		// Not for levels, reps-only or bodyweight exercises: there's no weight to warm up to
		if (!canWarmUp(exercise, exercise.name in repsOnly)) return;
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
			const copied: WorkoutExerciseInProgress['sets'][number] = {
				...historySet,
				load: sameKindOfLoad ? historySet.load : exerciseToEdit.sets[i].load,
				completed: false,
				// Copied on purpose: these are the person's numbers now, not suggestions
				chosen: sameKindOfLoad
					? ['reps', 'load', 'RIR']
					: ['reps', 'RIR', ...(exerciseToEdit.sets[i].chosen?.includes('load') ? (['load'] as const) : [])],
				miniSets: historySet.miniSets.map((miniSet) => {
					const { id, workoutExerciseSetId, ...restOfTheMiniSet } = miniSet;
					return { ...restOfTheMiniSet, completed: false };
				})
			};
			// A new starting point from the copied numbers (RIR too): no hint until the weight changes
			exerciseToEdit.sets[i] = editingWorkoutId === null ? { ...copied, hintBase: hintBaseOf(copied) } : copied;
		}

		exerciseHistorySheetOpen = false;
		saveStoresToLocalStorage();
	}

	function loadWorkout(workout: FullWorkoutWithMesoData, homeWeightUnit: WeightUnit) {
		editingWorkoutId = workout.id;
		repsOnly = {};
		lastActivityAt = null;
		loadRepsOnly(workout.workoutExercises.map((ex) => ex.name));
		workoutData = {
			startedAt: workout.startedAt,
			endedAt: workout.endedAt,
			userBodyweight: workout.userBodyweight,
			workoutExercises: [],
			note: workout.note,
			homeWeightUnit,
			routineName: workout.routineName
		};
		// Saved loads are in kg; show them in the unit each exercise was done in
		workoutExercises = workout.workoutExercises.map((ex) => {
			const { id, workoutId, ...exercise } = convertExerciseLoads(ex, 'toDisplay');
			return {
				...exercise,
				sets: exercise.sets.map((set) => {
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
		editSnapshot = editFingerprint();
		saveStoresToLocalStorage();
	}

	return {
		get lastActivityAt() {
			return lastActivityAt;
		},
		set lastActivityAt(value) {
			lastActivityAt = value;
			saveStoresToLocalStorage();
		},
		markActivity,
		hasUnsavedEdits,
		/** Whether a saved workout couldn't be opened; true only the first time it's asked */
		takeSavedWorkoutUnreadable() {
			const unreadable = savedWorkoutUnreadable;
			savedWorkoutUnreadable = false;
			return unreadable;
		},
		get workoutData() {
			return workoutData;
		},
		set workoutData(value) {
			workoutData = value;
			saveStoresToLocalStorage();
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
			saveStoresToLocalStorage();
		},
		get repsOnly() {
			return repsOnly;
		},
		set repsOnly(value) {
			repsOnly = value;
			saveStoresToLocalStorage();
		},
		setRepsOnly,
		get suggestionsFailed() {
			return suggestionsFailed;
		},
		set suggestionsFailed(value: boolean) {
			suggestionsFailed = value;
			saveStoresToLocalStorage();
		},
		get previousWorkoutData() {
			return previousWorkoutData;
		},
		set previousWorkoutData(value) {
			previousWorkoutData = value;
			saveStoresToLocalStorage();
		},
		get replacingExerciseIdx() {
			return replacingExerciseIdx;
		},
		set replacingExerciseIdx(value) {
			replacingExerciseIdx = value;
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
		replaceExercise,
		deleteExercise,
		loadWorkout,
		openExerciseHistorySheet,
		openExerciseWarmupDialog,
		copyExerciseSetNumbersFromHistory
	};
}

export const workoutRunes = createWorkoutRunes();
