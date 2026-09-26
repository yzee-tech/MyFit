import { prisma } from '$lib/prisma';
import { z } from 'zod';
import { t } from '$lib/trpc/t';
import {
	ExerciseSplitDayCreateWithoutExerciseSplitInputSchema,
	ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema
} from '$lib/zodSchemas';
import type { ExerciseSplitDay, Prisma, PrismaPromise } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { TRPCError } from '@trpc/server';
import { ignoreExerciseLink } from '$lib/trpc/exerciseLinkInput';
import { linkToExercise, resolveExercises, type ResolvedExercise } from '$lib/server/exercises';

const zodExerciseSplitInput = z.strictObject({
	splitName: z.string(),
	splitDays: z.array(ExerciseSplitDayCreateWithoutExerciseSplitInputSchema),
	splitExercises: z.array(z.array(ignoreExerciseLink(ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema)))
});

/** The active block, if it can take this library's edits: made from it, or its link was lost by older edits */
async function findActiveBlockForLibrary(userId: string, exerciseSplitId: string) {
	return prisma.mesocycle.findFirst({
		where: {
			userId,
			startDate: { not: null },
			endDate: null,
			OR: [{ exerciseSplitId }, { exerciseSplitId: null }]
		},
		select: { id: true, name: true }
	});
}

type LibraryExercise = z.infer<typeof ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema>;

/**
 * Copies a library's routines into a block: a routine found in the block (by its name before the
 * edit, else its name) gets the library's exercises, keeping each exercise's sets and overrides;
 * a new routine is added at the end. Positions don't change, so workouts stay with their
 * routine. Routines only in the block stay as they are.
 */
async function updateBlockFromLibrary(
	userId: string,
	mesocycleId: string,
	exerciseSplitId: string,
	routines: { name: string; weightUnit: 'KG' | 'LB' | 'ASK'; previousName: string | null }[],
	routineExercises: LibraryExercise[][],
	exercisesByName: Map<string, ResolvedExercise>
): Promise<PrismaPromise<unknown>[]> {
	const block = await prisma.mesocycle.findFirst({
		where: { id: mesocycleId, userId, startDate: { not: null }, endDate: null },
		include: { mesocycleExerciseSplitDays: { include: { mesocycleSplitDayExercises: true } } }
	});
	if (!block) throw new TRPCError({ code: 'NOT_FOUND', message: 'Current block not found' });

	const blockRoutines = block.mesocycleExerciseSplitDays;
	const allSets = blockRoutines.flatMap((routine) => routine.mesocycleSplitDayExercises.map((ex) => ex.sets));
	const usualSets = mostCommon(allSets) ?? 3;

	const queries: PrismaPromise<unknown>[] = [
		prisma.mesocycle.update({ where: { id: block.id }, data: { exerciseSplitId } })
	];
	const matched = new Set<string>();
	let nextDayIndex = Math.max(-1, ...blockRoutines.map((routine) => routine.dayIndex)) + 1;

	routines.forEach((routine, routineIdx) => {
		const findUnmatched = (name: string | null) =>
			blockRoutines.find((blockRoutine) => blockRoutine.name === name && !matched.has(blockRoutine.id));
		const target = findUnmatched(routine.previousName) ?? findUnmatched(routine.name);
		if (target) matched.add(target.id);

		const oldExercises = target?.mesocycleSplitDayExercises ?? [];
		const routineSets = mostCommon(oldExercises.map((ex) => ex.sets)) ?? usualSets;
		const splitDayId = target?.id ?? createId();
		const exercises = routineExercises[routineIdx].map(({ id, ...exercise }, exerciseIndex) => {
			const old = oldExercises.find((ex) => ex.name === exercise.name);
			return {
				...linkToExercise(exercise, exercisesByName),
				exerciseIndex,
				mesocycleExerciseSplitDayId: splitDayId,
				sets: old?.sets ?? routineSets,
				overloadPercentage: old?.overloadPercentage ?? null,
				lastSetToFailure: old?.lastSetToFailure ?? null,
				forceRIRMatching: old?.forceRIRMatching ?? null,
				minimumWeightChange: old?.minimumWeightChange ?? null,
				weightUnit: old?.weightUnit ?? null
			};
		});

		if (target) {
			queries.push(
				prisma.mesocycleExerciseSplitDay.update({
					where: { id: target.id },
					data: { name: routine.name, weightUnit: routine.weightUnit }
				}),
				prisma.mesocycleExerciseTemplate.deleteMany({ where: { mesocycleExerciseSplitDayId: target.id } })
			);
		} else {
			queries.push(
				prisma.mesocycleExerciseSplitDay.create({
					data: {
						id: splitDayId,
						name: routine.name,
						dayIndex: nextDayIndex++,
						isRestDay: false,
						weightUnit: routine.weightUnit,
						mesocycleId: block.id
					}
				})
			);
		}
		queries.push(prisma.mesocycleExerciseTemplate.createMany({ data: exercises }));
	});
	return queries;
}

function mostCommon(values: number[]): number | undefined {
	const counts = new Map<number, number>();
	values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
	return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];
}

/**
 * The library's exercises, as they are: their details change only on the Exercises page. A
 * template or an import creates the exercises it needs.
 */
function resolveLibraryExercises(input: z.infer<typeof zodExerciseSplitInput>, userId: string) {
	return resolveExercises(userId, input.splitExercises.flat(), { restore: true });
}

