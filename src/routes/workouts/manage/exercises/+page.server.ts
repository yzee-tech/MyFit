import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
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
	if (!routineName || editing || keepCurrent) return { workoutExercises: [] };

	const userBodyweight = parseFloat(event.url.searchParams.get('userBodyweight') ?? '');
	if (isNaN(userBodyweight) || userBodyweight <= 0) error(400, 'Invalid bodyweight');

	const sessionUnit = event.url.searchParams.get('sessionUnit');
	const sessionWeightSetId = event.url.searchParams.get('sessionWeightSetId') ?? undefined;

	const trpc = createCaller(await createContext(event));
	const serverData = trpc.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight,
		routineName,
		useActiveMesocycle,
		welcomeBack: event.url.searchParams.has('welcomeBack'),
		sessionUnit: sessionUnit === 'KG' || sessionUnit === 'LB' ? sessionUnit : undefined,
		sessionWeightSetId
	});
	return { serverData };
};
