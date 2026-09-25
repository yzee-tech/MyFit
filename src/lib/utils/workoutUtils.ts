import type { MesocycleExerciseTemplateWithoutIdsOrIndex } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import type { ActiveMesocycleWithProgressionData } from '$lib/trpc/routes/workouts';
import { arrayAverage, arraySum } from '../utils';
import type { Workout, WorkoutExercise } from './types';
import { type Prisma } from '@prisma/client';
import { defaultWeightStep, fromKg, roundWeight, snapToStep, toKg } from './weightUnits';

export function getSetVolume(set: SetDetails, userBodyweight: number, bodyweightFraction: number | null) {
	const setVolume = (set.reps + set.RIR) * set.load + (bodyweightFraction ?? 0) * userBodyweight;
	const miniSetsVolume = set.miniSets?.reduce((totalMiniSetVolume, miniSet) => {
		const miniSetVolume = (miniSet.reps + miniSet.RIR) * miniSet.load + (bodyweightFraction ?? 0) * userBodyweight;
		return miniSetVolume + totalMiniSetVolume;
	}, 0);
	return setVolume + (miniSetsVolume ?? 0);
}

export function getExerciseVolume(workoutExercise: WorkoutExercise, userBodyweight: number) {
	return arraySum(
		workoutExercise.sets.map((set) => getSetVolume(set, userBodyweight, workoutExercise.bodyweightFraction))
	);
}

export function cleanupInProgressMiniSets(miniSets: WorkoutExerciseInProgress['sets'][number]['miniSets']) {
	return miniSets.map((miniSet) => {
		return {
			reps: miniSet.reps ?? 0,
			load: miniSet.load ?? 0,
			RIR: miniSet.RIR ?? 0
		};
	});
}

export type SetDetails = {
	reps: number;
	load: number;
	RIR: number;
	miniSets: {
		reps: number;
		load: number;
		RIR: number;
	}[];
};

type CommonBergerType = {
	bodyweightFraction: number | null;
	oldUserBodyweight?: number;
	newUserBodyweight?: number;
	oldSet: SetDetails;
};

type BergerNewReps = {
	variableToSolve: 'NewReps';
	knownValues: CommonBergerType & {
		overloadPercentage: number;
		newSet: Omit<SetDetails, 'reps'> & { reps?: number };
	};
};

type BergerOverloadPercentage = {
	variableToSolve: 'OverloadPercentage';
	knownValues: CommonBergerType & {
		newSet: SetDetails;
	};
};

type BergerInput = BergerNewReps | BergerOverloadPercentage;

export function solveBergerFormula(input: BergerInput) {
	const { variableToSolve, knownValues } = input;
	const { oldSet, newSet, bodyweightFraction = null, oldUserBodyweight = 0, newUserBodyweight = 0 } = knownValues;

	const oldLoad = oldSet.load + (bodyweightFraction ?? 0) * oldUserBodyweight;
	const newLoad = newSet.load + (bodyweightFraction ?? 0) * newUserBodyweight;

	const exponentialMultiplier = Math.pow(Math.E, (131 * (oldSet.reps + oldSet.RIR)) / 5000);

	switch (variableToSolve) {
		case 'NewReps': {
			const numerator =
				(1 + knownValues.overloadPercentage / 100) * (9745640 * oldLoad - 423641) * exponentialMultiplier;
			const denominator = 9745640 * newLoad - 423641;
			return 38.1679 * Math.log(numerator / denominator) - newSet.RIR;
		}

		case 'OverloadPercentage': {
			const numeratorMultiplier = Math.pow(Math.E, (knownValues.newSet.reps + newSet.RIR) / 38.1679);
			const numerator = numeratorMultiplier * (9745640 * newLoad - 423641);
			const denominator = exponentialMultiplier * (9745640 * oldLoad - 423641);
			const overloadPercentage = (numerator / denominator - 1) * 100;

			let miniSetsCompared = 0;
			let totalMiniSetsOverload = 0;
			for (let i = 0; i < Math.max(newSet.miniSets.length, oldSet.miniSets.length); i++) {
				const prevMiniSet = oldSet.miniSets[i];
				const newMiniSet = newSet.miniSets[i];
				if (!prevMiniSet || !newMiniSet) break;

				totalMiniSetsOverload += solveBergerFormula({
					variableToSolve: 'OverloadPercentage',
					knownValues: {
						newSet: { ...newMiniSet, miniSets: [] },
						oldSet: { ...prevMiniSet, miniSets: [] },
						bodyweightFraction,
						newUserBodyweight,
						oldUserBodyweight
					}
				});
				miniSetsCompared++;
			}

			if (miniSetsCompared === 0) {
				return overloadPercentage;
			}

			return (overloadPercentage + totalMiniSetsOverload) / (miniSetsCompared + 1);
		}
	}
}

