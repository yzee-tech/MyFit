/** A workout over this long most likely wasn't saved straight away: worth checking its times */
export const LONG_WORKOUT_MINUTES = 3 * 60;

/** Whole minutes from start to end (never negative) */
export function workoutMinutes(startedAt: Date | string, endedAt: Date | string) {
	const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
	return Math.max(0, Math.floor(ms / 60000));
}

/** A workout's length, e.g. "45 min" or "1 h 8 min" */
export function formatWorkoutLength(startedAt: Date | string, endedAt: Date | string) {
	const minutes = workoutMinutes(startedAt, endedAt);
	const hours = Math.floor(minutes / 60);
	if (hours === 0) return `${minutes} min`;
	const rest = minutes % 60;
	return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** A running workout's clock, e.g. "0:52", "12:34" or "1:05:10" */
export function formatWorkoutClock(startedAt: Date | string, now: Date | string) {
	const seconds = Math.max(0, Math.floor((new Date(now).getTime() - new Date(startedAt).getTime()) / 1000));
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const pad = (value: number) => String(value).padStart(2, '0');
	const secondsPart = pad(seconds % 60);
	return hours > 0 ? `${hours}:${pad(minutes)}:${secondsPart}` : `${minutes}:${secondsPart}`;
}
