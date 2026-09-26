import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { resolveExerciseUnit } from '$lib/utils/weightUnits';
import { linkToExercise, resolveExercises } from '$lib/server/exercises';
import {
	convertExerciseLoads,
	getBlockWeek,
	isDeloadWeek,
	progressiveOverloadMagic,
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
	splitDayIndex: number;
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

type WorkoutExercisesWithPreviousData = {
	todaysWorkoutExercises: WorkoutExerciseInProgress[];
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
	workoutExercisesMiniSets: z.array(z.array(z.array(WorkoutExerciseMiniSetCreateWithoutParentSetInputSchema)))
});

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
		if (data === null) return todaysWorkoutData;

		const { mesocycleExerciseSplitDays, workoutsOfMesocycle, ...mesocycle } = data;
		const weekNumber = getBlockWeek(mesocycle.startDate!);
		const totalWeeks = mesocycle.weeklyRIR.length;

		const routines: RoutineOption[] = mesocycleExerciseSplitDays
			.filter((splitDay) => !splitDay.isRestDay)
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
				splitDayIndex: z.number().int(),
				welcomeBack: z.boolean().optional(),
				/** Unit chosen at the start of the workout, for routines set to "ask each time" */
				sessionUnit: z.enum(['KG', 'LB']).optional(),
				/** Weights this gym has, for routines set to "ask each time" */
				sessionWeightSetId: z.string().cuid2().optional()
			})
		)
		.query(async ({ ctx, input }) => {
			const { splitDayIndex } = input;
			const data: ActiveMesocycleWithProgressionData | null = await prisma.mesocycle.findFirst({
				where: {
					userId: ctx.userId,
					startDate: { not: null },
					endDate: null
				},
				include: createActiveMesocycleWithProgressionDataInclude()
			});

			const workoutExercisesWithPreviousData: WorkoutExercisesWithPreviousData = {
				todaysWorkoutExercises: [],
				previousWorkoutData: null
			};
			const todaysSplitDay = data?.mesocycleExerciseSplitDays[splitDayIndex];
			if (!data || !todaysSplitDay || todaysSplitDay.isRestDay) return workoutExercisesWithPreviousData;

			const exerciseNames = todaysSplitDay.mesocycleSplitDayExercises.map((exercise) => exercise.name);
			const [exerciseHistory, userSettings, weightSets] = await Promise.all([
				getExerciseHistory(
					ctx.userId,
					todaysSplitDay.mesocycleSplitDayExercises.flatMap((exercise) => exercise.exerciseId ?? [])
				),
				prisma.userSettings.findUnique({ where: { userId: ctx.userId }, select: { homeWeightUnit: true } }),
				prisma.weightSet.findMany({
					where: { userId: ctx.userId },
					select: { id: true, name: true, unit: true, weights: true, isAssistance: true }
				})
			]);
			const weightSetById = new Map(weightSets.map((weightSet) => [weightSet.id, weightSet]));
			const askEachTime = todaysSplitDay.weightUnit === 'ASK';

			// Each exercise's unit: its own choice, else its weight set's (in a routine for one gym), else
			// the routine's, else the one picked for this workout
			const sessionUnit = input.sessionUnit ?? userSettings?.homeWeightUnit ?? 'KG';
			const sessionWeightSet = input.sessionWeightSetId ? weightSetById.get(input.sessionWeightSetId) : undefined;
			todaysSplitDay.mesocycleSplitDayExercises.forEach((exercise) => {
				const ownWeightSet = exercise.weightSetId ? weightSetById.get(exercise.weightSetId) : undefined;
				exercise.weightUnit = resolveExerciseUnit(
					exercise.weightUnit,
					todaysSplitDay.weightUnit,
					sessionUnit,
					ownWeightSet?.unit
				);
				// At a gym picked for this workout, its weights apply unless the exercise has its own in this unit
				if (askEachTime && sessionWeightSet && ownWeightSet?.unit !== exercise.weightUnit) {
					exercise.weightSetId = sessionWeightSet.id;
				}
			});
			const unitByExerciseName = new Map(
				todaysSplitDay.mesocycleSplitDayExercises.map((exercise) => [exercise.name, exercise.weightUnit ?? 'KG'])
			);

			const weekNumber = getBlockWeek(data.startDate!);
			let mode: ProgressionMode = 'normal';
			if (isDeloadWeek(data.weeklyRIR, weekNumber)) mode = 'deload';
			else if (input.welcomeBack) mode = 'welcomeBack';

			const exerciseNotes = new Map(
				(
					await prisma.exercise.findMany({
						where: { userId: ctx.userId, name: { in: exerciseNames } },
						select: { name: true, note: true }
					})
				).map((exercise) => [exercise.name, exercise.note])
			);

			// Suggestions are worked out in kg, then shown in each exercise's unit
			workoutExercisesWithPreviousData.todaysWorkoutExercises = progressiveOverloadMagic(
				data,
				weekNumber,
				input.userBodyweight,
				splitDayIndex,
				exerciseHistory,
				mode,
				weightSets
			).map((exercise) => ({
				...convertExerciseLoads(exercise, 'toDisplay'),
				// The exercise's own note, shown with the routine's note
				exerciseNote: exerciseNotes.get(exercise.name) ?? null
			}));

			// "Previous" for comparisons: the last time each of today's exercises was done
			const lastPerformances = exerciseNames
				.map((name) => exerciseHistory[name]?.at(-1))
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
	 * Suggested sets for an exercise added during a workout, from the last times it was done
	 * (in the exercise's unit). Null when it hasn't been done before.
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
				weightUnit: z.enum(['KG', 'LB']),
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
				prisma.weightSet.findMany({
					where: { userId: ctx.userId },
					select: { id: true, name: true, unit: true, weights: true, isAssistance: true }
				})
			]);
			if (!history[exercise.name]?.length) return null;

			// The current block's effort and overload settings, else steady defaults
			const weekNumber = block?.startDate ? getBlockWeek(block.startDate) : 1;
			const mesocycle: ActiveMesocycleWithProgressionData = {
				id: 'suggestion',
				name: '',
				userId: ctx.userId,
				exerciseSplitId: null,
				weeklyRIR: block?.weeklyRIR ?? [2],
				startDate: block?.startDate ?? new Date(),
				endDate: null,
				startOverloadPercentage: block?.startOverloadPercentage ?? 2.5,
				lastSetToFailure: block?.lastSetToFailure ?? false,
				forceRIRMatching: block?.forceRIRMatching ?? false,
				mesocycleExerciseSplitDays: [
					{
						id: 'suggestion',
						name: '',
						dayIndex: 0,
						isRestDay: false,
						weightUnit: input.weightUnit,
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
				weightSets
			);
			return convertExerciseLoads(suggestion, 'toDisplay').sets;
		}),

	create: t.procedure.input(createWorkoutSchema).mutation(async ({ ctx, input }) => {
		const workout: Prisma.WorkoutUncheckedCreateInput = {
			id: createId(),
			userId: ctx.userId,
			startedAt: input.workoutData.startedAt ?? new Date(),
			endedAt: new Date(),
			userBodyweight: input.workoutData.userBodyweight,
			note: input.workoutData.note
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
		const { byName, syncQueries } = await resolveExercises(ctx.userId, input.workoutExercises, { restore: false });
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

		if (!workoutOfMesocycle) {
			await prisma.$transaction(transactionQueries);
			return { message: 'Workout created successfully' };
		}

		// Update the routine's exercises in the block according to this workout
		const mesocycleData = await prisma.mesocycle.findFirst({
			where: { id: workoutOfMesocycle.mesocycle.id, userId: ctx.userId },
			select: {
				mesocycleExerciseSplitDays: {
					select: {
						id: true,
						dayIndex: true,
						weightUnit: true,
						mesocycleSplitDayExercises: { select: { name: true, weightSetId: true } }
					}
				}
			}
		});
		const todaysSplitDay = mesocycleData?.mesocycleExerciseSplitDays.find(
			(splitDay) => splitDay.dayIndex === workoutOfMesocycle.splitDayIndex
		);
		if (!mesocycleData || !todaysSplitDay) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'Routine of the active block not found' });
		}

		if (workoutOfMesocycle.workoutStatus === null) {
			// Routines used at many gyms keep their own weight set links, not the gym picked for this workout
			const routineWeightSetIds = new Map(
				todaysSplitDay.mesocycleSplitDayExercises.map((exercise) => [exercise.name, exercise.weightSetId])
			);
			transactionQueries.push(
				prisma.mesocycleExerciseTemplate.deleteMany({
					where: { mesocycleExerciseSplitDayId: todaysSplitDay.id }
				}),
				prisma.mesocycleExerciseTemplate.createMany({
					data: workoutExercises.map((ex, exerciseIdx) => {
						// The exercise note lives on the exercise itself, not the routine
						const { workoutId, weightUnit, exerciseNote, ...exercise } = ex;
						// Remember an exercise's own unit (e.g. lb machines at a kg gym), but not for routines
						// used at many gyms, where the unit is picked again each workout
						const rememberedUnit =
							todaysSplitDay.weightUnit !== 'ASK' && weightUnit !== todaysSplitDay.weightUnit ? weightUnit : null;
						const weightSetId =
							todaysSplitDay.weightUnit === 'ASK' ? (routineWeightSetIds.get(ex.name) ?? null) : ex.weightSetId;
						return {
							...exercise,
							weightUnit: rememberedUnit,
							weightSetId,
							mesocycleExerciseSplitDayId: todaysSplitDay.id,
							sets: input.workoutExercisesSets[exerciseIdx].length
						};
					})
				})
			);
		}

		await prisma.$transaction(transactionQueries);
		const message = 'Workout created successfully';
		return { message };
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
			const workout: Prisma.WorkoutUncheckedCreateInput = {
				id: input.id,
				userId: ctx.userId,
				startedAt: input.data.workoutData.startedAt!,
				endedAt: input.endedAt,
				userBodyweight: input.data.workoutData.userBodyweight,
				note: input.data.workoutData.note
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
					sets: { include: { miniSets: true }, orderBy: { setIndex: 'asc' } }
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