export function getWorkoutVolume(workout: Workout) {
	return arraySum(workout.workoutExercises.map((exercise) => getExerciseVolume(exercise, workout.userBodyweight)));
}

type SetInProgress = {
	reps: number | undefined;
	load: number | undefined;
	RIR: number | undefined;
	completed: boolean;
};

export type PreviousPerformance = {
	exercise: WorkoutExercise;
	oldUserBodyweight: number;
};

/** Past performances of each exercise, keyed by exercise name, oldest first */
export type ExerciseHistory = Record<string, PreviousPerformance[]>;

export type WorkoutExerciseInProgress = Omit<
	Prisma.WorkoutExerciseCreateWithoutWorkoutInput,
	'sets' | 'exerciseIndex'
> & {
	sets: (Omit<
		Prisma.WorkoutExerciseSetCreateWithoutWorkoutExerciseInput,
		'reps' | 'load' | 'RIR' | 'miniSets' | 'setIndex'
	> &
		SetInProgress & {
			miniSets: (Omit<
				Prisma.WorkoutExerciseMiniSetCreateWithoutParentSetInput,
				'reps' | 'load' | 'RIR' | 'miniSetIndex'
			> &
				SetInProgress)[];
		})[];
};

export type WorkoutExerciseWithSets = Prisma.WorkoutExerciseGetPayload<{
	include: { sets: { include: { miniSets: true } } };
}>;

export function createWorkoutExerciseInProgressFromMesocycleExerciseTemplate(
	exerciseTemplate: MesocycleExerciseTemplateWithoutIdsOrIndex,
	oldSets?: WorkoutExerciseInProgress['sets']
): WorkoutExerciseInProgress {
	const { id, sets, ...exercise } = exerciseTemplate;
	const defaultSet = {
		reps: undefined,
		load: undefined,
		RIR: undefined,
		completed: false,
		skipped: false
	};

	const newSets = oldSets ? [...oldSets] : [];
	while (newSets.length < sets) newSets.push({ ...defaultSet, miniSets: [] });

	if (!['Drop', 'MyorepMatch', 'MyorepMatchDown'].includes(exercise.setType)) {
		newSets.map((set) => (set.miniSets = []));
	}

	if (!['Drop', 'Down', 'MyorepMatchDown'].includes(exercise.setType)) {
		exercise.changeAmount = null;
		exercise.changeType = null;
	}

	if (['Straight', 'MyorepMatch', 'Myorep'].includes(exercise.setType)) {
		newSets.map((set, setIndex) => {
			if (setIndex) set.load = newSets[0].load;
		});
	}

	return { ...exercise, weightUnit: exercise.weightUnit ?? 'KG', sets: newSets.slice(0, sets) };
}

/** Marks a deload week in a block's weekly RIR plan */
export const DELOAD_WEEK = -1;
/** Effort of a deload week: stop well short of failure */
export const DELOAD_RIR = 4;

/** The plan entry for a 1-based week; past the planned length, the last week's entry applies */
function getWeekPlanEntry(weeklyRIR: number[], week: number): number {
	if (weeklyRIR.length === 0) return 0;
	return weeklyRIR[Math.min(Math.max(week, 1), weeklyRIR.length) - 1];
}

