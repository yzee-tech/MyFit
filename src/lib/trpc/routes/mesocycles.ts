import { prisma } from '$lib/prisma';
import { z } from 'zod';
import { t } from '$lib/trpc/t';
import {
	ExerciseSplitDayCreateWithoutExerciseSplitInputSchema,
	ExerciseSplitSchema,
	MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema,
	MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema,
	MesocycleUncheckedCreateWithoutUserInputSchema,
	MesocycleUpdateInputSchema
} from '$lib/zodSchemas';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { TRPCError } from '@trpc/server';
import { ignoreExerciseLink } from '$lib/trpc/exerciseLinkInput';
import { linkToExercise, resolveExercises } from '$lib/server/exercises';

const zodMesocycleCreateInput = z.strictObject({
	mesocycle: MesocycleUncheckedCreateWithoutUserInputSchema,
	mesocycleCyclicSetChanges: z.array(MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),
	mesocycleExerciseTemplates: z.array(
		z.array(ignoreExerciseLink(MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema))
	),
	exerciseSplit: ExerciseSplitSchema.extend({
		exerciseSplitDays: z.array(ExerciseSplitDayCreateWithoutExerciseSplitInputSchema)
	}),
	startImmediately: z.boolean()
});

const zodMesocycleEditInput = z.strictObject({
	mesocycle: MesocycleUpdateInputSchema,
	mesocycleCyclicSetChanges: z.array(MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema)
});

const zodUpdateExerciseSplitInput = z.strictObject({
	mesocycleExerciseSplitDays: z.array(
		z.strictObject({
			name: z.string(),
			dayIndex: z.number().int(),
			isRestDay: z.boolean(),
			weightUnit: z.enum(['KG', 'LB', 'ASK']).optional(),
			/** Where this routine was before the edit; null for a new routine */
			previousDayIndex: z.number().int().nullable().optional()
		})
	),
	mesocycleExerciseTemplates: z.array(
		z.array(ignoreExerciseLink(MesocycleExerciseTemplateCreateWithoutMesocycleExerciseSplitDayInputSchema))
	),
	mesocycleId: z.string().cuid2()
});

const getActiveMesocycle = async (userId: string) => {
	return await prisma.mesocycle.findFirst({
		where: { userId, startDate: { not: null }, endDate: null },
		select: { name: true, id: true }
	});
};

