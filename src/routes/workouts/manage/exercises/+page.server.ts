import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
	const editing = event.url.searchParams.has('editing');
	const useActiveMesocycle = event.url.searchParams.has('useActiveMesocycle');
	// With no block: a routine of My routines, by its name
	const routineName = event.url.searchParams.get('routine')?.trim() || undefined;
	const keepCurrent = event.url.searchParams.has('keepCurrent');
	if ((!useActiveMesocycle && !routineName) || editing || keepCurrent) return { workoutExercises: [] };

	const userBodyweight = parseFloat(event.url.searchParams.get('userBodyweight') ?? '');
	if (isNaN(userBodyweight) || userBodyweight <= 0) error(400, 'Invalid bodyweight');

	let splitDayIndex: number | undefined;
	if (useActiveMesocycle) {
		splitDayIndex = parseInt(event.url.searchParams.get('splitDayIndex') ?? '');
		if (isNaN(splitDayIndex) || splitDayIndex < 0) error(400, 'Invalid split day index');
	}

	const sessionUnit = event.url.searchParams.get('sessionUnit');
	const sessionWeightSetId = event.url.searchParams.get('sessionWeightSetId') ?? undefined;

	const trpc = createCaller(await createContext(event));
	const serverData = trpc.workouts.getWorkoutExercisesWithPreviousData({
		userBodyweight,
		...(useActiveMesocycle ? { splitDayIndex } : { routineName }),
		welcomeBack: event.url.searchParams.has('welcomeBack'),
		sessionUnit: sessionUnit === 'KG' || sessionUnit === 'LB' ? sessionUnit : undefined,
		sessionWeightSetId
	});
	return { serverData };
};
