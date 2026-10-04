/**
 * My routines: each person's one list of routines (an ExerciseSplit), the one place routines are
 * edited. The active block follows it: every change here syncs the block in the same transaction.
 */
import { prisma } from '$lib/prisma';
import { z } from 'zod';
import { t } from '$lib/trpc/t';
import { ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema } from '$lib/zodSchemas';
import { createId } from '@paralleldrive/cuid2';
import { TRPCError } from '@trpc/server';
import { ignoreExerciseLink } from '$lib/trpc/exerciseLinkInput';
import { linkToExercise, resolveExercises } from '$lib/server/exercises';
import {
	ensureMyRoutines,
	syncBlockFromRoutines,
	uniqueRoutineName,
	withRoutinesTransaction
} from '$lib/server/blockCache';

const zodSaveRoutinesInput = z.strictObject({
	routines: z.array(
		z.strictObject({
			name: z.string().trim().min(1).max(100),
			weightUnit: z.enum(['KG', 'LB', 'ASK']),
			/** The routine's name before this edit; unset for a new one. The block keeps its place */
			previousName: z.string().optional()
		})
	),
	/** Each routine's exercises, in order */
	routineExercises: z.array(z.array(ignoreExerciseLink(ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema)))
});

export const exerciseSplits = t.router({
	/** My routines, in order (null before the first one is saved) */
	mine: t.procedure.query(({ ctx }) =>
		prisma.exerciseSplit.findUnique({
			where: { userId: ctx.userId },
			include: {
				exerciseSplitDays: {
					where: { isRestDay: false },
					include: { exercises: { orderBy: { exerciseIndex: 'asc' } } },
					orderBy: { dayIndex: 'asc' }
				}
			}
		})
	),

	/** Saves My routines as given, and the active block follows */
	save: t.procedure.input(zodSaveRoutinesInput).mutation(async ({ input, ctx }) => {
		if (input.routineExercises.length !== input.routines.length) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'Each routine needs its list of exercises' });
		}
		const names = input.routines.map((routine) => routine.name);
		if (new Set(names).size !== names.length) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'Routine names should be unique' });
		}

		// Exercises as they are: their details change only on the Exercises page. A template or an
		// import creates the exercises it needs
		const { byName, restoreIds } = await resolveExercises(ctx.userId, input.routineExercises.flat(), {
			restore: true
		});
		const renames = new Map(
			input.routines.flatMap((routine) =>
				routine.previousName !== undefined && routine.previousName !== routine.name
					? [[routine.name, routine.previousName] as const]
					: []
			)
		);

		await withRoutinesTransaction(async (tx) => {
			if (restoreIds.length > 0) {
				await tx.exercise.updateMany({ where: { id: { in: restoreIds } }, data: { archived: false } });
			}
			const listId = await ensureMyRoutines(tx, ctx.userId);
			await tx.exerciseSplitDay.deleteMany({ where: { exerciseSplitId: listId } });
			for (const [dayIndex, routine] of input.routines.entries()) {
				const routineId = createId();
				await tx.exerciseSplitDay.create({
					data: {
						id: routineId,
						name: routine.name,
						dayIndex,
						isRestDay: false,
						weightUnit: routine.weightUnit,
						exerciseSplitId: listId
					}
				});
				await tx.exerciseTemplate.createMany({
					data: input.routineExercises[dayIndex].map(({ id, ...exercise }, exerciseIndex) => ({
						...linkToExercise(exercise, byName),
						exerciseIndex,
						exerciseSplitDayId: routineId
					}))
				});
			}
			await syncBlockFromRoutines(tx, ctx.userId, { renames });
		});
		return { message: 'My routines saved' };
	}),

	/**
	 * Adds a workout to My routines as a new routine (e.g. a blank one with a trainer): its exercises
	 * in order, each with the sets done and its set type and rep range. A name already taken gets
	 * "(2)", "(3)"...
	 */
	createFromWorkout: t.procedure
		.input(z.strictObject({ workoutId: z.string().cuid2(), name: z.string().trim().min(1).max(100) }))
		.mutation(async ({ input, ctx }) => {
			const workout = await prisma.workout.findFirst({
				where: { id: input.workoutId, userId: ctx.userId },
				include: {
					workoutExercises: {
						orderBy: { exerciseIndex: 'asc' },
						include: { _count: { select: { sets: true } } }
					}
				}
			});
			if (!workout) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workout not found' });
			if (workout.workoutExercises.length === 0) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'This workout has no exercises' });
			}

			// The routine's unit: the one most exercises were done in (levels aren't a routine unit)
			const massUnits = workout.workoutExercises.flatMap((ex) => (ex.weightUnit === 'LEVEL' ? [] : [ex.weightUnit]));
			const lbCount = massUnits.filter((unit) => unit === 'LB').length;
			const weightUnit = lbCount > massUnits.length - lbCount ? 'LB' : 'KG';

			const routineName = await withRoutinesTransaction(async (tx) => {
				const listId = await ensureMyRoutines(tx, ctx.userId);
				const existing = await tx.exerciseSplitDay.findMany({
					where: { exerciseSplitId: listId },
					select: { name: true, dayIndex: true }
				});
				const name = uniqueRoutineName(
					input.name,
					existing.map((routine) => routine.name)
				);
				const routineId = createId();
				await tx.exerciseSplitDay.create({
					data: {
						id: routineId,
						name,
						dayIndex: Math.max(-1, ...existing.map((routine) => routine.dayIndex)) + 1,
						isRestDay: false,
						weightUnit,
						exerciseSplitId: listId
					}
				});
				await tx.exerciseTemplate.createMany({
					data: workout.workoutExercises.map((ex, exerciseIndex) => ({
						exerciseSplitDayId: routineId,
						exerciseIndex,
						exerciseId: ex.exerciseId,
						name: ex.name,
						targetMuscleGroup: ex.targetMuscleGroup,
						customMuscleGroup: ex.customMuscleGroup,
						bodyweightFraction: ex.bodyweightFraction,
						sets: ex._count.sets || null,
						setType: ex.setType,
						repRangeStart: ex.repRangeStart,
						repRangeEnd: ex.repRangeEnd,
						topRepRangeStart: ex.topRepRangeStart,
						topRepRangeEnd: ex.topRepRangeEnd,
						changeType: ex.changeType,
						changeAmount: ex.changeAmount,
						note: ex.note,
						weightSetId: ex.weightSetId
					}))
				});
				await syncBlockFromRoutines(tx, ctx.userId);
				return name;
			});
			return { routineName, message: `Added to My routines as “${routineName}”` };
		})
});
