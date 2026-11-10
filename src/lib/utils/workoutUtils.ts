import type { RoutineExerciseTemplate } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import { arrayAverage, arraySum } from '../utils';
import type { Workout, WorkoutExercise } from './types';
import { type Mesocycle, type Prisma } from '@prisma/client';
import {
	convertWeight,
	defaultWeightStep,
	fromKg,
	isLevelUnit,
	roundWeight,
	snapToStep,
	toKg,
	type MassUnit
} from './weightUnits';
import type { DistanceUnit, ExerciseMeasure, WeightUnit } from './prismaEnums';
import { fromMeters, roundDistance, toMeters } from './distanceUnits';
import { isCardioMeasure, measureOfSets } from './measure';
import {
	availableWeightsFor,
	levelSetOf,
	machineSetOf,
	nextWeightUp,
	weightsAround,
	type WeightSetLike
} from './weightSets';
import { BERGER_REPS_RATE } from './oneRepMax';

type VolumeSet = { reps: number; load: number; RIR: number; miniSets?: { reps: number; load: number; RIR: number }[] };

/**
 * Work done in a set, in kg: reps × (load + the bodyweight share), mini-sets the same way. Reps in
 * reserve weren't done, so they don't count; help (a negative load) never makes it below 0
 */
export function getSetVolume(set: VolumeSet, userBodyweight: number, bodyweightFraction: number | null) {
	const bodyweight = (bodyweightFraction ?? 0) * userBodyweight;
	const work = (part: { reps: number; load: number }) => Math.max(0, part.reps * (part.load + bodyweight));
	return work(set) + arraySum((set.miniSets ?? []).map(work));
}

/**
 * What a set could have done, for comparing a session's sets with each other: (reps + reps in reserve)
 * × (load + the bodyweight share), mini-sets the same way
 */
function getSetCapacity(set: VolumeSet, userBodyweight: number, bodyweightFraction: number | null) {
	const bodyweight = (bodyweightFraction ?? 0) * userBodyweight;
	const capacity = (part: { reps: number; load: number; RIR: number }) =>
		(part.reps + part.RIR) * (part.load + bodyweight);
	return capacity(set) + arraySum((set.miniSets ?? []).map(capacity));
}

