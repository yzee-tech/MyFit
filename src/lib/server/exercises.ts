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
 * Finds the user's exercise for each name, creating any that don't exist yet (a template or an
 * import brings its own exercises). Existing exercises keep their details: those change only on
 * the Exercises page. `restore`: putting a deleted exercise back into a routine brings it back.
 *
 * Returns the exercises by name, and queries to run with the save.
 */
export async function resolveExercises(
	userId: string,
	items: ExerciseDetails[],
	{ restore }: { restore: boolean }
): Promise<{ byName: Map<string, ResolvedExercise>; syncQueries: PrismaPromise<unknown>[] }> {
	const firstByName = new Map<string, ExerciseDetails>();
	items.forEach((item) => firstByName.set(item.name, firstByName.get(item.name) ?? item));
	const names = [...firstByName.keys()];
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
			data: missing.map((name) => ({ userId, name, ...detailsOf(firstByName.get(name)!) })),
			skipDuplicates: true
		});
		exercises = await prisma.exercise.findMany({ where: { userId, name: { in: names } }, select });
	}

	const syncQueries: PrismaPromise<unknown>[] = [];
	const byName = new Map<string, ResolvedExercise>();
	for (const { archived, ...exercise } of exercises) {
		if (archived && restore) {
			syncQueries.push(prisma.exercise.update({ where: { id: exercise.id }, data: { archived: false } }));
		}
		byName.set(exercise.name, exercise);
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