const createOrEditExerciseSplit = async (
	input: z.infer<typeof zodExerciseSplitInput>,
	userId: string,
	editingId?: string,
	extraQueries: PrismaPromise<unknown>[] = [],
	resolved?: Awaited<ReturnType<typeof resolveLibraryExercises>>
) => {
	const exerciseSplitId = editingId ?? createId();
	const { byName, syncQueries } = resolved ?? (await resolveLibraryExercises(input, userId));

	const exerciseSplitDays: ExerciseSplitDay[] = input.splitDays.map((splitDay) => ({
		...splitDay,
		weightUnit: splitDay.weightUnit ?? 'KG',
		id: createId(),
		exerciseSplitId
	}));

	const exerciseTemplates: Prisma.ExerciseTemplateUncheckedCreateInput[] = input.splitExercises.flatMap(
		(dayExercises, dayNumber) =>
			dayExercises.map((exercise) => ({
				...linkToExercise(exercise, byName),
				id: createId(),
				exerciseSplitDayId: exerciseSplitDays[dayNumber].id
			}))
	);

	// An edit replaces the routines but keeps the library itself, so blocks made from it stay linked
	const saveLibraryQueries: PrismaPromise<unknown>[] = editingId
		? [
				prisma.exerciseSplit.update({ where: { id: editingId, userId }, data: { name: input.splitName } }),
				prisma.exerciseSplitDay.deleteMany({ where: { exerciseSplitId: editingId } })
			]
		: [prisma.exerciseSplit.create({ data: { id: exerciseSplitId, name: input.splitName, userId } })];

	await prisma.$transaction([
		...saveLibraryQueries,
		prisma.exerciseSplitDay.createMany({ data: exerciseSplitDays }),
		prisma.exerciseTemplate.createMany({ data: exerciseTemplates }),
		...syncQueries,
		...extraQueries
	]);
};

export const exerciseSplits = t.router({
	findById: t.procedure.input(z.string().cuid2()).query(({ input, ctx }) =>
		prisma.exerciseSplit.findUnique({
			where: { id: input, userId: ctx.userId },
			include: {
				exerciseSplitDays: {
					include: { exercises: { orderBy: { exerciseIndex: 'asc' } } },
					orderBy: { dayIndex: 'asc' }
				}
			}
		})
	),

	load: t.procedure
		.input(
			z.strictObject({
				cursorId: z.string().cuid2().optional(),
				searchString: z.string().optional()
			})
		)
		.query(async ({ input, ctx }) => {
			return prisma.exerciseSplit.findMany({
				where: { userId: ctx.userId, name: { contains: input.searchString, mode: 'insensitive' } },
				orderBy: { id: 'desc' },
				include: { exerciseSplitDays: { orderBy: { dayIndex: 'asc' } } },
				cursor: input.cursorId !== undefined ? { id: input.cursorId } : undefined,
				skip: input.cursorId !== undefined ? 1 : 0,
				take: 10
			});
		}),

	loadAllNames: t.procedure.query(async ({ ctx }) => {
		return prisma.exerciseSplit.findMany({
			where: { userId: ctx.userId },
			orderBy: { id: 'desc' }
		});
	}),

	create: t.procedure.input(zodExerciseSplitInput).mutation(async ({ input, ctx }) => {
		await createOrEditExerciseSplit(input, ctx.userId);
		return { message: 'Routine library created' };
	}),

	/** The current block that saving this library can update, if any */
	findActiveBlockForLibrary: t.procedure
		.input(z.string().cuid2())
		.query(({ input, ctx }) => findActiveBlockForLibrary(ctx.userId, input)),

	editById: t.procedure
		.input(
			z.strictObject({
				id: z.string().cuid2(),
				splitData: zodExerciseSplitInput,
				/** Also copy the edited routines into this block (the current one made from this library) */
				updateBlock: z
					.strictObject({
						mesocycleId: z.string().cuid2(),
						/** Each routine's name before the edit, in order; null for a new routine */
						previousRoutineNames: z.array(z.string().nullable())
					})
					.optional()
			})
		)
		.mutation(async ({ input, ctx }) => {
			const library = await prisma.exerciseSplit.findFirst({ where: { id: input.id, userId: ctx.userId } });
			if (!library) throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine library not found' });

			const resolved = await resolveLibraryExercises(input.splitData, ctx.userId);
			let blockQueries: PrismaPromise<unknown>[] = [];
			if (input.updateBlock) {
				const routines = input.splitData.splitDays
					.map((splitDay, idx) => ({
						name: splitDay.name,
						weightUnit: splitDay.weightUnit ?? 'KG',
						previousName: input.updateBlock!.previousRoutineNames[idx] ?? null,
						isRestDay: splitDay.isRestDay,
						exercises: input.splitData.splitExercises[idx] ?? []
					}))
					.filter((routine) => !routine.isRestDay);
				blockQueries = await updateBlockFromLibrary(
					ctx.userId,
					input.updateBlock.mesocycleId,
					input.id,
					routines,
					routines.map((routine) => routine.exercises),
					resolved.byName
				);
			}

			await createOrEditExerciseSplit(input.splitData, ctx.userId, input.id, blockQueries, resolved);
			return {
				message: input.updateBlock ? 'Routine library and current block updated' : 'Routine library saved'
			};
		}),

	deleteById: t.procedure.input(z.string().cuid2()).mutation(async ({ input, ctx }) => {
		await prisma.exerciseSplit.delete({ where: { userId: ctx.userId, id: input } });
		return { message: 'Routine library deleted' };
	})
});
