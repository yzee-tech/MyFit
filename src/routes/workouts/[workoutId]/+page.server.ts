import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import type {
	Mesocycle,
	Workout,
	WorkoutExercise,
	WorkoutExerciseMiniSet,
	WorkoutExerciseSet,
	WorkoutOfMesocycle
} from '@prisma/client';

export const load = async (event) => {
	const trpc = createCaller(await createContext(event));
	const workout = trpc.workouts.findById(event.params.workoutId);
	return { workout };
};

export type FullWorkoutWithMesoData = Workout & {
	/** My routines still has the routine this workout was done from */
	routineExists: boolean;
	workoutOfMesocycle: (WorkoutOfMesocycle & { mesocycle: Mesocycle }) | null;
	workoutExercises: (WorkoutExercise & {
		sets: (WorkoutExerciseSet & { miniSets: WorkoutExerciseMiniSet[] })[];
	})[];
};
