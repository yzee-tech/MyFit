import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { isLevelUnit, resolveExerciseUnit } from '$lib/utils/weightUnits';
import { ownUnit, routineChanges } from '$lib/utils/routineChanges';
import { linkToExercise, resolveExercises } from '$lib/server/exercises';
import { syncBlockFromRoutines, withRoutinesTransaction } from '$lib/server/blockCache';
import { routineSetCount } from '$lib/utils/routineSets';
import {
	comparablePerformances,
	convertExerciseLoads,
	getBlockWeek,
	isDeloadWeek,
	NO_BLOCK_PROGRESSION,
	progressiveOverloadMagic,
	type RepsOnlySettings,
	type ProgressionMode,
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
	WorkoutStatus,
	type RoutineWeightUnit,
	type WeightUnit as WeightUnitType,
	type Mesocycle,
	type PrismaPromise,
	type WorkoutExercise,
	type WorkoutOfMesocycle
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { ignoreExerciseLink } from '$lib/trpc/exerciseLinkInput';
import { createId } from '@paralleldrive/cuid2';
import { levelSetOf, levelSetsFor, type WeightSetLike } from '$lib/utils/weightSets';
import { z } from 'zod';

type TodaysWorkoutData = {
	startedAt: Date | string;
	endedAt: Date | string | null;
	userBodyweight: number | null;
	workoutExercises: Pick<WorkoutExercise, 'name' | 'targetMuscleGroup' | 'customMuscleGroup'>[];
	workoutOfMesocycle?: Pick<WorkoutOfMesocycle, 'workoutStatus' | 'splitDayIndex'> & {
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
	/** Its position in the active block; none for a routine of My routines picked with no block */
	splitDayIndex?: number;
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
/** A gym's weights, and each machine's levels (from its exercise) */
async function userWeightSets(userId: string): Promise<WeightSetLike[]> {
	const [weightSets, levelExercises] = await Promise.all([
		prisma.weightSet.findMany({
			where: { userId, unit: { not: 'LEVEL' } },
			select: { id: true, name: true, unit: true, weights: true, isAssistance: true }
		}),
		prisma.exercise.findMany({
			where: { userId, levelsFrom: { not: null } },
			select: { id: true, name: true, levelsFrom: true, levelsTo: true, levelStep: true }
		})
	]);
	return [...weightSets, ...levelSetsFor(levelExercises)];
}

function repsOnlySettings(exercises: { name: string; repsOnly: boolean; maxReps: number | null }[]): RepsOnlySettings {
	return new Map(
		exercises.filter((exercise) => exercise.repsOnly).map((exercise) => [exercise.name, exercise.maxReps])
	);
}

type WorkoutExercisesWithPreviousData = {
	todaysWorkoutExercises: WorkoutExerciseInProgress[];
	/** Today's reps-only exercises by name, with their rep cap (null for none) */
	repsOnly: Record<string, number | null>;
	previousWorkoutData: null | {
		exercises: WorkoutExerciseWithSets[];
		userBodyweight: number;
	};
};

const createActiveMesocycleWithProgressionDataInclude = () =>
	Prisma.validator<Prisma.MesocycleInclude>()({
		mesocycleExerciseSplitDays: {
			include: { mesocycleSplitDayExercises: { orderBy: { exerciseIndex: 'asc' } } },
			orderBy: { dayIndex: 'asc' }
		}
	});

export type ActiveMesocycleWithProgressionData = Prisma.MesocycleGetPayload<{
	include: ReturnType<typeof createActiveMesocycleWithProgressionDataInclude>;
}>;

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
	const pastExercises = await prisma.workoutExercise.findMany({
		where: { exerciseId: { in: exerciseIds }, workout: { userId, isDeload: false } },
		include: {
			sets: { include: { miniSets: { orderBy: { miniSetIndex: 'asc' } } }, orderBy: { setIndex: 'asc' } },
			workout: { select: { userBodyweight: true } }
		},
		orderBy: { workout: { startedAt: 'desc' } }
	});

	const history: ExerciseHistory = {};
	for (const { workout, ...exercise } of pastExercises) {
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
	/** The routine of My routines a workout outside a block is done from (a block's is looked up) */
	routineName: z.string().trim().min(1).max(100).nullish(),
	userBodyweight: z.number(),
	workoutOfMesocycle: z
		.object({
			mesocycle: z.object({ id: z.string().cuid2() }),
			splitDayIndex: z.number().int(),
			workoutStatus: z.nativeEnum(WorkoutStatus).nullable()
		})
		.optional(),
	note: z.string().optional()
});

const createWorkoutSchema = z.strictObject({
	workoutData: workoutInputDataSchema,
	workoutExercises: z.array(ignoreExerciseLink(WorkoutExerciseCreateWithoutWorkoutInputSchema)),
	workoutExercisesSets: z.array(z.array(WorkoutExerciseSetCreateWithoutWorkoutExerciseInputSchema)),
	workoutExercisesMiniSets: z.array(z.array(z.array(WorkoutExerciseMiniSetCreateWithoutParentSetInputSchema))),
	/** Also save the workout's changes to its routine in My routines (the block follows) */
	updateRoutine: z.boolean().optional()
});

/**
 * The name of the routine a workout is done from: a block workout's from its block routine (whatever
 * the client says), else the one given; none for a blank workout
 */
async function workoutRoutineName(userId: string, workoutData: z.infer<typeof workoutInputDataSchema>) {
	const { workoutOfMesocycle } = workoutData;
	if (!workoutOfMesocycle) return workoutData.routineName ?? null;
	const blockRoutine = await prisma.mesocycleExerciseSplitDay.findFirst({
		where: {
			mesocycleId: workoutOfMesocycle.mesocycle.id,
			dayIndex: workoutOfMesocycle.splitDayIndex,
			mesocycle: { userId }
		},
		select: { name: true }
	});
	if (!blockRoutine) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Routine of the active block not found' });
	return blockRoutine.name;
}

/** The routine in My routines a workout is from (by name), if it's still there */
async function findWorkoutRoutine(userId: string, routineName: string | null) {
	if (routineName === null) return null;
	return prisma.exerciseSplitDay.findFirst({
		where: { exerciseSplit: { userId }, name: routineName, isRestDay: false },
		include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
	});
}

type WorkoutRoutine = NonNullable<Awaited<ReturnType<typeof findWorkoutRoutine>>>;

/** A new workout's end time: the one given (its last ticked set), kept between its start and now */
function newWorkoutEnd(startedAt: Date, endedAt: Date | string | undefined) {
	const now = new Date();
	if (endedAt === undefined) return now;
	const end = new Date(endedAt);
	if (isNaN(end.getTime())) return now;
	return new Date(Math.min(Math.max(end.getTime(), startedAt.getTime()), now.getTime()));
}

/** A routine's exercises as a plan, each with its set count (the usual 3 where none is set) */
function routinePlan(routine: WorkoutRoutine) {
	return routine.exercises.map((exercise) => ({ ...exercise, sets: routineSetCount(exercise.sets) }));
}

/**
 * The routine as this workout did it: its exercises in order, each with the sets done (skipped ones
 * too: skipping keeps the plan; in a deload, the routine's own counts) and its settings. "Ask each time" routines keep their own weight sets
 * and units, as those are picked again each workout.
 */
function workoutAsRoutine(input: z.infer<typeof createWorkoutSchema>, routine: WorkoutRoutine, deload: boolean) {
	const plan = routinePlan(routine);
	const routineWeightSetIds = new Map(plan.map((ex) => [ex.name, ex.weightSetId]));
	// A deload halves the sets on purpose: the routine keeps its own counts
	const routineSets = new Map(plan.map((ex) => [ex.name, ex.sets]));
	return input.workoutExercises.map((ex, exerciseIndex) => ({
		name: ex.name,
		exerciseIndex,
		targetMuscleGroup: ex.targetMuscleGroup,
		customMuscleGroup: ex.customMuscleGroup ?? null,
		bodyweightFraction: ex.bodyweightFraction ?? null,
		sets: (deload ? routineSets.get(ex.name) : undefined) ?? input.workoutExercisesSets[exerciseIndex]?.length ?? 0,
		setType: ex.setType,
		repRangeStart: ex.repRangeStart,
		repRangeEnd: ex.repRangeEnd,
		topRepRangeStart: ex.topRepRangeStart ?? null,
		topRepRangeEnd: ex.topRepRangeEnd ?? null,
		changeType: ex.changeType ?? null,
		changeAmount: ex.changeAmount ?? null,
		note: ex.note ?? null,
		overloadPercentage: ex.overloadPercentage ?? null,
		lastSetToFailure: ex.lastSetToFailure ?? null,
		forceRIRMatching: ex.forceRIRMatching ?? null,
		minimumWeightChange: ex.minimumWeightChange ?? null,
		weightUnit: ownUnit(ex.weightUnit, routine.weightUnit),
		weightSetId: routine.weightUnit === 'ASK' ? (routineWeightSetIds.get(ex.name) ?? null) : (ex.weightSetId ?? null)
	}));
}

/** Today's routine in the active block, with the block's progression settings */
async function findBlockRoutineForWorkout(userId: string, splitDayIndex: number) {
	const data: ActiveMesocycleWithProgressionData | null = await prisma.mesocycle.findFirst({
		where: { userId, startDate: { not: null }, endDate: null },
		include: createActiveMesocycleWithProgressionDataInclude()
	});
	const routine = data?.mesocycleExerciseSplitDays.find((splitDay) => splitDay.dayIndex === splitDayIndex);
	if (!data || !routine || routine.isRestDay) return null;
	return { data, splitDayIndex, weekNumber: getBlockWeek(data.startDate!), inBlock: true };
}

/**
 * A routine of My routines for a workout outside a block, as a stand-in block holding just that
 * routine, with steady progression settings
 */
async function findMyRoutineForWorkout(userId: string, routineName: string) {
	const routine = await prisma.exerciseSplitDay.findFirst({
		where: { exerciseSplit: { userId }, name: routineName, isRestDay: false },
		include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
	});
	if (!routine) return null;
	const data: ActiveMesocycleWithProgressionData = {
		id: 'my-routines',
		name: '',
		userId,
		exerciseSplitId: null,
		weeklyRIR: [...NO_BLOCK_PROGRESSION.weeklyRIR],
		startDate: new Date(),
		endDate: null,
		startOverloadPercentage: NO_BLOCK_PROGRESSION.startOverloadPercentage,
		lastSetToFailure: NO_BLOCK_PROGRESSION.lastSetToFailure,
		forceRIRMatching: NO_BLOCK_PROGRESSION.forceRIRMatching,
		mesocycleExerciseSplitDays: [
			{
				id: routine.id,
				name: routine.name,
				dayIndex: 0,
				isRestDay: false,
				hidden: false,
				weightUnit: routine.weightUnit,
				mesocycleId: 'my-routines',
				mesocycleSplitDayExercises: routine.exercises.map(({ exerciseSplitDayId, sets, ...exercise }) => ({
					...exercise,
					sets: routineSetCount(sets),
					mesocycleExerciseSplitDayId: routine.id
				}))
			}
		]
	};
	return { data, splitDayIndex: 0, weekNumber: 1, inBlock: false };
}

const loadWorkoutsSchema = z.strictObject({
	cursorId: z.string().cuid2().optional(),
	filters: z
		.object({
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			selectedWorkoutStatuses: z.array(z.union([z.literal('RestDay'), z.literal('Skipped'), z.null()])).optional(),
			selectedMesocycles: z.array(z.union([z.string(), z.null()])).optional()
		})
		.optional()
});

export const workouts = t.router({
	load: t.procedure.input(loadWorkoutsSchema).query(async ({ input, ctx }) => {
		let whereClause: Prisma.WorkoutWhereInput = { userId: ctx.userId };
		const andConditions: Prisma.WorkoutWhereInput['AND'] = [];
		const { filters } = input;

		if (filters?.startDate) {
			whereClause = { ...whereClause, startedAt: { gte: filters.startDate } };
		}

		if (filters?.endDate) {
			const endDate = new Date(Number(filters.endDate) + 1000 * 60 * 60 * 24);
			whereClause = { ...whereClause, startedAt: { lte: endDate } };
		}

		if (filters?.selectedWorkoutStatuses) {
			const orClause: Prisma.WorkoutWhereInput['OR'] = [
				{ workoutOfMesocycle: { workoutStatus: { in: filters.selectedWorkoutStatuses.filter((m) => m !== null) } } }
			];

			if (filters.selectedWorkoutStatuses.includes(null)) {
				orClause.push({ workoutOfMesocycle: { workoutStatus: { equals: null } } });
				orClause.push({ workoutOfMesocycle: null });
			}

			andConditions.push({ OR: orClause });
		}

		if (filters?.selectedMesocycles) {
			const orClause: Prisma.WorkoutWhereInput['OR'] = [
				{ workoutOfMesocycle: { mesocycle: { name: { in: filters.selectedMesocycles.filter((m) => m !== null) } } } }
			];

			if (filters.selectedMesocycles.includes(null)) {
				orClause.push({ workoutOfMesocycle: null });
			}

			andConditions.push({ OR: orClause });
		}

		whereClause = { ...whereClause, AND: andConditions };

		return prisma.workout.findMany({
			where: whereClause,
			orderBy: { startedAt: 'desc' },
			include: {
				workoutOfMesocycle: {
					include: {
						mesocycle: {
							select: {
								id: true,
								name: true,
								mesocycleExerciseSplitDays: {
									select: { name: true },
									orderBy: { dayIndex: 'asc' }
								}
							}
						}
					}
				}
			},
			cursor: input.cursorId !== undefined ? { id: input.cursorId } : undefined,
			skip: input.cursorId !== undefined ? 1 : 0,
			take: 10
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
			select: { name: true, startDate: true, endDate: true }
		});

		return { firstWorkoutDate, lastWorkoutDate, allMesocycles };
	}),

	findById: t.procedure.input(z.string().cuid2()).query(({ input, ctx }) =>
		prisma.workout.findUnique({
			where: { id: input, userId: ctx.userId },
			include: {
				workoutOfMesocycle: {
					include: {
						mesocycle: {
							include: {
								mesocycleExerciseSplitDays: { select: { name: true }, orderBy: { dayIndex: 'asc' } }
							}
						}
					}
				},
				workoutExercises: {
					orderBy: { exerciseIndex: 'asc' },
					include: {
						sets: { include: { miniSets: { orderBy: { miniSetIndex: 'asc' } } }, orderBy: { setIndex: 'asc' } }
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

		const data = await prisma.mesocycle.findFirst({
			where: { userId: ctx.userId, startDate: { not: null }, endDate: null },
			include: {
				mesocycleExerciseSplitDays: {
					include: {
						mesocycleSplitDayExercises: {
							select: { name: true, targetMuscleGroup: true, customMuscleGroup: true },
							orderBy: { exerciseIndex: 'asc' }
						}
					},
					orderBy: { dayIndex: 'asc' }
				},
				workoutsOfMesocycle: {
					select: { splitDayIndex: true, workout: { select: { startedAt: true } } },
					orderBy: { workout: { startedAt: 'desc' } }
				}
			}
		});
		if (data === null) {
			// No block: pick from My routines; "last done" from workouts done from each routine (by name)
			const [myRoutines, lastDone] = await Promise.all([
				prisma.exerciseSplitDay.findMany({
					where: { exerciseSplit: { userId: ctx.userId }, isRestDay: false },
					orderBy: { dayIndex: 'asc' },
					select: {
						name: true,
						weightUnit: true,
						exercises: {
							select: { name: true, targetMuscleGroup: true, customMuscleGroup: true },
							orderBy: { exerciseIndex: 'asc' }
						}
					}
				}),
				prisma.workout.groupBy({
					by: ['routineName'],
					where: { userId: ctx.userId, routineName: { not: null } },
					_max: { startedAt: true }
				})
			]);
			todaysWorkoutData.myRoutines = myRoutines.map((routine) => ({
				name: routine.name,
				weightUnit: routine.weightUnit,
				workoutExercises: routine.exercises,
				lastDoneAt: lastDone.find((row) => row.routineName === routine.name)?._max.startedAt ?? null
			}));
			return todaysWorkoutData;
		}

		const { mesocycleExerciseSplitDays, workoutsOfMesocycle, ...mesocycle } = data;
		const weekNumber = getBlockWeek(mesocycle.startDate!);
		const totalWeeks = mesocycle.weeklyRIR.length;

		// The block's routines are a copy of My routines: in their order, without ones no longer there
		const myRoutineNames = (
			await prisma.exerciseSplitDay.findMany({
				where: { exerciseSplit: { userId: ctx.userId }, isRestDay: false },
				orderBy: { dayIndex: 'asc' },
				select: { name: true }
			})
		).map((routine) => routine.name);
		const routines: RoutineOption[] = mesocycleExerciseSplitDays
			.filter((splitDay) => !splitDay.isRestDay && !splitDay.hidden)
			.sort((a, b) => myRoutineNames.indexOf(a.name) - myRoutineNames.indexOf(b.name))
			.map((splitDay) => ({
				splitDayIndex: splitDay.dayIndex,
				name: splitDay.name,
				weightUnit: splitDay.weightUnit,
				workoutExercises: splitDay.mesocycleSplitDayExercises,
				lastDoneAt: workoutsOfMesocycle.find((wm) => wm.splitDayIndex === splitDay.dayIndex)?.workout.startedAt ?? null
			}));

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
				/** A routine of the active block, by its position... */
				splitDayIndex: z.number().int().optional(),
				/** ...or, with no block, a routine of My routines, by its name */
				routineName: z.string().trim().min(1).max(100).optional(),
				welcomeBack: z.boolean().optional(),
				/** Unit chosen at the start of the workout, for routines set to "ask each time" */
				sessionUnit: z.enum(['KG', 'LB']).optional(),
				/** Weights this gym has, for routines set to "ask each time" */
				sessionWeightSetId: z.string().cuid2().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			if ((input.splitDayIndex === undefined) === (input.routineName === undefined)) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Give a block routine or a routine name, not both' });
			}
			const workoutExercisesWithPreviousData: WorkoutExercisesWithPreviousData = {
				todaysWorkoutExercises: [],
				repsOnly: {},
				previousWorkoutData: null
			};
			const today =
				input.splitDayIndex !== undefined
					? await findBlockRoutineForWorkout(ctx.userId, input.splitDayIndex)
					: await findMyRoutineForWorkout(ctx.userId, input.routineName!);
			if (!today) return workoutExercisesWithPreviousData;
			const { data, splitDayIndex, weekNumber, inBlock } = today;
			const todaysSplitDay = data.mesocycleExerciseSplitDays.find((splitDay) => splitDay.dayIndex === splitDayIndex)!;

			const exerciseNames = todaysSplitDay.mesocycleSplitDayExercises.map((exercise) => exercise.name);
			const [exerciseHistory, userSettings, weightSets] = await Promise.all([
				getExerciseHistory(
					ctx.userId,
					todaysSplitDay.mesocycleSplitDayExercises.flatMap((exercise) => exercise.exerciseId ?? [])
				),
				prisma.userSettings.findUnique({ where: { userId: ctx.userId }, select: { homeWeightUnit: true } }),
				userWeightSets(ctx.userId)
			]);
			const weightSetById = new Map(weightSets.map((weightSet) => [weightSet.id, weightSet]));
			const askEachTime = todaysSplitDay.weightUnit === 'ASK';

			// Each exercise's unit: its own choice, else its weight set's (in a routine for one gym), else
			// the routine's, else the one picked for this workout
			const sessionUnit = input.sessionUnit ?? userSettings?.homeWeightUnit ?? 'KG';
			const sessionWeightSet = input.sessionWeightSetId ? weightSetById.get(input.sessionWeightSetId) : undefined;
			todaysSplitDay.mesocycleSplitDayExercises.forEach((exercise) => {
				// A machine with levels always uses its own levels
				const levels = levelSetOf(exercise.name, weightSets);
				const ownWeightSet = exercise.weightSetId ? weightSetById.get(exercise.weightSetId) : undefined;
				exercise.weightUnit = resolveExerciseUnit(
					exercise.weightUnit,
					todaysSplitDay.weightUnit,
					sessionUnit,
					levels ? 'LEVEL' : ownWeightSet?.unit
				);
				// At a gym picked for this workout, its weights apply unless the exercise has its own in this unit
				if (!levels && askEachTime && sessionWeightSet && ownWeightSet?.unit !== exercise.weightUnit) {
					exercise.weightSetId = sessionWeightSet.id;
				}
			});
			const unitByExerciseName = new Map(
				todaysSplitDay.mesocycleSplitDayExercises.map((exercise) => [exercise.name, exercise.weightUnit ?? 'KG'])
			);

			let mode: ProgressionMode = 'normal';
			if (inBlock && isDeloadWeek(data.weeklyRIR, weekNumber)) mode = 'deload';
			else if (input.welcomeBack) mode = 'welcomeBack';

			const exercises = await prisma.exercise.findMany({
				where: { userId: ctx.userId, name: { in: exerciseNames } },
				select: { name: true, note: true, repsOnly: true, maxReps: true }
			});
			const exerciseNotes = new Map(exercises.map((exercise) => [exercise.name, exercise.note]));
			const repsOnly = repsOnlySettings(exercises);
			workoutExercisesWithPreviousData.repsOnly = Object.fromEntries(repsOnly);

			// Suggestions are worked out in kg, then shown in each exercise's unit
			workoutExercisesWithPreviousData.todaysWorkoutExercises = progressiveOverloadMagic(
				data,
				weekNumber,
				input.userBodyweight,
				splitDayIndex,
				exerciseHistory,
				mode,
				weightSets,
				repsOnly
			).map((exercise) => ({
				...convertExerciseLoads(exercise, 'toDisplay'),
				// The exercise's own note, shown with the routine's note
				exerciseNote: exerciseNotes.get(exercise.name) ?? null
			}));

			// "Previous" for comparisons: the last time each of today's exercises was done, with the same
			// kind of load (levels or weights)
			const lastPerformances = exerciseNames
				.map((name) => comparablePerformances(exerciseHistory[name] ?? [], unitByExerciseName.get(name)).at(-1))
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
			const settings = { repsOnly: exercise.repsOnly, maxReps: exercise.maxReps };
			const lastPerformance = comparablePerformances(history[exercise.name] ?? [], input.weightUnit).at(-1);
			if (!lastPerformance) return { ...settings, sets: null, previous: null };
			// The last time it was done, in today's unit, for the workout's "Previous" column
			const previous: { exercise: WorkoutExerciseWithSets; userBodyweight: number } = {
				exercise: convertExerciseLoads({ ...lastPerformance.exercise, weightUnit: input.weightUnit }, 'toDisplay'),
				userBodyweight: lastPerformance.oldUserBodyweight
			};

			// The current block's effort and overload settings, else steady defaults
			const weekNumber = block?.startDate ? getBlockWeek(block.startDate) : 1;
			const mesocycle: ActiveMesocycleWithProgressionData = {
				id: 'suggestion',
				name: '',
				userId: ctx.userId,
				exerciseSplitId: null,
				weeklyRIR: block?.weeklyRIR ?? [...NO_BLOCK_PROGRESSION.weeklyRIR],
				startDate: block?.startDate ?? new Date(),
				endDate: null,
				startOverloadPercentage: block?.startOverloadPercentage ?? NO_BLOCK_PROGRESSION.startOverloadPercentage,
				lastSetToFailure: block?.lastSetToFailure ?? NO_BLOCK_PROGRESSION.lastSetToFailure,
				forceRIRMatching: block?.forceRIRMatching ?? NO_BLOCK_PROGRESSION.forceRIRMatching,
				mesocycleExerciseSplitDays: [
					{
						id: 'suggestion',
						name: '',
						dayIndex: 0,
						isRestDay: false,
						hidden: false,
						weightUnit: isLevelUnit(input.weightUnit) ? 'KG' : input.weightUnit,
						mesocycleId: 'suggestion',
						mesocycleSplitDayExercises: [
							{
								id: 'suggestion',
								mesocycleExerciseSplitDayId: 'suggestion',
								exerciseIndex: 0,
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
					}
				]
			};
			const mode: ProgressionMode = block && isDeloadWeek(block.weeklyRIR, weekNumber) ? 'deload' : 'normal';
			const [suggestion] = progressiveOverloadMagic(
				mesocycle,
				weekNumber,
				input.userBodyweight,
				0,
				history,
				mode,
				weightSets,
				repsOnlySettings([exercise])
			);
			return { ...settings, sets: convertExerciseLoads(suggestion, 'toDisplay').sets, previous };
		}),

	/**
	 * What a new workout changed about its routine's plan, for the "Update routine?" prompt. Read-only:
	 * a mutation only so the whole workout is POSTed rather than packed into a URL.
	 */
	previewRoutineChanges: t.procedure.input(createWorkoutSchema).mutation(async ({ ctx, input }) => {
		const { workoutOfMesocycle } = input.workoutData;
		// A skipped block workout keeps the plan; a blank workout has no routine
		if (workoutOfMesocycle && workoutOfMesocycle.workoutStatus !== null) return null;
		if (!workoutOfMesocycle && !input.workoutData.routineName) return null;
		const routine = await findWorkoutRoutine(ctx.userId, await workoutRoutineName(ctx.userId, input.workoutData));
		// Removed from My routines during the workout: nothing to update
		if (!routine) return null;
		const deload = workoutOfMesocycle
			? await isInDeloadWeek(ctx.userId, workoutOfMesocycle.mesocycle.id, input.workoutData.startedAt ?? new Date())
			: false;
		const changes = routineChanges(routinePlan(routine), workoutAsRoutine(input, routine, deload), {
			routineUnit: routine.weightUnit,
			deload
		});
		return { routineName: routine.name, changes };
	}),

	create: t.procedure.input(createWorkoutSchema).mutation(async ({ ctx, input }) => {
		const startedAt = new Date(input.workoutData.startedAt ?? new Date());
		const routineName = await workoutRoutineName(ctx.userId, input.workoutData);
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
			workout.isDeload = await isInDeloadWeek(ctx.userId, workoutOfMesocycle.mesocycle.id, workout.startedAt);
			workout.workoutOfMesocycle = {
				create: {
					mesocycleId: workoutOfMesocycle.mesocycle.id,
					splitDayIndex: workoutOfMesocycle.splitDayIndex,
					workoutStatus: workoutOfMesocycle.workoutStatus
				}
			};
		}

		// Exercises as they are: their details change only on the Exercises page
		const { byName, syncQueries, restoreIds } = await resolveExercises(ctx.userId, input.workoutExercises, {
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

		// Only when chosen: the routine in My routines becomes what this workout did, and the block follows
		const skipped = workoutOfMesocycle !== undefined && workoutOfMesocycle.workoutStatus !== null;
		const routine = input.updateRoutine && !skipped ? await findWorkoutRoutine(ctx.userId, routineName) : null;
		if (!routine) {
			await prisma.$transaction(transactionQueries);
			return { message: 'Workout created successfully', workoutId: workout.id as string };
		}

		const plan = workoutAsRoutine(input, routine, workout.isDeload ?? false).map((exercise) =>
			linkToExercise(exercise, byName)
		);
		await withRoutinesTransaction(async (tx) => {
			await tx.workout.create({ data: workout });
			await tx.workoutExercise.createMany({ data: workoutExercises });
			await tx.workoutExerciseSet.createMany({ data: workoutExercisesSets });
			await tx.workoutExerciseMiniSet.createMany({ data: workoutExercisesMiniSets });
			if (restoreIds.length > 0) {
				await tx.exercise.updateMany({ where: { id: { in: restoreIds } }, data: { archived: false } });
			}
			await tx.exerciseTemplate.deleteMany({ where: { exerciseSplitDayId: routine.id } });
			await tx.exerciseTemplate.createMany({
				data: plan.map((exercise) => ({ ...exercise, exerciseSplitDayId: routine.id }))
			});
			await syncBlockFromRoutines(tx, ctx.userId);
		});
		return { message: 'Workout created successfully', workoutId: workout.id as string };
	}),

	editById: t.procedure
		.input(
			z.strictObject({
				id: z.string().cuid2(),
				data: createWorkoutSchema,
				endedAt: z.date().or(z.string().date())
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Times are the user's to correct, as given; the routine it was done from stays as saved
			const existing = await prisma.workout.findFirst({
				where: { id: input.id, userId: ctx.userId },
				select: { routineName: true }
			});
			if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workout not found' });
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

			const { byName, syncQueries } = await resolveExercises(ctx.userId, input.data.workoutExercises, {
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
		.input(z.strictObject({ exerciseName: z.string(), cursorId: z.string().cuid2().optional() }))
		.query(async ({ ctx, input }) => {
			return await prisma.workoutExercise.findMany({
				where: { workout: { userId: ctx.userId }, name: input.exerciseName },
				include: {
					workout: {
						select: {
							startedAt: true,
							userBodyweight: true,
							routineName: true,
							workoutOfMesocycle: {
								select: {
									splitDayIndex: true,
									mesocycle: {
										select: {
											name: true,
											mesocycleExerciseSplitDays: {
												select: { name: true },
												orderBy: { dayIndex: 'asc' }
											}
										}
									}
								}
							}
						}
					},
					sets: { include: { miniSets: true }, orderBy: { setIndex: 'asc' } },
					// Reps-only exercises are charted by their reps
					exercise: { select: { repsOnly: true } }
				},
				cursor: input.cursorId !== undefined ? { id: input.cursorId } : undefined,
				skip: input.cursorId !== undefined ? 1 : 0,
				take: 10,
				orderBy: { workout: { startedAt: 'desc' } }
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
		const [workoutExercises, splitExercises, mesocycleExercises] = await Promise.all([
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
			}),
			prisma.mesocycleExerciseTemplate.findMany({
				where: { mesocycleExerciseSplitDay: { mesocycle: { userId: ctx.userId } } },
				distinct: ['name'],
				select
			})
		]);

		const seenNames = new Set<string>();
		return [...workoutExercises, ...splitExercises, ...mesocycleExercises].filter((exercise) => {
			if (seenNames.has(exercise.name)) return false;
			seenNames.add(exercise.name);
			return true;
		});
	})
});
