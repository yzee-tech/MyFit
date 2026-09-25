import type { SplitExerciseTemplateWithoutIdsOrIndex } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import type { Prisma } from '@prisma/client';

export type FullExerciseSplit = Prisma.ExerciseSplitGetPayload<{
	include: { exerciseSplitDays: { include: { exercises: true } } };
}>;

export type FullExerciseSplitWithoutIdsOrIndex = Omit<
	Prisma.ExerciseSplitCreateWithoutUserInput,
	'exerciseSplitDays'
> & {
	exerciseSplitDays: (Omit<Prisma.ExerciseSplitDayCreateWithoutExerciseSplitInput, 'exercises' | 'dayIndex'> & {
		exercises: SplitExerciseTemplateWithoutIdsOrIndex[];
	})[];
};

type ExerciseSplitDayWithoutIds = Omit<Prisma.ExerciseSplitDayCreateWithoutExerciseSplitInput, 'dayIndex'> & {
	/** The routine's name before this edit (unset for a new routine), to find it in the current block */
	previousName?: string;
};

export function createExerciseSplitRunes() {
	let splitName = $state('');
	let splitDays: ExerciseSplitDayWithoutIds[] = $state([{ name: '', isRestDay: false, weightUnit: 'KG' }]);
	let splitExercises: SplitExerciseTemplateWithoutIdsOrIndex[][] = $state([]);
	let editingExerciseSplitId: string | null = $state(null);

	let selectedSplitDayIndex: number = $state(0);
	let editingExercise: SplitExerciseTemplateWithoutIdsOrIndex | undefined = $state(undefined);
	let copiedExercises: SplitExerciseTemplateWithoutIdsOrIndex[] | undefined = $state(undefined);

	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('exerciseSplitRunes');
		if (savedState) ({ splitName, splitDays, splitExercises, editingExerciseSplitId } = JSON.parse(savedState));
	}

	function addSplitDay() {
		splitDays.push({ name: '', isRestDay: false, weightUnit: 'KG' });
	}

	function removeSplitDay(idx: number) {
		splitDays.splice(idx, 1);
		splitExercises.splice(idx, 1);
		if (selectedSplitDayIndex >= splitDays.length) selectedSplitDayIndex = splitDays.length - 1;
		saveStoresToLocalStorage();
	}

	function validateSplitStructure() {
		const routineNames = splitDays.map((splitDay) => splitDay.name.trim());
		return new Set(routineNames).size === routineNames.length;
	}

	function updateSplitExercisesStructure() {
		for (let i = 0; i < splitDays.length; i++) splitExercises[i] ??= [];
		splitExercises.length = splitDays.length;
		selectedSplitDayIndex = 0;
		saveStoresToLocalStorage();
	}

	function exerciseNameExists(exerciseName: string, exceptIndex?: number) {
		const exercise = splitExercises[selectedSplitDayIndex].find(
			(exerciseTemplate, idx) => exerciseTemplate.name === exerciseName && idx !== exceptIndex
		);
		return exercise !== undefined;
	}

	function addExercise(exerciseTemplate: SplitExerciseTemplateWithoutIdsOrIndex) {
		if (exerciseNameExists(exerciseTemplate.name)) return false;
		splitExercises[selectedSplitDayIndex].push(exerciseTemplate);
		saveStoresToLocalStorage();
		return true;
	}

	function deleteExercise(exerciseIdx: number) {
		splitExercises[selectedSplitDayIndex].splice(exerciseIdx, 1);
		saveStoresToLocalStorage();
	}

	function setEditingExercise(exerciseTemplate: SplitExerciseTemplateWithoutIdsOrIndex | undefined) {
		editingExercise = exerciseTemplate;
	}

	function editExercise(exerciseTemplate: SplitExerciseTemplateWithoutIdsOrIndex) {
		if (!editingExercise) return false;
		const editingExerciseIndex = splitExercises[selectedSplitDayIndex].indexOf(editingExercise);
		if (exerciseNameExists(exerciseTemplate.name, editingExerciseIndex)) return false;
		splitExercises[selectedSplitDayIndex][editingExerciseIndex] = exerciseTemplate;
		saveStoresToLocalStorage();
		return true;
	}

	function copyExercises() {
		copiedExercises = structuredClone($state.snapshot(splitExercises[selectedSplitDayIndex]));
	}

	function pasteExercises() {
		if (!copiedExercises || splitExercises[selectedSplitDayIndex].length > 0) return;
		splitExercises[selectedSplitDayIndex] = structuredClone($state.snapshot(copiedExercises));
		saveStoresToLocalStorage();
	}

	function cutExercises() {
		copyExercises();
		splitExercises[selectedSplitDayIndex] = [];
		saveStoresToLocalStorage();
	}

	function swapExercises(swapFromIndex: number) {
		[splitExercises[selectedSplitDayIndex], splitExercises[swapFromIndex]] = [
			splitExercises[swapFromIndex],
			splitExercises[selectedSplitDayIndex]
		];
		saveStoresToLocalStorage();
	}

	function saveStoresToLocalStorage() {
		localStorage.setItem(
			'exerciseSplitRunes',
			JSON.stringify({ splitName, splitDays, splitExercises, editingExerciseSplitId })
		);
	}

	function resetStores() {
		editingExerciseSplitId = null;
		splitName = '';
		splitDays = [{ name: '', isRestDay: false, weightUnit: 'KG' }];
		splitExercises = [];
		selectedSplitDayIndex = 0;
		editingExercise = undefined;
		copiedExercises = undefined;
		saveStoresToLocalStorage();
	}

	function loadExerciseSplit(exerciseSplit: FullExerciseSplitWithoutIdsOrIndex, editingId?: string) {
		editingExerciseSplitId = editingId ?? null;
		splitName = exerciseSplit.name;
		// Rest days belonged to the old fixed rotation; a routine library only has routines
		const routines = exerciseSplit.exerciseSplitDays.filter((splitDay) => !splitDay.isRestDay);
		splitDays = routines.map((splitDay) => ({
			name: splitDay.name,
			isRestDay: false,
			weightUnit: splitDay.weightUnit ?? 'KG',
			...(editingId && { previousName: splitDay.name })
		}));
		splitExercises = routines.map((splitDay) => splitDay.exercises);
		selectedSplitDayIndex = 0;
		editingExercise = undefined;
		copiedExercises = undefined;
		saveStoresToLocalStorage();
	}

	return {
		get splitName() {
			return splitName;
		},
		set splitName(name) {
			splitName = name;
		},
		get splitDays() {
			return splitDays;
		},
		get splitExercises() {
			return splitExercises;
		},
		get editingExercise() {
			return editingExercise;
		},
		set editingExercise(exerciseTemplate) {
			editingExercise = exerciseTemplate;
		},
		get selectedSplitDayIndex() {
			return selectedSplitDayIndex;
		},
		set selectedSplitDayIndex(idx) {
			selectedSplitDayIndex = idx;
		},
		get copiedExercises() {
			return copiedExercises;
		},
		get editingExerciseSplitId() {
			return editingExerciseSplitId;
		},
		set editingExerciseSplitId(id) {
			editingExerciseSplitId = id;
		},
		addSplitDay,
		removeSplitDay,
		validateSplitStructure,
		updateSplitExercisesStructure,
		addExercise,
		setEditingExercise,
		editExercise,
		deleteExercise,
		copyExercises,
		pasteExercises,
		cutExercises,
		swapExercises,
		saveStoresToLocalStorage,
		resetStores,
		loadExerciseSplit
	};
}

export const exerciseSplitRunes = createExerciseSplitRunes();
