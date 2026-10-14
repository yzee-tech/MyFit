import { test, expect } from '@playwright/test';
import { overviewStats, progressBars, progressPoint, statsRanges, type StatsWorkout } from '../../src/lib/utils/stats';

/** A workout of one exercise, `minutes` long */
function workout(startedAt: Date, minutes: number, sets: { reps: number; load: number; skipped?: boolean }[]) {
	return {
		startedAt,
		endedAt: new Date(startedAt.getTime() + minutes * 60000),
		userBodyweight: 80,
		workoutExercises: [
			{
				targetMuscleGroup: 'Lats',
				customMuscleGroup: null,
				bodyweightFraction: null,
				weightUnit: 'KG',
				sets: sets.map((set) => ({
					reps: set.reps,
					load: set.load,
					RIR: 2,
					skipped: set.skipped ?? false,
					miniSets: [{ reps: 3, load: set.load, RIR: 0 }]
				}))
			}
		]
	} as StatsWorkout;
}

// Wednesday 15 October 2026, 18:00 local time
const now = new Date(2026, 9, 15, 18, 0);

test('periods: days against the days before, the year so far against the same dates last year, all time alone', () => {
	const month = statsRanges(30, now);
	expect(month.current.from).toEqual(new Date(now.getTime() - 30 * 86400000));
	expect(month.previous!.to).toEqual(month.current.from);

	const yearStart = new Date(2026, 0, 1);
	const ytd = statsRanges('ytd', now, yearStart);
	expect(ytd.current).toEqual({ from: yearStart, to: now });
	expect(ytd.previous).toEqual({ from: new Date(2025, 0, 1), to: new Date(2025, 9, 15, 18, 0) });

	expect(statsRanges('all', now)).toEqual({ current: { from: null, to: now }, previous: null });
});

test('all time: everything counts, nothing to compare with', () => {
	const workouts = [
		workout(new Date(2020, 5, 1), 60, [{ reps: 10, load: 50 }]),
		workout(new Date(2026, 9, 14), 30, [])
	];
	const overview = overviewStats(workouts, statsRanges('all', now));
	expect(overview.current.workouts).toBe(2);
	expect(overview.previous).toBeNull();
	expect(overview.progress).toHaveLength(2);
});

test('a workout’s totals: minutes, volume like the cards, and reps with mini-sets but not skipped sets', () => {
	const point = progressPoint(
		workout(now, 45, [
			{ reps: 10, load: 50 },
			{ reps: 8, load: 50, skipped: true }
		])
	);
	expect(point.minutes).toBe(45);
	// (10 + 3) × 50
	expect(point.volume).toBe(650);
	expect(point.reps).toBe(13);
});

test('bars: by day for 7 and 30 days, by week from Monday for 90 days and the year, by month for all time; empty ones are 0', () => {
	const points = [
		progressPoint(workout(new Date(2026, 9, 15, 7), 60, [{ reps: 10, load: 50 }])),
		progressPoint(workout(new Date(2026, 9, 13, 7), 30, [{ reps: 10, load: 50 }])),
		progressPoint(workout(new Date(2026, 6, 20, 7), 40, [{ reps: 10, load: 50 }]))
	];

	const week = progressBars(points, 7, now);
	expect(week).toHaveLength(7);
	expect(week[0].start).toEqual(new Date(2026, 9, 9));
	expect(week.map((bar) => bar.minutes)).toEqual([0, 0, 0, 0, 30, 0, 60]);

	expect(progressBars(points, 30, now)).toHaveLength(30);

	// 90 days back is Friday 17 July: weeks from Monday 13 July to Monday 12 October
	const quarter = progressBars(points, 90, now);
	expect(quarter[0].start).toEqual(new Date(2026, 6, 13));
	expect(quarter.at(-1)!.start).toEqual(new Date(2026, 9, 12));
	expect(quarter).toHaveLength(14);
	expect(quarter[1].minutes).toBe(40);
	expect(quarter.at(-1)!.minutes).toBe(90);

	// The year so far: from the week of 1 January (Thursday → Monday 29 December 2025)
	const year = progressBars(points, 'ytd', now, new Date(2026, 0, 1));
	expect(year[0].start).toEqual(new Date(2025, 11, 29));

	// All time: from the first workout's month
	const all = progressBars(points, 'all', now);
	expect(all.map((bar) => bar.start.getMonth())).toEqual([6, 7, 8, 9]);
	expect(all.map((bar) => bar.minutes)).toEqual([40, 0, 0, 90]);
	expect(progressBars([], 'all', now)).toHaveLength(1);
});
