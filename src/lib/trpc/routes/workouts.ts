import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { resolveExerciseUnit } from '$lib/utils/weightUnits';
import { linkToExercise, resolveExercises } from '$lib/server/exercises';
import { routineSetCount } from '$lib/utils/routineSets';
import { isValidDistanceMeters, isValidTimeSeconds } from '$lib/utils/distanceUnits';
import { isCardioMeasure, measureOfSets } from '$lib/utils/measure';
import {
	comparablePerformances,
	convertExerciseLoads,
	getBlockWeek,
	getExerciseVolume,
	isDeloadWeek,
	NO_BLOCK_PROGRESSION,
	progressiveOverloadMagic,
	type RepsOnlySettings,
	type MeasureSettings,
	convertExerciseDistances,
	type ProgressionMode,
	type ProgressionPlan,
	type ExerciseHistory,
	type WorkoutExerciseInProgress,
	type WorkoutExerciseWithSets
} from '$lib/utils/workoutUtils';
import {
	ChangeTypeSchema,
	SetTypeSchema,
	WorkoutExerciseCreateWithoutWorkoutInputSchema,
	WorkoutExerciseMiniSetCreateWithoutParentSetInputSchema,
	WorkoutExerciseSetCreateWithoutWorkoutExerciseInputSchema
} from '$lib/zodSchemas';
import {
	Prisma,
	type DistanceUnit,
	type ExerciseMeasure,
	type RoutineWeightUnit,
	type WeightUnit as WeightUnitType,
	type Mesocycle,
	type PrismaPromise,
	type WorkoutExercise
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { monthInput } from './stats';
import { ignoreExerciseLink } from '$lib/trpc/exerciseLinkInput';
import { APP_UPDATED_MESSAGE } from '$lib/trpc/appUpdated';
import { createId } from '@paralleldrive/cuid2';
import { levelSetOf, machineSetOf } from '$lib/utils/weightSets';
import { userWeightSets } from '$lib/server/weightSets';
import { z } from 'zod';

/** What an app version too old to name its routine is told: reopening loads the current version */

type TodaysWorkoutData = {
	startedAt: Date | string;
	endedAt: Date | string | null;
	userBodyweight: number | null;
	workoutExercises: Pick<WorkoutExercise, 'name' | 'targetMuscleGroup' | 'customMuscleGroup'>[];
	workoutOfMesocycle?: {
		mesocycle: Mesocycle;
		cycleNumber: number;
		splitDayName: string;
	};
	note: string | null;
	activeBlock?: ActiveBlockData;
	/** With no active block: My routines to pick from */
	myRoutines?: RoutineOption[];
	/** The routine this workout is done from (block or My routines); none for a blank workout */
	routineName?: string | null;
	/** Set when it has been long enough since the last workout for an easier first session back */
	welcomeBack?: { daysSinceLastWorkout: number };
	/** Unit for bodyweight and a starting choice for routines set to "ask each time" */
	homeWeightUnit: WeightUnitType;
	/** Unit picked at the start of this workout, for routines set to "ask each time" */
	sessionWeightUnit?: WeightUnitType;
	/** Weights this gym has, picked at the start of a workout for routines set to "ask each time" */
	sessionWeightSetId?: string;
};

export type RoutineOption = {
	name: string;
	weightUnit: RoutineWeightUnit;
	workoutExercises: Pick<WorkoutExercise, 'name' | 'targetMuscleGroup' | 'customMuscleGroup'>[];
	lastDoneAt: Date | null;
};

type ActiveBlockData = {
	mesocycle: Mesocycle;
	weekNumber: number;
	totalWeeks: number;
	blockFinished: boolean;
	routines: RoutineOption[];
};

/** Reps-only exercises by name, with their rep cap */
function repsOnlySettings(exercises: { name: string; repsOnly: boolean; maxReps: number | null }[]): RepsOnlySettings {
	return new Map(
		exercises.filter((exercise) => exercise.repsOnly).map((exercise) => [exercise.name, exercise.maxReps])
	);
}

/** How an exercise is measured and, for distances, the unit they're shown in */
export type ExerciseMeasureInfo = { measure: ExerciseMeasure; distanceUnit: DistanceUnit | null };

/** Today's cardio exercises by name (reps exercises are left out: missing means reps) */
function measureSettings(exercises: { name: string; measure: ExerciseMeasure; distanceUnit: DistanceUnit | null }[]) {
	const measures: MeasureSettings = new Map();
	const info: Record<string, ExerciseMeasureInfo> = {};
	for (const exercise of exercises) {
		if (!isCardioMeasure(exercise.measure)) continue;
		measures.set(exercise.name, exercise.measure);
		info[exercise.name] = { measure: exercise.measure, distanceUnit: exercise.distanceUnit };
	}
	return { measures, info };
}

/**
 * Every set of a cardio exercise done (not skipped) has to carry its time, and its distance for a
 * DistanceTime exercise, within bounds; a reps exercise's sets carry neither. A saved row's measure is
 * read from its sets, so this is what keeps history meaning what it says. An exercise that is cardio
 * now was cardio for every row ever saved against it (its measure is fixed once it has workouts), so
 * the check holds for edits of past workouts too. An older app version can't fill in a cardio set:
 * its save is refused and it's asked to reopen the app
 */
async function assertSetsMatchMeasures(userId: string, input: z.infer<typeof createWorkoutSchema>) {
	const names = [...new Set(input.workoutExercises.map((exercise) => exercise.name))];
	const exercises = await prisma.exercise.findMany({
		where: { userId, name: { in: names } },
		select: { name: true, measure: true }
	});
	const measureByName = new Map(exercises.map((exercise) => [exercise.name, exercise.measure]));
	input.workoutExercises.forEach((exercise, exerciseIdx) => {
		const sets = input.workoutExercisesSets[exerciseIdx] ?? [];
		// An exercise renamed or removed on another device mid-workout: its rows say what they logged, and the
		// save makes the exercise again, measured that way (see resolveExercises)
		const measure = measureByName.get(exercise.name) ?? measureOfSets(sets);
		if (measure !== 'Reps' && input.workoutExercisesMiniSets[exerciseIdx]?.some((miniSets) => miniSets.length > 0)) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: `${exercise.name}: an interval has no mini-sets` });
		}
		for (const set of sets) {
			if (set.timeSeconds != null && !isValidTimeSeconds(set.timeSeconds)) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: `${exercise.name}: a set's time is out of range` });
			}
			if (set.distanceMeters != null && !isValidDistanceMeters(set.distanceMeters)) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: `${exercise.name}: a set's distance is out of range` });
			}
			if (set.skipped) continue;
			if (measure === 'Reps') {
				if (set.timeSeconds != null || set.distanceMeters != null) {
					throw new TRPCError({ code: 'BAD_REQUEST', message: `${exercise.name} is measured in reps` });
				}
				continue;
			}
			const missingTime = set.timeSeconds == null;
			const missingDistance = measure === 'DistanceTime' ? set.distanceMeters == null : set.distanceMeters != null;
			if (missingTime || missingDistance) {
				throw new TRPCError({ code: 'PRECONDITION_FAILED', message: APP_UPDATED_MESSAGE });
			}
		}
	});
}

