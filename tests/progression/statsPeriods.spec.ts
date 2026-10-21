import { test, expect } from '@playwright/test';
import {
	overviewStats,
	progressBars,
	progressPoint,
	statsRanges,
	sundayWeek,
	sundayWeekDay,
	type StatsWorkout
} from '../../src/lib/utils/stats';

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

test('periods: calendar days from midnight against the days before, the year against the same dates last year, all time alone', () => {
	const week = statsRanges(7, now);
	// Today and the 6 days before: from midnight on Friday 9 October
	expect(week.current).toEqual({ from: new Date(2026, 9, 9), to: now });
	expect(week.previous).toEqual({ from: new Date(2026, 9, 2), to: new Date(2026, 9, 9) });
	expect(statsRanges(30, now).current.from).toEqual(new Date(2026, 8, 16));

	const ytd = statsRanges('ytd', now);
	expect(ytd.current).toEqual({ from: new Date(2026, 0, 1), to: now });
	expect(ytd.previous).toEqual({ from: new Date(2025, 0, 1), to: new Date(2025, 9, 15, 18, 0) });

	expect(statsRanges('all', now)).toEqual({ current: { from: null, to: now }, previous: null });
});

test('a week with a clock change is still 7 calendar days, each from midnight', () => {
	const zone = process.env.TZ;
	// The UK's clocks go back on Sunday 25 October 2026
	process.env.TZ = 'Europe/London';
	try {
		const later = new Date(2026, 9, 28, 12, 0);
		const { current, previous } = statsRanges(7, later);
		expect([current.from!.getDate(), current.from!.getHours()]).toEqual([22, 0]);
		expect([previous!.from!.getDate(), previous!.from!.getHours()]).toEqual([15, 0]);
		expect(progressBars([], 7, current).map((bar) => bar.start.getDate())).toEqual([22, 23, 24, 25, 26, 27, 28]);
	} finally {
		process.env.TZ = zone;
	}
});

test('the edges: the cards and the chart count the same workouts', () => {
	const workouts = [
		// 6 days ago, just after midnight: the first day of the 7
		workout(new Date(2026, 9, 9, 0, 30), 30, [{ reps: 10, load: 50 }]),
		// 7 days ago, late in the day (later than now's time of day): the week before
		workout(new Date(2026, 9, 8, 23, 30), 40, [{ reps: 10, load: 50 }]),
		workout(new Date(2026, 9, 15, 7, 0), 60, [{ reps: 10, load: 50 }])
	];
	const ranges = statsRanges(7, now);
	const overview = overviewStats(workouts, ranges);
	expect(overview.current.workouts).toBe(2);
	expect(overview.previous!.workouts).toBe(1);
	const bars = progressBars(overview.progress, 7, ranges.current);
	expect(bars).toHaveLength(7);
	expect(bars.reduce((sum, bar) => sum + bar.minutes, 0)).toBe(overview.current.minutes);
	expect(bars[0].minutes).toBe(30);
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
	const bars = (period: 7 | 30 | 90 | 'ytd' | 'all') => progressBars(points, period, statsRanges(period, now).current);

	const week = bars(7);
	expect(week).toHaveLength(7);
	expect(week[0].start).toEqual(new Date(2026, 9, 9));
	expect(week.map((bar) => bar.minutes)).toEqual([0, 0, 0, 0, 30, 0, 60]);

	expect(bars(30)).toHaveLength(30);

	// 90 days from Saturday 18 July: weeks from Monday 13 July to Monday 12 October
	const quarter = bars(90);
	expect(quarter[0].start).toEqual(new Date(2026, 6, 13));
	expect(quarter.at(-1)!.start).toEqual(new Date(2026, 9, 12));
	expect(quarter).toHaveLength(14);
	expect(quarter[1].minutes).toBe(40);
	expect(quarter.at(-1)!.minutes).toBe(90);

	// The year so far: from the week of 1 January (Thursday → Monday 29 December 2025)
	expect(bars('ytd')[0].start).toEqual(new Date(2025, 11, 29));

	// All time: from the first workout's month
	const all = bars('all');
	expect(all.map((bar) => bar.start.getMonth())).toEqual([6, 7, 8, 9]);
	expect(all.map((bar) => bar.minutes)).toEqual([40, 0, 0, 90]);
	expect(progressBars([], 'all', statsRanges('all', now).current)).toHaveLength(1);
});

test('the dashboard week: Sunday midnight to the next Sunday midnight, each day from midnight', () => {
	// Wednesday 21 October 2026, midday: Sunday 18 to Sunday 25
	const week = sundayWeek(new Date(2026, 9, 21, 12, 0));
	expect(week.from).toEqual(new Date(2026, 9, 18));
	expect(week.to).toEqual(new Date(2026, 9, 25));
	expect(week.days.map((day) => day.getDate())).toEqual([18, 19, 20, 21, 22, 23, 24]);
	// On the Sunday itself, just after midnight: that week, day 0
	expect(sundayWeek(new Date(2026, 9, 18, 0, 10)).from).toEqual(new Date(2026, 9, 18));
	expect(sundayWeekDay(new Date(2026, 9, 18, 0, 10), week)).toBe(0);
	// Saturday late: still this week, day 6; the next Sunday just after midnight: not this week
	expect(sundayWeekDay(new Date(2026, 9, 24, 23, 30), week)).toBe(6);
	expect(sundayWeekDay(new Date(2026, 9, 25, 0, 10), week)).toBeNull();
	// The Saturday before: not this week
	expect(sundayWeekDay(new Date(2026, 9, 17, 23, 30), week)).toBeNull();
});

test('the dashboard week with a clock change is still 7 calendar days, ending at midnight', () => {
	const zone = process.env.TZ;
	// The UK's clocks go back on Sunday 25 October 2026: that week is 169 hours long
	process.env.TZ = 'Europe/London';
	try {
		const week = sundayWeek(new Date(2026, 9, 28, 12, 0));
		expect(week.days.map((day) => [day.getDate(), day.getHours()])).toEqual(
			[25, 26, 27, 28, 29, 30, 31].map((date) => [date, 0])
		);
		expect([week.to.getMonth(), week.to.getDate(), week.to.getHours()]).toEqual([10, 1, 0]);
		expect(sundayWeekDay(new Date(2026, 9, 31, 23, 30), week)).toBe(6);
	} finally {
		process.env.TZ = zone;
	}
});
