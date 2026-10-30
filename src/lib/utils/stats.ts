/**
 * The Stats overview: what was done in a period (workouts, time, volume, sets) and how the sets
 * spread over the body. Pure, so the server and tests share it.
 */
import type { MuscleGroup, WeightUnit } from './prismaEnums';
import { getExerciseVolume } from './workoutUtils';
import { workoutMinutes } from './workoutLength';

/** The six areas of the radar, in the order drawn (clockwise from the top left) */
export const BODY_AREAS = ['Back', 'Chest', 'Core', 'Shoulders', 'Arms', 'Legs'] as const;
export type BodyArea = (typeof BODY_AREAS)[number];

const AREA_OF: Record<Exclude<MuscleGroup, 'Custom' | 'Cardio'>, BodyArea> = {
	Chest: 'Chest',
	Lats: 'Back',
	Traps: 'Back',
	Neck: 'Back',
	FrontDelts: 'Shoulders',
	SideDelts: 'Shoulders',
	RearDelts: 'Shoulders',
	Biceps: 'Arms',
	Triceps: 'Arms',
	Forearms: 'Arms',
	Quads: 'Legs',
	Hamstrings: 'Legs',
	Glutes: 'Legs',
	Calves: 'Legs',
	Adductors: 'Legs',
	Abductors: 'Legs',
	Abs: 'Core'
};

/** A muscle group's area; custom ones have none ("Other"), and cardio isn't a muscle */
export function bodyAreaOf(muscleGroup: MuscleGroup): BodyArea | null {
	return muscleGroup === 'Custom' || muscleGroup === 'Cardio' ? null : AREA_OF[muscleGroup];
}

type StatsSet = {
	reps: number;
	load: number;
	RIR: number;
	skipped: boolean;
	miniSets: { reps: number; load: number; RIR: number }[];
};
export type StatsWorkout = {
	startedAt: Date;
	endedAt: Date;
	userBodyweight: number;
	workoutExercises: {
		targetMuscleGroup: MuscleGroup;
		customMuscleGroup: string | null;
		bodyweightFraction: number | null;
		weightUnit: WeightUnit;
		sets: StatsSet[];
	}[];
};

export type PeriodStats = {
	workouts: number;
	/** Total minutes trained, start to last ticked set */
	minutes: number;
	/** Work done in kg */
	volume: number;
	/** Sets done (cardio intervals included): skipped ones and mini-sets don't count */
	sets: number;
	setsByArea: Record<BodyArea, number>;
	/** Sets per muscle, e.g. "SideDelts" or a custom group's name; cardio isn't a muscle, so it's left out */
	setsByMuscle: Record<string, number>;
};

export function periodStats(workouts: StatsWorkout[]): PeriodStats {
	const stats: PeriodStats = {
		workouts: workouts.length,
		minutes: 0,
		volume: 0,
		sets: 0,
		setsByArea: Object.fromEntries(BODY_AREAS.map((area) => [area, 0])) as Record<BodyArea, number>,
		setsByMuscle: {}
	};
	for (const workout of workouts) {
		stats.minutes += workoutMinutes(workout.startedAt, workout.endedAt);
		for (const exercise of workout.workoutExercises) {
			stats.volume += getExerciseVolume(exercise, workout.userBodyweight);
			const sets = exercise.sets.filter((set) => !set.skipped).length;
			if (sets === 0) continue;
			stats.sets += sets;
			if (exercise.targetMuscleGroup === 'Cardio') continue;
			const muscle =
				exercise.targetMuscleGroup === 'Custom' ? (exercise.customMuscleGroup ?? 'Custom') : exercise.targetMuscleGroup;
			stats.setsByMuscle[muscle] = (stats.setsByMuscle[muscle] ?? 0) + sets;
			const area = bodyAreaOf(exercise.targetMuscleGroup);
			if (area) stats.setsByArea[area] += sets;
		}
	}
	return stats;
}

export const STATS_PERIODS = [7, 30, 90, 'ytd', 'all'] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

/** From `from` (included; null: the first workout) up to `to` (not included) */
export type StatsRange = { from: Date | null; to: Date };
export type StatsRanges = { current: StatsRange; previous: StatsRange | null };

/** The same moment a year earlier (29 February becomes 28 February) */
function yearEarlier(date: Date) {
	const earlier = new Date(date);
	earlier.setFullYear(date.getFullYear() - 1);
	if (earlier.getMonth() !== date.getMonth()) earlier.setDate(0);
	return earlier;
}

/** `days` calendar days earlier, at the same time of day (a day with a clock change still counts as one) */
function daysEarlier(date: Date, days: number) {
	const earlier = new Date(date);
	earlier.setDate(earlier.getDate() - days);
	return earlier;
}

/**
 * What a period covers and what it's compared with, in the time zone of the device it runs on, up to
 * `now`: the last 7, 30 or 90 calendar days (today and the days before, from midnight) against the same
 * number of days before them; the year so far against the same dates last year; all time alone.
 * Worked out on the person's phone, whose clock also stamps their workouts, and sent to the server, so
 * the cards and the chart cover exactly the same workouts
 */
