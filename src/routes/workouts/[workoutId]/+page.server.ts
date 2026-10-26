import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import type {
	DistanceUnit,
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
	workoutOfMesocycle: (WorkoutOfMesocycle & { mesocycle: Mesocycle }) | null;
	workoutExercises: (WorkoutExercise & {
		sets: (WorkoutExerciseSet & { miniSets: WorkoutExerciseMiniSet[] })[];
		/** The exercise it's linked to, for the unit its distances show in; none for an unlinked row */
		exercise?: { distanceUnit: DistanceUnit | null } | null;
	})[];
};
