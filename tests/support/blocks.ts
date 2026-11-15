import { createCaller } from '../../src/lib/trpc/router';
import { exerciseSplitTemplates } from '../../src/lib/common/exerciseSplitTemplates';
import { suggestWeeklyRIR } from '../../src/lib/utils/workoutUtils';

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

/**
 * The starting point the slow workout tests built by clicking through the template and the block wizard
 * (the "Pull Push Legs" template in My routines, then a MyMeso block started at once), seeded through the
 * same two server calls the screens make, so a long test doesn't spend its budget on setup clicks
 */
export async function seedTemplateSplitAndMeso(userId: string) {
	const caller = createCaller({ event: {} as never, userId });
	const template = exerciseSplitTemplates[0].exerciseSplit;
	await caller.exerciseSplits.save({
		routines: template.exerciseSplitDays.map((routine) => ({ name: routine.name, weightUnit: 'KG' as const })),
		routineExercises: template.exerciseSplitDays.map((routine) =>
			routine.exercises.map((exercise, exerciseIndex) => ({ ...exercise, exerciseIndex }))
		)
	});
	await caller.mesocycles.create({
		mesocycle: {
			name: 'MyMeso',
			weeklyRIR: suggestWeeklyRIR(5),
			startOverloadPercentage: 2.5,
			lastSetToFailure: true,
			forceRIRMatching: true
		},
		mesocycleCyclicSetChanges: [],
		startImmediately: true
	});
}

/** A routine "Pull A" with 3 sets of `pullRows` (the exercise itself must already exist for the person) */
export async function savePullRoutine(caller: ReturnType<typeof createCaller>) {
	await caller.exerciseSplits.save({
		routines: [{ name: 'Pull A', weightUnit: 'KG' }],
		routineExercises: [[{ ...pullRows, exerciseIndex: 0, sets: 3 }]]
	});
}
