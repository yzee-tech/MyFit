/**
 * The Exercises page: the only place an exercise is created or its details (name, muscle group,
 * bodyweight share, note, reps only) are changed. Routines and workouts pick exercises from this list.
 */
import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { updateExerciseEverywhere } from '$lib/server/exercises';
import { withRoutinesTransaction } from '$lib/server/blockCache';
import { MuscleGroupSchema } from '$lib/zodSchemas';
import type { ChangeType, Prisma, SetType, WeightUnit } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { isLevelUnit } from '$lib/utils/weightUnits';
import { DEFAULT_SETS, routineSetCount } from '$lib/utils/routineSets';
import { MAX_WEIGHTS_PER_SET, normalizeWeights } from '$lib/utils/weightSets';
import { APP_UPDATED_MESSAGE } from '$lib/trpc/appUpdated';
import { z } from 'zod';

export const exerciseDetailsInput = z
	.strictObject({
		name: z.string().trim().min(1).max(100),
		targetMuscleGroup: MuscleGroupSchema,
		customMuscleGroup: z.string().trim().max(60).nullable(),
		bodyweightFraction: z.number().min(0.01).max(2).nullable(),
		note: z.string().trim().max(1000).nullable(),
		repsOnly: z.boolean().default(false),
		maxReps: z.number().int().min(1).max(500).nullable().default(null),
		/** A machine with levels: lowest and highest level, and the step (1 or 0.5); null for weights */
		levels: z
			.strictObject({
				from: z.number().positive().max(1000),
				to: z.number().positive().max(1000),
				step: z.union([z.literal(1), z.literal(0.5)])
			})
			.nullable()
			.default(null),
		/**
		 * A machine with its own weights, in the unit printed on it; null for none. Missing (an app version from
		 * before machines) leaves the exercise's machine as it is
		 */
		machine: z
			.strictObject({
				weights: z.array(z.number().positive().max(10000)).min(1).max(MAX_WEIGHTS_PER_SET),
				unit: z.enum(['KG', 'LB'])
			})
			.nullable()
			.optional(),
		/** Its weights are help, or a higher level is more help. Missing leaves it as it is */
		assisted: z.boolean().optional()
	})
	// Reps only never adds load, so it has no machine either; and a machine has weights or levels, not both
	.refine((details) => !(details.repsOnly && details.levels !== null), {
		message: 'Pick either Reps only or machine levels'
	})
	.refine((details) => !(details.repsOnly && details.machine), {
		message: 'Pick either Reps only or a machine'
	})
	.refine((details) => !(details.levels !== null && details.machine), {
		message: 'A machine has weights or levels, not both'
	})
	.refine((details) => !(details.assisted && details.machine === null && details.levels === null), {
		message: 'Only a machine can be assisted'
	})
	.refine((details) => details.levels === null || details.levels.to >= details.levels.from, {
		message: 'The highest level must be at least the lowest'
	})
	.refine(
		(details) =>
			details.levels === null || (details.levels.to - details.levels.from) / details.levels.step < MAX_WEIGHTS_PER_SET,
		{ message: `At most ${MAX_WEIGHTS_PER_SET} levels` }
	)
	.transform(({ levels, machine, ...details }) => ({
		...details,
		// undefined: not sent, left as it is
		machineWeights: machine === undefined ? undefined : machine ? normalizeWeights(machine.weights) : [],
		machineUnit: machine === undefined ? undefined : (machine?.unit ?? null),
		levelsFrom: levels?.from ?? null,
		levelsTo: levels?.to ?? null,
		levelStep: levels?.step ?? null,
		customMuscleGroup: details.targetMuscleGroup === 'Custom' ? details.customMuscleGroup || null : null,
		note: details.note || null,
		// A rep cap only applies to reps-only exercises
		maxReps: details.repsOnly ? details.maxReps : null
	}))
	.refine((details) => details.targetMuscleGroup !== 'Custom' || details.customMuscleGroup, {
		message: 'Enter the muscle group'
	});

type RoutineSettings = {
	setType: SetType;
	repRangeStart: number;
	repRangeEnd: number;
	changeType: ChangeType | null;
	changeAmount: number | null;
	topRepRangeStart: number | null;
	topRepRangeEnd: number | null;
};

