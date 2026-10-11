import type { Prisma } from '@prisma/client';

export type SplitExerciseTemplateWithoutIdsOrIndex = Omit<
	Prisma.ExerciseTemplateCreateWithoutExerciseSplitDayInput,
	'exerciseIndex'
>;
/** An exercise as a workout and its suggestions use it: a routine's exercise with its set count */
export type RoutineExerciseTemplate = Omit<SplitExerciseTemplateWithoutIdsOrIndex, 'sets'> & {
	sets: number;
	/** The exercise it is (Exercise), when the routine's entry is linked to one */
	exerciseId?: string | null;
};

export type ExerciseTemplateWithoutIdsOrIndex = SplitExerciseTemplateWithoutIdsOrIndex | RoutineExerciseTemplate;
