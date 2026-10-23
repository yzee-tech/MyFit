import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import { CALENDAR_HIDDEN_COOKIE } from './calendarCookie';

export const load = async (event) => {
	event.depends('workouts:all');
	const trpc = createCaller(await createContext(event));

	const filterData = trpc.workouts.getFilterData();
	// Hidden on this phone (set by the page's Hide calendar): so the first paint is already right
	const calendarHidden = event.cookies.get(CALENDAR_HIDDEN_COOKIE) === '1';
	return { filterData, calendarHidden };
};
