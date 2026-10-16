import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { overviewStats, type StatsRanges } from '$lib/utils/stats';
import { z } from 'zod';

// coerce turns a bad string into an Invalid Date: refused here rather than making a nonsense range
const date = z.coerce.date().refine((value) => !isNaN(+value), 'Invalid date');
const DAY_MS = 24 * 60 * 60 * 1000;
const bounded = (period: 7 | 30 | 90 | 'ytd') =>
	z.strictObject({
		period: z.literal(period),
		currentFrom: date,
		currentTo: date,
		previousFrom: date,
		previousTo: date
	});

const overviewInput = z
	.discriminatedUnion('period', [
		bounded(7),
		bounded(30),
		bounded(90),
		bounded('ytd'),
		z.strictObject({ period: z.literal('all'), currentTo: date })
	])
	.superRefine((input, ctx) => {
		// A sanity bound on the phone's clock, not a second clock
		if (+input.currentTo > Date.now() + DAY_MS) ctx.addIssue({ code: 'custom', message: 'currentTo is in the future' });
		if (input.period === 'all') return;
		// The windows follow each other: before ends where (or before) the period starts
		const ordered =
			+input.previousFrom < +input.previousTo &&
			+input.previousTo <= +input.currentFrom &&
			+input.currentFrom < +input.currentTo;
		if (!ordered) ctx.addIssue({ code: 'custom', message: 'Ranges out of order' });
	});

export const stats = t.router({
	/**
	 * The Stats overview for the last 7, 30 or 90 calendar days (against the same number before), the
	 * year so far (against the same dates last year) or all time, with each workout's totals for the
	 * chart. The phone sends the boundaries (statsRanges): its midnight and its clock, the one that
	 * stamped the workouts, not the server's
	 */
	overview: t.procedure.input(overviewInput).query(async ({ ctx, input }) => {
		const ranges: StatsRanges =
			input.period === 'all'
				? { current: { from: null, to: input.currentTo }, previous: null }
				: {
						current: { from: input.currentFrom, to: input.currentTo },
						previous: { from: input.previousFrom, to: input.previousTo }
					};
		const from = ranges.previous?.from ?? ranges.current.from;
		const to = ranges.current.to;
		const workouts = await prisma.workout.findMany({
			// Workouts done: a block's skipped days and rest days aren't
			where: {
				userId: ctx.userId,
				startedAt: from ? { gte: from, lt: to } : { lt: to },
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