/**
 * The workout's exercises with how each one's rows were logged, so an exercise the save has to make
 * (renamed or removed elsewhere meanwhile) is measured the way its rows are; distances start in km
 */
function withMeasureHints(input: z.infer<typeof createWorkoutSchema>) {
	return input.workoutExercises.map((exercise, exerciseIdx) => {
		const measure = measureOfSets(input.workoutExercisesSets[exerciseIdx] ?? []);
		return { ...exercise, measure, distanceUnit: measure === 'DistanceTime' ? ('KM' as const) : null };
	});
}

type WorkoutExercisesWithPreviousData = {
	todaysWorkoutExercises: WorkoutExerciseInProgress[];
	/** Today's reps-only exercises by name, with their rep cap (null for none) */
	repsOnly: Record<string, number | null>;
	/** Today's cardio exercises by name: how they're measured, and the unit their distances show in */
	measures: Record<string, ExerciseMeasureInfo>;
	previousWorkoutData: null | {
		exercises: WorkoutExerciseWithSets[];
		userBodyweight: number;
	};
};

/** Whether a workout on this date falls in a deload week of the block */
async function isInDeloadWeek(userId: string, mesocycleId: string, workoutDate: Date | string) {
	const mesocycle = await prisma.mesocycle.findFirst({
		where: { id: mesocycleId, userId },
		select: { startDate: true, weeklyRIR: true }
	});
	if (!mesocycle?.startDate) return false;
	return isDeloadWeek(mesocycle.weeklyRIR, getBlockWeek(mesocycle.startDate, new Date(workoutDate)));
}

/** How many past performances of an exercise feed its progression */
const EXERCISE_HISTORY_LENGTH = 8;

/** Recent performances of each named exercise across all of the user's workouts, oldest first */
async function getExerciseHistory(userId: string, exerciseIds: string[]): Promise<ExerciseHistory> {
	// Only the latest few of each: a routine can hold the same exercise twice, so each is asked for once
	const perExercise = await Promise.all(
		[...new Set(exerciseIds)].map((exerciseId) =>
			prisma.workoutExercise.findMany({
				where: { exerciseId, workout: { userId, isDeload: false } },
				include: {
					sets: { include: { miniSets: { orderBy: { miniSetIndex: 'asc' } } }, orderBy: { setIndex: 'asc' } },
					workout: { select: { userBodyweight: true, startedAt: true } }
				},
				orderBy: { workout: { startedAt: 'desc' } },
				take: EXERCISE_HISTORY_LENGTH
			})
		)
	);
	return historyFromPerformances(perExercise.flat());
}

/**
 * Past performances, keyed by the name they were done under: each one once, the latest
 * EXERCISE_HISTORY_LENGTH of each name, oldest first
 */
export function historyFromPerformances<
	T extends { id: string; name: string; workout: { userBodyweight: number; startedAt: Date } }
>(pastExercises: T[]) {
	const newestFirst = [...new Map(pastExercises.map((row) => [row.id, row])).values()].sort(
		(a, b) => b.workout.startedAt.getTime() - a.workout.startedAt.getTime()
	);
	const history: Record<string, { exercise: Omit<T, 'workout'>; oldUserBodyweight: number }[]> = {};
	for (const { workout, ...exercise } of newestFirst) {
		const performances = (history[exercise.name] ??= []);
		if (performances.length < EXERCISE_HISTORY_LENGTH) {
			performances.push({ exercise, oldUserBodyweight: workout.userBodyweight });
		}
	}
	Object.values(history).forEach((performances) => performances.reverse());
	return history;
}

