/**
 * The Exercises page: the only place an exercise is created or its details (name, muscle group,
 * bodyweight share, note) are changed. Routines and workouts pick exercises from this list.
 */
import { prisma } from '$lib/prisma';
import { t } from '$lib/trpc/t';
import { updateExerciseEverywhere } from '$lib/server/exercises';
import { commonExercisePerMuscleGroup } from '$lib/common/commonExercises';
import { MuscleGroupSchema } from '$lib/zodSchemas';
import type { ChangeType, PrismaPromise, SetType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const exerciseDetailsInput = z
	.strictObject({
		name: z.string().trim().min(1).max(100),
		targetMuscleGroup: MuscleGroupSchema,
		customMuscleGroup: z.string().trim().max(60).nullable(),
		bodyweightFraction: z.number().min(0.01).max(2).nullable(),
		note: z.string().trim().max(1000).nullable()
	})
	.transform((details) => ({
		...details,
		customMuscleGroup: details.targetMuscleGroup === 'Custom' ? details.customMuscleGroup || null : null,
		note: details.note || null
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

/** Routine settings for an exercise with no routine or workout to copy them from */
const DEFAULT_ROUTINE_SETTINGS: RoutineSettings = {
	setType: 'Straight',
	repRangeStart: 8,
	repRangeEnd: 12,
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

/** Each exercise's routine settings from its most recent use: a workout, else a block, else a library */
async function getRoutineSettings(userId: string, exerciseIds: string[]) {
	const [fromWorkouts, fromBlocks, fromLibraries] = await Promise.all([
		prisma.workoutExercise.findMany({
			where: { exerciseId: { in: exerciseIds }, workout: { userId } },
			distinct: ['exerciseId'],
			orderBy: { workout: { startedAt: 'desc' } },
			select: routineSettingsSelect
		}),
		prisma.mesocycleExerciseTemplate.findMany({
			where: { exerciseId: { in: exerciseIds }, mesocycleExerciseSplitDay: { mesocycle: { userId } } },
			distinct: ['exerciseId'],
			select: routineSettingsSelect
		}),
		prisma.exerciseTemplate.findMany({
			where: { exerciseId: { in: exerciseIds }, exerciseSplitDay: { exerciseSplit: { userId } } },
			distinct: ['exerciseId'],
			select: routineSettingsSelect
		})
	]);
	const settings = new Map<string, RoutineSettings>();
	for (const { exerciseId, ...rest } of [...fromLibraries, ...fromBlocks, ...fromWorkouts]) {
		if (exerciseId) settings.set(exerciseId, rest);
	}
	return settings;
}

/** A built-in exercise's usual sets and reps, for one of yours with the same name that isn't used yet */
function builtInRoutineSettings(name: string): RoutineSettings | undefined {
	const builtIn = commonExercisePerMuscleGroup
		.flatMap((group) => group.exercises)
		.find((exercise) => exercise.name === name);
	if (!builtIn) return undefined;
	return {
		setType: builtIn.setType,
		repRangeStart: builtIn.repRangeStart,
		repRangeEnd: builtIn.repRangeEnd,
		changeType: builtIn.changeType ?? null,
		changeAmount: builtIn.changeAmount ?? null,
		topRepRangeStart: builtIn.topRepRangeStart ?? null,
		topRepRangeEnd: builtIn.topRepRangeEnd ?? null
	};
}

function getActiveBlock(userId: string) {
	return prisma.mesocycle.findFirst({
		where: { userId, startDate: { not: null }, endDate: null },
		select: { id: true, name: true }
	});
}

async function findOwnExercise(userId: string, id: string) {
	const exercise = await prisma.exercise.findFirst({ where: { id, userId } });
	if (!exercise) throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
	return exercise;
}

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
		const activeBlock = await getActiveBlock(ctx.userId);
		const [allExercises, inLibraries, inBlock, inWorkouts, lastDone] = await Promise.all([
			prisma.exercise.findMany({ where: { userId: ctx.userId }, orderBy: { name: 'asc' } }),
			prisma.exerciseTemplate.groupBy({
				by: ['exerciseId'],
				where: { exerciseSplitDay: { exerciseSplit: { userId: ctx.userId } } },
				_count: true
			}),
			activeBlock
				? prisma.mesocycleExerciseTemplate.groupBy({
						by: ['exerciseId'],
						where: { mesocycleExerciseSplitDay: { mesocycleId: activeBlock.id } },
						_count: true
					})
				: [],
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
			routineCount: count(inLibraries, exercise.id) + count(inBlock, exercise.id),
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
		return available.map((exercise) => ({
			...exercise,
			routineSettings: settings.get(exercise.id) ?? builtInRoutineSettings(exercise.name) ?? DEFAULT_ROUTINE_SETTINGS
		}));
	}),

	/** One exercise: its details, the routines using it and its history */
	get: t.procedure.input(z.string().cuid2()).query(async ({ ctx, input }) => {
		const exercise = await findOwnExercise(ctx.userId, input);
		const activeBlock = await getActiveBlock(ctx.userId);
		const [libraryEntries, blockEntries, workoutCount, lastDone] = await Promise.all([
			prisma.exerciseTemplate.findMany({
				where: { exerciseId: exercise.id },
				include: { exerciseSplitDay: { include: { exerciseSplit: { select: { id: true, name: true } } } } },
				orderBy: { exerciseSplitDay: { dayIndex: 'asc' } }
			}),
			activeBlock
				? prisma.mesocycleExerciseTemplate.findMany({
						where: { exerciseId: exercise.id, mesocycleExerciseSplitDay: { mesocycleId: activeBlock.id } },
						include: { mesocycleExerciseSplitDay: { select: { name: true, dayIndex: true } } },
						orderBy: { mesocycleExerciseSplitDay: { dayIndex: 'asc' } }
					})
				: [],
			prisma.workoutExercise.count({ where: { exerciseId: exercise.id } }),
			prisma.workoutExercise.findFirst({
				where: { exerciseId: exercise.id },
				orderBy: { workout: { startedAt: 'desc' } },
				select: { workout: { select: { startedAt: true } } }
			})
		]);
		return {
			exercise,
			activeBlock,
			libraryEntries: libraryEntries.map((entry) => ({
				id: entry.id,
				libraryId: entry.exerciseSplitDay.exerciseSplit.id,
				libraryName: entry.exerciseSplitDay.exerciseSplit.name,
				routineName: entry.exerciseSplitDay.name,
				setType: entry.setType,
				repRangeStart: entry.repRangeStart,
				repRangeEnd: entry.repRangeEnd
			})),
			blockEntries: blockEntries.map((entry) => ({
				id: entry.id,
				routineName: entry.mesocycleExerciseSplitDay.name,
				sets: entry.sets,
				setType: entry.setType,
				repRangeStart: entry.repRangeStart,
				repRangeEnd: entry.repRangeEnd
			})),
			workoutCount,
			lastDoneAt: lastDone?.workout.startedAt ?? null
		};
	}),

	/** Routines an exercise can be added to: every library's, and the current block's */
	routineTargets: t.procedure.query(async ({ ctx }) => {
		const [libraries, activeBlock] = await Promise.all([
			prisma.exerciseSplit.findMany({
				where: { userId: ctx.userId },
				orderBy: { name: 'asc' },
				select: {
					id: true,
					name: true,
					exerciseSplitDays: {
						where: { isRestDay: false },
						orderBy: { dayIndex: 'asc' },
						select: { id: true, name: true, exercises: { select: { exerciseId: true } } }
					}
				}
			}),
			prisma.mesocycle.findFirst({
				where: { userId: ctx.userId, startDate: { not: null }, endDate: null },
				select: {
					id: true,
					name: true,
					mesocycleExerciseSplitDays: {
						where: { isRestDay: false },
						orderBy: { dayIndex: 'asc' },
						select: { id: true, name: true, mesocycleSplitDayExercises: { select: { exerciseId: true } } }
					}
				}
			})
		]);
		return {
			libraries: libraries.map((library) => ({
				id: library.id,
				name: library.name,
				routines: library.exerciseSplitDays.map((day) => ({
					id: day.id,
					name: day.name,
					exerciseIds: day.exercises.map((ex) => ex.exerciseId)
				}))
			})),
			activeBlock: activeBlock && {
				id: activeBlock.id,
				name: activeBlock.name,
				routines: activeBlock.mesocycleExerciseSplitDays.map((day) => ({
					id: day.id,
					name: day.name,
					exerciseIds: day.mesocycleSplitDayExercises.map((ex) => ex.exerciseId)
				}))
			}
		};
	}),

	create: t.procedure.input(exerciseDetailsInput).mutation(async ({ ctx, input }) => {
		await assertNameFree(ctx.userId, input.name);
		return prisma.exercise.create({ data: { ...input, userId: ctx.userId } });
	}),

	/** Changes an exercise everywhere: routines, blocks and past workouts (a rename included) */
	update: t.procedure
		.input(z.strictObject({ id: z.string().cuid2(), details: exerciseDetailsInput }))
		.mutation(async ({ ctx, input }) => {
			const exercise = await findOwnExercise(ctx.userId, input.id);
			if (input.details.name !== exercise.name) await assertNameFree(ctx.userId, input.details.name, exercise.id);
			const { note, ...shared } = input.details;
			await prisma.$transaction([
				...updateExerciseEverywhere(exercise.id, shared),
				prisma.exercise.update({ where: { id: exercise.id }, data: { note } })
			]);
			return { message: 'Exercise saved' };
		}),

	/** Adds an exercise to the end of routines, with settings from its most recent use */
	addToRoutines: t.procedure
		.input(
			z.strictObject({
				exerciseId: z.string().cuid2(),
				libraryRoutineIds: z.array(z.string().cuid2()),
				blockRoutineIds: z.array(z.string().cuid2())
			})
		)
		.mutation(async ({ ctx, input }) => {
			const exercise = await findOwnExercise(ctx.userId, input.exerciseId);
			const settings = (await getRoutineSettings(ctx.userId, [exercise.id])).get(exercise.id) ??
				builtInRoutineSettings(exercise.name) ?? { ...DEFAULT_ROUTINE_SETTINGS };
			const details = {
				exerciseId: exercise.id,
				name: exercise.name,
				targetMuscleGroup: exercise.targetMuscleGroup,
				customMuscleGroup: exercise.customMuscleGroup,
				bodyweightFraction: exercise.bodyweightFraction,
				...settings
			};

			const [libraryRoutines, blockRoutines] = await Promise.all([
				prisma.exerciseSplitDay.findMany({
					where: { id: { in: input.libraryRoutineIds }, exerciseSplit: { userId: ctx.userId } },
					include: { exercises: { select: { exerciseId: true, exerciseIndex: true } } }
				}),
				prisma.mesocycleExerciseSplitDay.findMany({
					where: {
						id: { in: input.blockRoutineIds },
						mesocycle: { userId: ctx.userId, startDate: { not: null }, endDate: null }
					},
					include: { mesocycleSplitDayExercises: { select: { exerciseId: true, exerciseIndex: true, sets: true } } }
				})
			]);
			if (
				libraryRoutines.length !== input.libraryRoutineIds.length ||
				blockRoutines.length !== input.blockRoutineIds.length
			) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
			}

			const queries: PrismaPromise<unknown>[] = [];
			for (const routine of libraryRoutines) {
				if (routine.exercises.some((ex) => ex.exerciseId === exercise.id)) continue;
				const exerciseIndex = Math.max(-1, ...routine.exercises.map((ex) => ex.exerciseIndex)) + 1;
				queries.push(
					prisma.exerciseTemplate.create({ data: { ...details, exerciseIndex, exerciseSplitDayId: routine.id } })
				);
			}
			for (const routine of blockRoutines) {
				const existing = routine.mesocycleSplitDayExercises;
				if (existing.some((ex) => ex.exerciseId === exercise.id)) continue;
				const exerciseIndex = Math.max(-1, ...existing.map((ex) => ex.exerciseIndex)) + 1;
				const sets = mostCommon(existing.map((ex) => ex.sets)) ?? 3;
				queries.push(
					prisma.mesocycleExerciseTemplate.create({
						data: { ...details, exerciseIndex, sets, mesocycleExerciseSplitDayId: routine.id }
					})
				);
			}
			await prisma.$transaction(queries);
			return { added: queries.length };
		}),

	removeFromRoutines: t.procedure
		.input(
			z.strictObject({
				exerciseId: z.string().cuid2(),
				libraryEntryIds: z.array(z.string().cuid2()),
				blockEntryIds: z.array(z.string().cuid2())
			})
		)
		.mutation(async ({ ctx, input }) => {
			const exercise = await findOwnExercise(ctx.userId, input.exerciseId);
			const [fromLibraries, fromBlocks] = await prisma.$transaction([
				prisma.exerciseTemplate.deleteMany({ where: { id: { in: input.libraryEntryIds }, exerciseId: exercise.id } }),
				prisma.mesocycleExerciseTemplate.deleteMany({
					where: { id: { in: input.blockEntryIds }, exerciseId: exercise.id }
				})
			]);
			return { removed: fromLibraries.count + fromBlocks.count };
		}),

	/**
	 * Removes an exercise from every routine. With workouts it's archived, so they keep it; without
	 * any, it's gone completely.
	 */
	delete: t.procedure.input(z.string().cuid2()).mutation(async ({ ctx, input }) => {
		const exercise = await findOwnExercise(ctx.userId, input);
		const workoutCount = await prisma.workoutExercise.count({ where: { exerciseId: exercise.id } });
		if (workoutCount === 0) {
			await prisma.exercise.delete({ where: { id: exercise.id } });
			return { archived: false };
		}
		await prisma.$transaction([
			prisma.exerciseTemplate.deleteMany({ where: { exerciseId: exercise.id } }),
			prisma.mesocycleExerciseTemplate.deleteMany({ where: { exerciseId: exercise.id } }),
			prisma.exercise.update({ where: { id: exercise.id }, data: { archived: true } })
		]);
		return { archived: true };
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

			// A routine that already has both keeps just the one merged into
			const [fromLibrary, intoLibrary, fromBlock, intoBlock] = await Promise.all([
				prisma.exerciseTemplate.findMany({
					where: { exerciseId: from.id },
					select: { id: true, exerciseSplitDayId: true }
				}),
				prisma.exerciseTemplate.findMany({ where: { exerciseId: into.id }, select: { exerciseSplitDayId: true } }),
				prisma.mesocycleExerciseTemplate.findMany({
					where: { exerciseId: from.id },
					select: { id: true, mesocycleExerciseSplitDayId: true }
				}),
				prisma.mesocycleExerciseTemplate.findMany({
					where: { exerciseId: into.id },
					select: { mesocycleExerciseSplitDayId: true }
				})
			]);
			const libraryDaysWithInto = new Set(intoLibrary.map((entry) => entry.exerciseSplitDayId));
			const blockDaysWithInto = new Set(intoBlock.map((entry) => entry.mesocycleExerciseSplitDayId));
			const [libraryDuplicates, libraryMoves] = [
				fromLibrary.filter((entry) => libraryDaysWithInto.has(entry.exerciseSplitDayId)),
				fromLibrary.filter((entry) => !libraryDaysWithInto.has(entry.exerciseSplitDayId))
			];
			const [blockDuplicates, blockMoves] = [
				fromBlock.filter((entry) => blockDaysWithInto.has(entry.mesocycleExerciseSplitDayId)),
				fromBlock.filter((entry) => !blockDaysWithInto.has(entry.mesocycleExerciseSplitDayId))
			];

			await prisma.$transaction([
				prisma.exerciseTemplate.deleteMany({ where: { id: { in: libraryDuplicates.map((entry) => entry.id) } } }),
				prisma.exerciseTemplate.updateMany({
					where: { id: { in: libraryMoves.map((entry) => entry.id) } },
					data: details
				}),
				prisma.mesocycleExerciseTemplate.deleteMany({
					where: { id: { in: blockDuplicates.map((entry) => entry.id) } }
				}),
				prisma.mesocycleExerciseTemplate.updateMany({
					where: { id: { in: blockMoves.map((entry) => entry.id) } },
					data: details
				}),
				prisma.workoutExercise.updateMany({ where: { exerciseId: from.id }, data: details }),
				prisma.exercise.update({ where: { id: into.id }, data: { archived: false } }),
				prisma.exercise.delete({ where: { id: from.id } })
			]);
			return { message: `Merged ${from.name} into ${into.name}` };
		})
});
