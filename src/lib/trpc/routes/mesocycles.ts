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

/**
 * Takes the block's row lock until the transaction ends. Pausing, resuming and stopping all write the block's
 * end date and pauses, so they wait for each other here; a plain transaction would not do that (each would
 * read the block as it was before the other committed)
 */
async function lockMesocycle(tx: Prisma.TransactionClient, userId: string, mesocycleId: string) {
	await tx.$queryRaw`SELECT id FROM "Mesocycle" WHERE id = ${mesocycleId} AND "userId" = ${userId} FOR UPDATE`;
}

export const mesocycles = t.router({
	findById: t.procedure.input(z.string().cuid2()).query(async ({ input, ctx }) => {
		const [mesocycle, myRoutines] = await Promise.all([
			prisma.mesocycle.findUnique({
				where: { id: input, userId: ctx.userId },
				include: {
					exerciseSplit: true,
					pauses: { orderBy: { pausedAt: 'asc' } },
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
				where: { exerciseSplit: { userId: ctx.userId } },
				orderBy: { dayIndex: 'asc' },
				select: { id: true, name: true, weightUnit: true, exercises: { orderBy: { exerciseIndex: 'asc' } } }
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
				await lockMesocycle(tx, ctx.userId, input.id);
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
				// A finished mesocycle is its workouts: it no longer uses My routines. A pause still open ends with it
				const endDate = new Date();
				await tx.mesocyclePause.updateMany({
					where: { mesocycleId: input.id, mesocycle: { userId: ctx.userId }, resumedAt: null },
					data: { resumedAt: endDate }
				});
				return tx.mesocycle.update({
					where: { id: input.id, userId: ctx.userId },
					data: { endDate, exerciseSplitId: null }
				});
			});
			return {
				message: `Mesocycle ${starting ? 'started' : 'stopped'} successfully`,
				startDate: updatedMesocycle.startDate,
				endDate: updatedMesocycle.endDate
			};
		}),

	/**
	 * Pauses a started block that isn't finished: its week count stands still until it is resumed. Pausing a paused
	 * block does nothing, so two devices (or a double tap) can't make two pauses
	 */
	pause: t.procedure.input(z.string().cuid2()).mutation(async ({ input, ctx }) => {
		try {
			return await prisma.$transaction(async (tx) => {
				// Behind a stop (or a resume) that is in flight: the block is read after it commits
				await lockMesocycle(tx, ctx.userId, input);
				const mesocycle = await tx.mesocycle.findFirst({
					where: { id: input, userId: ctx.userId },
					select: { startDate: true, endDate: true, pauses: { where: { resumedAt: null }, select: { id: true } } }
				});
				if (!mesocycle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mesocycle not found' });
				if (!mesocycle.startDate || mesocycle.endDate) {
					throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a mesocycle in progress can be paused' });
				}
				if (mesocycle.pauses.length > 0) return { message: 'Mesocycle already paused' };
				await tx.mesocyclePause.create({ data: { mesocycleId: input, pausedAt: new Date() } });
				return { message: 'Mesocycle paused' };
			});
		} catch (error) {
			// The database's one open pause per block is the backstop if the lock is ever bypassed
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
				return { message: 'Mesocycle already paused' };
			}
			throw error;
		}
	}),

	/** Ends a block's open pause; a block that isn't paused is left as it is */
	resume: t.procedure.input(z.string().cuid2()).mutation(async ({ input, ctx }) => {
		return prisma.$transaction(async (tx) => {
			await lockMesocycle(tx, ctx.userId, input);
			const mesocycle = await tx.mesocycle.findFirst({
				where: { id: input, userId: ctx.userId },
				select: { id: true }
			});
			if (!mesocycle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mesocycle not found' });
			const { count } = await tx.mesocyclePause.updateMany({
				where: { mesocycleId: input, resumedAt: null },
				data: { resumedAt: new Date() }
			});
			return { message: count > 0 ? 'Mesocycle resumed' : 'Mesocycle was not paused' };
		});
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
			where: { workoutOfMesocycle: { mesocycleId: activeMesocycle.id }, userId: ctx.userId },
			include: includeClause,
			orderBy: { startedAt: 'desc' },
			take: 12
		});
		return recentWorkouts.reverse();
	})
});
