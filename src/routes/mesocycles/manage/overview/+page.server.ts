import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';

export const load = async (event) => {
	event.depends('mesocycles:active');
	const trpc = createCaller(await createContext(event));
	return {
		activeMesocycle: trpc.mesocycles.findActiveMesocycle(),
		myRoutineNames: trpc.exerciseSplits
			.mine()
			.then((myRoutines) => myRoutines?.exerciseSplitDays.map((routine) => routine.name) ?? [])
	};
};