export function isDeloadWeek(weeklyRIR: number[], week: number): boolean {
	return getWeekPlanEntry(weeklyRIR, week) === DELOAD_WEEK;
}

export function getRIRForWeek(weeklyRIR: number[], week: number): number {
	const entry = getWeekPlanEntry(weeklyRIR, week);
	return entry === DELOAD_WEEK ? DELOAD_RIR : entry;
}

/**
 * Converts the old "weeks per RIR level" format (index = RIR, done from the highest RIR down)
 * into one RIR per week
 */
export function weeklyRIRFromWeeksPerRIR(weeksPerRIR: number[]): number[] {
	return weeksPerRIR.flatMap((weeks, rir) => Array<number>(weeks).fill(rir)).toSorted((a, b) => b - a);
}

/**
 * A starting plan for a block: effort builds from 3 RIR to 0 RIR, and blocks of 4+ weeks
 * end with a deload week
 */
export function suggestWeeklyRIR(weeks: number): number[] {
	const workingWeeks = weeks >= 4 ? weeks - 1 : weeks;
	const plan = Array.from({ length: workingWeeks }, (_, idx) =>
		workingWeeks === 1 ? 2 : Math.round(3 - (3 * idx) / (workingWeeks - 1))
	);
	if (weeks >= 4) plan.push(DELOAD_WEEK);
	return plan;
}

/** e.g. "2 RIR" or "Deload" */
export function formatWeekEffort(weeklyRIR: number[], week: number): string {
	return isDeloadWeek(weeklyRIR, week) ? 'Deload' : `${getRIRForWeek(weeklyRIR, week)} RIR`;
}

/**
 * - `normal`: beat last time
 * - `deload`: same weights and reps as last time, half the sets, easy effort
 * - `welcomeBack`: first workout after a break; same weights and reps as last time, 1 extra RIR
 */
export type ProgressionMode = 'normal' | 'deload' | 'welcomeBack';

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

/** 1-based calendar week of a block, counted from its start date */
export function getBlockWeek(startDate: Date | string, now: Date = new Date()): number {
	const elapsed = now.getTime() - new Date(startDate).getTime();
	return Math.max(1, Math.floor(elapsed / WEEK_IN_MS) + 1);
}

function generateAveragePerformanceDropOffs(performances: PreviousPerformance[]) {
	const rateOfChangeSums: number[] = [];
	let invalidDropOffs = false;

	for (const performance of performances) {
		for (let i = 0; i < performance.exercise.sets.length - 1; i++) {
			const rateOfChange =
				getSetVolume(
					performance.exercise.sets[i],
					performance.oldUserBodyweight,
					performance.exercise.bodyweightFraction
				) -
				getSetVolume(
					performance.exercise.sets[i + 1],
					performance.oldUserBodyweight,
					performance.exercise.bodyweightFraction
				);
			rateOfChangeSums[i] = (rateOfChangeSums[i] || 0) + rateOfChange;
			if (rateOfChange < 0) {
				invalidDropOffs = true;
			}
		}
	}

	// Incorrect RIR estimates causing an increase in set performance over time
	if (invalidDropOffs) {
		return new Array(rateOfChangeSums.length).fill(0);
	}

	const averageRatesOfChange = rateOfChangeSums.map((sum) => sum / performances.length);
	return averageRatesOfChange;
}

function getMaxIndexes(arr: number[]) {
	return arr
		.map((value, index) => ({ value, index }))
		.sort((a, b) => b.value - a.value)
		.map((item) => item.index);
}

function addExtraSetProperties(exerciseSet: WorkoutExercise['sets'][number]) {
	const { workoutExerciseId, ...rest } = exerciseSet;
	const exerciseSetWithoutIds = {
		...rest,
		miniSets: rest.miniSets.map(({ workoutExerciseSetId, ...rest }) => rest)
	};
	return {
		...exerciseSetWithoutIds,
		completed: false,
		miniSets: exerciseSetWithoutIds.miniSets.map((miniSet) => ({
			...miniSet,
			completed: false
		}))
	};
}

