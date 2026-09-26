/**
 * Every exercise is one record (Exercise), shared by the routines and workouts that use it. Its
 * name, muscle group and bodyweight share are the same everywhere: routines and workouts keep a
 * copy of them, and all changes go through here so the copies always match the exercise.
 */
import { prisma } from '$lib/prisma';
import { TRPCError } from '@trpc/server';
import type { MuscleGroup, PrismaPromise } from '@prisma/client';

/** The details that belong to the exercise itself, not to a routine or a workout */
export type ExerciseDetails = {
	name: string;
	targetMuscleGroup: MuscleGroup;
	customMuscleGroup?: string | null;
	bodyweightFraction?: number | null;
};

export type ResolvedExercise = {
	id: string;
	name: string;
	targetMuscleGroup: MuscleGroup;
	customMuscleGroup: string | null;
	bodyweightFraction: number | null;
};

function detailsOf(item: ExerciseDetails) {
	return {
		targetMuscleGroup: item.targetMuscleGroup,
		customMuscleGroup: item.customMuscleGroup ?? null,
		bodyweightFraction: item.bodyweightFraction ?? null
	};
}

function sameDetails(a: ReturnType<typeof detailsOf>, b: ReturnType<typeof detailsOf>) {
	return (
		a.targetMuscleGroup === b.targetMuscleGroup &&
		a.customMuscleGroup === b.customMuscleGroup &&
		a.bodyweightFraction === b.bodyweightFraction
	);
}

/** Queries that give an exercise new details and copy them to every routine and workout using it */
export function updateExerciseEverywhere(
	exerciseId: string,
	data: Partial<Omit<ResolvedExercise, 'id'>>
): PrismaPromise<unknown>[] {
	return [
		prisma.exercise.update({ where: { id: exerciseId }, data }),
		prisma.exerciseTemplate.updateMany({ where: { exerciseId }, data }),
		prisma.mesocycleExerciseTemplate.updateMany({ where: { exerciseId }, data }),
		prisma.workoutExercise.updateMany({ where: { exerciseId }, data })
	];
}

/**
 * Finds the user's exercise for each name, creating the ones that don't exist yet.
 * - `define`: an editor of routines or workouts, where details given here become the exercise's
 *   details, everywhere it's used
 * - `link`: existing exercises keep their details (e.g. a new block or library made from a copy)
 *
 * Returns the exercises by name, and the queries to run with the save that keep every copy in
 * step. Exercises are created straight away; an unused one is harmless.
 */
export async function resolveExercises(
	userId: string,
	items: ExerciseDetails[],
	mode: 'define' | 'link'
): Promise<{ byName: Map<string, ResolvedExercise>; syncQueries: PrismaPromise<unknown>[] }> {
	const itemsByName = new Map<string, ExerciseDetails[]>();
	items.forEach((item) => itemsByName.set(item.name, [...(itemsByName.get(item.name) ?? []), item]));
	const names = [...itemsByName.keys()];
	if (names.length === 0) return { byName: new Map(), syncQueries: [] };

	const select = {
		id: true,
		name: true,
		targetMuscleGroup: true,
		customMuscleGroup: true,
		bodyweightFraction: true,
		archived: true
	} as const;
	let exercises = await prisma.exercise.findMany({ where: { userId, name: { in: names } }, select });
	const missing = names.filter((name) => !exercises.some((exercise) => exercise.name === name));
	if (missing.length > 0) {
		await prisma.exercise.createMany({
			data: missing.map((name) => ({ userId, name, ...detailsOf(itemsByName.get(name)![0]) })),
			skipDuplicates: true
		});
		exercises = await prisma.exercise.findMany({ where: { userId, name: { in: names } }, select });
	}

	const syncQueries: PrismaPromise<unknown>[] = [];
	const byName = new Map<string, ResolvedExercise>();
	for (const exercise of exercises) {
		const { archived, ...resolved } = exercise;
		// Used again, so no longer deleted
		if (archived) syncQueries.push(prisma.exercise.update({ where: { id: exercise.id }, data: { archived: false } }));

		if (mode === 'define') {
			// Of several copies in one save, the one that differs is the one that was edited
			const current = detailsOf(exercise);
			const edited = itemsByName
				.get(exercise.name)!
				.map(detailsOf)
				.find((details) => !sameDetails(details, current));
			if (edited) {
				syncQueries.push(...updateExerciseEverywhere(exercise.id, edited));
				Object.assign(resolved, edited);
			}
		}
		byName.set(exercise.name, resolved);
	}
	return { byName, syncQueries };
}

/**
 * A routine's or workout's exercise, linked to its exercise and carrying its details. Anything a
 * client sent about the link itself is ignored.
 */
export function linkToExercise<T extends ExerciseDetails>(item: T, byName: Map<string, ResolvedExercise>) {
	const exercise = byName.get(item.name);
	if (!exercise) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Exercise ${item.name} not found` });
	const { exercise: _link, exerciseId: _id, ...rest } = item as T & { exercise?: unknown; exerciseId?: unknown };
	return {
		...rest,
		exerciseId: exercise.id,
		name: exercise.name,
		targetMuscleGroup: exercise.targetMuscleGroup,
		customMuscleGroup: exercise.customMuscleGroup,
		bodyweightFraction: exercise.bodyweightFraction
	};
}

/** Renames an exercise everywhere: routines, blocks and past workouts all follow */
export async function renameExercise(userId: string, oldName: string, newName: string) {
	const trimmed = newName.trim();
	if (!trimmed) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Enter a name' });
	const exercise = await prisma.exercise.findUnique({ where: { userId_name: { userId, name: oldName } } });
	if (!exercise) throw new TRPCError({ code: 'NOT_FOUND', message: `Exercise ${oldName} not found` });
	if (trimmed === oldName) return exercise;
	const clash = await prisma.exercise.findUnique({ where: { userId_name: { userId, name: trimmed } } });
	if (clash) throw new TRPCError({ code: 'CONFLICT', message: `An exercise called ${trimmed} already exists` });
	await prisma.$transaction(updateExerciseEverywhere(exercise.id, { name: trimmed }));
	return exercise;
}
