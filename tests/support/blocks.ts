import { createCaller } from '../../src/lib/trpc/router';

/** The mesocycle settings that almost every test leaves at their usual values (spread into `prisma.mesocycle.create`) */
export const mesocycleDefaults = {
	startOverloadPercentage: 2.5,
	lastSetToFailure: false,
	forceRIRMatching: false
};

/** The one exercise the tests' "Pull A" routine is built from */
export const pullRows = {
	name: 'Barbell rows',
	targetMuscleGroup: 'Traps' as const,
	setType: 'Straight' as const,
	repRangeStart: 10,
	repRangeEnd: 15
};

/** A routine "Pull A" with 3 sets of `pullRows` (the exercise itself must already exist for the person) */
export async function savePullRoutine(caller: ReturnType<typeof createCaller>) {
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...pullRows, exerciseIndex: 0, sets: 3 }]]
	});
}
