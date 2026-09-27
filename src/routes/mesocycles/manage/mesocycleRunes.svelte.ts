import { MuscleGroup } from '$lib/utils/prismaEnums';
import { suggestWeeklyRIR, weeklyRIRFromWeeksPerRIR } from '$lib/utils/workoutUtils';
import type { Prisma, Mesocycle } from '@prisma/client';
import type { FullExerciseSplit } from '../../exercise-splits/manage/exerciseSplitRunes.svelte';

type MesocycleWithoutIds = Omit<Mesocycle, 'id' | 'exerciseSplitId' | 'userId'>;
const defaultMesocycle: MesocycleWithoutIds = {
	name: '',
	weeklyRIR: suggestWeeklyRIR(5),
	startDate: null,
	endDate: null,
	startOverloadPercentage: 2.5,
	lastSetToFailure: true,
	forceRIRMatching: true
};

export type FullMesocycleWithoutIds = MesocycleWithoutIds & {
	mesocycleCyclicSetChanges: Prisma.MesocycleCyclicSetChangeCreateWithoutMesocycleInput[];
	mesocycleExerciseSplitDays: (Prisma.MesocycleExerciseSplitDayCreateWithoutMesocycleInput & {
		mesocycleSplitDayExercises: Prisma.MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInput[];
	})[];
};

export type MesocycleCyclicSetChangeWithExtraProps = Prisma.MesocycleCyclicSetChangeCreateWithoutMesocycleInput & {
	startVolume: number;
	inSplit: boolean;
};

