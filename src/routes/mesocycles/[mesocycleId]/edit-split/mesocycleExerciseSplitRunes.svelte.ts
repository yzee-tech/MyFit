import type { MesocycleExerciseTemplateWithoutIdsOrIndex } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import type { RouterOutputs } from '$lib/trpc/router';
import type { Prisma } from '@prisma/client';

export type FullMesocycleWithExerciseSplit = Prisma.MesocycleGetPayload<{
	include: { mesocycleExerciseSplitDays: { include: { mesocycleSplitDayExercises: true } } };
}>;

type MesocycleExerciseSplitDayWithoutIds = Omit<
	Prisma.MesocycleExerciseSplitDayCreateWithoutMesocycleInput,
	'mesocycleSplitDayExercises' | 'dayIndex'
> & {
	/** Position of this routine when editing started (null for new ones), so logged workouts can follow it */
	previousDayIndex: number | null;
};

export function createMesocycleExerciseSplitRunes() {
	let mesocycle: RouterOutputs['mesocycles']['findById'] = $state(null);
	let splitDays: MesocycleExerciseSplitDayWithoutIds[] = $state([
		{ name: '', isRestDay: false, previousDayIndex: null }
	]);
	let splitExercises: MesocycleExerciseTemplateWithoutIdsOrIndex[][] = $state([]);

	let selectedSplitDayIndex: number = $state(0);
	let editingExercise: MesocycleExerciseTemplateWithoutIdsOrIndex | undefined = $state(undefined);
	let copiedExercises: MesocycleExerciseTemplateWithoutIdsOrIndex[] | undefined = $state(undefined);

	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('mesocycleExerciseSplitRunes');
		if (savedState) ({ splitDays, splitExercises, mesocycle } = JSON.parse(savedState));
		// Edits saved by an older version don't know where routines came from: start over from the block
		if (splitDays.some((splitDay) => splitDay.previousDayIndex === undefined)) mesocycle = null;
	}

	function addSplitDay() {
		splitDays.push({ name: '', isRestDay: false, previousDayIndex: null });
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

	/** Routines already trained in this block can't be deleted, or their workouts would lose their routine */
	function routineHasWorkouts(idx: number) {
		const previousDayIndex = splitDays[idx]?.previousDayIndex;
		if (previousDayIndex === null || previousDayIndex === undefined || !mesocycle) return false;
		return mesocycle.workoutsOfMesocycle.some((wm) => wm.splitDayIndex === previousDayIndex);
	}

	function exerciseNameExists(exerciseName: string, exceptIndex?: number) {
		const exercise = splitExercises[selectedSplitDayIndex].find(
			(exerciseTemplate, idx) => exerciseTemplate.name === exerciseName && idx !== exceptIndex
		);
		return exercise !== undefined;
	}

	function addExercise(exerciseTemplate: MesocycleExerciseTemplateWithoutIdsOrIndex) {
		if (exerciseNameExists(exerciseTemplate.name)) return false;
		splitExercises[selectedSplitDayIndex].push(exerciseTemplate);
		saveStoresToLocalStorage();
		return true;
	}

	function deleteExercise(exerciseIdx: number) {
		splitExercises[selectedSplitDayIndex].splice(exerciseIdx, 1);
		saveStoresToLocalStorage();
	}

	function setEditingExercise(exerciseTemplate: MesocycleExerciseTemplateWithoutIdsOrIndex | undefined) {
		editingExercise = exerciseTemplate;
	}

	function editExercise(exerciseTemplate: MesocycleExerciseTemplateWithoutIdsOrIndex) {
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
		localStorage.setItem('mesocycleExerciseSplitRunes', JSON.stringify({ splitDays, splitExercises, mesocycle }));
	}

	function resetStores() {
		mesocycle = null;
		splitDays = [{ name: '', isRestDay: false, previousDayIndex: null }];
		splitExercises = [];
		selectedSplitDayIndex = 0;
		editingExercise = undefined;
		copiedExercises = undefined;
		saveStoresToLocalStorage();
	}

	function loadExerciseSplit(mesocycleWithExerciseSplit: NonNullable<RouterOutputs['mesocycles']['findById']>) {
		// Same mesocycle, don't reset and load new data, reuse and continue editing
		if (mesocycleWithExerciseSplit.id === mesocycle?.id) return;

		resetStores();
		mesocycle = structuredClone($state.snapshot(mesocycleWithExerciseSplit));
		// Rest days belonged to the old fixed rotation; only routines are edited
		const routines = mesocycleWithExerciseSplit.mesocycleExerciseSplitDays.filter((splitDay) => !splitDay.isRestDay);
		splitDays = routines.map((splitDay) => ({
			name: splitDay.name,
			isRestDay: false,
			previousDayIndex: splitDay.dayIndex
		}));
		splitExercises = routines.map((splitDay) =>
			splitDay.mesocycleSplitDayExercises.map((exercise) => {
				const { id, mesocycleExerciseSplitDayId, ...rest } = exercise;
				return rest;
			})
		);
		saveStoresToLocalStorage();
	}

	return {
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
		get mesocycle() {
			return mesocycle;
		},
		set mesocycle(value) {
			mesocycle = value;
		},
		addSplitDay,
		removeSplitDay,
		validateSplitStructure,
		routineHasWorkouts,
		updateSplitExercisesStructure,
		addExercise,
		editExercise,
		deleteExercise,
		setEditingExercise,
		copyExercises,
		pasteExercises,
		cutExercises,
		swapExercises,
		saveStoresToLocalStorage,
		resetStores,
		loadExerciseSplit
	};
}

export const mesocycleExerciseSplitRunes = createMesocycleExerciseSplitRunes();