const workoutInputDataSchema = z.object({
	startedAt: z.date().or(z.string().datetime()).optional(),
	/** A new workout's end: its last ticked set. Kept between its start and now; none means now */
	endedAt: z.date().or(z.string().datetime()).optional(),
	/** The routine of My routines the workout is done from, in a block or not; none for a blank workout */
	routineName: z.string().trim().min(1).max(100).nullish(),
	userBodyweight: z.number(),
	workoutOfMesocycle: z
		.object({
			mesocycle: z.object({ id: z.string().cuid2() }),
			/** The routine's name as the app showed it: for a saved workout from before routineName */
			splitDayName: z.string().trim().min(1).max(100).optional()
			// workoutStatus (always null since skipped and rest days went) is still sent by older app versions; ignored
		})
		.optional(),
	note: z.string().optional()
});

const createWorkoutSchema = z.strictObject({
	workoutData: workoutInputDataSchema,
	workoutExercises: z.array(ignoreExerciseLink(WorkoutExerciseCreateWithoutWorkoutInputSchema)),
	workoutExercisesSets: z.array(z.array(WorkoutExerciseSetCreateWithoutWorkoutExerciseInputSchema)),
	workoutExercisesMiniSets: z.array(z.array(z.array(WorkoutExerciseMiniSetCreateWithoutParentSetInputSchema)))
});

/**
 * The name of the routine a workout is done from; none for a blank workout. A workout saved on the
 * phone by an app version from before routineName still has the name it showed (splitDayName)
 */
function routineNameOf(workoutData: z.infer<typeof workoutInputDataSchema>) {
	return workoutData.routineName ?? workoutData.workoutOfMesocycle?.splitDayName ?? null;
}

/** A new workout's end time: the one given (its last ticked set), kept between its start and now */
function newWorkoutEnd(startedAt: Date, endedAt: Date | string | undefined) {
	const now = new Date();
	if (endedAt === undefined) return now;
	const end = new Date(endedAt);
	if (isNaN(end.getTime())) return now;
	return new Date(Math.min(Math.max(end.getTime(), startedAt.getTime()), now.getTime()));
}

/**
 * A routine of My routines as the plan the suggestions work from: its exercises, with the active
 * mesocycle's progression settings and week, else steady ones
 */
async function findMyRoutineForWorkout(userId: string, routineName: string, inBlock = false) {
	const [routine, block] = await Promise.all([
		prisma.exerciseSplitDay.findFirst({
			where: { exerciseSplit: { userId }, name: routineName },
			include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
		}),
		inBlock ? prisma.mesocycle.findFirst({ where: { userId, startDate: { not: null }, endDate: null } }) : null
	]);
	if (!routine || (inBlock && !block)) return null;
	const plan: ProgressionPlan = {
		settings: block ?? {
			weeklyRIR: [...NO_BLOCK_PROGRESSION.weeklyRIR],
			startOverloadPercentage: NO_BLOCK_PROGRESSION.startOverloadPercentage,
			lastSetToFailure: NO_BLOCK_PROGRESSION.lastSetToFailure,
			forceRIRMatching: NO_BLOCK_PROGRESSION.forceRIRMatching
		},
		exercises: routine.exercises.map(({ exerciseSplitDayId, sets, ...exercise }) => ({
			...exercise,
			sets: routineSetCount(sets)
		}))
	};
	const weekNumber = block?.startDate ? getBlockWeek(block.startDate) : 1;
	return { plan, routineWeightUnit: routine.weightUnit, weekNumber, inBlock: block !== null };
}

/** The blocks an old link's filter names (null kept, for workouts not in a block); none if it names none */
async function legacyMesocycleIds(
	userId: string,
	filters: { selectedMesocycles?: (string | null)[] } | undefined
): Promise<(string | null)[] | undefined> {
	const names = filters?.selectedMesocycles;
	if (!names) return undefined;
	const named = await prisma.mesocycle.findMany({
		where: { userId, name: { in: names.filter((name) => name !== null) } },
		select: { id: true }
	});
	return [...named.map((mesocycle) => mesocycle.id), ...(names.includes(null) ? [null] : [])];
}

const loadWorkoutsSchema = z.strictObject({
	cursorId: z.string().cuid2().optional(),
	filters: z
		.object({
			startDate: z.date().optional(),
			/** From apps before endBefore: the end day's midnight in UTC, a day added */
			endDate: z.date().optional(),
			/** The midnight after the filter's last day (the phone's) */
			endBefore: z.date().optional(),
			/** Days picked on the calendar: from the first day's midnight to the midnight after the last (the phone's) */
			pickedDays: z.strictObject({ from: z.date(), to: z.date() }).optional(),
			// No longer a filter (skipped and rest days are gone): still accepted from a saved filter or an
			// app from before, and ignored
			selectedWorkoutStatuses: z.array(z.union([z.literal('RestDay'), z.literal('Skipped'), z.null()])).optional(),
			/** Blocks by id; null for workouts not in a block */
			selectedMesocycleIds: z.array(z.union([z.string().cuid2(), z.null()])).optional(),
			/** Blocks by name, from a link made before ids: every block of that name, as it was */
			selectedMesocycles: z.array(z.union([z.string(), z.null()])).optional()
		})
		.optional()
});