export const mesocycles = t.router({
	findById: t.procedure.input(z.string().cuid2()).query(
		async ({ input, ctx }) =>
			await prisma.mesocycle.findUnique({
				where: { id: input, userId: ctx.userId },
				include: {
					exerciseSplit: true,
					mesocycleExerciseSplitDays: {
						include: { mesocycleSplitDayExercises: { orderBy: { exerciseIndex: 'asc' } } },
						orderBy: { dayIndex: 'asc' }
					},
					mesocycleCyclicSetChanges: true,
					workoutsOfMesocycle: {
						include: {
							workout: {
								include: {
									workoutExercises: { include: { sets: { include: { miniSets: true } } } }
								}
							}
						},
						orderBy: { workout: { startedAt: 'asc' } }
					}
				}
			})
	),

	findActiveMesocycle: t.procedure.query(async ({ ctx }) => {
		return await getActiveMesocycle(ctx.userId);
	}),

	load: t.procedure
		.input(z.object({ cursorId: z.string().cuid2().optional(), searchString: z.string().optional() }))
		.query(async ({ input, ctx }) => {
			return prisma.mesocycle.findMany({
				where: { userId: ctx.userId, name: { contains: input.searchString, mode: 'insensitive' } },
				orderBy: { id: 'desc' },
				cursor: input.cursorId !== undefined ? { id: input.cursorId } : undefined,
				skip: input.cursorId !== undefined ? 1 : 0,
				take: 10
			});
		}),

	create: t.procedure.input(zodMesocycleCreateInput).mutation(async ({ input, ctx }) => {
		const mesocycle: Prisma.MesocycleUncheckedCreateInput = {
			id: createId(),
			userId: ctx.userId,
			...input.mesocycle
		};

		if (input.startImmediately) {
			const activeMesocycle = await getActiveMesocycle(ctx.userId);
			if (activeMesocycle) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A mesocycle is already active' });
			mesocycle.startDate = new Date();
		}

		const mesocycleCyclicSetChanges: Prisma.MesocycleCyclicSetChangeUncheckedCreateInput[] =
			input.mesocycleCyclicSetChanges.map((setChange) => ({
				...setChange,
				mesocycleId: mesocycle.id as string
			}));

		const mesocycleExerciseSplitDays: Prisma.MesocycleExerciseSplitDayUncheckedCreateInput[] =
			input.exerciseSplit.exerciseSplitDays.map((splitDay) => ({
				...splitDay,
				mesocycleId: mesocycle.id as string,
				id: createId()
			}));

		// A block is a copy of a library: its exercises already exist and keep their details
		const { byName, syncQueries } = await resolveExercises(ctx.userId, input.mesocycleExerciseTemplates.flat(), 'link');
		const mesocycleExerciseTemplates: Prisma.MesocycleExerciseTemplateUncheckedCreateInput[] =
			input.mesocycleExerciseTemplates.flatMap((dayExercises, dayNumber) =>
				dayExercises.map((exercise) => ({
					...linkToExercise(exercise, byName),
					mesocycleExerciseSplitDayId: mesocycleExerciseSplitDays[dayNumber].id as string
				}))
			);

		const transactionQueries = [
			prisma.mesocycle.create({ data: mesocycle }),
			prisma.mesocycleCyclicSetChange.createMany({ data: mesocycleCyclicSetChanges }),
			prisma.mesocycleExerciseSplitDay.createMany({ data: mesocycleExerciseSplitDays }),
			prisma.mesocycleExerciseTemplate.createMany({ data: mesocycleExerciseTemplates }),
			...syncQueries
		];

		await prisma.$transaction(transactionQueries);
		return { message: 'Mesocycle created successfully' };
	}),

	editById: t.procedure
		.input(z.strictObject({ id: z.string().cuid2(), mesocycleData: zodMesocycleEditInput }))
		.mutation(async ({ input, ctx }) => {
			await prisma.$transaction(async () => {
				const mesocycle = await prisma.mesocycle.update({
					where: { id: input.id, userId: ctx.userId },
					data: { ...input.mesocycleData.mesocycle },
					select: { id: true }
				});
				await prisma.mesocycleCyclicSetChange.deleteMany({ where: { mesocycleId: mesocycle.id } });
				await prisma.mesocycleCyclicSetChange.createMany({
					data: input.mesocycleData.mesocycleCyclicSetChanges.map((setChange) => ({
						mesocycleId: mesocycle.id,
						...setChange
					}))
				});
			});
			return { message: 'Mesocycle edited successfully' };
		}),

	deleteById: t.procedure.input(z.string().cuid2()).mutation(async ({ input, ctx }) => {
		await prisma.mesocycle.delete({ where: { userId: ctx.userId, id: input } });
		return { message: 'Mesocycle deleted successfully' };
	}),

	progressToNextStage: t.procedure
		.input(
			z.strictObject({
				id: z.string().cuid2(),
				startDate: z.date().nullable(),
				endDate: z.date().nullable()
			})
		)
		.mutation(async ({ input, ctx }) => {
			const now = new Date();
			let updateClause: Prisma.MesocycleUpdateInput;
			if (!input.startDate) updateClause = { startDate: now };
			else if (!input.endDate) updateClause = { endDate: now };
			else throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mesocycle already completed' });

			if (!input.startDate) {
				const activeMesocycle = await getActiveMesocycle(ctx.userId);
				if (activeMesocycle) {
					throw new TRPCError({ code: 'BAD_REQUEST', message: 'A mesocycle is already active' });
				}
			}

			const updatedMesocycle = await prisma.mesocycle.update({
				where: { id: input.id, userId: ctx.userId },
				data: updateClause
			});
			return {
				message: `Mesocycle ${!input.startDate ? 'started' : 'stopped'} successfully`,
				startDate: updatedMesocycle.startDate,
				endDate: updatedMesocycle.endDate
			};
		}),

	updateExerciseSplit: t.procedure.input(zodUpdateExerciseSplitInput).mutation(async ({ input, ctx }) => {
		const mesocycle = await prisma.mesocycle.findUniqueOrThrow({
			where: { id: input.mesocycleId, userId: ctx.userId },
			select: {
				id: true,
				mesocycleExerciseSplitDays: { select: { dayIndex: true, name: true } },
				workoutsOfMesocycle: { select: { splitDayIndex: true } }
			}
		});

		// Workouts point at routines by position: work out where each trained routine moves to
		const newIndexByPreviousIndex = new Map<number, number>();
		input.mesocycleExerciseSplitDays.forEach((splitDay, newIndex) => {
			if (splitDay.previousDayIndex !== null && splitDay.previousDayIndex !== undefined) {
				newIndexByPreviousIndex.set(splitDay.previousDayIndex, newIndex);
			}
		});
		const trainedDayIndexes = new Set(mesocycle.workoutsOfMesocycle.map((wm) => wm.splitDayIndex));
		for (const dayIndex of trainedDayIndexes) {
			if (!newIndexByPreviousIndex.has(dayIndex)) {
				const routineName = mesocycle.mesocycleExerciseSplitDays.find((day) => day.dayIndex === dayIndex)?.name;
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: `Can't delete ${routineName || 'a routine'}: it has workouts in this mesocycle`
				});
			}
		}

		const deleteQuery = prisma.mesocycleExerciseSplitDay.deleteMany({
			where: { mesocycleId: mesocycle.id }
		});

		const newSplitDaysIds = Array.from({ length: input.mesocycleExerciseSplitDays.length }).map(() => createId());
		const createSplitDaysQuery = prisma.mesocycleExerciseSplitDay.createMany({
			data: input.mesocycleExerciseSplitDays.map(({ previousDayIndex, ...splitDay }, idx) => ({
				...splitDay,
				dayIndex: idx,
				id: newSplitDaysIds[idx],
				mesocycleId: mesocycle.id
			}))
		});
		// Editing a block's routines is where exercises are set up: details given here apply everywhere
		const { byName, syncQueries } = await resolveExercises(
			ctx.userId,
			input.mesocycleExerciseTemplates.flat(),
			'define'
		);
		const createSplitExercisesQuery = prisma.mesocycleExerciseTemplate.createMany({
			data: input.mesocycleExerciseTemplates.flatMap((dayExercises, idx) => {
				return dayExercises.map((exercise) => ({
					...linkToExercise(exercise, byName),
					mesocycleExerciseSplitDayId: newSplitDaysIds[idx]
				}));
			})
		});

		// Move workouts to their routine's new position, via an offset so moves can't collide
		const OFFSET = 100000;
		const movedDayIndexes = [...trainedDayIndexes].filter(
			(dayIndex) => newIndexByPreviousIndex.get(dayIndex) !== dayIndex
		);
		const moveWorkoutsQueries = [
			...movedDayIndexes.map((dayIndex) =>
				prisma.workoutOfMesocycle.updateMany({
					where: { mesocycleId: mesocycle.id, splitDayIndex: dayIndex },
					data: { splitDayIndex: newIndexByPreviousIndex.get(dayIndex)! + OFFSET }
				})
			),
			...movedDayIndexes.map((dayIndex) =>
				prisma.workoutOfMesocycle.updateMany({
					where: { mesocycleId: mesocycle.id, splitDayIndex: newIndexByPreviousIndex.get(dayIndex)! + OFFSET },
					data: { splitDayIndex: newIndexByPreviousIndex.get(dayIndex)! }
				})
			)
		];

		await prisma.$transaction([
			deleteQuery,
			createSplitDaysQuery,
			createSplitExercisesQuery,
			...moveWorkoutsQueries,
			...syncQueries
		]);
		return { message: 'Mesocycle exercise split edited successfully' };
	}),

	getWorkouts: t.procedure.input(z.enum(['activeMesocycle', 'allSplitDays'])).query(async ({ ctx, input }) => {
		const includeClause = Prisma.validator<Prisma.WorkoutInclude>()({
			workoutExercises: { include: { sets: { include: { miniSets: true } } } }
		});

		if (input === 'allSplitDays') {
			return await prisma.workout.findMany({ where: { userId: ctx.userId }, include: includeClause });
		}

		const activeMesocycle = await prisma.mesocycle.findFirst({
			where: { userId: ctx.userId, startDate: { not: null }, endDate: null },
			select: { id: true }
		});
		if (!activeMesocycle) return [];

		const recentWorkouts = await prisma.workout.findMany({
			where: { workoutOfMesocycle: { mesocycleId: activeMesocycle.id, workoutStatus: null }, userId: ctx.userId },
			include: includeClause,
			orderBy: { startedAt: 'desc' },
			take: 12
		});
		return recentWorkouts.reverse();
	})
});
