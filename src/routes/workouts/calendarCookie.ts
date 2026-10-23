/** Remembers on this phone that the Workouts calendar is hidden; only the Workouts page reads it */
export const CALENDAR_HIDDEN_COOKIE = 'myfit-calendar-hidden';

/** Sets it (hidden) or clears it, always with the same path so the two match */
export function rememberCalendarHidden(hidden: boolean) {
	const attributes = `path=/workouts; SameSite=Lax; max-age=${hidden ? 60 * 60 * 24 * 365 : 0}`;
	document.cookie = `${CALENDAR_HIDDEN_COOKIE}=${hidden ? '1' : ''}; ${attributes}`;
}