export const workouts = t.router({
	load: t.procedure.input(loadWorkoutsSchema).query(async ({ input, ctx }) => {
		let whereClause: Prisma.WorkoutWhereInput = { userId: ctx.userId };
		const andConditions: Prisma.WorkoutWhereInput['AND'] = [];
		const { filters } = input;

		// Both ends together (an end date used to replace the start)
		const startedAt: Prisma.DateTimeFilter = {};
		if (filters?.startDate) startedAt.gte = filters.startDate;
		if (filters?.endBefore) startedAt.lt = filters.endBefore;
		else if (filters?.endDate) startedAt.lte = new Date(Number(filters.endDate) + 1000 * 60 * 60 * 24);
		if (filters?.pickedDays) {
			startedAt.gte = filters.pickedDays.from;
			startedAt.lt = filters.pickedDays.to;
		}
		if (Object.keys(startedAt).length > 0) whereClause = { ...whereClause, startedAt };

		const selectedIds = filters?.selectedMesocycleIds ?? (await legacyMesocycleIds(ctx.userId, filters));
		if (selectedIds) {
			const orClause: Prisma.WorkoutWhereInput['OR'] = [
				{ workoutOfMesocycle: { mesocycleId: { in: selectedIds.filter((id) => id !== null) } } }
			];

			// Workouts not in a block
			if (selectedIds.includes(null)) {
				orClause.push({ workoutOfMesocycle: null });
			}

			andConditions.push({ OR: orClause });
		}

		whereClause = { ...whereClause, AND: andConditions };

		const workouts = await prisma.workout.findMany({
			where: whereClause,
			// Ties broken by id, so the pages (from the last one's id) never repeat or skip one
			orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
			include: {
				workoutOfMesocycle: {
					include: {
						mesocycle: {
							select: { id: true, name: true }
						}
					}
				},
				workoutExercises: {
					select: {
						bodyweightFraction: true,
						weightUnit: true,
						sets: { select: { reps: true, load: true, RIR: true, skipped: true, miniSets: true } }
					}
				}
			},
			cursor: input.cursorId !== undefined ? { id: input.cursorId } : undefined,
			skip: input.cursorId !== undefined ? 1 : 0,
			take: 10
		});
		// Each card shows its volume (kg, like the Stats card: levels don't count); the sets stay here
		return workouts.map(({ workoutExercises, ...workout }) => ({
			...workout,
			volume: workoutExercises.reduce(
				(total, exercise) => total + getExerciseVolume(exercise, workout.userBodyweight),
				0
			)
		}));
	}),

	/**
	 * The workouts done in a month, for the calendar: when, and their routine (the phone names them and
	 * sorts them into its own days, from its own midnight)
	 */
	monthDays: t.procedure.input(monthInput).query(async ({ ctx, input }) => {
		return prisma.workout.findMany({
			where: { userId: ctx.userId, startedAt: { gte: input.from, lt: input.to } },
			select: { startedAt: true, routineName: true },
			orderBy: [{ startedAt: 'asc' }, { id: 'asc' }]
		});
	}),

	getFilterData: t.procedure.query(async ({ ctx }) => {
		const firstWorkout = await prisma.workout.findFirst({
			where: { userId: ctx.userId },
			select: { startedAt: true },
			orderBy: { startedAt: 'asc' }
		});

		if (!firstWorkout) {
			return null;
		}
		const firstWorkoutDate = firstWorkout.startedAt;

		const lastWorkout = await prisma.workout.findFirst({
			where: { userId: ctx.userId },
			select: { startedAt: true },
			orderBy: { startedAt: 'desc' }
		});
		const lastWorkoutDate = lastWorkout!.startedAt;

		const allMesocycles = await prisma.mesocycle.findMany({
			where: { userId: ctx.userId },
			select: { id: true, name: true, startDate: true, endDate: true }
		});

		return { firstWorkoutDate, lastWorkoutDate, allMesocycles };
	}),

	findById: t.procedure.input(z.string().cuid2()).query(({ input, ctx }) =>
		prisma.workout.findUnique({
			where: { id: input, userId: ctx.userId },
			include: {
				workoutOfMesocycle: { include: { mesocycle: true } },
				workoutExercises: {
					orderBy: { exerciseIndex: 'asc' },
					include: {
						sets: { include: { miniSets: { orderBy: { miniSetIndex: 'asc' } } }, orderBy: { setIndex: 'asc' } },
						// A cardio row's measure is read from its sets; the exercise only says which unit its distances show in
						exercise: { select: { distanceUnit: true } }
					}
				}
			}
		})
	),

	deleteById: t.procedure.input(z.string().cuid2()).mutation(async ({ input, ctx }) => {
		await prisma.workout.delete({ where: { id: input, userId: ctx.userId } });
		return { message: 'Workout deleted successfully' };
	}),

	getTodaysWorkoutData: t.procedure.query(async ({ ctx }) => {
		const [lastWorkout, userSettings] = await Promise.all([
			prisma.workout.findFirst({
				where: { userId: ctx.userId },
				select: { userBodyweight: true, startedAt: true },
				orderBy: { startedAt: 'desc' }
			}),
			prisma.userSettings.findUnique({
				where: { userId: ctx.userId },
				select: { welcomeBackEnabled: true, welcomeBackAfterDays: true, homeWeightUnit: true }
			})
		]);

		const todaysWorkoutData: TodaysWorkoutData = {
			workoutExercises: [],
			userBodyweight: lastWorkout?.userBodyweight ?? null,
			startedAt: new Date(),
			endedAt: null,
			note: null,
			homeWeightUnit: userSettings?.homeWeightUnit ?? 'KG'
		};

		// Settings default to on, after 7 days
		const welcomeBackEnabled = userSettings?.welcomeBackEnabled ?? true;
		const welcomeBackAfterDays = userSettings?.welcomeBackAfterDays ?? 7;
		if (lastWorkout && welcomeBackEnabled) {
			const daysSinceLastWorkout = Math.floor((Date.now() - lastWorkout.startedAt.getTime()) / (24 * 60 * 60 * 1000));
			if (daysSinceLastWorkout >= welcomeBackAfterDays) todaysWorkoutData.welcomeBack = { daysSinceLastWorkout };
		}

		// Routines to pick from are My routines, in a block or not
		const myRoutines = await prisma.exerciseSplitDay.findMany({
			where: { exerciseSplit: { userId: ctx.userId } },
			orderBy: { dayIndex: 'asc' },
			select: {
				name: true,
				weightUnit: true,
				exercises: {
					select: { name: true, targetMuscleGroup: true, customMuscleGroup: true },
					orderBy: { exerciseIndex: 'asc' }
				}
			}
		});
		const data = await prisma.mesocycle.findFirst({
			where: { userId: ctx.userId, startDate: { not: null }, endDate: null }
		});
		// "Last done": the latest workout from each routine (by name), in this block if there is one
		const lastDone = await prisma.workout.groupBy({
			by: ['routineName'],
			where: {
				userId: ctx.userId,
				routineName: { not: null },
				...(data ? { workoutOfMesocycle: { is: { mesocycleId: data.id } } } : {})
			},
			_max: { startedAt: true }
		});
		const routines: RoutineOption[] = myRoutines.map((routine) => ({
			name: routine.name,
			weightUnit: routine.weightUnit,
			workoutExercises: routine.exercises,
			lastDoneAt: lastDone.find((row) => row.routineName === routine.name)?._max.startedAt ?? null
		}));
		if (data === null) {
			todaysWorkoutData.myRoutines = routines;
			return todaysWorkoutData;
		}

		const mesocycle = data;
		const weekNumber = getBlockWeek(mesocycle.startDate!);
		const totalWeeks = mesocycle.weeklyRIR.length;

		todaysWorkoutData.activeBlock = {
			mesocycle,
			weekNumber,
			totalWeeks,
			blockFinished: weekNumber > totalWeeks,
			routines
		};
		return todaysWorkoutData;
	}),

	getWorkoutExercisesWithPreviousData: t.procedure
		.input(
			z.strictObject({
				userBodyweight: z.number(),
				/** A routine of My routines, by its name... */
				routineName: z.string().trim().min(1).max(100).optional(),
				/** ...done in the active block, with its settings and week */
				useActiveMesocycle: z.boolean().optional(),
				/** Sent only by app versions from before routines had names: they're asked to reopen the app */
				splitDayIndex: z.number().int().optional(),
				welcomeBack: z.boolean().optional(),
				/** Unit chosen at the start of the workout, for routines set to "ask each time" */
				sessionUnit: z.enum(['KG', 'LB']).optional(),
				/** Weights this gym has, for routines set to "ask each time" */
				sessionWeightSetId: z.string().cuid2().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			if (input.routineName === undefined) {
				// An old app version names the routine by its position: it has to update first
				if (input.splitDayIndex !== undefined) {
					throw new TRPCError({ code: 'PRECONDITION_FAILED', message: APP_UPDATED_MESSAGE });
				}
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Give a routine name' });
			}
			const workoutExercisesWithPreviousData: WorkoutExercisesWithPreviousData = {
				todaysWorkoutExercises: [],
				repsOnly: {},
				measures: {},
				previousWorkoutData: null
			};
			const today = await findMyRoutineForWorkout(ctx.userId, input.routineName, input.useActiveMesocycle === true);
			if (!today) return workoutExercisesWithPreviousData;
			const { plan, routineWeightUnit, weekNumber, inBlock } = today;

			const exerciseNames = plan.exercises.map((exercise) => exercise.name);
			const [exerciseHistory, userSettings, weightSets] = await Promise.all([
				getExerciseHistory(
					ctx.userId,
					plan.exercises.flatMap((exercise) => exercise.exerciseId ?? [])
				),
				prisma.userSettings.findUnique({ where: { userId: ctx.userId }, select: { homeWeightUnit: true } }),
				userWeightSets(ctx.userId)
			]);
			const weightSetById = new Map(weightSets.map((weightSet) => [weightSet.id, weightSet]));
			const askEachTime = routineWeightUnit === 'ASK';

			// Each exercise's unit: its own choice, else its weight set's (in a routine for one gym), else
			// the routine's, else the one picked for this workout
			const sessionUnit = input.sessionUnit ?? userSettings?.homeWeightUnit ?? 'KG';
			const sessionWeightSet = input.sessionWeightSetId ? weightSetById.get(input.sessionWeightSetId) : undefined;
			plan.exercises.forEach((exercise) => {
				// A machine always uses its own levels or weights, in its own unit
				const levels = levelSetOf(exercise.name, weightSets);
				const machine = machineSetOf(exercise.name, weightSets);
				// At many gyms the gym picked for this workout decides the weights, never the exercise's own set
				const ownWeightSet = exercise.weightSetId && !askEachTime ? weightSetById.get(exercise.weightSetId) : undefined;
				exercise.weightUnit = resolveExerciseUnit(
					exercise.weightUnit,
					routineWeightUnit,
					sessionUnit,
					levels ? 'LEVEL' : ownWeightSet?.unit,
					machine?.unit
				);
				if (levels || machine) exercise.weightSetId = null;
				else if (askEachTime) exercise.weightSetId = sessionWeightSet?.id ?? null;
			});
			const unitByExerciseName = new Map(
				plan.exercises.map((exercise) => [exercise.name, exercise.weightUnit ?? 'KG'])
			);

			let mode: ProgressionMode = 'normal';
			if (inBlock && isDeloadWeek(plan.settings.weeklyRIR, weekNumber)) mode = 'deload';
			else if (input.welcomeBack) mode = 'welcomeBack';

			const exercises = await prisma.exercise.findMany({
				where: { userId: ctx.userId, name: { in: exerciseNames } },
				select: { name: true, note: true, repsOnly: true, maxReps: true, measure: true, distanceUnit: true }
			});
			const exerciseNotes = new Map(exercises.map((exercise) => [exercise.name, exercise.note]));
			const repsOnly = repsOnlySettings(exercises);
			workoutExercisesWithPreviousData.repsOnly = Object.fromEntries(repsOnly);
			const { measures, info: measureInfo } = measureSettings(exercises);
			workoutExercisesWithPreviousData.measures = measureInfo;

			// Suggestions are worked out in kg and metres, then shown in each exercise's units
			workoutExercisesWithPreviousData.todaysWorkoutExercises = progressiveOverloadMagic(
				plan,
				weekNumber,
				input.userBodyweight,
				exerciseHistory,
				mode,
				weightSets,
				repsOnly,
				measures
			).map((exercise) => ({
				...convertExerciseDistances(
					convertExerciseLoads(exercise, 'toDisplay'),
					'toDisplay',
					measureInfo[exercise.name]?.distanceUnit
				),
				// The exercise's own note, shown with the routine's note
				exerciseNote: exerciseNotes.get(exercise.name) ?? null
			}));

			// "Previous" for comparisons: the last time each of today's exercises was done, with the same
			// kind of load (levels or weights) and measured the same way
			const lastPerformances = exerciseNames
				.map((name) =>
					comparablePerformances(
						exerciseHistory[name] ?? [],
						unitByExerciseName.get(name),
						measures.get(name) ?? 'Reps'
					).at(-1)
				)
				.filter((performance) => performance !== undefined);
			if (lastPerformances.length > 0) {
				workoutExercisesWithPreviousData.previousWorkoutData = {
					// In today's unit for each exercise, so it compares like with like
					exercises: lastPerformances.map(({ exercise }) => {
						const weightUnit = unitByExerciseName.get(exercise.name) ?? exercise.weightUnit;
						return convertExerciseLoads({ ...exercise, weightUnit }, 'toDisplay');
					}),
					userBodyweight: lastPerformances.at(-1)!.oldUserBodyweight
				};
			}

			return workoutExercisesWithPreviousData;
		}),

	/**
	 * Suggested sets for an exercise added during a workout, from the last times it was done (in the
	 * exercise's unit; null when it hasn't been done before), and whether it's reps only
	 */
	suggestSets: t.procedure
		.input(
			z.strictObject({
				exerciseName: z.string(),
				sets: z.number().int().min(1).max(30),
				setType: SetTypeSchema,
				repRangeStart: z.number().int(),
				repRangeEnd: z.number().int(),
				topRepRangeStart: z.number().int().nullish(),
				topRepRangeEnd: z.number().int().nullish(),
				changeType: ChangeTypeSchema.nullish(),
				changeAmount: z.number().nullish(),
				weightUnit: z.enum(['KG', 'LB', 'LEVEL']),
				weightSetId: z.string().nullish(),
				userBodyweight: z.number().positive()
			})
		)
		.query(async ({ ctx, input }) => {
			const exercise = await prisma.exercise.findUnique({
				where: { userId_name: { userId: ctx.userId, name: input.exerciseName } }
			});
			if (!exercise) return null;
			const [history, block, weightSets] = await Promise.all([
				getExerciseHistory(ctx.userId, [exercise.id]),
				prisma.mesocycle.findFirst({ where: { userId: ctx.userId, startDate: { not: null }, endDate: null } }),
				userWeightSets(ctx.userId)
			]);
			const settings = {
				repsOnly: exercise.repsOnly,
				maxReps: exercise.maxReps,
				measure: exercise.measure,
				distanceUnit: exercise.distanceUnit
			};
			const { measures } = measureSettings([exercise]);
			const lastPerformance = comparablePerformances(
				history[exercise.name] ?? [],
				input.weightUnit,
				exercise.measure
			).at(-1);
			if (!lastPerformance) return { ...settings, sets: null, previous: null };
			// The last time it was done, in today's unit, for the workout's "Previous" column
			const previous: { exercise: WorkoutExerciseWithSets; userBodyweight: number } = {
				exercise: convertExerciseLoads({ ...lastPerformance.exercise, weightUnit: input.weightUnit }, 'toDisplay'),
				userBodyweight: lastPerformance.oldUserBodyweight
			};

			// The current block's effort and overload settings, else steady defaults
			const weekNumber = block?.startDate ? getBlockWeek(block.startDate) : 1;
			const plan: ProgressionPlan = {
				settings: {
					weeklyRIR: block?.weeklyRIR ?? [...NO_BLOCK_PROGRESSION.weeklyRIR],
					startOverloadPercentage: block?.startOverloadPercentage ?? NO_BLOCK_PROGRESSION.startOverloadPercentage,
					lastSetToFailure: block?.lastSetToFailure ?? NO_BLOCK_PROGRESSION.lastSetToFailure,
					forceRIRMatching: block?.forceRIRMatching ?? NO_BLOCK_PROGRESSION.forceRIRMatching
				},
				exercises: [
					{
						exerciseId: exercise.id,
						name: exercise.name,
						targetMuscleGroup: exercise.targetMuscleGroup,
						customMuscleGroup: exercise.customMuscleGroup,
						bodyweightFraction: exercise.bodyweightFraction,
						note: null,
						sets: input.sets,
						setType: input.setType,
						repRangeStart: input.repRangeStart,
						repRangeEnd: input.repRangeEnd,
						topRepRangeStart: input.topRepRangeStart ?? null,
						topRepRangeEnd: input.topRepRangeEnd ?? null,
						changeType: input.changeType ?? null,
						changeAmount: input.changeAmount ?? null,
						overloadPercentage: null,
						lastSetToFailure: null,
						forceRIRMatching: null,
						minimumWeightChange: null,
						weightUnit: input.weightUnit,
						weightSetId: input.weightSetId ?? null
					}
				]
			};
			const mode: ProgressionMode = block && isDeloadWeek(block.weeklyRIR, weekNumber) ? 'deload' : 'normal';
			const [suggestion] = progressiveOverloadMagic(
				plan,
				weekNumber,
				input.userBodyweight,
				history,
				mode,
				weightSets,
				repsOnlySettings([exercise]),
				measures
			);
			const shown = convertExerciseDistances(
				convertExerciseLoads(suggestion, 'toDisplay'),
				'toDisplay',
				exercise.distanceUnit
			);
			return { ...settings, sets: shown.sets, previous };
		}),

	create: t.procedure.input(createWorkoutSchema).mutation(async ({ ctx, input }) => {
		await assertSetsMatchMeasures(ctx.userId, input);
		const startedAt = new Date(input.workoutData.startedAt ?? new Date());
		const routineName = routineNameOf(input.workoutData);
		const workout: Prisma.WorkoutUncheckedCreateInput = {
			id: createId(),
			userId: ctx.userId,
			startedAt,
			endedAt: newWorkoutEnd(startedAt, input.workoutData.endedAt),
			userBodyweight: input.workoutData.userBodyweight,
			note: input.workoutData.note,
			routineName
		};

		const { workoutOfMesocycle } = input.workoutData;
		if (workoutOfMesocycle) {
			// Only one of the user's own blocks
			const mesocycle = await prisma.mesocycle.findFirst({
				where: { id: workoutOfMesocycle.mesocycle.id, userId: ctx.userId },
				select: { id: true }
			});
			if (!mesocycle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Block not found' });
			workout.isDeload = await isInDeloadWeek(ctx.userId, workoutOfMesocycle.mesocycle.id, workout.startedAt);
			workout.workoutOfMesocycle = {
				create: { mesocycleId: workoutOfMesocycle.mesocycle.id }
			};
		}

		// Exercises as they are: their details change only on the Exercises page
		const { byName, syncQueries } = await resolveExercises(ctx.userId, withMeasureHints(input), {
			restore: false
		});
		const workoutExercises: Prisma.WorkoutExerciseUncheckedCreateInput[] = input.workoutExercises.map((ex) => ({
			...linkToExercise(ex, byName),
			workoutId: workout.id as string,
			id: createId()
		}));

		const workoutExercisesSets: Prisma.WorkoutExerciseSetUncheckedCreateInput[] = input.workoutExercisesSets.flatMap(
			(sets, exerciseIdx) =>
				sets.map((set) => ({
					...set,
					id: createId(),
					workoutExerciseId: workoutExercises[exerciseIdx].id as string
				}))
		);

		let setIndex = 0;
		const workoutExercisesMiniSets: Prisma.WorkoutExerciseMiniSetUncheckedCreateInput[] =
			input.workoutExercisesMiniSets.flatMap((sets) =>
				sets.flatMap((miniSets) => {
					const mappedMiniSets = miniSets.map((miniSet) => ({
						...miniSet,
						workoutExerciseSetId: workoutExercisesSets[setIndex].id as string
					}));
					setIndex += 1;
					return mappedMiniSets;
				})
			);

		const transactionQueries: PrismaPromise<unknown>[] = [
			prisma.workout.create({ data: workout }),
			prisma.workoutExercise.createMany({ data: workoutExercises }),
			prisma.workoutExerciseSet.createMany({ data: workoutExercisesSets }),
			prisma.workoutExerciseMiniSet.createMany({ data: workoutExercisesMiniSets }),
			...syncQueries
		];

		await prisma.$transaction(transactionQueries);
		return { message: 'Workout created successfully', workoutId: workout.id as string };
	}),

	editById: t.procedure
		.input(
			z.strictObject({
				id: z.string().cuid2(),
				data: createWorkoutSchema,
				endedAt: z.date().or(z.string().datetime())
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Times are the user's to correct, as given; the routine it was done from stays as saved
			const existing = await prisma.workout.findFirst({
				where: { id: input.id, userId: ctx.userId },
				select: { routineName: true }
			});
			if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workout not found' });
			await assertSetsMatchMeasures(ctx.userId, input.data);
			const workout: Prisma.WorkoutUncheckedCreateInput = {
				id: input.id,
				userId: ctx.userId,
				startedAt: input.data.workoutData.startedAt!,
				endedAt: input.endedAt,
				userBodyweight: input.data.workoutData.userBodyweight,
				note: input.data.workoutData.note,
				routineName: existing.routineName
			};

			const workoutOfMesocycle = await prisma.workoutOfMesocycle.findFirst({
				where: { workoutId: input.id, workout: { userId: ctx.userId } }
			});
			if (workoutOfMesocycle) {
				workout.isDeload = await isInDeloadWeek(ctx.userId, workoutOfMesocycle.mesocycleId, workout.startedAt);
			}

			const { byName, syncQueries } = await resolveExercises(ctx.userId, withMeasureHints(input.data), {
				restore: false
			});
			const workoutExercises: Prisma.WorkoutExerciseUncheckedCreateInput[] = input.data.workoutExercises.map((ex) => ({
				...linkToExercise(ex, byName),
				workoutId: workout.id as string,
				id: createId()
			}));

			const workoutExercisesSets: Prisma.WorkoutExerciseSetUncheckedCreateInput[] =
				input.data.workoutExercisesSets.flatMap((sets, exerciseIdx) =>
					sets.map((set) => ({
						...set,
						id: createId(),
						workoutExerciseId: workoutExercises[exerciseIdx].id as string
					}))
				);

			let setIndex = 0;
			const workoutExercisesMiniSets: Prisma.WorkoutExerciseMiniSetUncheckedCreateInput[] =
				input.data.workoutExercisesMiniSets.flatMap((sets) =>
					sets.flatMap((miniSets) => {
						const mappedMiniSets = miniSets.map((miniSet) => ({
							...miniSet,
							workoutExerciseSetId: workoutExercisesSets[setIndex].id as string
						}));
						setIndex += 1;
						return mappedMiniSets;
					})
				);

			const transactionQueries = [
				prisma.workout.delete({ where: { id: input.id, userId: ctx.userId } }),
				prisma.workout.create({ data: workout }),
				prisma.workoutExercise.createMany({ data: workoutExercises }),
				prisma.workoutExerciseSet.createMany({ data: workoutExercisesSets }),
				prisma.workoutExerciseMiniSet.createMany({ data: workoutExercisesMiniSets }),
				...(workoutOfMesocycle ? [prisma.workoutOfMesocycle.create({ data: workoutOfMesocycle })] : []),
				...syncQueries
			];

			await prisma.$transaction(transactionQueries);
			return { message: 'Workout edited successfully' };
		}),

	getExerciseHistory: t.procedure
		.input(
			z.strictObject({
				exerciseName: z.string(),
				cursorId: z.string().cuid2().optional(),
				// 1 to 100 (0 would read as the end, and a negative take reverses the order); 10 by default
				pageSize: z.number().int().min(1).max(100).optional()
			})
		)
		.query(async ({ ctx, input }) => {
			return await prisma.workoutExercise.findMany({
				where: { workout: { userId: ctx.userId }, name: input.exerciseName },
				include: {
					workout: {
						select: {
							startedAt: true,
							userBodyweight: true,
							routineName: true,
							workoutOfMesocycle: { select: { mesocycle: { select: { name: true } } } }
						}
					},
					sets: { include: { miniSets: true }, orderBy: { setIndex: 'asc' } },
					// Reps-only exercises are charted by their reps; cardio by its time, distance and pace
					exercise: { select: { repsOnly: true, measure: true, distanceUnit: true } }
				},
				cursor: input.cursorId !== undefined ? { id: input.cursorId } : undefined,
				skip: input.cursorId !== undefined ? 1 : 0,
				take: input.pageSize ?? 10,
				// Ties broken by id, so the pages never repeat or skip one
				orderBy: [{ workout: { startedAt: 'desc' } }, { id: 'desc' }]
			});
		}),

	getUserExercises: t.procedure.input(z.enum(['minimal', 'extensive'])).query(async ({ ctx, input }) => {
		if (input === 'extensive') {
			return prisma.workoutExercise.findMany({
				where: { workout: { userId: ctx.userId } },
				distinct: ['name'],
				orderBy: { workout: { startedAt: 'desc' } }
			});
		}

		// Names from logged workouts (most recent first), then ones only used in routines so far
		// Fields shared by logged exercises and routine exercises, so picking one pre-fills its settings
		const select = {
			name: true,
			targetMuscleGroup: true,
			customMuscleGroup: true,
			bodyweightFraction: true,
			setType: true,
			repRangeStart: true,
			repRangeEnd: true,
			changeType: true,
			changeAmount: true,
			note: true,
			topRepRangeStart: true,
			topRepRangeEnd: true
		} as const;
		const [workoutExercises, splitExercises] = await Promise.all([
			prisma.workoutExercise.findMany({
				where: { workout: { userId: ctx.userId } },
				distinct: ['name'],
				orderBy: { workout: { startedAt: 'desc' } },
				select
			}),
			prisma.exerciseTemplate.findMany({
				where: { exerciseSplitDay: { exerciseSplit: { userId: ctx.userId } } },
				distinct: ['name'],
				select
			})
		]);

		const seenNames = new Set<string>();
		return [...workoutExercises, ...splitExercises].filter((exercise) => {
			if (seenNames.has(exercise.name)) return false;
			seenNames.add(exercise.name);
			return true;
		});
	})
});
