import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';

export const load = async (event) => {
	event.depends('mesocycles:active');
	const trpc = createCaller(await createContext(event));
	return {
		// "Start immediately" only when no other mesocycle is running
		activeMesocycle: trpc.mesocycles.findActiveMesocycle()
	};
};
