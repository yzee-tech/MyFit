import { suggestWeeklyRIR, weeklyRIRFromWeeksPerRIR } from '$lib/utils/workoutUtils';
import type { Prisma, Mesocycle } from '@prisma/client';

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

/** A block's own settings: its routines are My routines */
export type FullMesocycleWithoutIds = MesocycleWithoutIds & {
	mesocycleCyclicSetChanges: Prisma.MesocycleCyclicSetChangeCreateWithoutMesocycleInput[];
};

/** Setting up or editing a block: its weeks, weekly effort and progression settings */
export function createMesocycleRunes() {
	let mesocycle: MesocycleWithoutIds = $state(structuredClone(defaultMesocycle));
	// Automatic set increases are no longer used: kept only so an edit doesn't drop stored ones
	let mesocycleCyclicSetChanges: Prisma.MesocycleCyclicSetChangeCreateWithoutMesocycleInput[] = $state([]);
	let editingMesocycleId: string | null = $state(null);

	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('mesocycleRunes');
		if (savedState) ({ mesocycle, editingMesocycleId, mesocycleCyclicSetChanges = [] } = JSON.parse(savedState));
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
		mesocycleCyclicSetChanges = [];
		editingMesocycleId = null;
		saveStoresToLocalStorage();
	}

	function loadMesocycle(mesocycleData: FullMesocycleWithoutIds, editingId?: string) {
		editingMesocycleId = editingId ?? null;
		const { mesocycleCyclicSetChanges: setChanges, ...onlyMesocycleData } = mesocycleData;
		mesocycle = onlyMesocycleData;
		mesocycleCyclicSetChanges = setChanges;
		saveStoresToLocalStorage();
	}

	function saveStoresToLocalStorage() {
		localStorage.setItem(
			'mesocycleRunes',
			JSON.stringify({ mesocycle, editingMesocycleId, mesocycleCyclicSetChanges })
		);
	}

	return {
		get editingMesocycleId() {
			return editingMesocycleId;
		},
		set editingMesocycleId(id) {
			editingMesocycleId = id;
		},
		get mesocycle() {
			return mesocycle;
		},
		set mesocycle(value) {
			mesocycle = value;
		},
		get mesocycleCyclicSetChanges() {
			return mesocycleCyclicSetChanges;
		},
		loadMesocycle,
		resetStores,
		saveStoresToLocalStorage
	};
}

export const mesocycleRunes = createMesocycleRunes();