/** Routine settings for an exercise with no routine or workout to copy them from: Independent, 8–15 */
const DEFAULT_ROUTINE_SETTINGS: RoutineSettings = {
	setType: 'V2',
	repRangeStart: 8,
	repRangeEnd: 15,
	changeType: null,
	changeAmount: null,
	topRepRangeStart: null,
	topRepRangeEnd: null
};

const routineSettingsSelect = {
	exerciseId: true,
	setType: true,
	repRangeStart: true,
	repRangeEnd: true,
	changeType: true,
	changeAmount: true,
	topRepRangeStart: true,
	topRepRangeEnd: true
} as const;

/** Each exercise's routine settings from its most recent use: a workout, else My routines */
async function getRoutineSettings(userId: string, exerciseIds: string[]) {
	const [fromWorkouts, fromMyRoutines] = await Promise.all([
		prisma.workoutExercise.findMany({
			where: { exerciseId: { in: exerciseIds }, workout: { userId } },
			distinct: ['exerciseId'],
			orderBy: { workout: { startedAt: 'desc' } },
			select: routineSettingsSelect
		}),
		prisma.exerciseTemplate.findMany({
			where: { exerciseId: { in: exerciseIds }, exerciseSplitDay: { exerciseSplit: { userId } } },
			distinct: ['exerciseId'],
			select: routineSettingsSelect
		})
	]);
	const settings = new Map<string, RoutineSettings & { from: 'workout' | 'routine' }>();
	for (const { exerciseId, ...rest } of fromMyRoutines) {
		if (exerciseId) settings.set(exerciseId, { ...rest, from: 'routine' });
	}
	for (const { exerciseId, ...rest } of fromWorkouts) {
		if (exerciseId) settings.set(exerciseId, { ...rest, from: 'workout' });
	}
	return settings;
}

/**
 * A workout that has both exercises of a merge would list the merged one twice: its entries become
 * one, with all the sets in the order they were done (the first entry's, then the next one's).
 * Levels and weights aren't combined, as their loads mean different things.
 */
async function combineWorkoutDuplicates(tx: Prisma.TransactionClient, exerciseIds: string[]) {
	const entries = await tx.workoutExercise.findMany({
		where: { exerciseId: { in: exerciseIds } },
		select: { id: true, workoutId: true, exerciseIndex: true, weightUnit: true, _count: { select: { sets: true } } },
		orderBy: [{ workoutId: 'asc' }, { exerciseIndex: 'asc' }]
	});
	const byWorkout = new Map<string, typeof entries>();
	for (const entry of entries) byWorkout.set(entry.workoutId, [...(byWorkout.get(entry.workoutId) ?? []), entry]);
	for (const workoutEntries of byWorkout.values()) {
		if (workoutEntries.length < 2) continue;
		const [kept, ...others] = workoutEntries;
		const combined = others.filter((other) => isLevelUnit(other.weightUnit) === isLevelUnit(kept.weightUnit));
		let setCount = kept._count.sets;
		for (const other of combined) {
			await tx.workoutExerciseSet.updateMany({
				where: { workoutExerciseId: other.id },
				data: { workoutExerciseId: kept.id, setIndex: { increment: setCount } }
			});
			setCount += other._count.sets;
		}
		// Later exercises move up into the gap, last one removed first so the positions stay right
		for (const other of [...combined].reverse()) {
			await tx.workoutExercise.delete({ where: { id: other.id } });
			await tx.workoutExercise.updateMany({
				where: { workoutId: other.workoutId, exerciseIndex: { gt: other.exerciseIndex } },
				data: { exerciseIndex: { decrement: 1 } }
			});
		}
	}
}

type MachineSettings = { machineWeights: number[]; machineUnit: WeightUnit | null; assisted: boolean };

/**
 * The machine an exercise ends up with: what was sent, else what it has (an older app version doesn't know
 * machines). Refused when an older version would turn on levels or reps only for an exercise that is a machine
 * with weights: it can't see that setting, so it's asked to reopen the app
 */
