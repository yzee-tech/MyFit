/**
 * My routines: each person's one list of routines (an ExerciseSplit), the one place routines are
 * edited. The active mesocycle reads it directly.
 */
import { prisma } from '$lib/prisma';
import { z } from 'zod';
import { t } from '$lib/trpc/t';
import { ExerciseTemplateCreateWithoutExerciseSplitDayInputSchema } from '$lib/zodSchemas';
import { createId } from '@paralleldrive/cuid2';
import { TRPCError } from '@trpc/server';
import { ignoreExerciseLink } from '$lib/trpc/exerciseLinkInput';
import { exerciseCopy, linkToExercise, resolveExercises } from '$lib/server/exercises';
import { withUniqueNames } from '$lib/utils/routineNames';
import { ensureMyRoutines, uniqueRoutineName, withRoutinesTransaction } from '$lib/server/blockCache';

const zodSaveRoutinesInput = z.strictObject({
	routines: z.array(
		z.strictObject({
			name: z.string().trim().min(1).max(100),
			weightUnit: z.enum(['KG', 'LB', 'ASK']),
			/** The routine's name before this edit; unset for a new one. Sent by the app, not needed any more */
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

		// An exercise twice in a routine would crash its editor: the second one is renamed ("Bench (2)")
		const routineExercises = input.routineExercises.map((exercises) => withUniqueNames(exercises));
		// Exercises as they are: their details change only on the Exercises page. A template or an
		// import creates the exercises it needs
		const { byName, restoreIds } = await resolveExercises(ctx.userId, routineExercises.flat(), {
			restore: true
		});
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
						weightUnit: routine.weightUnit,
						exerciseSplitId: listId
					}
				});
				await tx.exerciseTemplate.createMany({
					data: routineExercises[dayIndex].map(({ id, ...exercise }, exerciseIndex) => ({
						...linkToExercise(exercise, byName),
						exerciseIndex,
						exerciseSplitDayId: routineId
					}))
				});
			}
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
						// Sets done: a skipped one doesn't count towards the routine's sets
						include: { _count: { select: { sets: { where: { skipped: false } } } } }
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
			// An exercise twice in a workout (e.g. kept as a Levels one and a KG one after a merge) would crash the
			// routine's editor: the second one is renamed, as in an import
			const workoutExercises = withUniqueNames(workout.workoutExercises);
			// A renamed row is its own exercise, as in a save: still linked to the first one's, a rename of that exercise
			// (which renames every row linked to it) would give both rows the same name again
			const renamedRows = workoutExercises.filter((ex, idx) => ex.name !== workout.workoutExercises[idx].name);
			const sources = await prisma.exercise.findMany({
				where: { userId: ctx.userId, id: { in: renamedRows.flatMap((ex) => (ex.exerciseId ? [ex.exerciseId] : [])) } },
				select: { id: true, measure: true, distanceUnit: true }
			});
			const { byName: renamedExercises } = await resolveExercises(
				ctx.userId,
				renamedRows.map((ex) => {
					const source = sources.find((exercise) => exercise.id === ex.exerciseId);
					return {
						name: ex.name,
						targetMuscleGroup: ex.targetMuscleGroup,
						customMuscleGroup: ex.customMuscleGroup,
						secondaryMuscleGroups: ex.secondaryMuscleGroups,
						bodyweightFraction: ex.bodyweightFraction,
						measure: source?.measure,
						distanceUnit: source?.distanceUnit
					};
				}),
				{ restore: true }
			);
			const exerciseOf = (ex: (typeof workoutExercises)[number]) => {
				const renamed = renamedExercises.get(ex.name);
				return renamed && renamedRows.includes(ex)
					? exerciseCopy(renamed)
					: { exerciseId: ex.exerciseId, name: ex.name };
			};
			// A weight set deleted since the workout isn't linked: the delete only cleared the routines' links
			const weightSetIds = new Set(
				(
					await prisma.weightSet.findMany({
						where: {
							userId: ctx.userId,
							id: { in: workoutExercises.flatMap((ex) => (ex.weightSetId ? [ex.weightSetId] : [])) }
						},
						select: { id: true }
					})
				).map((weightSet) => weightSet.id)
			);

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
						weightUnit,
						exerciseSplitId: listId
					}
				});
				await tx.exerciseTemplate.createMany({
					data: workoutExercises.map((ex, exerciseIndex) => ({
						exerciseSplitDayId: routineId,
						exerciseIndex,
						targetMuscleGroup: ex.targetMuscleGroup,
						customMuscleGroup: ex.customMuscleGroup,
						secondaryMuscleGroups: ex.secondaryMuscleGroups,
						bodyweightFraction: ex.bodyweightFraction,
						// After the workout's own copy: a renamed row that lands on an exercise already in the library takes
						// that exercise's details, as in a save
						...exerciseOf(ex),
						sets: ex._count.sets || null,
						setType: ex.setType,
						repRangeStart: ex.repRangeStart,
						repRangeEnd: ex.repRangeEnd,
						topRepRangeStart: ex.topRepRangeStart,
						topRepRangeEnd: ex.topRepRangeEnd,
						changeType: ex.changeType,
						changeAmount: ex.changeAmount,
						note: ex.note,
						weightSetId: ex.weightSetId && weightSetIds.has(ex.weightSetId) ? ex.weightSetId : null,
						// One done in the other unit than the routine's keeps its own (levels come from the machine)
						weightUnit: ex.weightUnit !== 'LEVEL' && ex.weightUnit !== weightUnit ? ex.weightUnit : null
					}))
				});
				const exerciseIds = [
					...new Set(
						workoutExercises.flatMap((ex) => {
							const { exerciseId } = exerciseOf(ex);
							return exerciseId ? [exerciseId] : [];
						})
					)
				];
				if (exerciseIds.length > 0) {
					await tx.exercise.updateMany({
						where: { id: { in: exerciseIds }, userId: ctx.userId, archived: true },
						data: { archived: false }
					});
				}
				return name;
			});
			return { routineName, message: `Added to My routines as “${routineName}”` };
		})
});