/** Volume in kg of the sets done (not skipped); a machine's levels aren't weights, so they count 0 */
export function getExerciseVolume(
	// Plain fields, not the router's types: the workouts list (a router procedure) uses this too
	workoutExercise: {
		weightUnit?: WeightUnit | null;
		bodyweightFraction?: number | null;
		sets: (VolumeSet & { skipped?: boolean })[];
	},
	userBodyweight: number
) {
	if (isLevelUnit(workoutExercise.weightUnit)) return 0;
	return arraySum(
		workoutExercise.sets
			.filter((set) => !set.skipped)
			.map((set) => getSetVolume(set, userBodyweight, workoutExercise.bodyweightFraction ?? null))
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

/** The formula's load term: below about 0.04 kg (no weight, or help without bodyweight) it goes negative */
const bergerLoadFactor = (load: number) => 9745640 * load - 423641;

/**
 * Whether the formula can compare two loads (kg, with any bodyweight share): both above its zero
 * point, or exactly the same (the terms cancel). Not 0 kg against a weight (-46,009% for 0 → 20 kg),
 * nor two amounts of help counted without bodyweight (20 → 10 kg of help would score -50%)
 */
function bergerComparable(oldLoad: number, newLoad: number) {
	return oldLoad === newLoad || (bergerLoadFactor(oldLoad) > 0 && bergerLoadFactor(newLoad) > 0);
}

export function solveBergerFormula(input: BergerInput) {
	const { variableToSolve, knownValues } = input;
	const { oldSet, newSet, bodyweightFraction = null, oldUserBodyweight = 0, newUserBodyweight = 0 } = knownValues;

	const oldLoad = oldSet.load + (bodyweightFraction ?? 0) * oldUserBodyweight;
	const newLoad = newSet.load + (bodyweightFraction ?? 0) * newUserBodyweight;

	const exponentialMultiplier = Math.exp(BERGER_REPS_RATE * (oldSet.reps + oldSet.RIR));

	switch (variableToSolve) {
		case 'NewReps': {
			const numerator =
				(1 + knownValues.overloadPercentage / 100) * (9745640 * oldLoad - 423641) * exponentialMultiplier;
			const denominator = 9745640 * newLoad - 423641;
			return Math.log(numerator / denominator) / BERGER_REPS_RATE - newSet.RIR;
		}

		case 'OverloadPercentage': {
			const numeratorMultiplier = Math.exp(BERGER_REPS_RATE * (knownValues.newSet.reps + newSet.RIR));
			const numerator = numeratorMultiplier * (9745640 * newLoad - 423641);
			const denominator = exponentialMultiplier * (9745640 * oldLoad - 423641);
			const overloadPercentage = (numerator / denominator - 1) * 100;

			let miniSetsCompared = 0;
			let totalMiniSetsOverload = 0;
			for (let i = 0; i < Math.max(newSet.miniSets.length, oldSet.miniSets.length); i++) {
				const prevMiniSet = oldSet.miniSets[i];
				const newMiniSet = newSet.miniSets[i];
				if (!prevMiniSet || !newMiniSet) break;
				const share = bodyweightFraction ?? 0;
				if (
					!bergerComparable(prevMiniSet.load + share * oldUserBodyweight, newMiniSet.load + share * newUserBodyweight)
				) {
					continue;
				}

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

/** A set's boxes that can hold a suggestion (time and distance: a cardio set's) */
export type SetField = 'reps' | 'load' | 'RIR' | 'timeSeconds' | 'distance';

type SetInProgress = {
	reps: number | undefined;
	load: number | undefined;
	RIR: number | undefined;
	/** A cardio set's time, in seconds (the box shows and takes m:ss) */
	timeSeconds?: number;
	/** A DistanceTime set's distance, in the exercise's distance unit; saved in metres */
	distance?: number;
	completed: boolean;
	/**
	 * Boxes the person made theirs (typed in, or copied from last time, a reps hint or History). The
	 * others still hold the app's suggestion and look lighter. Only on the phone: not saved
	 */
	chosen?: SetField[];
	/**
	 * A box's suggestion from before it was typed in, so emptying the box brings it back. Only on the
	 * phone: not saved
	 */
	suggested?: Partial<Record<SetField, number>>;
	/**
	 * What the reps hint is worked out from: the weight, reps and RIR the set started with (the
	 * suggestion, or the last time Use or Previous filled it). Frozen, so typing reps or RIR never moves
	 * the hint. A set without one (added, or from a workout started before this) shows no hint. Only on
	 * the phone: kept with the workout in progress, not saved
	 */
	hintBase?: HintBase;
};

export type HintBase = { load: number; reps: number; RIR: number };

/** A set's numbers as the hint's starting point; none unless all three are numbers */
export function hintBaseOf(set: {
	load?: number;
	reps?: number;
	RIR?: number;
	skipped?: boolean;
}): HintBase | undefined {
	const { load, reps, RIR } = set;
	if (set.skipped || typeof load !== 'number' || typeof reps !== 'number' || typeof RIR !== 'number') return undefined;
	return { load, reps, RIR };
}

/** The sets with the hint's starting point captured from their numbers, once the suggestions are final */
export function withHintBase<
	T extends { load?: number; reps?: number; RIR?: number; skipped?: boolean; hintBase?: HintBase }
>(sets: T[]): T[] {
	return sets.map((set) => {
		const hintBase = hintBaseOf(set);
		return hintBase ? { ...set, hintBase } : set;
	});
}

export type PreviousPerformance = {
	exercise: WorkoutExercise;
	oldUserBodyweight: number;
};

/** Past performances of each exercise, keyed by exercise name, oldest first */
export type ExerciseHistory = Record<string, PreviousPerformance[]>;

/** Reps-only exercises by name, with their rep cap (null for none) */
export type RepsOnlySettings = Map<string, number | null>;

/** How each exercise is measured, by name; missing means reps */
export type MeasureSettings = Map<string, ExerciseMeasure>;

/** Whether every suggested set of a reps-only exercise is at its rep cap */
export function allSetsAtMaxReps(
	ex: { sets: { reps?: number; skipped?: boolean | null }[] },
	maxReps: number | null | undefined
) {
	if (typeof maxReps !== 'number') return false;
	const sets = ex.sets.filter((set) => !set.skipped);
	return sets.length > 0 && sets.every((set) => set.reps !== undefined && set.reps >= maxReps);
}

/**
 * The performances that compare with an exercise in `unit` and measured as `measure`: levels only
 * with levels, and kg or lb only with kg or lb (a level isn't a weight); and runs only with runs,
 * going by what each past row logged (a reps history never drives a cardio suggestion, or the reverse)
 */
export function comparablePerformances<
	T extends { exercise: { weightUnit?: WeightUnit | null; sets: MeasuredSetLike[] } }
>(performances: T[], unit: WeightUnit | null | undefined, measure: ExerciseMeasure = 'Reps'): T[] {
	return performances.filter(
		(performance) =>
			isLevelUnit(performance.exercise.weightUnit) === isLevelUnit(unit) &&
			measureOfSets(performance.exercise.sets) === measure
	);
}

type MeasuredSetLike = { skipped: boolean; timeSeconds?: number | null; distanceMeters?: number | null };

export type WorkoutExerciseInProgress = Omit<
	Prisma.WorkoutExerciseCreateWithoutWorkoutInput,
	'sets' | 'exerciseIndex'
> & {
	sets: (Omit<
		Prisma.WorkoutExerciseSetCreateWithoutWorkoutExerciseInput,
		'reps' | 'load' | 'RIR' | 'miniSets' | 'setIndex' | 'timeSeconds' | 'distanceMeters'
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

export function createWorkoutExerciseInProgressFromRoutineExercise(
	exerciseTemplate: RoutineExerciseTemplate,
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

	// Myo-rep sets share set 1's load; straight sets only start from it, each keeping its own
	if (['MyorepMatch', 'Myorep'].includes(exercise.setType)) {
		newSets.map((set, setIndex) => {
			if (setIndex) set.load = newSets[0].load;
		});
	} else if (exercise.setType === 'Straight') {
		newSets.map((set, setIndex) => {
			if (setIndex && set.load === undefined) set.load = newSets[0].load;
		});
	}

	return { ...exercise, weightUnit: exercise.weightUnit ?? 'KG', sets: newSets.slice(0, sets) };
}

/** Marks a deload week in a block's weekly RIR plan */
export const DELOAD_WEEK = -1;

/**
 * Progression settings for a workout outside a block (a routine from My routines, or an exercise
 * added to a blank workout): a steady effort, no deload weeks
 */
export const NO_BLOCK_PROGRESSION = {
	weeklyRIR: [2],
	startOverloadPercentage: 2.5,
	lastSetToFailure: false,
	forceRIRMatching: false
} as const;
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
 * - `deload`: last time's weights with half the sets at an easy effort: reps come off, and a set already
 *   out of reps keeps them at a lighter weight
 * - `welcomeBack`: first workout after a break; last time's numbers at 1 extra RIR: reps come off, and a
 *   set that would leave its rep range gets a lighter weight instead
 */
export type ProgressionMode = 'normal' | 'deload' | 'welcomeBack';

const DAYS_IN_BLOCK_WEEK = 7;

/** The longest IANA timezone name there is is well under this: anything longer is not one */
const MAX_TIME_ZONE_LENGTH = 64;

/** The calendar day an instant falls on in a timezone, as a number of days (Date.UTC of its local date) */
function localDayNumber(date: Date, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric'
	}).formatToParts(date);
	const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return Math.floor(Date.UTC(part('year'), part('month') - 1, part('day')) / 86400000);
}

/**
 * Whole calendar days from one instant to another, in the timezone (the phone's): Monday evening to
 * the next Monday morning is 7, whatever the hours between. A missing, invalid or over-long timezone
 * counts the days in UTC. It never throws
 */
export function localDaysBetween(from: Date | string, to: Date, timeZone?: string | null): number {
	const start = new Date(from);
	if (Number.isNaN(start.getTime()) || Number.isNaN(to.getTime())) return 0;
	const days = (zone: string) => localDayNumber(to, zone) - localDayNumber(start, zone);
	try {
		if (!timeZone || timeZone.length > MAX_TIME_ZONE_LENGTH) throw new RangeError('No usable timezone');
		return days(timeZone);
	} catch {
		return days('UTC');
	}
}

/** A time a block was paused; no end means it is paused now */
export type BlockPause = { pausedAt: Date | string; resumedAt: Date | string | null };

/** Whether `at` falls in one of the pauses (a pause with no end lasts to now and beyond) */
export function isInPause(pauses: BlockPause[] | undefined, at: Date): boolean {
	return (pauses ?? []).some(
		(pause) =>
			new Date(pause.pausedAt).getTime() <= at.getTime() &&
			(pause.resumedAt === null || at.getTime() < new Date(pause.resumedAt).getTime())
	);
}

/** Whether the block is paused right now: one of its pauses has no end */
export function isBlockPaused(pauses: BlockPause[] | undefined): boolean {
	return (pauses ?? []).some((pause) => pause.resumedAt === null);
}

/**
 * The calendar days of the timezone a block spent paused before `now`: from the day it was paused to the
 * day it was resumed (or `now`), so pausing and resuming on the same day removes none and every midnight
 * crossed while paused removes one. A pause after `now` is not counted yet, which keeps the week a past
 * workout shows as it was
 */
function pausedLocalDays(pauses: BlockPause[] | undefined, now: Date, zone: string) {
	let days = 0;
	for (const pause of pauses ?? []) {
		const pausedAt = new Date(pause.pausedAt);
		if (Number.isNaN(pausedAt.getTime()) || pausedAt.getTime() >= now.getTime()) continue;
		const resumedAt = pause.resumedAt ? new Date(pause.resumedAt) : null;
		const end =
			resumedAt && !Number.isNaN(resumedAt.getTime()) && resumedAt.getTime() < now.getTime() ? resumedAt : now;
		days += Math.max(0, localDayNumber(end, zone) - localDayNumber(pausedAt, zone));
	}
	return days;
}

/**
 * The days a block has been running, counted in calendar days of the timezone (the phone's) with the days it
 * spent paused taken out: what the week is made of (7 days a week). A missing, invalid or over-long timezone
 * counts the days in UTC. An unreadable start or `now` is 0 days. It never throws
 */
export function blockActiveDays(
	startDate: Date | string,
	now: Date = new Date(),
	timeZone?: string | null,
	pauses?: BlockPause[]
): number {
	const start = new Date(startDate);
	if (Number.isNaN(start.getTime()) || Number.isNaN(now.getTime())) return 0;
	const days = (zone: string) =>
		localDayNumber(now, zone) - localDayNumber(start, zone) - pausedLocalDays(pauses, now, zone);
	try {
		if (!timeZone || timeZone.length > MAX_TIME_ZONE_LENGTH) throw new RangeError('No usable timezone');
		return days(timeZone);
	} catch {
		return days('UTC');
	}
}

/**
 * 1-based week of a block, counted in calendar days of the timezone (the phone's): the 8th day
 * since the start day is in Week 2, whatever time the block was started at. Days the block was paused
 * are not counted, so a paused block's week stands still. A missing, empty, invalid or over-long
 * timezone counts the days in UTC. It never throws
 */
export function getBlockWeek(
	startDate: Date | string,
	now: Date = new Date(),
	timeZone?: string | null,
	pauses?: BlockPause[]
): number {
	const elapsedDays = blockActiveDays(startDate, now, timeZone, pauses);
	return Math.max(1, Math.floor(elapsedDays / DAYS_IN_BLOCK_WEEK) + 1);
}

/**
 * Whether the block has run all its planned weeks: its days (paused ones out) have reached 7 for each week
 * of the plan. For a paused block that is where it stands still, so a block paused at the end of its plan is
 * past its planned weeks until it is given another week
 */
export function isPastPlannedWeeks(
	startDate: Date | string,
	now: Date,
	timeZone: string | null | undefined,
	pauses: BlockPause[] | undefined,
	plannedWeeks: number
): boolean {
	return blockActiveDays(startDate, now, timeZone, pauses) >= plannedWeeks * DAYS_IN_BLOCK_WEEK;
}

/**
 * How many weeks of a started block are locked, counted from Week 1: the past weeks and the current one can't
 * be changed, later weeks can.
 * - Running: through the week it is in.
 * - Paused: the weeks with at least one of the block's days in them, `ceil(days / 7)`. Paused at the end of
 *   its plan that is every planned week, so the weeks added after it stay open however often the plan is
 *   extended. (A pause on the first day of a week leaves that week open while it is paused: it locks on Resume.)
 * Never more than the plan has
 */
export function lockedWeekCount(
	startDate: Date | string,
	now: Date,
	timeZone: string | null | undefined,
	pauses: BlockPause[] | undefined,
	plannedWeeks: number
): number {
	const days = Math.max(0, blockActiveDays(startDate, now, timeZone, pauses));
	const locked = isBlockPaused(pauses)
		? Math.ceil(days / DAYS_IN_BLOCK_WEEK)
		: Math.floor(days / DAYS_IN_BLOCK_WEEK) + 1;
	return Math.min(plannedWeeks, locked);
}

const DAY_MS = 86400000;

/** The timezone to count days in: the one given, else UTC (as every week calculation does) */
function usableZone(timeZone: string | null | undefined): string {
	try {
		if (!timeZone || timeZone.length > MAX_TIME_ZONE_LENGTH) return 'UTC';
		localDayNumber(new Date(0), timeZone);
		return timeZone;
	} catch {
		return 'UTC';
	}
}

/** The first instant of a calendar day (a number of days since 1970, as `localDayNumber` gives) in a timezone */
function startOfLocalDay(dayNumber: number, zone: string): Date {
	// Local days start between 14 hours before and 12 hours after that day's UTC midnight
	let low = dayNumber * DAY_MS - 15 * 60 * 60 * 1000;
	let high = dayNumber * DAY_MS + 13 * 60 * 60 * 1000;
	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if (localDayNumber(new Date(mid), zone) >= dayNumber) high = mid;
		else low = mid + 1;
	}
	return new Date(low);
}

/**
 * The moment a block's plan ended: the start of the calendar day on which its days (paused ones out) reached
 * 7 for each planned week. A pause begun there freezes the block at the end of its plan (its week stands at
 * the one after the last), so a block opened weeks later is still where it ended. Earlier pauses are taken
 * out of the days; none may reach past this moment. Null if it never gets there
 */
export function endOfPlanBoundary(
	startDate: Date | string,
	pauses: BlockPause[] | undefined,
	plannedWeeks: number,
	timeZone?: string | null
): Date | null {
	const start = new Date(startDate);
	if (Number.isNaN(start.getTime()) || plannedWeeks < 1) return null;
	const zone = usableZone(timeZone);
	const startDay = localDayNumber(start, zone);
	const target = plannedWeeks * DAYS_IN_BLOCK_WEEK;
	// Each day adds at most one to the days run, and a paused day adds none
	for (let day = startDay + target; day <= startDay + target + 3660; day++) {
		const dayStart = startOfLocalDay(day, zone);
		if (day - startDay - pausedLocalDays(pauses, dayStart, zone) >= target) return dayStart;
	}
	return null;
}

/**
 * The phone's timezone, read from the browser on every call (never kept), so travelling is followed.
 * Undefined when the browser can't say: the server then counts UTC days
 */
export function browserTimeZone(): string | undefined {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch {
		return undefined;
	}
}

/** The week in the phone's timezone */
export function getBlockWeekHere(startDate: Date | string, now: Date = new Date(), pauses?: BlockPause[]): number {
	return getBlockWeek(startDate, now, browserTimeZone(), pauses);
}

function generateAveragePerformanceDropOffs(performances: PreviousPerformance[]) {
	const rateOfChangeSums: number[] = [];
	let invalidDropOffs = false;

	for (const performance of performances) {
		for (let i = 0; i < performance.exercise.sets.length - 1; i++) {
			const rateOfChange =
				getSetCapacity(
					performance.exercise.sets[i],
					performance.oldUserBodyweight,
					performance.exercise.bodyweightFraction
				) -
				getSetCapacity(
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
	// A reps set's cardio fields are null: not carried into the suggestion
	const { workoutExerciseId, timeSeconds, distanceMeters, ...rest } = exerciseSet;
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

/**
 * How much each workout beat the one before (%, the average over the sets both did). A pair with no
 * set both did is left out: averaging nothing would give NaN and spoil every other pair
 */
export function getPerformanceChanges(performances: PreviousPerformance[]) {
	const performanceChanges: number[] = [];
	if (performances.length < 2) return performanceChanges;
	for (let i = 0; i < performances.length - 1; i++) {
		const oldPerformance = performances[i];
		const newPerformance = performances[i + 1];

		const setPerformanceChanges: number[] = [];
		const setCount = Math.max(oldPerformance.exercise.sets.length, newPerformance.exercise.sets.length);
		for (let j = 0; j < setCount; j++) {
			const oldSet = oldPerformance.exercise.sets[j];
			const newSet = newPerformance.exercise.sets[j];
			if (!oldSet || !newSet) break;
			if (oldSet.skipped || newSet.skipped) continue;
			// The formula can't compare these loads (e.g. 0 kg against a weight): left out
			const share = newPerformance.exercise.bodyweightFraction ?? 0;
			const oldLoad = oldSet.load + share * oldPerformance.oldUserBodyweight;
			const newLoad = newSet.load + share * newPerformance.oldUserBodyweight;
			if (!bergerComparable(oldLoad, newLoad)) continue;

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
		if (setPerformanceChanges.length > 0) performanceChanges.push(arrayAverage(setPerformanceChanges));
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

/** Myo-rep match: a match set may take this many mini-sets at most for the weight to go up */
export const MYOREP_MATCH_MAX_MINI_SETS = 3;

/**
 * Myo-rep match goes up in weight only when set 1 went past the top of the rep range AND every match
 * set reached set 1's reps in at most 3 mini-sets (last time's numbers)
 */
export function myorepMatchReadyToGoUp(sets: WorkoutExercise['sets'], repRangeEnd: number) {
	const [first, ...matchSets] = sets.filter((set) => !set.skipped);
	if (!first || first.reps <= repRangeEnd) return false;
	return matchSets.every((set) => {
		const miniSets = set.miniSets.filter((miniSet) => miniSet.reps > 0);
		const matched = set.reps + arraySum(miniSets.map((miniSet) => miniSet.reps)) >= first.reps;
		return matched && miniSets.length <= MYOREP_MATCH_MAX_MINI_SETS;
	});
}

/**
 * Myo-rep match up a weight: set 1, the match sets and their mini-sets all at the next weight. Set 1
 * gets its reps at that weight; each match set a guess for its main part, with no mini-sets yet so
 * it shows the reps left to match. Stays as is when set 1 would fall below the rep range
 */
function raiseMyorepMatchLoad(ex: WorkoutExerciseInProgress, userBodyweight: number, weights: number[] | null) {
	const first = ex.sets[0];
	if (first?.reps === undefined || first.load === undefined || first.RIR === undefined) return ex.sets;
	const unit = ex.weightUnit ?? 'KG';
	let newLoad = first.load + toKg(ex.minimumWeightChange ?? defaultWeightStep(unit), unit);
	if (weights) {
		const nextWeight = nextWeightUp(weights, roundWeight(fromKg(first.load, unit)));
		if (nextWeight === null) return ex.sets;
		newLoad = toKg(nextWeight, unit);
	}
	const repsAt = (set: { reps: number; load: number; RIR: number }) =>
		Math.round(repsAtLoad(ex, set, newLoad, userBodyweight));
	const firstReps = repsAt({ reps: first.reps, load: first.load, RIR: first.RIR });
	// The formula can't tell (e.g. from 0 kg): stays as is
	if (!Number.isFinite(firstReps) || firstReps < ex.repRangeStart) return ex.sets;
	return ex.sets.map((set, setIdx) => {
		if (setIdx === 0) return { ...set, reps: firstReps, load: newLoad, miniSets: [] };
		if (set.reps === undefined || set.load === undefined || set.RIR === undefined) {
			return { ...set, load: newLoad, miniSets: [] };
		}
		const matchReps = repsAt({ reps: set.reps, load: set.load, RIR: set.RIR });
		const reps = Number.isFinite(matchReps) ? Math.max(1, Math.min(matchReps, firstReps)) : firstReps;
		return { ...set, reps, load: newLoad, miniSets: [] };
	});
}

function increaseLoadOfSets(ex: WorkoutExerciseInProgress, userBodyweight: number, weights: number[] | null) {
	const sameLoadSetType = ex.setType === 'Straight' || ex.setType === 'Myorep';
	let loadIncreasedForOneOfSameLoadSets = false;
	// A set whose reps the formula can't work out (e.g. 0 kg to a weight) stays exactly as last time
	let cantMoveASet = false;

	const newSets = ex.sets.map((set, setIdx) => {
		if (set.reps === undefined || set.load === undefined || set.RIR === undefined) return set;

		let newLoad = set.load;

		// For TopBackoff, use topRepRangeEnd for first set, regular repRangeEnd for others
		const isTopSet = ex.setType === 'TopBackoff' && setIdx === 0;
		const repRangeEnd = isTopSet && typeof ex.topRepRangeEnd === 'number' ? ex.topRepRangeEnd : ex.repRangeEnd;

		// TODO: #107
		if (set.reps > repRangeEnd || loadIncreasedForOneOfSameLoadSets) {
			// Weights and steps are in the exercise's unit (e.g. 5 lb); loads here are in kg
			const unit = ex.weightUnit ?? 'KG';
			if (weights) {
				// The next weight the gym has; at the top of the set, stay and keep adding reps
				const nextWeight = nextWeightUp(weights, roundWeight(fromKg(set.load, unit)));
				if (nextWeight !== null) newLoad = toKg(nextWeight, unit);
			} else {
				newLoad += toKg(ex.minimumWeightChange ?? defaultWeightStep(unit), unit);
			}
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

		if (!Number.isFinite(newReps)) {
			cantMoveASet = true;
			return set;
		}
		const newSet = { ...set, reps: Math.round(newReps), load: newLoad };
		return newSet;
	});

	// Sets meant to share a load move together, or not at all
	if (sameLoadSetType && cantMoveASet) return ex.sets;
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

/** Reps at a new load (kg) for the same effort as a set, e.g. 10 kg × 12 → 14 kg × 6 */
function repsAtLoad(
	ex: Pick<WorkoutExerciseInProgress, 'bodyweightFraction'>,
	set: { reps: number; load: number; RIR: number },
	newLoad: number,
	userBodyweight: number
) {
	return solveBergerFormula({
		variableToSolve: 'NewReps',
		knownValues: {
			oldSet: { reps: set.reps, load: set.load, RIR: set.RIR, miniSets: [] },
			newSet: { load: newLoad, RIR: set.RIR, miniSets: [] },
			bodyweightFraction: ex.bodyweightFraction ?? null,
			newUserBodyweight: userBodyweight,
			oldUserBodyweight: userBodyweight,
			overloadPercentage: 0
		}
	});
}

function repRangeOfSet(ex: WorkoutExerciseInProgress, setIdx: number) {
	const isTopSet = ex.setType === 'TopBackoff' && setIdx === 0;
	return {
		start: isTopSet && typeof ex.topRepRangeStart === 'number' ? ex.topRepRangeStart : ex.repRangeStart,
		end: isTopSet && typeof ex.topRepRangeEnd === 'number' ? ex.topRepRangeEnd : ex.repRangeEnd
	};
}

type SuggestedSet = WorkoutExerciseInProgress['sets'][number];

/** Moves a set to a new load (kg), recalculating reps so the effort stays the same */
function moveSetToLoad(
	ex: WorkoutExerciseInProgress,
	set: SuggestedSet,
	newLoad: number,
	userBodyweight: number,
	snapMiniSetLoad: (kg: number) => number
): SuggestedSet {
	const miniSets = set.miniSets.map((miniSet) =>
		miniSet.load === undefined ? miniSet : { ...miniSet, load: snapMiniSetLoad(miniSet.load) }
	);
	if (
		set.load === undefined ||
		set.reps === undefined ||
		set.RIR === undefined ||
		Math.abs(newLoad - set.load) < 1e-9
	) {
		return { ...set, load: newLoad, miniSets };
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
	// The formula can't tell (e.g. from 0 kg): the set stays where it was
	if (!Number.isFinite(newReps)) return set;
	return { ...set, load: newLoad, reps: Math.max(1, Math.round(newReps)), miniSets };
}

/** A unit-switch baseline at the visible target, without choosing a second snapped weight. */
export function hintBaseAfterUnitSwitch(
	original: WorkoutExerciseInProgress,
	index: number,
	visible: WorkoutExerciseInProgress['sets'][number],
	to: MassUnit,
	userBodyweight: number
): HintBase | undefined {
	const set = original.sets[index];
	const base = set.hintBase;
	if (!base || set.skipped) return undefined;
	if ([set.load, set.reps, set.RIR].every((value) => typeof value === 'number')) return hintBaseOf(visible);
	const from = original.weightUnit ?? 'KG';
	if (typeof visible.load !== 'number') {
		return {
			load: roundWeight(convertWeight(base.load, from, to)),
			reps: set.reps ?? base.reps,
			RIR: set.RIR ?? base.RIR
		};
	}
	const effective = { ...set, load: set.load ?? base.load, reps: set.reps ?? base.reps, RIR: set.RIR ?? base.RIR };
	const inKg = convertExerciseLoads({ ...original, sets: [effective] }, 'toKg');
	const targetKg = toKg(visible.load, to);
	const moved = set.completed ? inKg.sets[0] : moveSetToLoad(inKg, inKg.sets[0], targetKg, userBodyweight, (kg) => kg);
	// The finite-value guard may keep the original reps; the target still is exactly the visible load.
	return { load: visible.load, reps: moved.reps!, RIR: moved.RIR! };
}

/**
 * The weight a set remembers for "emptied" (suggested.load) put through `convert`, e.g. into the other unit.
 * Reps and RIR have no unit, so they stay; every other field and set is left as it is
 */
export function convertSuggestedLoads<T extends { suggested?: Partial<Record<SetField, number>> }>(
	sets: T[],
	convert: (load: number) => number
): T[] {
	return sets.map((set) =>
		typeof set.suggested?.load === 'number'
			? { ...set, suggested: { ...set.suggested, load: convert(set.suggested.load) } }
			: set
	);
}

/**
 * A set (or mini-set) whose weight means something else now, because the kind of load changed (levels vs
 * weights): no weight, not done, and no remembered weight or hint start from the old kind
 */
export function clearLoads<T extends { load?: number; completed: boolean }>(set: T) {
	const { suggested, hintBase, ...rest } = set as T & { suggested?: SetInProgress['suggested']; hintBase?: HintBase };
	const { load, ...remembered } = suggested ?? {};
	return { ...rest, ...(suggested ? { suggested: remembered } : {}), load: undefined, completed: false } as Omit<
		T,
		'load' | 'completed' | 'suggested' | 'hintBase'
	> & { load: undefined; completed: false; suggested?: SetInProgress['suggested'] };
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
	ex.sets = ex.sets.map((set) =>
		set.load === undefined ? set : moveSetToLoad(ex, set, snapKg(set.load), userBodyweight, snapKg)
	);
}

/**
 * Moves each suggested load (in kg) to a weight the gym has (`weights`, in the exercise's unit),
 * recalculating reps. Picks the nearest weight, unless only the other neighbour keeps the reps
 * in the rep range, e.g. 14 kg × 8 with only 12 and 16 kg → 12 kg × 11.
 */
export function snapSetsToAvailableWeights(ex: WorkoutExerciseInProgress, userBodyweight: number, weights: number[]) {
	const unit = ex.weightUnit ?? 'KG';
	const nearestKg = (kg: number) => {
		const value = fromKg(kg, unit);
		const { below, above } = weightsAround(weights, value);
		if (below === null || above === null) return toKg((below ?? above)!, unit);
		return toKg(value - below <= above - value ? below : above, unit);
	};

	function pickLoad(set: SuggestedSet, setIdx: number): number {
		const load = set.load!;
		const value = fromKg(load, unit);
		const { below, above } = weightsAround(weights, value);
		if (below === null || above === null || below === above) return nearestKg(load);
		const candidates = value - below <= above - value ? [below, above] : [above, below];
		if (set.reps === undefined || set.RIR === undefined) return toKg(candidates[0], unit);
		const { start, end } = repRangeOfSet(ex, setIdx);
		const oldSet = { reps: set.reps, load, RIR: set.RIR };
		const inRange = (weight: number) => {
			const reps = Math.round(repsAtLoad(ex, oldSet, toKg(weight, unit), userBodyweight));
			return reps >= start && reps <= end;
		};
		const pick = candidates.find(inRange) ?? candidates[0];
		return toKg(pick, unit);
	}

	// Sets meant to share a load keep sharing it
	const sameLoadSetType = ['Straight', 'Myorep', 'MyorepMatch'].includes(ex.setType);
	const pickedLoads = new Map<number, number>();
	ex.sets = ex.sets.map((set, setIdx) => {
		// Bodyweight only (no added load) stays as is, and so does a load the weights can't be (added
		// weight with an assisted machine's settings, or help with a weight stack)
		if (set.load === undefined || set.load === 0 || set.load < 0 !== weights[0] < 0) return set;
		let newLoad = sameLoadSetType ? pickedLoads.get(set.load) : undefined;
		if (newLoad === undefined) {
			newLoad = pickLoad(set, setIdx);
			if (sameLoadSetType) pickedLoads.set(set.load, newLoad);
		}
		return moveSetToLoad(ex, set, newLoad, userBodyweight, nearestKg);
	});
}

/**
 * When the next weight is too big a jump to reach the rep range yet, e.g. 10 kg × 12 with
 * 14 kg next (about 6 reps): the next weight, and about how many more reps to do first at the
 * current weight. Loads are in the exercise's unit, as shown in a workout.
 */
export function getNextWeightHint(
	ex: WorkoutExerciseInProgress,
	weights: number[] | null,
	userBodyweightKg: number | null | undefined,
	repsOnly = false
): { currentWeight: number; nextWeight: number; moreReps: number } | null {
	// Levels go up with double progression instead, and reps-only exercises never add weight
	if (!weights || repsOnly || isLevelUnit(ex.weightUnit)) return null;
	const setIdx = ex.sets.findIndex(
		(set) => set.reps !== undefined && set.RIR !== undefined && set.load !== undefined && set.load > 0
	);
	if (setIdx === -1) return null;
	const set = ex.sets[setIdx] as { reps: number; load: number; RIR: number };
	const { start, end } = repRangeOfSet(ex, setIdx);
	if (set.reps < end) return null;

	const nextWeight = nextWeightUp(weights, set.load);
	if (nextWeight === null) return null;

	const unit = ex.weightUnit ?? 'KG';
	const bodyweight = userBodyweightKg ?? 0;
	const current = { ...set, load: toKg(set.load, unit) };
	const repsAtNextWeight = Math.round(repsAtLoad(ex, current, toKg(nextWeight, unit), bodyweight));
	if (!Number.isFinite(repsAtNextWeight) || repsAtNextWeight >= start) return null;

	// Reps at the current weight that match the bottom of the rep range at the next weight
	const readyReps = repsAtLoad(
		ex,
		{ reps: start, load: toKg(nextWeight, unit), RIR: set.RIR },
		current.load,
		bodyweight
	);
	if (!Number.isFinite(readyReps)) return null;
	const moreReps = Math.max(1, Math.ceil(readyReps - 1e-9) - set.reps);
	return { currentWeight: set.load, nextWeight, moreReps };
}

type SetWithLoads = { load?: number; miniSets: { load?: number }[] };

/**
 * Switches an in-progress exercise to the other unit. Loads are in the exercise's unit.
 * Sets already done keep the exact weight lifted; sets still to do move to the exercise's
 * weight set in the new unit, or else the new unit's standard steps (a custom step belongs to
 * the old unit), with reps adjusted.
 */
export function switchExerciseUnit(
	ex: WorkoutExerciseInProgress,
	to: MassUnit,
	userBodyweightKg: number,
	weightSets: WeightSetLike[] = [],
	repsOnly = false
): WorkoutExerciseInProgress {
	// A level stays a level
	if ((ex.weightUnit ?? 'KG') === to || isLevelUnit(ex.weightUnit)) return ex;
	const inKg = convertExerciseLoads(ex, 'toKg');
	// Reps only keeps the exact weight, just shown in the other unit (e.g. 5 kg is 11.02 lb)
	if (repsOnly) return convertExerciseLoads({ ...inKg, weightUnit: to }, 'toDisplay');
	const snapped: WorkoutExerciseInProgress = structuredClone({ ...inKg, weightUnit: to, minimumWeightChange: null });
	// The exercise's weight set, if it's in the new unit; otherwise the new unit's standard steps
	const weights = availableWeightsFor(snapped, weightSets);
	if (weights) snapSetsToAvailableWeights(snapped, userBodyweightKg, weights);
	else snapSetsToUnitSteps(snapped, userBodyweightKg);
	const merged = {
		...inKg,
		weightUnit: to,
		sets: inKg.sets.map((set, idx) => (set.completed ? set : snapped.sets[idx]))
	};
	return convertExerciseLoads(merged, 'toDisplay');
}

/** Converts an exercise's loads from kg to the unit it's shown in (or back) */
export function convertExerciseLoads<T extends { weightUnit?: WeightUnit | null; sets: SetWithLoads[] }>(
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
 * A down set's next weight, in the exercise's unit: `load` rounded down to a weight the gym has (its
 * lightest, under all of them), else to the exercise's weight step (2.5 kg or 5 lb without one)
 */
export function downSetLoad(
	load: number,
	ex: { weightUnit?: WeightUnit | null; minimumWeightChange?: number | null },
	weights: number[] | null
): number {
	if (weights) return weightsAround(weights, load).below ?? weights[0];
	const step = ex.minimumWeightChange ?? defaultWeightStep(ex.weightUnit ?? 'KG');
	return roundWeight(Math.floor(load / step + 1e-9) * step);
}

/** Whether a set holds a suggestion: reps, or for a cardio set a time */
const hasSuggestion = (set: WorkoutExerciseInProgress['sets'][number]) =>
	set.reps !== undefined || set.timeSeconds !== undefined;

/**
 * The routine decides how many sets: drop extra sets from the last time, and fill missing ones
 * with a copy of the last suggested set
 */
function fitSetsToRoutine(ex: WorkoutExerciseInProgress, routineSetCount: number) {
	ex.sets = ex.sets.slice(0, routineSetCount);
	const lastSuggestedSet = ex.sets.findLast(hasSuggestion);
	if (!lastSuggestedSet) return;
	const copyOfLastSet = () => ({ ...lastSuggestedSet, miniSets: structuredClone(lastSuggestedSet.miniSets) });
	while (ex.sets.length < routineSetCount) ex.sets.push(copyOfLastSet());
	ex.sets = ex.sets.map((set) => (hasSuggestion(set) ? set : copyOfLastSet()));
}

/**
 * Last time's cardio sets as today's suggestion: the time, distance (in metres here; shown in the
 * exercise's unit later) and, on a machine with levels, the level. Reps, weight and RIR are never
 * suggested for cardio: they're zero-filled when the set is ticked
 */
function repeatCardioSets(oldSets: WorkoutExercise['sets'], keepLevel: boolean): WorkoutExerciseInProgress['sets'] {
	return oldSets.map((oldSet) => ({
		skipped: oldSet.skipped,
		completed: false,
		reps: undefined,
		load: keepLevel ? oldSet.load : undefined,
		RIR: undefined,
		timeSeconds: oldSet.timeSeconds ?? undefined,
		distance: oldSet.distanceMeters ?? undefined,
		miniSets: []
	}));
}

/**
 * Converts an exercise's distances between metres (as saved and compared) and the unit they're shown in.
 * Only DistanceTime sets have one; everything else passes through unchanged
 */
export function convertExerciseDistances<T extends { sets: { distance?: number }[] }>(
	ex: T,
	direction: 'toDisplay' | 'toMeters',
	unit: DistanceUnit | null | undefined
): T {
	const distanceUnit = unit ?? 'KM';
	const convert = (distance: number) =>
		direction === 'toDisplay' ? roundDistance(fromMeters(distance, distanceUnit)) : toMeters(distance, distanceUnit);
	return {
		...ex,
		sets: ex.sets.map((set) => (set.distance === undefined ? set : { ...set, distance: convert(set.distance) }))
	};
}

/**
 * Double progression for a machine's levels: a rep more each time, up to the top of the rep range.
 * Once every set is at the top, every set goes up one level (keeping any gaps, e.g. down sets on
 * 8, 7, 6 go to 9, 8, 7), back at the bottom of the range. Sets already at the top wait for the
 * others. When a set has no higher level, none move up and reps keep going up instead.
 * An assisted machine (a higher level is more help) goes down a level instead: less help is harder.
 */
function progressLevels(
	ex: WorkoutExerciseInProgress,
	levels: number[] | null,
	assisted = false
): WorkoutExerciseInProgress['sets'] {
	const harderLevel = (level: number) => {
		if (!assisted) return levels ? nextWeightUp(levels, level) : level + 1;
		if (levels) return levels.findLast((lower) => lower < level - 1e-6) ?? null;
		return level - 1 > 0 ? level - 1 : null;
	};
	const counts = (set: WorkoutExerciseInProgress['sets'][number]) =>
		!set.skipped && set.reps !== undefined && set.load !== undefined;
	const allAtTop = ex.sets.every((set, setIdx) => !counts(set) || set.reps! >= repRangeOfSet(ex, setIdx).end);
	const nextLevels = ex.sets.map((set) => (counts(set) ? harderLevel(set.load!) : null));
	const moveUp = allAtTop && ex.sets.every((set, setIdx) => !counts(set) || nextLevels[setIdx] !== null);

	return ex.sets.map((set, setIdx) => {
		if (!counts(set)) return set;
		const { start, end } = repRangeOfSet(ex, setIdx);
		if (moveUp) return { ...set, load: nextLevels[setIdx]!, reps: start };
		// Below the top, or all at the top with no harder level to go to: a rep more. Otherwise wait
		if (set.reps! < end || allAtTop) return { ...set, reps: set.reps! + 1 };
		return set;
	});
}

/**
 * What the suggestions work from: the progression settings (the active mesocycle's, else steady ones)
 * and the exercises of the routine being done, each with its set count
 */
export type ProgressionPlan = {
	settings: Pick<Mesocycle, 'weeklyRIR' | 'startOverloadPercentage' | 'lastSetToFailure' | 'forceRIRMatching'>;
	exercises: RoutineExerciseTemplate[];
};

/**
 * Help without counting bodyweight (an assisted machine, or help logged as a negative load): the formula
 * can't compare amounts of help with nothing to take them from, so the help stays and reps go up
 */
function assistedWithoutShare(
	ex: WorkoutExerciseInProgress,
	lastPerformance: PreviousPerformance,
	weightSets: WeightSetLike[]
) {
	if (ex.bodyweightFraction !== null && ex.bodyweightFraction !== undefined) return false;
	const machine = machineSetOf(ex.name, weightSets);
	const linked = weightSets.find((set) => ex.weightSetId && set.id === ex.weightSetId);
	if (machine?.isAssistance || (!machine && linked?.isAssistance)) return true;
	return lastPerformance.exercise.sets.some((set) => !set.skipped && set.load < 0);
}

/**
 * Done at 0 kg without counting bodyweight (plain push-ups, a band): every set done, and every part
 * of a drop set, at 0. The formula can't put weight on it, so it goes up in reps. A skipped set's
 * load doesn't count
 */
function doneWithNoWeight(ex: WorkoutExerciseInProgress, lastPerformance: PreviousPerformance) {
	if (ex.bodyweightFraction !== null && ex.bodyweightFraction !== undefined) return false;
	const done = lastPerformance.exercise.sets.filter((set) => !set.skipped);
	return done.length > 0 && done.every((set) => set.load === 0 && set.miniSets.every((miniSet) => miniSet.load === 0));
}

/** A set's effort change for the week, worked out before any weight is lowered */
type EffortPlan = {
	idx: number;
	/** In reserve last time, and what the week asks for */
	oldRIR: number;
	targetRIR: number;
	/** Reps the week takes off for the extra reps in reserve (negative: reps added for fewer) */
	repsOff: number;
	/** Bottom of the set's rep range */
	start: number;
	/** Its reps before the week's effort is applied */
	reps: number;
};

/** A session never lowers a weight by more than this share of it (always by one step at least) */
export const MAX_LOAD_DROP = 0.1;

/**
 * The heaviest lower weight (kg) at which a set reaches `targetReps` for the same effort, less the reps
 * the week takes off. Weights the gym has, else steps of the exercise's unit; more help for an assisted
 * exercise already done with help. Stops at MAX_LOAD_DROP of what is lifted (the bodyweight share
 * included) and where the formula can't tell. Short of the target: the lowest weight it may use, with
 * the reps it gives there; null with no lower weight at all
 */
function lowerLoadForReps(
	ex: Pick<WorkoutExerciseInProgress, 'bodyweightFraction' | 'weightUnit' | 'minimumWeightChange'>,
	set: { reps: number; load: number; RIR: number },
	repsOff: number,
	targetReps: number,
	maxReps: number,
	weights: number[] | null,
	userBodyweight: number
): { load: number; reps: number } | null {
	const unit = ex.weightUnit ?? 'KG';
	const share = (ex.bodyweightFraction ?? 0) * userBodyweight;
	const lifted = set.load + share;
	if (bergerLoadFactor(lifted) <= 0) return null;
	const shown = roundWeight(fromKg(set.load, unit));
	const step = ex.minimumWeightChange ?? defaultWeightStep(unit);
	// A gym's weights don't mix with help: added weight stays added weight
	const candidates = weights
		? set.load > 0 && weights[0] < 0
			? []
			: weights.filter((weight) => weight < shown - 1e-6).toReversed()
		: step > 0
			? Array.from({ length: 400 }, (_, k) => roundWeight(shown - (k + 1) * step))
			: [];
	let lowest: { load: number; reps: number } | null = null;
	for (const [index, candidate] of candidates.entries()) {
		const load = toKg(candidate, unit);
		// Added weight comes off down to none; only a set done with help gets more help
		if (set.load >= 0 && load < 0) break;
		if (bergerLoadFactor(load + share) <= 0) break;
		if (index > 0 && load + share < lifted * (1 - MAX_LOAD_DROP) - 1e-9) break;
		const moved = Math.round(repsAtLoad(ex, set, load, userBodyweight));
		if (!Number.isFinite(moved)) break;
		const reps = moved - repsOff;
		// A gap too big to land in the range (the next weight down is past its top): the weight stays
		if (reps > maxReps) return lowest;
		lowest = { load, reps };
		if (reps >= targetReps) return lowest;
	}
	return lowest;
}

export function progressiveOverloadMagic(
	plan: ProgressionPlan,
	cycleNumber: number,
	userBodyweight: number,
	exerciseHistory: ExerciseHistory = {},
	mode: ProgressionMode = 'normal',
	weightSets: WeightSetLike[] = [],
	/** Reps-only exercises by name, with their rep cap (null for none) */
	repsOnly: RepsOnlySettings = new Map(),
	/** How each exercise is measured, by name; missing means reps */
	measures: MeasureSettings = new Map()
) {
	const mesocycle = plan.settings;
	// Cardio repeats last time's numbers and is never progressed, deloaded or adjusted for effort
	const isCardio = (ex: WorkoutExerciseInProgress) => isCardioMeasure(measures.get(ex.name));
	// Done with no weight last time, or helped without counting bodyweight: progressed as reps only too
	// (found per exercise below)
	const noWeight = new Set<string>();
	// Levels keep their own rule, so reps only applies to exercises with weights
	const isRepsOnly = (ex: WorkoutExerciseInProgress) =>
		(repsOnly.has(ex.name) || noWeight.has(ex.name)) && !isLevelUnit(ex.weightUnit);

	const weekRIR = getRIRForWeek(mesocycle.weeklyRIR, cycleNumber);
	let currentCycleRIR = weekRIR;
	if (mode === 'deload') currentCycleRIR = DELOAD_RIR;
	else if (mode === 'welcomeBack') currentCycleRIR = Math.min(weekRIR + 1, DELOAD_RIR);
	const easySession = mode !== 'normal';
	const workoutExercises = plan.exercises.map((exercise) =>
		createWorkoutExerciseInProgressFromRoutineExercise(exercise)
	);

	workoutExercises.forEach((ex) => {
		// Progressive overload from the last times this exercise was done, in any routine, with the
		// same kind of load (levels or weights) and measured the same way
		const allPreviousPerformances = comparablePerformances(
			exerciseHistory[ex.name] ?? [],
			ex.weightUnit,
			measures.get(ex.name) ?? 'Reps'
		);
		const lastPerformance = allPreviousPerformances.at(-1);
		if (!lastPerformance?.exercise) return;

		const routineSetCount = ex.sets.length;

		// Cardio: the same intervals as last time (time, distance and level), nothing more
		if (isCardio(ex)) {
			ex.sets = repeatCardioSets(lastPerformance.exercise.sets, isLevelUnit(ex.weightUnit));
			fitSetsToRoutine(ex, routineSetCount);
			return;
		}
		if (doneWithNoWeight(ex, lastPerformance)) noWeight.add(ex.name);
		if (assistedWithoutShare(ex, lastPerformance, weightSets)) noWeight.add(ex.name);

		// Only weights this gym has (from the exercise's weight set), else steps of the exercise's unit
		const weights = availableWeightsFor(ex, weightSets);

		// Levels aren't weights, so they use double progression instead of the formula
		if (isLevelUnit(ex.weightUnit)) {
			// Only the sets the routine has decide whether to go up a level
			ex.sets = lastPerformance.exercise.sets.slice(0, routineSetCount).map((oldSet) => addExtraSetProperties(oldSet));
			if (!easySession) ex.sets = progressLevels(ex, weights, levelSetOf(ex.name, weightSets)?.isAssistance ?? false);
			fitSetsToRoutine(ex, routineSetCount);
			return;
		}

		// Reps only: the same load as last time (never snapped or raised), and a rep more on every set
		if (isRepsOnly(ex)) {
			ex.sets = lastPerformance.exercise.sets.map((oldSet) => addExtraSetProperties(oldSet));
			fitSetsToRoutine(ex, routineSetCount);
			if (!easySession) {
				ex.sets = ex.sets.map((set) => (set.skipped || set.reps === undefined ? set : { ...set, reps: set.reps + 1 }));
			}
			return;
		}

		const unitChanged = (lastPerformance.exercise.weightUnit ?? 'KG') !== (ex.weightUnit ?? 'KG');
		const snapToRealWeights = () => {
			if (weights) snapSetsToAvailableWeights(ex, userBodyweight, weights);
			else if (unitChanged) snapSetsToUnitSteps(ex, userBodyweight);
		};

		// Easy sessions repeat the last numbers instead of trying to beat them
		if (easySession) {
			ex.sets = lastPerformance.exercise.sets.map((oldSet) => addExtraSetProperties(oldSet));
			fitSetsToRoutine(ex, routineSetCount);
			snapToRealWeights();
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
		// Myo-rep match moves as one: set 1 and how the match sets went decide, never a set on its own
		if (ex.setType === 'MyorepMatch') {
			if (myorepMatchReadyToGoUp(lastPerformance.exercise.sets, ex.repRangeEnd)) {
				ex.sets = raiseMyorepMatchLoad(ex, userBodyweight, weights);
			}
		} else {
			ex.sets = increaseLoadOfSets(ex, userBodyweight, weights);
		}
		snapToRealWeights();
	});

	// Deload: half the sets (a deload week doesn't cut a run short)
	if (mode === 'deload') {
		workoutExercises.forEach((ex) => {
			if (!isCardio(ex)) ex.sets = ex.sets.slice(0, Math.ceil(ex.sets.length / 2));
		});
	}

	// RIR adjustment (cardio has no effort to adjust)
	workoutExercises.forEach((ex) => {
		if (isCardio(ex)) return;
		// Levels and reps only already add a rep each time, and have no weight to lower
		const repEachTime = isLevelUnit(ex.weightUnit) || isRepsOnly(ex);
		const weights = availableWeightsFor(ex, weightSets);
		const before = ex.sets.map((set) => ({ reps: set.reps, load: set.load }));

		const plans = ex.sets.map((set, idx): EffortPlan | null => {
			const oldRIR = set.RIR ?? currentCycleRIR;
			set.RIR = currentCycleRIR;

			// Last set to failure (not in easy sessions)
			const lastSetToFailure = !easySession && (ex.lastSetToFailure ?? mesocycle.lastSetToFailure);
			if (idx === ex.sets.length - 1 && lastSetToFailure) set.RIR = 0;

			// Adjust reps when RIR changed
			const RIRDifference = set.RIR - oldRIR;
			// A set skipped last time has no numbers to adjust (it is emptied below)
			if (set.reps === undefined || set.skipped) return null;
			const targetRIR = set.RIR;
			const repRangeStart = repRangeOfSet(ex, idx).start;

			if (repEachTime) {
				// A harder week doesn't add more than the rep they already get
				if (RIRDifference < 0) return null;
				// Easy sessions always take reps off to match the easier effort
				if (RIRDifference > 0 && !(easySession || (ex.forceRIRMatching ?? mesocycle.forceRIRMatching))) return null;
				// An easier week takes reps off, but not below the range (or a lower rep cap), and keeps the
				// week's effort
				if (mode !== 'deload') {
					const floor = Math.min(repRangeStart, repsOnly.get(ex.name) ?? Infinity);
					set.reps = Math.max(set.reps - RIRDifference, Math.min(set.reps, floor));
					return null;
				}
				// A deload may go below the range, never below one rep (and never past what was there to give)
				const reps = Math.max(1, set.reps - RIRDifference);
				set.RIR = Math.min(targetRIR, Math.max(0, set.reps + oldRIR - reps));
				set.reps = reps;
				return null;
			}

			// Easy sessions always take reps off to match the easier effort; a normal week only when asked to
			const forceRIRMatching = easySession || (ex.forceRIRMatching ?? mesocycle.forceRIRMatching);
			const repsOff = RIRDifference > 0 && !forceRIRMatching ? 0 : RIRDifference;
			return { idx, oldRIR, targetRIR, repsOff, start: repRangeStart, reps: set.reps };
		});

		/** When taking the reps off isn't enough: the reps to reach at a lower weight, else null */
		const dropTarget = (plan: EffortPlan): number | null => {
			const planned = plan.reps - plan.repsOff;
			// A deload keeps its weight and gives up reps; out of reps, it keeps them and gives up weight
			if (mode === 'deload') return planned < 1 ? plan.reps : null;
			if (planned >= plan.start) return null;
			// A normal week keeps the weight of a set that reached the range (it stops at the bottom of it,
			// with less in reserve than the week asks); one that fell short gets a lighter weight
			if (mode === 'normal' && plan.reps >= plan.start) return null;
			return plan.start;
		};

		/** The set at a load (kg), for the same effort less the reps the week takes off; never under one rep */
		const applyAt = (plan: EffortPlan, loadKg: number | undefined, snapMini: (kg: number) => number) => {
			const set = ex.sets[plan.idx];
			let sameEffortReps = plan.reps;
			if (loadKg !== undefined && set.load !== undefined && Math.abs(loadKg - set.load) > 1e-9) {
				const moved = Math.round(
					repsAtLoad(ex, { reps: plan.reps, load: set.load, RIR: plan.oldRIR }, loadKg, userBodyweight)
				);
				if (Number.isFinite(moved)) {
					sameEffortReps = moved;
					set.load = loadKg;
					set.miniSets = set.miniSets.map((miniSet) =>
						miniSet.load === undefined ? miniSet : { ...miniSet, load: snapMini(miniSet.load) }
					);
				}
			}
			let reps = sameEffortReps - plan.repsOff;
			let RIR = plan.targetRIR;
			if (mode === 'normal' && loadKg === undefined && plan.repsOff > 0 && reps < plan.start) {
				// Stops at the bottom of the range, with as much in reserve as that leaves
				const give = Math.min(plan.repsOff, Math.max(sameEffortReps - plan.start, 0));
				reps = sameEffortReps - give;
				RIR = plan.oldRIR + give;
			}
			if (reps < 1) {
				// Never more than could be done last time
				reps = 1;
				RIR = Math.min(plan.targetRIR, Math.max(0, sameEffortReps + plan.oldRIR - 1));
			}
			set.reps = reps;
			set.RIR = RIR;
		};

		const lowerFor = (plan: EffortPlan, target: number) => {
			const set = ex.sets[plan.idx];
			if (set.load === undefined) return null;
			return lowerLoadForReps(
				ex,
				{ reps: plan.reps, load: set.load, RIR: plan.oldRIR },
				plan.repsOff,
				target,
				mode === 'deload' ? Infinity : repRangeOfSet(ex, plan.idx).end,
				weights,
				userBodyweight
			);
		};
		const miniSnap = (from: number, to: number) => (kg: number) => {
			const moved = kg + (to - from);
			if (!weights) return moved;
			const unit = ex.weightUnit ?? 'KG';
			const { below, above } = weightsAround(weights, roundWeight(fromKg(moved, unit)));
			return below === null && above === null ? moved : toKg((below ?? above)!, unit);
		};

		const active = plans.filter((plan): plan is EffortPlan => plan !== null);
		const sharedLoad = ['Straight', 'Myorep', 'MyorepMatch'].includes(ex.setType);
		if (sharedLoad) {
			// Sets meant to share a load move together: the first set with numbers says whether, and how far.
			// Later sets fading under the range don't lower the weight by themselves
			const decider = active.find((plan) => ex.sets[plan.idx].load !== undefined);
			const target = decider ? dropTarget(decider) : null;
			const lower = decider && target !== null ? lowerFor(decider, target) : null;
			const from = decider ? ex.sets[decider.idx].load! : 0;
			active.forEach((plan) => {
				const sharesIt = lower !== null && ex.sets[plan.idx].load !== undefined;
				applyAt(
					plan,
					sharesIt ? miniSnap(from, lower!.load)(ex.sets[plan.idx].load!) : undefined,
					miniSnap(from, lower?.load ?? from)
				);
			});
		} else {
			active.forEach((plan) => {
				const target = dropTarget(plan);
				const lower = target !== null ? lowerFor(plan, target) : null;
				const from = ex.sets[plan.idx].load ?? 0;
				applyAt(plan, lower?.load, miniSnap(from, lower?.load ?? from));
			});
			// Down and top/back-off sets get lighter set by set: a set lowered here doesn't leave the next one
			// heavier than it, when it wasn't before
			if (ex.setType === 'Down' || ex.setType === 'TopBackoff') {
				active.forEach((plan) => {
					const prev = plan.idx - 1;
					const [loadNow, prevNow] = [ex.sets[plan.idx].load, ex.sets[prev]?.load];
					const [loadBefore, prevBefore] = [before[plan.idx].load, before[prev]?.load];
					if (loadNow === undefined || prevNow === undefined || loadBefore === undefined || prevBefore === undefined)
						return;
					if (loadBefore <= prevBefore + 1e-9 && loadNow > prevNow + 1e-9) {
						ex.sets[plan.idx].load = loadBefore;
						applyAt(plan, prevNow, miniSnap(loadBefore, prevNow));
					}
				});
			}
		}
	});

	// Reps-only cap: the last word, after every other change to reps
	workoutExercises.forEach((ex) => {
		const maxReps = isRepsOnly(ex) ? repsOnly.get(ex.name) : null;
		if (typeof maxReps !== 'number') return;
		ex.sets.forEach((set) => {
			if (set.reps !== undefined) set.reps = Math.min(set.reps, maxReps);
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
				set.RIR = isCardio(ex) ? undefined : currentCycleRIR;
				set.timeSeconds = undefined;
				set.distance = undefined;
			});
	});

	return workoutExercises;
}