function machineSettings(
	details: Pick<
		z.output<typeof exerciseDetailsInput>,
		'repsOnly' | 'levelsFrom' | 'machineWeights' | 'machineUnit' | 'assisted'
	>,
	stored: MachineSettings
): MachineSettings {
	if (details.machineWeights === undefined && stored.machineWeights.length > 0) {
		if (details.repsOnly || details.levelsFrom !== null) {
			throw new TRPCError({ code: 'PRECONDITION_FAILED', message: APP_UPDATED_MESSAGE });
		}
	}
	const machineWeights = details.machineWeights ?? stored.machineWeights;
	const machineUnit = machineWeights.length > 0 ? (details.machineUnit ?? stored.machineUnit) : null;
	if (machineWeights.length > 0 && machineUnit === null) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick the machine’s unit' });
	}
	// Only a machine can be assisted: weights or levels
	const isMachine = machineWeights.length > 0 || details.levelsFrom !== null;
	return { machineWeights, machineUnit, assisted: isMachine && (details.assisted ?? stored.assisted) };
}

async function findOwnExercise(userId: string, id: string) {
	const exercise = await prisma.exercise.findFirst({ where: { id, userId } });
	if (!exercise) throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
	return exercise;
}

/**
 * The one check that a name is free, for creating and renaming. Kept in this file on purpose: a second
 * copy elsewhere would let the two drift apart
 */
async function assertNameFree(userId: string, name: string, exceptId?: string) {
	const clash = await prisma.exercise.findUnique({ where: { userId_name: { userId, name } } });
	if (clash && clash.id !== exceptId) {
		throw new TRPCError({
			code: 'CONFLICT',
			message: clash.archived
				? `A deleted exercise called ${name} still has workouts. Merge into it, or pick another name`
				: `An exercise called ${name} already exists`
		});
	}
}

function mostCommon(values: number[]): number | undefined {
	const counts = new Map<number, number>();
	values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
	return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];
}

