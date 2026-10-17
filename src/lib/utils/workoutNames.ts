/**
 * A blank workout's name, from when it started (local time), e.g. "Morning workout". Only shown, never
 * saved: a workout's routineName means it was done from a routine (Save as routine, the routine
 * changes question), so a blank workout keeps none
 */
export function blankWorkoutName(startedAt: Date | string): string {
	const hour = new Date(startedAt).getHours();
	if (hour >= 5 && hour < 12) return 'Morning workout';
	if (hour >= 12 && hour < 14) return 'Noon workout';
	if (hour >= 14 && hour < 17) return 'Afternoon workout';
	return 'Evening workout';
}

/** What a workout is called: its routine's name, or a blank workout's time-of-day name */
export function workoutName(workout: { routineName: string | null | undefined; startedAt: Date | string }): string {
	return workout.routineName ?? blankWorkoutName(workout.startedAt);
}
