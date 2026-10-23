import { blankWorkoutName } from './workoutNames';

/**
 * Days on the phone's calendar. Everything is built from local date parts (never toISOString, which
 * is the UTC date: a workout done at 6 am in Hong Kong would land on the day before), and a day's end
 * is the next day's midnight (setDate, not + 24 hours, so a clock change keeps the days right)
 */

/**
 * Workouts sorted into the phone's days (YYYY-MM-DD), with the names a calendar shows: the routine,
 * or a blank workout's time of day without "workout" ("Morning")
 */
export function calendarDayNames(workouts: { startedAt: Date | string; routineName: string | null }[]) {
	const days = new Map<string, string[]>();
	for (const workout of workouts) {
		const key = localDayKey(new Date(workout.startedAt));
		const name = workout.routineName ?? blankWorkoutName(workout.startedAt).replace(/ workout$/, '');
		days.set(key, [...(days.get(key) ?? []), name]);
	}
	return days;
}

/** A local day as YYYY-MM-DD, e.g. for the page link or as a key */
export function localDayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/** Local midnight of a YYYY-MM-DD day, or null if it isn't one (a bad format, or 2026-02-30) */
export function parseLocalDay(value: string | null | undefined): Date | null {
	const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const date = new Date(year, month - 1, day);
	// A day that doesn't exist rolls over into the next month: refused
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
	return date;
}

/** Midnight of the day after */
export function nextDay(day: Date): Date {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
}

/** The moments a pick of days covers: from the first day's midnight to the midnight after the last */
export function pickedBounds(from: Date, to: Date): { from: Date; to: Date } {
	return { from, to: nextDay(to) };
}

export type CalendarMonth = { year: number; month: number };

export const monthOf = (date: Date): CalendarMonth => ({ year: date.getFullYear(), month: date.getMonth() });
export const monthStart = ({ year, month }: CalendarMonth) => new Date(year, month, 1);
export const addMonths = ({ year, month }: CalendarMonth, count: number): CalendarMonth =>
	monthOf(new Date(year, month + count, 1));
/** -1, 0 or 1 */
export const compareMonths = (a: CalendarMonth, b: CalendarMonth) =>
	Math.sign(a.year * 12 + a.month - (b.year * 12 + b.month));

/** How a pick reads, e.g. "Fri, Oct 16", "Oct 5 – 12" or "Sep 28 – Oct 5" */
export function describePick(from: Date, to: Date): string {
	if (+from === +to) return from.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	return describeDates(from, to);
}

/** Two dates as a span: the month once if they share it, and the year only if it isn't this one */
export function describeDates(from: Date, to: Date, now = new Date()): string {
	const withYear = from.getFullYear() !== now.getFullYear() || to.getFullYear() !== now.getFullYear();
	const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', ...(withYear && { year: 'numeric' }) };
	if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth() && !withYear) {
		return `${from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${to.getDate()}`;
	}
	return `${from.toLocaleDateString(undefined, options)} – ${to.toLocaleDateString(undefined, options)}`;
}

/**
 * The Showing box's second line for days picked on a calendar: while a held day waits for the other
 * end of its range, what to do next; for one day, how to pick a range; for a range, nothing
 */
export function pickHint(picked: { from: string; to: string } | null, rangeStart: string | null): string | null {
	// Hints are about days picked: none for the filters
	if (!picked) return null;
	const start = parseLocalDay(rangeStart);
	if (start)
		return `From ${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: now tap the last day`;
	if (picked.from === picked.to) return 'Tip: hold a day to pick a range';
	return null;
}