export const exercises = t.router({
	/** Every exercise, with where it's used */
	list: t.procedure.query(async ({ ctx }) => {
		const [allExercises, inRoutines, inWorkouts, lastDone] = await Promise.all([
			prisma.exercise.findMany({ where: { userId: ctx.userId }, orderBy: { name: 'asc' } }),
			prisma.exerciseTemplate.groupBy({
				by: ['exerciseId'],
				where: { exerciseSplitDay: { exerciseSplit: { userId: ctx.userId } } },
				_count: true
			}),
			prisma.workoutExercise.groupBy({
				by: ['exerciseId'],
				where: { workout: { userId: ctx.userId } },
				_count: true
			}),
			prisma.workoutExercise.findMany({
				where: { workout: { userId: ctx.userId } },
				distinct: ['exerciseId'],
				orderBy: { workout: { startedAt: 'desc' } },
				select: { exerciseId: true, workout: { select: { startedAt: true } } }
			})
		]);
		const count = (rows: { exerciseId: string | null; _count: number }[], id: string) =>
			rows.find((row) => row.exerciseId === id)?._count ?? 0;
		return allExercises.map((exercise) => ({
			...exercise,
			routineCount: count(inRoutines, exercise.id),
			workoutCount: count(inWorkouts, exercise.id),
			lastDoneAt: lastDone.find((row) => row.exerciseId === exercise.id)?.workout.startedAt ?? null
		}));
	}),

	/** Exercises to pick from in routines and workouts, with routine settings to start from */
	forPicker: t.procedure.query(async ({ ctx }) => {
		const available = await prisma.exercise.findMany({
			where: { userId: ctx.userId, archived: false },
			orderBy: { name: 'asc' }
		});
		const settings = await getRoutineSettings(
			ctx.userId,
			available.map((exercise) => exercise.id)
		);
		return available.map((exercise) => {
			const { from, ...routineSettings } = settings.get(exercise.id) ?? { ...DEFAULT_ROUTINE_SETTINGS, from: null };
			// Where they came from: its last workout, a routine in My routines, or neither (the defaults)
			return { ...exercise, routineSettings, settingsFrom: from };
		});
	}),

	/** One exercise: its details, the routines using it and its history */
	get: t.procedure.input(z.string().cuid2()).query(async ({ ctx, input }) => {
		const exercise = await findOwnExercise(ctx.userId, input);
		const [routineEntries, workoutCount, lastDone] = await Promise.all([
			prisma.exerciseTemplate.findMany({
				where: { exerciseId: exercise.id, exerciseSplitDay: { exerciseSplit: { userId: ctx.userId } } },
				include: { exerciseSplitDay: { select: { name: true } } },
				orderBy: { exerciseSplitDay: { dayIndex: 'asc' } }
			}),
			prisma.workoutExercise.count({ where: { exerciseId: exercise.id } }),
			prisma.workoutExercise.findFirst({
				where: { exerciseId: exercise.id },
				orderBy: { workout: { startedAt: 'desc' } },
				select: { workout: { select: { startedAt: true } } }
			})
		]);
		return {
			exercise,
			routineEntries: routineEntries.map((entry) => ({
				id: entry.id,
				routineName: entry.exerciseSplitDay.name,
				sets: routineSetCount(entry.sets),
				setType: entry.setType,
				repRangeStart: entry.repRangeStart,
				repRangeEnd: entry.repRangeEnd
			})),
			workoutCount,
			lastDoneAt: lastDone?.workout.startedAt ?? null
		};
	}),

	/** Routines an exercise can be added to: My routines */
	routineTargets: t.procedure.query(async ({ ctx }) => {
		const routines = await prisma.exerciseSplitDay.findMany({
			where: { exerciseSplit: { userId: ctx.userId } },
			orderBy: { dayIndex: 'asc' },
			select: { id: true, name: true, exercises: { select: { exerciseId: true } } }
		});
		return routines.map((routine) => ({
			id: routine.id,
			name: routine.name,
			exerciseIds: routine.exercises.map((ex) => ex.exerciseId)
		}));
	}),

	create: t.procedure.input(exerciseDetailsInput).mutation(async ({ ctx, input }) => {
		await assertNameFree(ctx.userId, input.name);
		const machine = machineSettings(input, { machineWeights: [], machineUnit: null, assisted: false });
		return prisma.exercise.create({ data: { ...input, ...machine, userId: ctx.userId } });
	}),

	/** Changes an exercise everywhere: routines, blocks and past workouts (a rename included) */
	update: t.procedure
		.input(z.strictObject({ id: z.string().cuid2(), details: exerciseDetailsInput }))
		.mutation(async ({ ctx, input }) => {
			const exercise = await findOwnExercise(ctx.userId, input.id);
			if (input.details.name !== exercise.name) await assertNameFree(ctx.userId, input.details.name, exercise.id);
			// The note and reps-only settings live on the exercise alone; the rest is copied everywhere
			const machine = machineSettings(input.details, exercise);
			const {
				note,
				repsOnly,
				maxReps,
				levelsFrom,
				levelsTo,
				levelStep,
				machineWeights,
				machineUnit,
				assisted,
				...shared
			} = input.details;
			await withRoutinesTransaction(async (tx) => {
				await updateExerciseEverywhere(tx, exercise.id, shared);
				await tx.exercise.update({
					where: { id: exercise.id },
					data: { note, repsOnly, maxReps, levelsFrom, levelsTo, levelStep, ...machine }
				});
			});
			return { message: 'Exercise saved' };
		}),

	/** Adds an exercise to the end of routines in My routines, with settings from its most recent use */
	addToRoutines: t.procedure
		.input(z.strictObject({ exerciseId: z.string().cuid2(), routineIds: z.array(z.string().cuid2()) }))
		.mutation(async ({ ctx, input }) => {
			const exercise = await findOwnExercise(ctx.userId, input.exerciseId);
			const { from, ...settings } = (await getRoutineSettings(ctx.userId, [exercise.id])).get(exercise.id) ?? {
				...DEFAULT_ROUTINE_SETTINGS,
				from: null
			};
			const details = {
				exerciseId: exercise.id,
				name: exercise.name,
				targetMuscleGroup: exercise.targetMuscleGroup,
				customMuscleGroup: exercise.customMuscleGroup,
				bodyweightFraction: exercise.bodyweightFraction,
				...settings
			};

			const added = await withRoutinesTransaction(async (tx) => {
				const routines = await tx.exerciseSplitDay.findMany({
					where: { id: { in: input.routineIds }, exerciseSplit: { userId: ctx.userId } },
					include: { exercises: { select: { exerciseId: true, exerciseIndex: true, sets: true } } }
				});
				if (routines.length !== input.routineIds.length) {
					throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
				}
				let count = 0;
				for (const routine of routines) {
					if (routine.exercises.some((ex) => ex.exerciseId === exercise.id)) continue;
					const exerciseIndex = Math.max(-1, ...routine.exercises.map((ex) => ex.exerciseIndex)) + 1;
					const sets = mostCommon(routine.exercises.map((ex) => routineSetCount(ex.sets))) ?? DEFAULT_SETS;
					await tx.exerciseTemplate.create({
						data: { ...details, exerciseIndex, sets, exerciseSplitDayId: routine.id }
					});
					count++;
				}
				return count;
			});
			return { added };
		}),

	removeFromRoutines: t.procedure
		.input(z.strictObject({ exerciseId: z.string().cuid2(), entryIds: z.array(z.string().cuid2()) }))
		.mutation(async ({ ctx, input }) => {
			const exercise = await findOwnExercise(ctx.userId, input.exerciseId);
			const removed = await withRoutinesTransaction(async (tx) => {
				const { count } = await tx.exerciseTemplate.deleteMany({
					where: {
						id: { in: input.entryIds },
						exerciseId: exercise.id,
						exerciseSplitDay: { exerciseSplit: { userId: ctx.userId } }
					}
				});
				return count;
			});
			return { removed };
		}),

	/**
	 * Removes an exercise from My routines. With workouts it's archived, so they keep it; without
	 * any, it's gone completely.
	 */
	delete: t.procedure.input(z.string().cuid2()).mutation(async ({ ctx, input }) => {
		const exercise = await findOwnExercise(ctx.userId, input);
		const workoutCount = await prisma.workoutExercise.count({ where: { exerciseId: exercise.id } });
		await withRoutinesTransaction(async (tx) => {
			await tx.exerciseTemplate.deleteMany({ where: { exerciseId: exercise.id } });
			if (workoutCount === 0) {
				await tx.exercise.delete({ where: { id: exercise.id } });
			} else {
				await tx.exercise.update({ where: { id: exercise.id }, data: { archived: true } });
			}
		});
		return { archived: workoutCount > 0 };
	}),

	/**
	 * Merges a duplicate (e.g. a misspelling) into another exercise: its workouts and routines move
	 * over, and it's removed
	 */
	merge: t.procedure
		.input(z.strictObject({ fromId: z.string().cuid2(), intoId: z.string().cuid2() }))
		.mutation(async ({ ctx, input }) => {
			if (input.fromId === input.intoId) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick a different exercise to merge into' });
			}
			const [from, into] = await Promise.all([
				findOwnExercise(ctx.userId, input.fromId),
				findOwnExercise(ctx.userId, input.intoId)
			]);
			const details = {
				exerciseId: into.id,
				name: into.name,
				targetMuscleGroup: into.targetMuscleGroup,
				customMuscleGroup: into.customMuscleGroup,
				bodyweightFraction: into.bodyweightFraction
			};

			await withRoutinesTransaction(async (tx) => {
				// A routine in My routines that already has both keeps just the one merged into
				const [fromEntries, intoEntries] = await Promise.all([
					tx.exerciseTemplate.findMany({
						where: { exerciseId: from.id },
						select: { id: true, exerciseSplitDayId: true }
					}),
					tx.exerciseTemplate.findMany({ where: { exerciseId: into.id }, select: { exerciseSplitDayId: true } })
				]);
				const routinesWithInto = new Set(intoEntries.map((entry) => entry.exerciseSplitDayId));
				const duplicates = fromEntries.filter((entry) => routinesWithInto.has(entry.exerciseSplitDayId));
				const moves = fromEntries.filter((entry) => !routinesWithInto.has(entry.exerciseSplitDayId));

				await combineWorkoutDuplicates(tx, [from.id, into.id]);
				await tx.exerciseTemplate.deleteMany({ where: { id: { in: duplicates.map((entry) => entry.id) } } });
				await tx.exerciseTemplate.updateMany({ where: { id: { in: moves.map((entry) => entry.id) } }, data: details });
				await tx.workoutExercise.updateMany({ where: { exerciseId: from.id }, data: details });
				await tx.exercise.update({ where: { id: into.id }, data: { archived: false } });
				await tx.exercise.delete({ where: { id: from.id } });
			});
			return { message: `Merged ${from.name} into ${into.name}` };
		})
});
