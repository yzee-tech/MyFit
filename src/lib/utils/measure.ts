/**
 * How a saved exercise was measured. A workout exercise's copies of its exercise (name, muscle group,
 * bodyweight share) are kept in sync with the exercise and so can't say how its sets were logged; the
 * sets themselves can, and they're written once. So a saved row's measure is read from its own sets,
 * never from the exercise record: reps, time, or distance and time.
 */
import type { DistanceUnit, ExerciseMeasure } from './prismaEnums';

/** How a cardio exercise is measured, and the unit its distances show in */
export type MeasureInfo = { measure: ExerciseMeasure; distanceUnit: DistanceUnit | null };
/** The user's cardio exercises by name (reps exercises are left out) */
export type CardioExercises = Record<string, MeasureInfo>;

const REPS: MeasureInfo = { measure: 'Reps', distanceUnit: null };

/** How an exercise is measured, by name: cardio from the list, else reps */
export function measureInfoOf(exerciseName: string, cardioExercises: CardioExercises | undefined): MeasureInfo {
	return cardioExercises?.[exerciseName] ?? REPS;
}

/**
 * How a saved row shows: measured as its own sets say (what was logged never changes), in the distance
 * unit its exercise has now (km shown as miles is the same run)
 */
export function savedRowMeasure(
	exerciseName: string,
	sets: readonly MeasuredSet[],
	cardioExercises: CardioExercises | undefined
): MeasureInfo {
	const measure = measureOfSets(sets);
	if (measure === 'Reps') return REPS;
	return {
		measure,
		distanceUnit: cardioExercises?.[exerciseName]?.distanceUnit ?? (measure === 'DistanceTime' ? 'KM' : null)
	};
}

export type MeasuredSet = { skipped: boolean; timeSeconds?: number | null; distanceMeters?: number | null };

/**
 * DistanceTime if any set done has a distance, Time if any has a time, else Reps. A row whose every set
 * was skipped reads Reps, which is inert: the `!skipped` filters leave all-skipped rows out everywhere
 */
export function measureOfSets(sets: readonly MeasuredSet[]): ExerciseMeasure {
	const done = sets.filter((set) => !set.skipped);
	if (done.some((set) => set.distanceMeters != null)) return 'DistanceTime';
	if (done.some((set) => set.timeSeconds != null)) return 'Time';
	return 'Reps';
}

export function isCardioMeasure(measure: ExerciseMeasure | null | undefined): measure is 'Time' | 'DistanceTime' {
	return measure === 'Time' || measure === 'DistanceTime';
}

/** "3 intervals" or "1 interval", for routine and past-workout headers */
export function intervalsLabel(count: number): string {
	return `${count} ${count === 1 ? 'interval' : 'intervals'}`;
}

/** "Reps & weight", "Time" or "Distance & time" */
export function measureLabel(measure: ExerciseMeasure): string {
	return { Reps: 'Reps & weight', Time: 'Time', DistanceTime: 'Distance & time' }[measure];
}
