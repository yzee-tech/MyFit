import { suggestWeeklyRIR, weeklyRIRFromWeeksPerRIR } from '$lib/utils/workoutUtils';
import type { Prisma, Mesocycle, MesocycleCyclicSetChange } from '@prisma/client';

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

/** A block's own settings, to clone: its routines are My routines */
export function fullMesocycleWithoutIds(
	mesocycle: Mesocycle & { mesocycleCyclicSetChanges: MesocycleCyclicSetChange[] }
): FullMesocycleWithoutIds {
	return {
		name: mesocycle.name,
		weeklyRIR: mesocycle.weeklyRIR,
		startDate: mesocycle.startDate,
		endDate: mesocycle.endDate,
		startOverloadPercentage: mesocycle.startOverloadPercentage,
		lastSetToFailure: mesocycle.lastSetToFailure,
		forceRIRMatching: mesocycle.forceRIRMatching,
		mesocycleCyclicSetChanges: mesocycle.mesocycleCyclicSetChanges.map(({ id, mesocycleId, ...rest }) => rest)
	};
}

/**
 * Setting up a new block (or a clone): its weeks, weekly effort and progression settings. A block that exists is
 * edited on its own page, with a draft of its own: nothing it holds is kept here
 */
export function createMesocycleRunes() {
	let mesocycle: MesocycleWithoutIds = $state(structuredClone(defaultMesocycle));
	// Automatic set increases are no longer used: kept only so an edit doesn't drop stored ones
	let mesocycleCyclicSetChanges: Prisma.MesocycleCyclicSetChangeCreateWithoutMesocycleInput[] = $state([]);

	if (globalThis.localStorage) {
		const savedState = localStorage.getItem('mesocycleRunes');
		if (savedState) {
			const saved = JSON.parse(savedState);
			// Kept by an app version that edited a block here: that edit is not a new block's to start from
			if (saved.editingMesocycleId) localStorage.removeItem('mesocycleRunes');
			else ({ mesocycle, mesocycleCyclicSetChanges = [] } = saved);
		}
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
		saveStoresToLocalStorage();
	}

	function loadMesocycle(mesocycleData: FullMesocycleWithoutIds) {
		const { mesocycleCyclicSetChanges: setChanges, ...onlyMesocycleData } = mesocycleData;
		mesocycle = onlyMesocycleData;
		mesocycleCyclicSetChanges = setChanges;
		saveStoresToLocalStorage();
	}

	function saveStoresToLocalStorage() {
		localStorage.setItem('mesocycleRunes', JSON.stringify({ mesocycle, mesocycleCyclicSetChanges }));
	}

	return {
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
