import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { overviewStats, STATS_PERIODS } from '$lib/utils/stats';
import { z } from 'zod';

export const stats = t.router({
	/** The Stats overview for the last 7, 30 or 90 days, and the same length before it */
	overview: t.procedure
		.input(
			z.union(STATS_PERIODS.map((days) => z.literal(days)) as [z.ZodLiteral<7>, z.ZodLiteral<30>, z.ZodLiteral<90>])
		)
		.query(async ({ ctx, input }) => {
			const now = new Date();
			const from = new Date(now.getTime() - 2 * input * 24 * 60 * 60 * 1000);
			const workouts = await prisma.workout.findMany({
				// Workouts done: a block's skipped days and rest days aren't
				where: {
					userId: ctx.userId,
					startedAt: { gt: from, lte: now },
					OR: [{ workoutOfMesocycle: { is: null } }, { workoutOfMesocycle: { is: { workoutStatus: null } } }]
				},
				select: {
					startedAt: true,
					endedAt: true,
					userBodyweight: true,
					workoutExercises: {
						select: {
							targetMuscleGroup: true,
							customMuscleGroup: true,
							bodyweightFraction: true,
							weightUnit: true,
							sets: {
								select: {
									reps: true,
									load: true,
									RIR: true,
									skipped: true,
									miniSets: { select: { reps: true, load: true, RIR: true } }
								}
							}
						}
					}
				}
			});
			return overviewStats(workouts, input, now);
		})
});
