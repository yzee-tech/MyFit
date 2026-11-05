/**
 * Setup for browser tests without clicking through the app. Each helper calls the same server operation the
 * page calls (a direct tRPC caller for the worker's own test user), so the rows are the ones the page makes.
 * Use the page for setup only when that flow is what the test tests. Each helper takes userData.userId; the
 * data of the last test is cleared before every test (see autoTestFixture).
 */
import { config } from 'dotenv';
config();
import { prisma } from '../../src/lib/prisma';
import { createCaller } from '../../src/lib/trpc/router';
import { exerciseSplitTemplates } from '../../src/lib/common/exerciseSplitTemplates';
import { uniqueRoutineName } from '../../src/lib/utils/routineNames';
import { suggestWeeklyRIR } from '../../src/lib/utils/workoutUtils';

function callerFor(userId: string) {
	return createCaller({ event: {} as never, userId });
}

/**
 * A template's routines added to My routines, as "Add from a template" does: after the ones there, a taken
 * name getting "(2)", "(3)"... Same default as createTemplateExerciseSplit: Pull Push Legs, 6 routines
 */
export async function seedRoutines(userId: string, templateName = 'Pull Push Legs') {
	const template = exerciseSplitTemplates.find((candidate) => candidate.exerciseSplit.name === templateName);
	if (!template) throw new Error(`No template called ${templateName}`);
	const caller = callerFor(userId);
	const existing = (await caller.exerciseSplits.mine())?.exerciseSplitDays ?? [];
	const routines: { name: string; weightUnit: 'KG' | 'LB' | 'ASK'; previousName?: string }[] = existing.map(
		(routine) => ({ name: routine.name, weightUnit: routine.weightUnit, previousName: routine.name })
	);
	const routineExercises = existing.map((routine) =>
		routine.exercises.map(({ id, exerciseSplitDayId, exerciseIndex, ...exercise }) => exercise)
	);
	for (const day of template.exerciseSplit.exerciseSplitDays) {
		routines.push({
			name: uniqueRoutineName(
				day.name,
				routines.map((routine) => routine.name)
			),
			weightUnit: day.weightUnit ?? 'KG'
		});
		routineExercises.push(structuredClone(day.exercises));
	}
	await caller.exerciseSplits.save({
		routines,
		routineExercises: routineExercises.map((exercises) =>
			exercises.map((exercise, exerciseIndex) => ({ ...exercise, exerciseIndex }))
		)
	});
}

/**
 * A running block with the form's defaults (5 weeks with a suggested weekly effort, progression settings as
 * the Progression page opens), started now, as "Start immediately" does. Its routines are My routines
 */
export async function seedActiveMesocycle(userId: string, name = 'MyMeso') {
	await callerFor(userId).mesocycles.create({
		mesocycle: {
			name,
			weeklyRIR: suggestWeeklyRIR(5),
			startOverloadPercentage: 2.5,
			lastSetToFailure: true,
			forceRIRMatching: true
		},
		mesocycleCyclicSetChanges: [],
		startImmediately: true
	});
	return prisma.mesocycle.findFirstOrThrow({ where: { userId, name }, orderBy: { startDate: 'desc' } });
}

/** What the tests need most: the template's routines in My routines and a running block that uses them */
export async function seedRoutinesAndMesocycle(userId: string, name = 'MyMeso') {
	await seedRoutines(userId);
	return seedActiveMesocycle(userId, name);
}
