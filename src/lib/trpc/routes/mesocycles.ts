import { prisma } from '$lib/prisma';
import { z } from 'zod';
import { t } from '$lib/trpc/t';
import { MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema } from '$lib/zodSchemas';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { TRPCError } from '@trpc/server';
import { ensureMyRoutines, withRoutinesTransaction } from '$lib/server/blockCache';

/**
 * A block's own settings. A block is a training period: its routines are My routines, so nothing
 * here can write them (other fields sent along, such as dates, are dropped)
 */
const zodMesocycleSettings = z.object({
	name: z.string().trim().min(1).max(100),
	weeklyRIR: z.array(z.number().int().min(-1).max(10)).min(1).max(52),
	startOverloadPercentage: z.number().min(0).max(100),
	lastSetToFailure: z.boolean(),
	forceRIRMatching: z.boolean()
});

const zodMesocycleCreateInput = z.strictObject({
	mesocycle: zodMesocycleSettings,
	mesocycleCyclicSetChanges: z.array(MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema),
	startImmediately: z.boolean()
});

const zodMesocycleEditInput = z.strictObject({
	mesocycle: zodMesocycleSettings,
	mesocycleCyclicSetChanges: z.array(MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema)
});

const getActiveMesocycle = async (userId: string) => {
	return await prisma.mesocycle.findFirst({
		where: { userId, startDate: { not: null }, endDate: null },
		select: { name: true, id: true }
	});
};

export const mesocycles = t.router({
	findById: t.procedure.input(z.string().cuid2()).query(async ({ input, ctx }) => {
		const [mesocycle, myRoutines] = await Promise.all([
			prisma.mesocycle.findUnique({
				where: { id: input, userId: ctx.userId },
				include: {
					exerciseSplit: true,
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
			}),
			prisma.exerciseSplitDay.findMany({
				where: { exerciseSplit: { userId: ctx.userId }, isRestDay: false },
				orderBy: { dayIndex: 'asc' },
				select: { name: true, exercises: { orderBy: { exerciseIndex: 'asc' } } }
			})
		]);
		if (!mesocycle) return null;
		// A mesocycle that isn't finished uses My routines as they are; a finished one is its workouts
		return { ...mesocycle, routines: mesocycle.endDate ? null : myRoutines };
	}),

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
		const mesocycleId = createId();
		await withRoutinesTransaction(async (tx) => {
			if (input.startImmediately) {
				const activeMesocycle = await tx.mesocycle.findFirst({
					where: { userId: ctx.userId, startDate: { not: null }, endDate: null },
					select: { id: true }
				});
				if (activeMesocycle) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A mesocycle is already active' });
			}
			const exerciseSplitId = await ensureMyRoutines(tx, ctx.userId);
			await tx.mesocycle.create({
				data: {
					...input.mesocycle,
					id: mesocycleId,
					userId: ctx.userId,
					exerciseSplitId,
					startDate: input.startImmediately ? new Date() : null,
					endDate: null
				}
			});
			await tx.mesocycleCyclicSetChange.createMany({
				data: input.mesocycleCyclicSetChanges.map((setChange) => ({ ...setChange, mesocycleId }))
			});
		});
		return { message: 'Mesocycle created successfully' };
	}),

	editById: t.procedure
		.input(z.strictObject({ id: z.string().cuid2(), mesocycleData: zodMesocycleEditInput }))
		.mutation(async ({ input, ctx }) => {
			await prisma.$transaction(async (tx) => {
				const mesocycle = await tx.mesocycle.update({
					where: { id: input.id, userId: ctx.userId },
					data: { ...input.mesocycleData.mesocycle },
					select: { id: true }
				});
				await tx.mesocycleCyclicSetChange.deleteMany({ where: { mesocycleId: mesocycle.id } });
				await tx.mesocycleCyclicSetChange.createMany({
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
			if (input.startDate && input.endDate) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mesocycle already completed' });
			}
			const starting = !input.startDate;
			const updatedMesocycle = await withRoutinesTransaction(async (tx) => {
				if (starting) {
					const activeMesocycle = await tx.mesocycle.findFirst({
						where: { userId: ctx.userId, startDate: { not: null }, endDate: null },
						select: { id: true }
					});
					if (activeMesocycle) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A mesocycle is already active' });
					const exerciseSplitId = await ensureMyRoutines(tx, ctx.userId);
					const started = await tx.mesocycle.update({
						where: { id: input.id, userId: ctx.userId },
						data: { startDate: new Date(), exerciseSplitId }
					});
					return started;
				}
				// A finished mesocycle is its workouts: it no longer uses My routines
				return tx.mesocycle.update({
					where: { id: input.id, userId: ctx.userId },
					data: { endDate: new Date(), exerciseSplitId: null }
				});
			});
			return {
				message: `Mesocycle ${starting ? 'started' : 'stopped'} successfully`,
				startDate: updatedMesocycle.startDate,
				endDate: updatedMesocycle.endDate
			};
		}),

	/** The active block's latest workouts done */
	getWorkouts: t.procedure.query(async ({ ctx }) => {
		const includeClause = Prisma.validator<Prisma.WorkoutInclude>()({
			workoutExercises: { include: { sets: { include: { miniSets: true } } } }
		});

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
