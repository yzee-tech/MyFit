/**
 * Every exercise is one record (Exercise), shared by the routines and workouts that use it. Its
 * name, muscle group and bodyweight share are the same everywhere: routines and workouts keep a
 * copy of them, and all changes go through here so the copies always match the exercise.
 */
import { prisma } from '$lib/prisma';
import { TRPCError } from '@trpc/server';
import type { DistanceUnit, ExerciseMeasure, MuscleGroup, Prisma, PrismaPromise } from '@prisma/client';
import { MuscleGroupSchema } from '$lib/zodSchemas';
import { isBuiltInMuscleName, secondaryMusclesFor } from '$lib/utils/muscleShares';

/** The details that belong to the exercise itself, not to a routine or a workout */
export type ExerciseDetails = {
	name: string;
	targetMuscleGroup: MuscleGroup;
	customMuscleGroup?: string | null;
	/** A list, or the same list the way a database write spells it */
	secondaryMuscleGroups?: MuscleGroup[] | { set: MuscleGroup[] };
	bodyweightFraction?: number | null;
	/** Only for an exercise the save has to make: how its rows were logged (reps unless said) */
	measure?: ExerciseMeasure;
	distanceUnit?: DistanceUnit | null;
};

export type ResolvedExercise = {
	id: string;
	name: string;
	targetMuscleGroup: MuscleGroup;
	customMuscleGroup: string | null;
	secondaryMuscleGroups: MuscleGroup[];
	bodyweightFraction: number | null;
};

/**
 * What a routine entry or a workout row copies from its exercise: the link, the name, the muscles and
 * the bodyweight share. Every copy goes through here, so a detail added to an exercise can't be left
 * out of one of them
 */
export function exerciseCopy(exercise: ResolvedExercise) {
	return {
		exerciseId: exercise.id,
		name: exercise.name,
		targetMuscleGroup: exercise.targetMuscleGroup,
		customMuscleGroup: exercise.customMuscleGroup,
		secondaryMuscleGroups: exercise.secondaryMuscleGroups,
		bodyweightFraction: exercise.bodyweightFraction
	};
}

/** A custom muscle group can't take the name of a built-in one: the two would read the same everywhere */
export function assertCustomMuscleName(targetMuscleGroup: MuscleGroup, customMuscleGroup: string | null | undefined) {
	if (targetMuscleGroup !== 'Custom' || !customMuscleGroup) return;
	if (isBuiltInMuscleName(customMuscleGroup, MuscleGroupSchema.options)) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: `“${customMuscleGroup.trim()}” is one of the muscle groups to pick from: pick it instead of Custom`
		});
	}
}

/** The details of an exercise a save has to make (it wasn't made on the Exercises page first) */
function detailsOf(item: ExerciseDetails) {
	assertCustomMuscleName(item.targetMuscleGroup, item.customMuscleGroup);
	const secondaries = Array.isArray(item.secondaryMuscleGroups)
		? item.secondaryMuscleGroups
		: item.secondaryMuscleGroups?.set;
	return {
		targetMuscleGroup: item.targetMuscleGroup,
		customMuscleGroup: item.customMuscleGroup ?? null,
		secondaryMuscleGroups: secondaryMusclesFor(item.targetMuscleGroup, secondaries),
		bodyweightFraction: item.bodyweightFraction ?? null
	};
}

/** Gives an exercise new details and copies them to My routines and past workouts */
export async function updateExerciseEverywhere(
	tx: Prisma.TransactionClient,
	exerciseId: string,
	data: Partial<Omit<ResolvedExercise, 'id'>>
) {
	await tx.exercise.update({ where: { id: exerciseId }, data });
	await tx.exerciseTemplate.updateMany({ where: { exerciseId }, data });
	await tx.workoutExercise.updateMany({ where: { exerciseId }, data });
}

/**
 * Finds the user's exercise for each name, creating any that don't exist yet (a template or an
 * import brings its own exercises). Existing exercises keep their details: those change only on
 * the Exercises page. `restore`: putting a deleted exercise back into a routine brings it back.
 *
 * Returns the exercises by name, and queries to run with the save (or, for a save in an interactive
 * transaction, the ids of exercises to bring back).
 */
export async function resolveExercises(
	userId: string,
	items: ExerciseDetails[],
	{ restore }: { restore: boolean }
): Promise<{ byName: Map<string, ResolvedExercise>; syncQueries: PrismaPromise<unknown>[]; restoreIds: string[] }> {
	const firstByName = new Map<string, ExerciseDetails>();
	items.forEach((item) => firstByName.set(item.name, firstByName.get(item.name) ?? item));
	const names = [...firstByName.keys()];
	if (names.length === 0) return { byName: new Map(), syncQueries: [], restoreIds: [] };

	const select = {
		id: true,
		name: true,
		targetMuscleGroup: true,
		customMuscleGroup: true,
		secondaryMuscleGroups: true,
		bodyweightFraction: true,
		archived: true
	} as const;
	let exercises = await prisma.exercise.findMany({ where: { userId, name: { in: names } }, select });
	const missing = names.filter((name) => !exercises.some((exercise) => exercise.name === name));
	if (missing.length > 0) {
		await prisma.exercise.createMany({
			data: missing.map((name) => {
				const item = firstByName.get(name)!;
				return {
					userId,
					name,
					...detailsOf(item),
					measure: item.measure ?? 'Reps',
					distanceUnit: item.measure === 'DistanceTime' ? (item.distanceUnit ?? 'KM') : null
				};
			}),
			skipDuplicates: true
		});
		exercises = await prisma.exercise.findMany({ where: { userId, name: { in: names } }, select });
	}

	const restoreIds = restore ? exercises.filter((exercise) => exercise.archived).map((exercise) => exercise.id) : [];
	const syncQueries: PrismaPromise<unknown>[] = restoreIds.map((id) =>
		prisma.exercise.update({ where: { id }, data: { archived: false } })
	);
	const byName = new Map<string, ResolvedExercise>();
	for (const { archived, ...exercise } of exercises) byName.set(exercise.name, exercise);
	return { byName, syncQueries, restoreIds };
}

/**
 * A routine's or workout's exercise, linked to its exercise and carrying its details. Anything a
 * client sent about the link itself is ignored.
 */
export function linkToExercise<T extends ExerciseDetails>(item: T, byName: Map<string, ResolvedExercise>) {
	const exercise = byName.get(item.name);
	if (!exercise) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Exercise ${item.name} not found` });
	// The measure hints are for making a missing exercise, not for its rows
	const {
		exercise: _link,
		exerciseId: _id,
		measure: _measure,
		distanceUnit: _distanceUnit,
		...rest
	} = item as T & { exercise?: unknown; exerciseId?: unknown };
	return { ...rest, ...exerciseCopy(exercise) };
}