function getPerformanceChanges(performances: { exercise: WorkoutExercise; oldUserBodyweight: number }[]) {
	const performanceChanges: number[] = [];
	if (performances.length < 2) return performanceChanges;
	for (let i = 0; i < performances.length - 1; i++) {
		const oldPerformance = performances[i];
		const newPerformance = performances[i + 1];

		const setPerformanceChanges: number[] = [];
		for (let j = 0; j <= setPerformanceChanges.length; j++) {
			const oldSet = oldPerformance.exercise.sets[j];
			const newSet = newPerformance.exercise.sets[j];
			if (!oldSet || !newSet) break;
			if (oldSet.skipped || newSet.skipped) continue;

			setPerformanceChanges.push(
				solveBergerFormula({
					variableToSolve: 'OverloadPercentage',
					knownValues: {
						oldSet,
						newSet,
						bodyweightFraction: newPerformance.exercise.bodyweightFraction,
						newUserBodyweight: newPerformance.oldUserBodyweight,
						oldUserBodyweight: oldPerformance.oldUserBodyweight
					}
				})
			);
		}
		performanceChanges.push(arrayAverage(setPerformanceChanges));
	}
	return performanceChanges;
}

function adjustIdealPerformance(actualPerformances: number[], idealPerformance: number) {
	if (actualPerformances.length < 2) return idealPerformance;
	const weights = actualPerformances.map((_, index) => index + 1);
	const weightedSum = actualPerformances.reduce((acc, performance, index) => {
		return acc + performance * weights[index];
	}, 0);
	const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
	const weightedAverage = weightedSum / totalWeight;
	const adjustedIdealPerformance = (idealPerformance + weightedAverage) / 2;
	return adjustedIdealPerformance;
}

function increaseLoadOfSets(ex: WorkoutExerciseInProgress, userBodyweight: number) {
	const sameLoadSetType = ex.setType === 'Straight' || ex.setType === 'Myorep';
	let loadIncreasedForOneOfSameLoadSets = false;

	const newSets = ex.sets.map((set, setIdx) => {
		if (set.reps === undefined || set.load === undefined || set.RIR === undefined) return set;

		let newLoad = set.load;

		// For TopBackoff, use topRepRangeEnd for first set, regular repRangeEnd for others
		const isTopSet = ex.setType === 'TopBackoff' && setIdx === 0;
		const repRangeEnd = isTopSet && typeof ex.topRepRangeEnd === 'number' ? ex.topRepRangeEnd : ex.repRangeEnd;

		// TODO: #107
		if (set.reps > repRangeEnd || loadIncreasedForOneOfSameLoadSets) {
			// The weight step is in the exercise's unit (e.g. 5 lb); loads here are in kg
			const unit = ex.weightUnit ?? 'KG';
			newLoad += toKg(ex.minimumWeightChange ?? defaultWeightStep(unit), unit);
		}
		if (sameLoadSetType && newLoad > set.load) {
			loadIncreasedForOneOfSameLoadSets = true;
		}

		const cleanedMiniSets = cleanupInProgressMiniSets(set.miniSets);
		const newReps = solveBergerFormula({
			variableToSolve: 'NewReps',
			knownValues: {
				oldSet: { reps: set.reps, load: set.load, RIR: set.RIR, miniSets: cleanedMiniSets },
				newSet: { load: newLoad, RIR: set.RIR, miniSets: cleanedMiniSets },
				bodyweightFraction: ex.bodyweightFraction ?? null,
				newUserBodyweight: userBodyweight,
				oldUserBodyweight: userBodyweight,
				overloadPercentage: 0
			}
		});

		const newSet = { ...set, reps: Math.round(newReps), load: newLoad };
		return newSet;
	});

	if (sameLoadSetType) {
		const belowRepRangeStart = newSets.some((set) => set.reps! < ex.repRangeStart);
		if (belowRepRangeStart) return ex.sets;
	}

	return newSets.map((newSet, setIdx) => {
		// For TopBackoff, use topRepRangeStart for first set, regular repRangeStart for others
		const isTopSet = ex.setType === 'TopBackoff' && setIdx === 0;
		const repRangeStart = isTopSet && typeof ex.topRepRangeStart === 'number' ? ex.topRepRangeStart : ex.repRangeStart;

		if (newSet.reps! < repRangeStart) return ex.sets[setIdx];
		return newSet;
	});
}

