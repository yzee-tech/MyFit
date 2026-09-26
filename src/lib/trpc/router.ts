import { t } from '$lib/trpc/t';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { exerciseSplits } from './routes/exerciseSplits';
import { mesocycles } from './routes/mesocycles';
import { workouts } from './routes/workouts';
import { users } from './routes/users';
import { weightSets } from './routes/weightSets';
import { exercises } from './routes/exercises';

export const router = t.router({
	exerciseSplits,
	mesocycles,
	workouts,
	users,
	weightSets,
	exercises
});

export const createCaller = t.createCallerFactory(router);
export type Router = typeof router;

export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
