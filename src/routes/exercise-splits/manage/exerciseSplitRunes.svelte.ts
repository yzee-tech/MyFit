import type { SplitExerciseTemplateWithoutIdsOrIndex } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import type { Prisma } from '@prisma/client';
import { uniqueRoutineName } from '$lib/utils/routineNames';

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

/** A routine coming into the editor: from My routines, a template or an import */
export type RoutineToLoad = {
	name: string;
	isRestDay?: boolean;
	weightUnit?: Prisma.ExerciseSplitDayCreateWithoutExerciseSplitInput['weightUnit'];
	exercises: SplitExerciseTemplateWithoutIdsOrIndex[];
};

type ExerciseSplitDayWithoutIds = Omit<Prisma.ExerciseSplitDayCreateWithoutExerciseSplitInput, 'dayIndex'> & {
	/** The routine's name before this edit (unset for a new routine), to find it in the current block */
	previousName?: string;
};

/** A routine's exercises as the editor holds them: without database ids, which a save never takes */
function withoutIds(exercises: RoutineToLoad['exercises']): SplitExerciseTemplateWithoutIdsOrIndex[] {
	return exercises.map((exercise) => {
		const { id, exerciseSplitDayId, exerciseIndex, ...rest } = exercise as typeof exercise & {
			id?: string;
			exerciseSplitDayId?: string;
			exerciseIndex?: number;
		};
		return structuredClone(rest);
	});
}

/** The editor for My routines: the person's routines, with any unsaved changes */
export function createExerciseSplitRunes() {
	let splitDays: ExerciseSplitDayWithoutIds[] = $state([{ name: '', isRestDay: false, weightUnit: 'KG' }]);
	let splitExercises: SplitExerciseTemplateWithoutIdsOrIndex[][] = $state([]);

	let selectedSplitDayIndex: number = $state(0);
	let editingExercise: SplitExerciseTemplateWithoutIdsOrIndex | undefined = $state(undefined);
	let copiedExercises: SplitExerciseTemplateWithoutIdsOrIndex[] | undefined = $state(undefined);

	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('exerciseSplitRunes');
		if (savedState) ({ splitDays, splitExercises } = JSON.parse(savedState));
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
		localStorage.setItem('exerciseSplitRunes', JSON.stringify({ splitDays, splitExercises }));
	}

	function resetStores() {
		splitDays = [{ name: '', isRestDay: false, weightUnit: 'KG' }];
		splitExercises = [];
		selectedSplitDayIndex = 0;
		editingExercise = undefined;
		copiedExercises = undefined;
		saveStoresToLocalStorage();
	}

	/** Starts editing My routines as saved (none yet: one empty routine to fill in) */
	function loadMyRoutines(routines: RoutineToLoad[]) {
		splitDays = routines.map((splitDay) => ({
			name: splitDay.name,
			isRestDay: false,
			weightUnit: splitDay.weightUnit ?? 'KG',
			previousName: splitDay.name
		}));
		splitExercises = routines.map((splitDay) => withoutIds(splitDay.exercises));
		if (splitDays.length === 0) {
			splitDays = [{ name: '', isRestDay: false, weightUnit: 'KG' }];
			splitExercises = [[]];
		}
		selectedSplitDayIndex = 0;
		editingExercise = undefined;
		copiedExercises = undefined;
		saveStoresToLocalStorage();
	}

	/**
	 * Adds routines (from a template or an import) after the ones being edited. A name already taken
	 * gets "(2)", "(3)"... The list itself keeps its name
	 */
	function appendRoutines(routines: RoutineToLoad[]) {
		// An untouched empty routine (a list with nothing in it yet) makes way
		if (splitDays.length === 1 && !splitDays[0].name.trim() && (splitExercises[0]?.length ?? 0) === 0) {
			splitDays = [];
			splitExercises = [];
		}
		// Rest days belonged to the old fixed rotation: only routines come in
		for (const routine of routines.filter((splitDay) => !splitDay.isRestDay)) {
			const name = uniqueRoutineName(
				routine.name,
				splitDays.map((splitDay) => splitDay.name)
			);
			splitDays.push({ name, isRestDay: false, weightUnit: routine.weightUnit ?? 'KG' });
			splitExercises.push(withoutIds(routine.exercises));
		}
		selectedSplitDayIndex = 0;
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
		loadMyRoutines,
		appendRoutines
	};
}

export const exerciseSplitRunes = createExerciseSplitRunes();