/**
 * Moves each suggested load (in kg) to the nearest weight on the exercise unit's steps, and
 * recalculates reps so the effort stays the same. Used when the last performance was in the
 * other unit, e.g. 30 lb (13.6 kg) at a kg gym becomes 12.5 kg with a rep or two more.
 */
export function snapSetsToUnitSteps(ex: WorkoutExerciseInProgress, userBodyweight: number) {
	const unit = ex.weightUnit ?? 'KG';
	const step = ex.minimumWeightChange ?? defaultWeightStep(unit);
	const snapKg = (kg: number) => toKg(snapToStep(fromKg(kg, unit), step), unit);

	ex.sets = ex.sets.map((set) => {
		if (set.load === undefined) return set;
		const snappedLoad = snapKg(set.load);
		const miniSets = set.miniSets.map((miniSet) =>
			miniSet.load === undefined ? miniSet : { ...miniSet, load: snapKg(miniSet.load) }
		);
		if (set.reps === undefined || set.RIR === undefined || Math.abs(snappedLoad - set.load) < 1e-9) {
			return { ...set, load: snappedLoad, miniSets };
		}
		const cleanedMiniSets = cleanupInProgressMiniSets(set.miniSets);
		const newReps = solveBergerFormula({
			variableToSolve: 'NewReps',
			knownValues: {
				oldSet: { reps: set.reps, load: set.load, RIR: set.RIR, miniSets: cleanedMiniSets },
				newSet: { load: snappedLoad, RIR: set.RIR, miniSets: cleanedMiniSets },
				bodyweightFraction: ex.bodyweightFraction ?? null,
				newUserBodyweight: userBodyweight,
				oldUserBodyweight: userBodyweight,
				overloadPercentage: 0
			}
		});
		return { ...set, load: snappedLoad, reps: Math.max(1, Math.round(newReps)), miniSets };
	});
}

type SetWithLoads = { load?: number; miniSets: { load?: number }[] };

/**
 * Switches an in-progress exercise to the other unit. Loads are in the exercise's unit.
 * Sets already done keep the exact weight lifted; sets still to do move to the new unit's
 * steps (default steps, since a custom step belongs to the old unit) with reps adjusted.
 */
export function switchExerciseUnit(
	ex: WorkoutExerciseInProgress,
	to: 'KG' | 'LB',
	userBodyweightKg: number
): WorkoutExerciseInProgress {
	if ((ex.weightUnit ?? 'KG') === to) return ex;
	const inKg = convertExerciseLoads(ex, 'toKg');
	const snapped: WorkoutExerciseInProgress = structuredClone({ ...inKg, weightUnit: to, minimumWeightChange: null });
	snapSetsToUnitSteps(snapped, userBodyweightKg);
	const merged = {
		...inKg,
		weightUnit: to,
		sets: inKg.sets.map((set, idx) => (set.completed ? set : snapped.sets[idx]))
	};
	return convertExerciseLoads(merged, 'toDisplay');
}

/** Converts an exercise's loads from kg to the unit it's shown in (or back) */
export function convertExerciseLoads<T extends { weightUnit?: 'KG' | 'LB' | null; sets: SetWithLoads[] }>(
	ex: T,
	direction: 'toDisplay' | 'toKg'
): T {
	const unit = ex.weightUnit ?? 'KG';
	const convert = (load: number) => (direction === 'toDisplay' ? roundWeight(fromKg(load, unit)) : toKg(load, unit));
	return {
		...ex,
		sets: ex.sets.map((set) => ({
			...set,
			load: set.load === undefined ? undefined : convert(set.load),
			miniSets: set.miniSets.map((miniSet) => ({
				...miniSet,
				load: miniSet.load === undefined ? undefined : convert(miniSet.load)
			}))
		}))
	};
}

