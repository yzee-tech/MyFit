import { error, redirect } from '@sveltejs/kit';

export const load = async (event) => {
	const editing = event.url.searchParams.has('editing');
	// A routine of My routines by its name, done in the active block or not
	const useActiveMesocycle = event.url.searchParams.has('useActiveMesocycle');
	const routineName = event.url.searchParams.get('routine')?.trim() || undefined;
	const keepCurrent = event.url.searchParams.has('keepCurrent');
	// An old link names the routine by its position, which no longer means anything: pick it again
	if (!routineName && event.url.searchParams.has('splitDayIndex') && !editing && !keepCurrent) {
		redirect(303, '/workouts/manage/start');
	}
	// Nothing to fetch (the page starts with no exercises)
	if (!routineName || editing) return { suggestionsRequest: null };

	const userBodyweight = parseFloat(event.url.searchParams.get('userBodyweight') ?? '');
	if (isNaN(userBodyweight) || userBodyweight <= 0) {
		// An old resume link has no bodyweight: nothing to ask for, and nothing to refuse
		if (keepCurrent) return { suggestionsRequest: null };
		error(400, 'Invalid bodyweight');
	}

	const sessionUnit = event.url.searchParams.get('sessionUnit');
	const sessionWeightSetId = event.url.searchParams.get('sessionWeightSetId') ?? undefined;

	// The page asks for the suggestions itself, with the phone's timezone (the week is counted in its days)
	return {
		suggestionsRequest: {
			userBodyweight,
			routineName,
			useActiveMesocycle,
			welcomeBack: event.url.searchParams.has('welcomeBack'),
			sessionUnit: sessionUnit === 'KG' ? ('KG' as const) : sessionUnit === 'LB' ? ('LB' as const) : undefined,
			sessionWeightSetId
		}
	};
};
