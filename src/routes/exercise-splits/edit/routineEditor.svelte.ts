import type { SplitExerciseTemplateWithoutIdsOrIndex } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import type { RoutineWeightUnit } from '$lib/utils/prismaEnums';
import { routineFingerprint, type MyRoutine } from '../myRoutines';

type Exercise = SplitExerciseTemplateWithoutIdsOrIndex;

/**
 * One routine being edited (or a new one), with its unsaved changes. Kept on this device, so a reload
 * doesn't lose them. `opened` is the routine as it was when editing began: to tell whether anything
 * changed, and whether someone else changed it meanwhile.
 */
function createRoutineEditor() {
	/** Which routine: its saved name, or null for a new one. Unset when nothing is being edited */
	let editing: { originalName: string | null } | undefined = $state();
	let opened = $state('');
	let name = $state('');
	let weightUnit: RoutineWeightUnit = $state('KG');
	let exercises: Exercise[] = $state([]);

	let editingExercise: Exercise | undefined = $state();
	// Copied exercises stay for this visit, to paste into another routine
	let copiedExercises: Exercise[] | undefined = $state();

	if (globalThis.localStorage) {
		const saved = localStorage.getItem('routineEditor');
		if (saved) ({ editing, opened, name, weightUnit, exercises } = JSON.parse(saved));
	}

	function save() {
		localStorage.setItem('routineEditor', JSON.stringify({ editing, opened, name, weightUnit, exercises }));
	}

	/** Starts editing a routine as saved, or a new one */
	function open(routine: MyRoutine | null) {
		editing = { originalName: routine?.name ?? null };
		name = routine?.name ?? '';
		weightUnit = routine?.weightUnit ?? 'KG';
		exercises = structuredClone(routine?.exercises ?? []);
		opened = routine ? routineFingerprint(routine) : '';
		editingExercise = undefined;
		save();
	}

	/** Whether the editor holds this routine already (e.g. back after a reload): its edits stay */
	function isOpenFor(originalName: string | null) {
		return editing !== undefined && editing.originalName === originalName;
	}

	function hasUnsavedChanges() {
		if (!editing) return false;
		const now = { name, weightUnit, exercises: $state.snapshot(exercises) };
		// A new routine counts as changed once anything is filled in
		if (editing.originalName === null) return name.trim() !== '' || exercises.length > 0;
		return routineFingerprint(now) !== opened;
	}

	function close() {
		editing = undefined;
		opened = '';
		name = '';
		weightUnit = 'KG';
		exercises = [];
		editingExercise = undefined;
		save();
	}

	function exerciseNameExists(exerciseName: string, exceptIndex?: number) {
		return exercises.some((exercise, idx) => exercise.name === exerciseName && idx !== exceptIndex);
	}

	function addExercise(exercise: Exercise) {
		if (exerciseNameExists(exercise.name)) return false;
		exercises.push(exercise);
		save();
		return true;
	}

	function setEditingExercise(exercise: Exercise | undefined) {
		editingExercise = exercise;
	}

	function editExercise(exercise: Exercise) {
		if (!editingExercise) return false;
		const idx = exercises.indexOf(editingExercise);
		if (exerciseNameExists(exercise.name, idx)) return false;
		exercises[idx] = exercise;
		save();
		return true;
	}

	function deleteExercise(idx: number) {
		exercises.splice(idx, 1);
		save();
	}

	function copyExercises() {
		copiedExercises = structuredClone($state.snapshot(exercises));
	}

	/** Copied exercises into this routine, while it has none */
	function pasteExercises() {
		if (!copiedExercises || exercises.length > 0) return;
		exercises = structuredClone($state.snapshot(copiedExercises));
		save();
	}

	return {
		get editing() {
			return editing;
		},
		get opened() {
			return opened;
		},
		get name() {
			return name;
		},
		set name(value) {
			name = value;
			save();
		},
		get weightUnit() {
			return weightUnit;
		},
		set weightUnit(value) {
			weightUnit = value;
			save();
		},
		get exercises() {
			return exercises;
		},
		set exercises(value) {
			exercises = value;
			save();
		},
		get editingExercise() {
			return editingExercise;
		},
		get copiedExercises() {
			return copiedExercises;
		},
		open,
		isOpenFor,
		hasUnsavedChanges,
		close,
		addExercise,
		setEditingExercise,
		editExercise,
		deleteExercise,
		copyExercises,
		pasteExercises
	};
}

export const routineEditor = createRoutineEditor();