export function statsRanges(period: StatsPeriod, now: Date): StatsRanges {
	if (period === 'all') return { current: { from: null, to: now }, previous: null };
	if (period === 'ytd') {
		const from = new Date(now.getFullYear(), 0, 1);
		return { current: { from, to: now }, previous: { from: yearEarlier(from), to: yearEarlier(now) } };
	}
	const from = daysEarlier(startOfDay(now), period - 1);
	return { current: { from, to: now }, previous: { from: daysEarlier(from, period), to: from } };
}

const inRange = (workout: StatsWorkout, range: StatsRange) => {
	const at = new Date(workout.startedAt).getTime();
	return (range.from === null || at >= range.from.getTime()) && at < range.to.getTime();
};

/** One workout's totals, for the progress chart */
export type ProgressPoint = { startedAt: Date; minutes: number; volume: number; reps: number };

export function progressPoint(workout: StatsWorkout): ProgressPoint {
	let volume = 0;
	let reps = 0;
	for (const exercise of workout.workoutExercises) {
		volume += getExerciseVolume(exercise, workout.userBodyweight);
		for (const set of exercise.sets) {
			if (set.skipped) continue;
			reps += set.reps + set.miniSets.reduce((sum, miniSet) => sum + miniSet.reps, 0);
		}
	}
	return { startedAt: workout.startedAt, minutes: workoutMinutes(workout.startedAt, workout.endedAt), volume, reps };
}

/** The overview for a period and the one it's compared with (none for all time), and each workout's totals */
export function overviewStats(workouts: StatsWorkout[], ranges: StatsRanges) {
	const current = workouts.filter((workout) => inRange(workout, ranges.current));
	return {
		current: periodStats(current),
		previous: ranges.previous ? periodStats(workouts.filter((workout) => inRange(workout, ranges.previous!))) : null,
		progress: current.map(progressPoint)
	};
}

export type ProgressMeasure = 'minutes' | 'volume' | 'reps';
export type ProgressBar = { start: Date; end: Date; minutes: number; volume: number; reps: number };

function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
/** Weeks start on Monday */
function startOfWeek(date: Date) {
	const day = startOfDay(date);
	day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
	return day;
}
/**
 * This week for the dashboard, Sunday to Saturday (unlike the Stats weeks, which start on Monday), in
 * the phone's time zone: its seven days from midnight, and [from, to) from Sunday to the next Sunday
 */
export function sundayWeek(now: Date) {
	const from = startOfDay(now);
	from.setDate(from.getDate() - from.getDay());
	// Calendar days, not 7 × 24 hours: a week with a clock change still ends at midnight
	const days = Array.from({ length: 7 }, (_, idx) => {
		const day = new Date(from);
		day.setDate(from.getDate() + idx);
		return day;
	});
	const to = new Date(from);
	to.setDate(from.getDate() + 7);
	return { from, to, days };
}

/** The day (0 = Sunday) of the week a moment falls on; null outside the week */
export function sundayWeekDay(at: Date, week: { from: Date; to: Date }) {
	if (at.getTime() < week.from.getTime() || at.getTime() >= week.to.getTime()) return null;
	return at.getDay();
}

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** How a period's bars are cut: by day up to 30 days, by week up to a year, by month for all time */
export function progressBarSize(period: StatsPeriod): 'day' | 'week' | 'month' {
	if (period === 7 || period === 30) return 'day';
	return period === 'all' ? 'month' : 'week';
}

/**
 * The progress chart's bars, in local time, oldest first: one per day, week (from Monday) or month,
 * over the same range as the cards (all time: from the first workout's month). Bars without a workout
 * are 0, so time reads evenly
 */
export function progressBars(points: ProgressPoint[], period: StatsPeriod, range: StatsRange): ProgressBar[] {
	const size = progressBarSize(period);
	const startOf = size === 'day' ? startOfDay : size === 'week' ? startOfWeek : startOfMonth;
	const next = (date: Date) => {
		const after = new Date(date);
		if (size === 'day') after.setDate(after.getDate() + 1);
		else if (size === 'week') after.setDate(after.getDate() + 7);
		else after.setMonth(after.getMonth() + 1);
		return after;
	};
	const times = points.map((point) => new Date(point.startedAt).getTime());
	const end = range.to;
	// All time has no start: the bars begin at the first workout (its month), or are just this month
	const from = range.from ?? (times.length > 0 ? new Date(Math.min(...times)) : end);

	const bars: ProgressBar[] = [];
	for (let start = startOf(from); start.getTime() <= end.getTime(); start = next(start)) {
		bars.push({ start, end: next(start), minutes: 0, volume: 0, reps: 0 });
	}
	points.forEach((point, idx) => {
		const bar = bars.find((bar) => times[idx] >= bar.start.getTime() && times[idx] < bar.end.getTime());
		if (!bar) return;
		bar.minutes += point.minutes;
		bar.volume += point.volume;
		bar.reps += point.reps;
	});
	return bars;
}