export function createMesocycleRunes() {
	let mesocycle: MesocycleWithoutIds = $state(structuredClone(defaultMesocycle));
	let mesocycleExerciseTemplates: Prisma.MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInput[][] =
		$state([]);
	let mesocycleCyclicSetChanges: MesocycleCyclicSetChangeWithExtraProps[] = $state([]);

	let selectedExerciseSplit: FullExerciseSplit | null = $state(null);
	let minSets = $state(2);
	/** Routines of the selected library left out of the new block */
	let excludedRoutineIndexes: number[] = $state([]);
	let editingMesocycleId: string | null = $state(null);

	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('mesocycleRunes');
		if (savedState)
			({
				mesocycle,
				editingMesocycleId,
				selectedExerciseSplit,
				mesocycleExerciseTemplates,
				mesocycleCyclicSetChanges,
				minSets,
				excludedRoutineIndexes = []
			} = JSON.parse(savedState));
		// Block setups saved before weekly plans existed
		const legacyMesocycle = mesocycle as MesocycleWithoutIds & { RIRProgression?: number[] };
		if (!Array.isArray(legacyMesocycle.weeklyRIR)) {
			mesocycle.weeklyRIR = legacyMesocycle.RIRProgression
				? weeklyRIRFromWeeksPerRIR(legacyMesocycle.RIRProgression)
				: suggestWeeklyRIR(5);
			delete legacyMesocycle.RIRProgression;
		}
	}

	function resetStores() {
		mesocycle = structuredClone(defaultMesocycle);
		mesocycleExerciseTemplates = [];
		mesocycleCyclicSetChanges = [];
		selectedExerciseSplit = null;
		minSets = 2;
		excludedRoutineIndexes = [];
		editingMesocycleId = null;
		saveStoresToLocalStorage();
	}

	function generateMesocycleExerciseTemplates() {
		if (!selectedExerciseSplit) return;
		mesocycleExerciseTemplates = selectedExerciseSplit.exerciseSplitDays.map((splitDay) =>
			splitDay.exercises.map((exercise) => {
				const { id, exerciseSplitDayId, ...rest } = exercise;
				const mesocycleExerciseTemplate: Prisma.MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInput = {
					...rest,
					// The library's set count; 0 until the block setup fills it in
					sets: rest.sets ?? 0
				};
				return mesocycleExerciseTemplate;
			})
		);
		generateMesocycleCyclicSetChanges();
	}

	function generateMesocycleCyclicSetChanges() {
		const allMuscleGroupsFromExercises = new Set(
			mesocycleExerciseTemplates.flatMap((exercises) =>
				exercises.map((exercise) =>
					exercise.targetMuscleGroup === 'Custom' ? (exercise.customMuscleGroup as string) : exercise.targetMuscleGroup
				)
			)
		);
		allMuscleGroupsFromExercises.forEach((muscleGroup) => addMuscleGroupToCyclicSetChanges(muscleGroup, true));
	}

	function isEnumMuscleGroup(muscleGroup: string): muscleGroup is MuscleGroup {
		return Object.values(MuscleGroup).includes(muscleGroup as MuscleGroup);
	}

	function muscleGroupExistsInSetChanges(muscleGroup: string) {
		return mesocycleCyclicSetChanges.some((setChange) =>
			isEnumMuscleGroup(muscleGroup)
				? setChange.muscleGroup === muscleGroup
				: setChange.customMuscleGroup === muscleGroup
		);
	}

	function addMuscleGroupToCyclicSetChanges(muscleGroup: string, inSplit: boolean) {
		if (muscleGroupExistsInSetChanges(muscleGroup)) return false;

		mesocycleCyclicSetChanges.push({
			muscleGroup: isEnumMuscleGroup(muscleGroup) ? muscleGroup : 'Custom',
			customMuscleGroup: isEnumMuscleGroup(muscleGroup) ? null : muscleGroup,
			regardlessOfProgress: false,
			maxVolume: 30,
			setIncreaseAmount: 1,
			startVolume: 6,
			inSplit
		});

		saveStoresToLocalStorage();
		return true;
	}

	function isExerciseAndSetChangeMuscleSame(
		exercise: Prisma.MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInput,
		setChange: MesocycleCyclicSetChangeWithExtraProps
	) {
		return exercise.customMuscleGroup
			? exercise.customMuscleGroup === setChange.customMuscleGroup
			: exercise.targetMuscleGroup === setChange.muscleGroup;
	}

	/** Exercises with no set count yet (not given one in their library) */
	function countExercisesWithoutSets(routineIndexes: number[]) {
		return routineIndexes.reduce(
			(count, idx) => count + (mesocycleExerciseTemplates[idx] ?? []).filter((exercise) => !exercise.sets).length,
			0
		);
	}

	/** Gives exercises with no set count this many; the others keep theirs */
	function fillMissingSets(sets: number) {
		mesocycleExerciseTemplates.forEach((dayExercises) =>
			dayExercises.forEach((exercise) => {
				if (!exercise.sets) exercise.sets = sets;
			})
		);
		// Automatic set increases are no longer used; keep the stored rules inert
		mesocycleCyclicSetChanges.forEach((setChange) => {
			setChange.setIncreaseAmount = 0;
			setChange.regardlessOfProgress = false;
		});
		saveStoresToLocalStorage();
	}

	async function loadMesocycle(mesocycleData: FullMesocycleWithoutIds, editingId?: string) {
		editingMesocycleId = editingId ?? null;
		const {
			mesocycleCyclicSetChanges: mesocycleCyclicSetChangesData,
			mesocycleExerciseSplitDays,
			...onlyMesocycleData
		} = mesocycleData;
		mesocycle = onlyMesocycleData;

		mesocycleExerciseTemplates = mesocycleExerciseSplitDays.map((splitDay) => splitDay.mesocycleSplitDayExercises);
		mesocycleCyclicSetChanges = mesocycleCyclicSetChangesData.map((setChange) => ({
			...setChange,
			inSplit: true,
			startVolume: 5
		}));
		saveStoresToLocalStorage();
	}

	function saveStoresToLocalStorage() {
		localStorage.setItem(
			'mesocycleRunes',
			JSON.stringify({
				mesocycle,
				editingMesocycleId,
				selectedExerciseSplit,
				mesocycleExerciseTemplates,
				mesocycleCyclicSetChanges,
				minSets,
				excludedRoutineIndexes
			})
		);
	}

	/** Indexes of the library's routines that go into the block (rest days never do) */
	function getIncludedRoutineIndexes() {
		if (!selectedExerciseSplit) return [];
		return selectedExerciseSplit.exerciseSplitDays
			.map((splitDay, idx) => ({ splitDay, idx }))
			.filter(({ splitDay, idx }) => !splitDay.isRestDay && !excludedRoutineIndexes.includes(idx))
			.map(({ idx }) => idx);
	}

	function setRoutineIncluded(idx: number, included: boolean) {
		excludedRoutineIndexes = included
			? excludedRoutineIndexes.filter((excludedIdx) => excludedIdx !== idx)
			: [...excludedRoutineIndexes, idx];
		saveStoresToLocalStorage();
	}

	return {
		getIncludedRoutineIndexes,
		setRoutineIncluded,
		get excludedRoutineIndexes() {
			return excludedRoutineIndexes;
		},
		get editingMesocycleId() {
			return editingMesocycleId;
		},
		set editingMesocycleId(id) {
			editingMesocycleId = id;
		},
		get minSets() {
			return minSets;
		},
		set minSets(value) {
			minSets = value;
		},
		get selectedExerciseSplit() {
			return selectedExerciseSplit;
		},
		set selectedExerciseSplit(exerciseSplit) {
			if (exerciseSplit?.id !== selectedExerciseSplit?.id) excludedRoutineIndexes = [];
			selectedExerciseSplit = exerciseSplit;
			generateMesocycleExerciseTemplates();
			saveStoresToLocalStorage();
		},
		get mesocycle() {
			return mesocycle;
		},
		set mesocycle(value) {
			mesocycle = value;
		},
		get mesocycleExerciseTemplates() {
			return mesocycleExerciseTemplates;
		},
		set mesocycleExerciseTemplates(value) {
			mesocycleExerciseTemplates = value;
			saveStoresToLocalStorage();
		},
		get mesocycleCyclicSetChanges() {
			return mesocycleCyclicSetChanges;
		},
		set mesocycleCyclicSetChanges(value) {
			mesocycleCyclicSetChanges = value;
			saveStoresToLocalStorage();
		},
		isExerciseAndSetChangeMuscleSame,
		addMuscleGroupToCyclicSetChanges,
		countExercisesWithoutSets,
		fillMissingSets,
		loadMesocycle,
		resetStores,
		saveStoresToLocalStorage
	};
}

export const mesocycleRunes = createMesocycleRunes();
