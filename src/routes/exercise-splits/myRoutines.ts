/**
 * My routines on the client: load the list, change it, save it whole. Every change (one routine edited,
 * a new one, a duplicate, a move, a delete, a template) starts from the list as the server has it now,
 * so it never undoes changes made elsewhere. The server keeps the current block in step on each save.
 */
import type { SplitExerciseTemplateWithoutIdsOrIndex } from '$lib/components/mesocycleAndExerciseSplit/commonTypes';
import { trpc } from '$lib/trpc/client';
import type { RoutineWeightUnit } from '$lib/utils/prismaEnums';
import { uniqueRoutineName } from '$lib/utils/routineNames';
import type { Prisma } from '@prisma/client';

/** A template or an import: routines with their exercises, without database ids */
export type FullExerciseSplitWithoutIdsOrIndex = Omit<
	Prisma.ExerciseSplitCreateWithoutUserInput,
	'exerciseSplitDays'
> & {
	exerciseSplitDays: (Omit<Prisma.ExerciseSplitDayCreateWithoutExerciseSplitInput, 'exercises' | 'dayIndex'> & {
		exercises: SplitExerciseTemplateWithoutIdsOrIndex[];
	})[];
};

/** A routine coming in from a template or an import */
export type RoutineToAdd = {
	name: string;
	isRestDay?: boolean;
	weightUnit?: RoutineWeightUnit;
	exercises: SplitExerciseTemplateWithoutIdsOrIndex[];
};

/** A routine of My routines as the client changes it */
export type MyRoutine = {
	name: string;
	weightUnit: RoutineWeightUnit;
	exercises: SplitExerciseTemplateWithoutIdsOrIndex[];
	/** Its name as saved (unset for a new one): a renamed routine keeps its place in the current block */
	previousName?: string;
};

/** Exercises without database ids or positions, which a save never takes */
export function withoutIds(exercises: readonly object[]): SplitExerciseTemplateWithoutIdsOrIndex[] {
	return exercises.map((exercise) => {
		const { id, exerciseSplitDayId, exerciseIndex, ...rest } = exercise as SplitExerciseTemplateWithoutIdsOrIndex & {
			id?: string;
			exerciseSplitDayId?: string;
			exerciseIndex?: number;
		};
		return structuredClone(rest);
	});
}

/** My routines as the server has them now, in order */
export async function fetchMyRoutines(): Promise<MyRoutine[]> {
	const list = await trpc().exerciseSplits.mine.query();
	return (list?.exerciseSplitDays ?? []).map((routine) => ({
		name: routine.name,
		weightUnit: routine.weightUnit,
		exercises: withoutIds(routine.exercises),
		previousName: routine.name
	}));
}

/** Saves My routines as given, in this order; the server's message */
export async function saveMyRoutines(routines: MyRoutine[]): Promise<string> {
	const { message } = await trpc().exerciseSplits.save.mutate({
		routines: routines.map((routine) => ({
			name: routine.name.trim(),
			weightUnit: routine.weightUnit,
			previousName: routine.previousName
		})),
		routineExercises: routines.map((routine) =>
			routine.exercises.map((exercise, exerciseIndex) => ({ ...exercise, exerciseIndex }))
		)
	});
	return message;
}

/** What a routine is, to tell whether it changed: name, unit and exercises */
export function routineFingerprint(routine: Pick<MyRoutine, 'name' | 'weightUnit' | 'exercises'>): string {
	return JSON.stringify({ name: routine.name.trim(), weightUnit: routine.weightUnit, exercises: routine.exercises });
}

/** Routines from a template or an import, after the ones there; a name already taken gets "(2)", "(3)"... */
export function withAddedRoutines(routines: MyRoutine[], incoming: RoutineToAdd[]): MyRoutine[] {
	const result = [...routines];
	// Rest days belonged to the old fixed rotation: only routines come in
	for (const routine of incoming.filter((routine) => !routine.isRestDay)) {
		result.push({
			name: uniqueRoutineName(
				routine.name,
				result.map((existing) => existing.name)
			),
			weightUnit: routine.weightUnit ?? 'KG',
			exercises: withoutIds(routine.exercises)
		});
	}
	return result;
}

/** A copy of a routine right below it, named "Name (2)" (or the next free number) */
export function withDuplicate(routines: MyRoutine[], name: string): MyRoutine[] {
	const idx = routines.findIndex((routine) => routine.name === name);
	if (idx === -1) return routines;
	const copy: MyRoutine = {
		name: uniqueRoutineName(
			name,
			routines.map((routine) => routine.name)
		),
		weightUnit: routines[idx].weightUnit,
		exercises: structuredClone(routines[idx].exercises)
	};
	return [...routines.slice(0, idx + 1), copy, ...routines.slice(idx + 1)];
}

/** A routine moved one place up (-1) or down (1) */
export function withMoved(routines: MyRoutine[], name: string, by: -1 | 1): MyRoutine[] {
	const idx = routines.findIndex((routine) => routine.name === name);
	const to = idx + by;
	if (idx === -1 || to < 0 || to >= routines.length) return routines;
	const result = [...routines];
	[result[idx], result[to]] = [result[to], result[idx]];
	return result;
}

/** Adds a template's or an import's routines to My routines and saves; how many were added */
export async function addToMyRoutines(incoming: RoutineToAdd[]): Promise<number> {
	const routines = await fetchMyRoutines();
	const next = withAddedRoutines(routines, incoming);
	await saveMyRoutines(next);
	return next.length - routines.length;
}

/** "Added 1 routine", "Added 3 routines" */
export function addedMessage(count: number) {
	return `Added ${count} ${count === 1 ? 'routine' : 'routines'}`;
}
