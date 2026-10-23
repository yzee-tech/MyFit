import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { overviewStats, type StatsRanges } from '$lib/utils/stats';
import { z } from 'zod';

// coerce turns a bad string into an Invalid Date: refused here rather than making a nonsense range
export const date = z.coerce.date().refine((value) => !isNaN(+value), 'Invalid date');
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
		// A deliberate limit, not a second clock: the phone's clock is trusted (it stamps the workouts),
		// within a day of the server's. Time zones are at most 14 hours apart, so a phone set right is
		// always inside it; one a day or more ahead is wrong, and its Stats would count future workouts
		if (+input.currentTo > Date.now() + DAY_MS) ctx.addIssue({ code: 'custom', message: 'currentTo is in the future' });
		if (input.period === 'all') return;
		// The windows follow each other: before ends where (or before) the period starts
		const ordered =
			+input.previousFrom < +input.previousTo &&
			+input.previousTo <= +input.currentFrom &&
			+input.currentFrom < +input.currentTo;
		if (!ordered) ctx.addIssue({ code: 'custom', message: 'Ranges out of order' });
	});

// A week at most (8 days allows for a clock change): never a read of every workout
export const weekInput = z.strictObject({ from: date, to: date }).superRefine((input, ctx) => {
	if (!(+input.from < +input.to)) ctx.addIssue({ code: 'custom', message: 'from must be before to' });
	if (+input.to - +input.from > 8 * DAY_MS) ctx.addIssue({ code: 'custom', message: 'At most a week' });
});

// A month at most (32 days allows for a clock change): the calendar asks for one month at a time
export const monthInput = z.strictObject({ from: date, to: date }).superRefine((input, ctx) => {
	if (!(+input.from < +input.to)) ctx.addIssue({ code: 'custom', message: 'from must be before to' });
	if (+input.to - +input.from > 32 * DAY_MS) ctx.addIssue({ code: 'custom', message: 'At most a month' });
});

export const stats = t.router({
	/**
	 * When the workouts in a week started, for the dashboard's week: the phone sends its own Sunday to
	 * Sunday (sundayWeek) and sorts them into its days
	 */
	weekWorkoutTimes: t.procedure.input(weekInput).query(async ({ ctx, input }) => {
		const workouts = await prisma.workout.findMany({
			where: {
				userId: ctx.userId,
				startedAt: { gte: input.from, lt: input.to }
			},
			select: { startedAt: true }
		});
		return workouts.map((workout) => workout.startedAt);
	}),

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
			where: { userId: ctx.userId, startedAt: from ? { gte: from, lt: to } : { lt: to } },
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
