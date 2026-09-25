import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
	const editing = event.url.searchParams.has('editing');
	const useActiveMesocycle = event.url.searchParams.has('useActiveMesocycle');
	const keepCurrent = event.url.searchParams.has('keepCurrent');
	if (!useActiveMesocycle || editing || keepCurrent) return { workoutExercises: [] };

	const userBodyweight = parseFloat(event.url.searchParams.get('userBodyweight') ?? '');
	if (isNaN(userBodyweight) || userBodyweight <= 0) error(400, 'Invalid bodyweight');

	const splitDayIndex = parseInt(event.url.searchParams.get('splitDayIndex') ?? '');
	if (isNaN(splitDayIndex) || splitDayIndex < 0) error(400, 'Invalid split day index');

	const sessionUnit = event.url.searchParams.get('sessionUnit');

	const trpc = createCaller(await createContext(event));
	const serverData = trpc.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight,
		splitDayIndex,
		welcomeBack: event.url.searchParams.has('welcomeBack'),
		sessionUnit: sessionUnit === 'KG' || sessionUnit === 'LB' ? sessionUnit : undefined
	});
	return { serverData };
};
