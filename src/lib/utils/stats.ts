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

const AREA_OF: Record<Exclude<MuscleGroup, 'Custom'>, BodyArea> = {
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

/** A muscle group's area; custom ones have none ("Other") */
export function bodyAreaOf(muscleGroup: MuscleGroup): BodyArea | null {
	return muscleGroup === 'Custom' ? null : AREA_OF[muscleGroup];
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
	/** Sets done: skipped ones and mini-sets don't count */
	sets: number;
	setsByArea: Record<BodyArea, number>;
	/** Sets per muscle, e.g. "SideDelts" or a custom group's name */
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
			const muscle =
				exercise.targetMuscleGroup === 'Custom' ? (exercise.customMuscleGroup ?? 'Custom') : exercise.targetMuscleGroup;
			stats.setsByMuscle[muscle] = (stats.setsByMuscle[muscle] ?? 0) + sets;
			const area = bodyAreaOf(exercise.targetMuscleGroup);
			if (area) stats.setsByArea[area] += sets;
		}
	}
	return stats;
}

export const STATS_PERIODS = [7, 30, 90] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

/** A period's stats and the period before it: the last `days` days up to `now`, then the days before */
export function overviewStats(workouts: StatsWorkout[], days: number, now: Date) {
	const periodMs = days * 24 * 60 * 60 * 1000;
	const currentStart = now.getTime() - periodMs;
	const previousStart = currentStart - periodMs;
	const at = (workout: StatsWorkout) => new Date(workout.startedAt).getTime();
	return {
		current: periodStats(workouts.filter((workout) => at(workout) > currentStart && at(workout) <= now.getTime())),
		previous: periodStats(workouts.filter((workout) => at(workout) > previousStart && at(workout) <= currentStart))
	};
}
