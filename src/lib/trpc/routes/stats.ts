import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { overviewStats, statsRanges } from '$lib/utils/stats';
import { z } from 'zod';

export const stats = t.router({
	/**
	 * The Stats overview for the last 7, 30 or 90 days (against the same length before), the year so
	 * far (against the same dates last year) or all time, with each workout's totals for the chart
	 */
	overview: t.procedure
		.input(
			z.discriminatedUnion('period', [
				z.strictObject({ period: z.literal(7) }),
				z.strictObject({ period: z.literal(30) }),
				z.strictObject({ period: z.literal(90) }),
				// The person's own 1 January, from their device. coerce turns a bad string into an Invalid Date,
				// so it's refused here rather than making a nonsense range
				z.strictObject({
					period: z.literal('ytd'),
					yearStart: z.coerce.date().refine((date) => !isNaN(+date), 'Invalid date')
				}),
				z.strictObject({ period: z.literal('all') })
			])
		)
		.query(async ({ ctx, input }) => {
			const now = new Date();
			const ranges = statsRanges(input.period, now, 'yearStart' in input ? input.yearStart : undefined);
			const from = ranges.previous?.from ?? ranges.current.from;
			const workouts = await prisma.workout.findMany({
				// Workouts done: a block's skipped days and rest days aren't
				where: {
					userId: ctx.userId,
					startedAt: from ? { gt: from, lte: now } : { lte: now },
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
			return overviewStats(workouts, ranges);
		})
});