/**
 * The routine decides how many sets: drop extra sets from the last time, and fill missing ones
 * with a copy of the last suggested set
 */
function fitSetsToRoutine(ex: WorkoutExerciseInProgress, routineSetCount: number) {
	ex.sets = ex.sets.slice(0, routineSetCount);
	const lastSuggestedSet = ex.sets.findLast((set) => set.reps !== undefined);
	if (!lastSuggestedSet) return;
	const copyOfLastSet = () => ({ ...lastSuggestedSet, miniSets: structuredClone(lastSuggestedSet.miniSets) });
	while (ex.sets.length < routineSetCount) ex.sets.push(copyOfLastSet());
	ex.sets = ex.sets.map((set) => (set.reps === undefined ? copyOfLastSet() : set));
}

export function progressiveOverloadMagic(
	mesocycleWithProgressionData: ActiveMesocycleWithProgressionData,
	cycleNumber: number,
	userBodyweight: number,
	splitDayIndex: number,
	exerciseHistory: ExerciseHistory = {},
	mode: ProgressionMode = 'normal'
) {
	const { mesocycleExerciseSplitDays, ...mesocycle } = mesocycleWithProgressionData;

	const weekRIR = getRIRForWeek(mesocycle.weeklyRIR, cycleNumber);
	let currentCycleRIR = weekRIR;
	if (mode === 'deload') currentCycleRIR = DELOAD_RIR;
	else if (mode === 'welcomeBack') currentCycleRIR = Math.min(weekRIR + 1, DELOAD_RIR);
	const easySession = mode !== 'normal';
	const todaysSplitDay = mesocycleExerciseSplitDays[splitDayIndex];
	const workoutExercises = todaysSplitDay.mesocycleSplitDayExercises.map((fullExercise) => {
		const { mesocycleExerciseSplitDayId, ...exercise } = fullExercise;
		return createWorkoutExerciseInProgressFromMesocycleExerciseTemplate(exercise);
	});

	workoutExercises.forEach((ex) => {
		// Progressive overload from the last times this exercise was done, in any routine
		const allPreviousPerformances = exerciseHistory[ex.name] ?? [];
		const lastPerformance = allPreviousPerformances.at(-1);
		if (!lastPerformance?.exercise) return;

		const routineSetCount = ex.sets.length;

		const unitChanged = (lastPerformance.exercise.weightUnit ?? 'KG') !== (ex.weightUnit ?? 'KG');

		// Easy sessions repeat the last numbers instead of trying to beat them
		if (easySession) {
			ex.sets = lastPerformance.exercise.sets.map((oldSet) => addExtraSetProperties(oldSet));
			fitSetsToRoutine(ex, routineSetCount);
			if (unitChanged) snapSetsToUnitSteps(ex, userBodyweight);
			return;
		}

		const averageDropOffs = generateAveragePerformanceDropOffs(allPreviousPerformances);
		const lastDropOffs = generateAveragePerformanceDropOffs([
			allPreviousPerformances[allPreviousPerformances.length - 1]
		]);

		let dropOffDifferences = averageDropOffs.map((averageDropOff, idx) => lastDropOffs[idx] - averageDropOff);
		dropOffDifferences =
			dropOffDifferences[0] < 0
				? [Math.abs(dropOffDifferences[0]), 0, ...dropOffDifferences.slice(1)]
				: [0, ...dropOffDifferences];

		const idealTotalOverloadPercentagePerSet = ex.overloadPercentage ?? mesocycle.startOverloadPercentage;
		const performanceChanges = getPerformanceChanges(allPreviousPerformances);
		const adjustedTotalOverloadPercentagePerSet = adjustIdealPerformance(
			performanceChanges,
			idealTotalOverloadPercentagePerSet
		);
		const setPriorities = (dropOffDifferences = getMaxIndexes(dropOffDifferences));
		let remainingTotalOverload = adjustedTotalOverloadPercentagePerSet * lastPerformance.exercise.sets.length;

		for (const setIndex of setPriorities) {
			const oldSet = lastPerformance.exercise.sets[setIndex];
			if (!oldSet) continue;

			const newSet = { ...oldSet, reps: oldSet.reps + 1 };
			const overloadAchieved = solveBergerFormula({
				variableToSolve: 'OverloadPercentage',
				knownValues: {
					oldSet,
					newSet,
					oldUserBodyweight: lastPerformance.oldUserBodyweight,
					newUserBodyweight: userBodyweight,
					bodyweightFraction: ex.bodyweightFraction ?? null
				}
			});

			const previousRemainingTotalOverload = remainingTotalOverload;
			remainingTotalOverload -= overloadAchieved;

			if (Math.abs(remainingTotalOverload) < previousRemainingTotalOverload) {
				ex.sets[setIndex] = addExtraSetProperties(newSet);
			} else {
				ex.sets[setIndex] = addExtraSetProperties(oldSet);
			}
		}

		fitSetsToRoutine(ex, routineSetCount);
		ex.sets = increaseLoadOfSets(ex, userBodyweight);
		if (unitChanged) snapSetsToUnitSteps(ex, userBodyweight);
	});

	// Deload: half the sets
	if (mode === 'deload') {
		workoutExercises.forEach((ex) => (ex.sets = ex.sets.slice(0, Math.ceil(ex.sets.length / 2))));
	}

	// RIR adjustment
	workoutExercises.forEach((ex) => {
		ex.sets.forEach((set, idx) => {
			const oldRIR = set.RIR ?? currentCycleRIR;
			set.RIR = currentCycleRIR;

			// Last set to failure (not in easy sessions)
			const lastSetToFailure = !easySession && (ex.lastSetToFailure ?? mesocycle.lastSetToFailure);
			if (idx === ex.sets.length - 1 && lastSetToFailure) set.RIR = 0;

			// Adjust reps when RIR changed
			const RIRDifference = set.RIR - oldRIR;
			if (set.reps === undefined) return;

			// Easy sessions always take reps off to match the easier effort
			const forceRIRMatching = easySession || (ex.forceRIRMatching ?? mesocycle.forceRIRMatching);
			if (RIRDifference > 0 && !forceRIRMatching) return;

			// For TopBackoff, use topRepRangeStart for first set, regular repRangeStart for others
			const isTopSet = ex.setType === 'TopBackoff' && idx === 0;
			const repRangeStart =
				isTopSet && typeof ex.topRepRangeStart === 'number' ? ex.topRepRangeStart : ex.repRangeStart;

			// If the RIR adjustment we are about to make causes reps to fall outside of lower rep range
			// (a deload is meant to be easy, so there reps may drop below the range)
			const adjustedReps = set.reps - RIRDifference;
			if (mode !== 'deload' && adjustedReps < repRangeStart && !(lastSetToFailure && idx === ex.sets.length - 1)) {
				const maxRIR = Math.max(set.reps - repRangeStart, 0);
				set.RIR = maxRIR;
				set.reps -= maxRIR - oldRIR;
				return;
			}
			set.reps -= RIRDifference;
		});
	});

	// Remove miniSet IDs and un-skip all sets
	workoutExercises.forEach((ex) => {
		ex.sets.forEach((set) => {
			set.miniSets = set.miniSets.map((miniSet) => {
				const { id, ...rest } = miniSet;
				return rest;
			});
		});
		ex.sets
			.filter((set) => set.skipped)
			.forEach((set) => {
				set.skipped = false;
				set.reps = undefined;
				set.load = undefined;
				set.RIR = currentCycleRIR;
			});
	});

	return workoutExercises;
}
