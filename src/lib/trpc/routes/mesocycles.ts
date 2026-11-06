import { prisma } from '$lib/prisma';
import { z } from 'zod';
import { t } from '$lib/trpc/t';
import { MesocycleCyclicSetChangeCreateWithoutMesocycleInputSchema } from '$lib/zodSchemas';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { TRPCError } from '@trpc/server';
import { ensureMyRoutines, withRoutinesTransaction } from '$lib/server/blockCache';
import { lockMesocycle, reconcileActiveBlock, reconcileEndOfPlanInTx } from '$lib/server/blockLifecycle';
import { isPastPlannedWeeks, lockedWeekCount } from '$lib/utils/workoutUtils';

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
 * A step on a block (pause, resume): its id (an app from before the other two sends only that), the timezone the
 * block's days are counted in (the phone's), and, for resuming, the pause the person saw open, so a tap made on
 * an old screen never closes a newer pause
 */
const zodBlockStepInput = z.union([
	z
		.string()
		.cuid2()
		.transform((id) => ({ id, timeZone: undefined, openPauseId: undefined })),
	z.strictObject({
		id: z.string().cuid2(),
		timeZone: z.string().optional().catch(undefined),
		openPauseId: z.string().cuid2().nullable().optional()
	})
]);

const BLOCK_CHANGED_MESSAGE =
	'This block was changed on another device. It has been refreshed: have a look and try again.';

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
		.input(
			z.strictObject({
				id: z.string().cuid2(),
				mesocycleData: zodMesocycleEditInput,
				/** The phone's timezone, to tell which weeks are past or current */
				timeZone: z.string().optional().catch(undefined)
			})
		)
		.mutation(async ({ input, ctx }) => {
			await prisma.$transaction(async (tx) => {
				// The block is locked and its plan-end pause made first: the weeks that can't be changed are
				// worked out from the block as it is now, not as the editor saw it
				await reconcileEndOfPlanInTx(tx, ctx.userId, input.id, input.timeZone);
				const block = await tx.mesocycle.findFirst({
					where: { id: input.id, userId: ctx.userId },
					select: {
						startDate: true,
						endDate: true,
						weeklyRIR: true,
						pauses: { select: { pausedAt: true, resumedAt: true } }
					}
				});
				if (!block) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mesocycle not found' });
				if (block.endDate) {
					throw new TRPCError({ code: 'BAD_REQUEST', message: 'A finished mesocycle cannot be changed' });
				}
				const locked = block.startDate
					? lockedWeekCount(block.startDate, new Date(), input.timeZone, block.pauses, block.weeklyRIR.length)
					: 0;
				const weeklyRIR = input.mesocycleData.mesocycle.weeklyRIR;
				const lockedChanged = block.weeklyRIR.slice(0, locked).some((rir, index) => weeklyRIR[index] !== rir);
				if (weeklyRIR.length < locked || lockedChanged) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: `${locked === 1 ? 'Week 1 is' : `Weeks 1 to ${locked} are`} past or in progress, so ${
							locked === 1 ? 'it' : 'they'
						} can't be changed or removed. Put ${locked === 1 ? 'it' : 'them'} back as ${
							locked === 1 ? 'it was' : 'they were'
						} and save again; your other changes are kept.`
					});
				}
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
				endDate: z.date().nullable(),
				/** Finishing: the pause the person saw open (none if they saw none), so an old screen's tap is refused */
				openPauseId: z.string().cuid2().nullable().optional(),
				/** Finishing: the phone's timezone, for a block past its plan that is not paused yet */
				timeZone: z.string().optional().catch(undefined)
			})
		)
		.mutation(async ({ input, ctx }) => {
			if (input.startDate && input.endDate) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mesocycle already completed' });
			}
			const starting = !input.startDate;
			const updatedMesocycle = await withRoutinesTransaction(async (tx) => {
				await lockMesocycle(tx, ctx.userId, input.id);
				if (!starting && input.openPauseId !== undefined) {
					const open = await tx.mesocyclePause.findFirst({
						where: { mesocycleId: input.id, mesocycle: { userId: ctx.userId }, resumedAt: null },
						select: { id: true }
					});
					if ((open?.id ?? null) !== input.openPauseId) {
						throw new TRPCError({ code: 'CONFLICT', message: BLOCK_CHANGED_MESSAGE });
					}
				}
				// A block past its plan is paused where it ended before it is finished, so the days after are not its own
				if (!starting) await reconcileEndOfPlanInTx(tx, ctx.userId, input.id, input.timeZone);
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
	pause: t.procedure.input(zodBlockStepInput).mutation(async ({ input, ctx }) => {
		try {
			return await prisma.$transaction(async (tx) => {
				// Behind a stop (or a resume) that is in flight: the block is read after it commits. A block past its
				// plan is paused already, where its plan ended
				await reconcileEndOfPlanInTx(tx, ctx.userId, input.id, input.timeZone);
				const mesocycle = await tx.mesocycle.findFirst({
					where: { id: input.id, userId: ctx.userId },
					select: { startDate: true, endDate: true, pauses: { where: { resumedAt: null }, select: { id: true } } }
				});
				if (!mesocycle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mesocycle not found' });
				if (!mesocycle.startDate || mesocycle.endDate) {
					throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a mesocycle in progress can be paused' });
				}
				if (mesocycle.pauses.length > 0) return { message: 'Mesocycle already paused' };
				await tx.mesocyclePause.create({ data: { mesocycleId: input.id, pausedAt: new Date() } });
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

	/**
	 * Ends a block's open pause; a block that isn't paused is left as it is. Only the pause the person saw open is
	 * ended (when they say which), and a block that has run all its planned weeks is not resumed until it has been
	 * given another: it would only be paused again straight away
	 */
	resume: t.procedure.input(zodBlockStepInput).mutation(async ({ input, ctx }) => {
		return prisma.$transaction(async (tx) => {
			await reconcileEndOfPlanInTx(tx, ctx.userId, input.id, input.timeZone);
			const mesocycle = await tx.mesocycle.findFirst({
				where: { id: input.id, userId: ctx.userId },
				select: {
					startDate: true,
					weeklyRIR: true,
					pauses: { select: { id: true, pausedAt: true, resumedAt: true } }
				}
			});
			if (!mesocycle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mesocycle not found' });
			const open = mesocycle.pauses.find((pause) => pause.resumedAt === null);
			if (input.openPauseId !== undefined && (open?.id ?? null) !== input.openPauseId) {
				throw new TRPCError({ code: 'CONFLICT', message: BLOCK_CHANGED_MESSAGE });
			}
			if (!open) return { message: 'Mesocycle was not paused' };
			if (
				mesocycle.startDate &&
				isPastPlannedWeeks(
					mesocycle.startDate,
					new Date(),
					input.timeZone,
					mesocycle.pauses,
					mesocycle.weeklyRIR.length
				)
			) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'It has run all its planned weeks. Extend it with another week first, or finish it.'
				});
			}
			await tx.mesocyclePause.update({ where: { id: open.id }, data: { resumedAt: new Date() } });
			return { message: 'Mesocycle resumed' };
		});
	}),

	/**
	 * Pauses the person's block where its plan ended, if it has run all its planned weeks: called by the app with the
	 * phone's timezone when a block's screen opens. The block's pages are loaded by the server, which doesn't know
	 * the phone's days
	 */
	reconcileEndOfPlan: t.procedure
		.input(z.strictObject({ timeZone: z.string().optional().catch(undefined) }))
		.mutation(async ({ input, ctx }) => ({ created: await reconcileActiveBlock(ctx.userId, input.timeZone) })),

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
