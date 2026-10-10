import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
	const editing = event.url.searchParams.has('editing');
	// A routine of My routines by its name, done in the active block or not
	const useActiveMesocycle = event.url.searchParams.has('useActiveMesocycle');
	const routineName = event.url.searchParams.get('routine')?.trim() || undefined;
	// Old links name a block routine by its position
	const splitDayIndexParam = event.url.searchParams.get('splitDayIndex');
	const keepCurrent = event.url.searchParams.has('keepCurrent');
	if ((!routineName && splitDayIndexParam === null) || editing || keepCurrent) return { workoutExercises: [] };

	const userBodyweight = parseFloat(event.url.searchParams.get('userBodyweight') ?? '');
	if (isNaN(userBodyweight) || userBodyweight <= 0) error(400, 'Invalid bodyweight');

	let splitDayIndex: number | undefined;
	if (!routineName && splitDayIndexParam !== null) {
		splitDayIndex = parseInt(splitDayIndexParam);
		if (isNaN(splitDayIndex) || splitDayIndex < 0) error(400, 'Invalid split day index');
	}

	const sessionUnit = event.url.searchParams.get('sessionUnit');
	const sessionWeightSetId = event.url.searchParams.get('sessionWeightSetId') ?? undefined;

	const trpc = createCaller(await createContext(event));
	const serverData = trpc.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight,
		...(splitDayIndex !== undefined ? { splitDayIndex } : { routineName, useActiveMesocycle }),
		welcomeBack: event.url.searchParams.has('welcomeBack'),
		sessionUnit: sessionUnit === 'KG' || sessionUnit === 'LB' ? sessionUnit : undefined,
		sessionWeightSetId
	});
	return { serverData };
};
