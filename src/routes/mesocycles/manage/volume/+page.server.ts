import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
	const exerciseSplitId = event.url.searchParams.get('exerciseSplitId');
	if (!exerciseSplitId) error(400, 'No exercise split ID given');

	const tRPC = createCaller(await createContext(event));
	const exerciseSplit = tRPC.exerciseSplits.findById(exerciseSplitId);
	return { exerciseSplit };
};
