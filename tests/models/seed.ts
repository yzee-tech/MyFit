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
import type { SplitExerciseTemplateWithoutIdsOrIndex } from '../../src/lib/components/mesocycleAndExerciseSplit/commonTypes';
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
	const routineExercises: SplitExerciseTemplateWithoutIdsOrIndex[][] = existing.map((routine) =>
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

export type SeededSet = { reps: number; load: number; RIR: number };

/**
 * A finished workout from a routine of My routines, as saving it from the workout pages does (workouts.create):
 * the routine's exercises named in `exercises` (the others "deleted" in the workout), in the routine's order,
 * with the routine's details for each and the routine's unit (or `weightUnit` for "Ask each time"). In the
 * running block when there is one (pass inBlock: false for a workout outside it). Without `startedAt` it starts
 * now and ends when the server saves it (no end is sent); with one, the end sent is two seconds after it, which
 * the server may cap at its own now for a start in the future. `timeZone` is the phone's (the test browser's is
 * UTC).
 *
 * Not a general stand-in for logging through the pages yet; extend it, and its comparison in
 * seedLoggedWorkout.spec, before a conversion that needs any of these:
 * - Exercises with their own unit (a LEVEL machine, a weight set, a unit different from the routine's) or a note:
 *   every exercise gets the routine's unit and no exerciseNote.
 * - A paused block: the start page defaults countsForProgression to false then; this defaults to true, so pass
 *   it explicitly.
 * - Mini-sets and cardio sets (time, distance): only reps, load and RIR sets are made.
 */
export async function seedLoggedWorkout(
	userId: string,
	options: {
		routineName: string;
		exercises: Record<string, SeededSet[]>;
		inBlock?: boolean;
		userBodyweight?: number;
		startedAt?: Date;
		countsForProgression?: boolean;
		timeZone?: string;
		/** The gym's unit for a routine set to "Ask each time" (the workout page asks at the start) */
		weightUnit?: 'KG' | 'LB';
	}
) {
	const caller = callerFor(userId);
	const routine = (await caller.exerciseSplits.mine())?.exerciseSplitDays.find(
		(day) => day.name === options.routineName
	);
	if (!routine) throw new Error(`No routine called ${options.routineName} in My routines`);
	const weightUnit = routine.weightUnit === 'ASK' ? options.weightUnit : routine.weightUnit;
	if (!weightUnit) throw new Error(`${options.routineName} asks for its unit each time: pass weightUnit`);
	const kept = routine.exercises.filter((template) => template.name in options.exercises);
	const missing = Object.keys(options.exercises).filter((name) => !kept.some((template) => template.name === name));
	if (missing.length > 0) throw new Error(`${options.routineName} has no ${missing.join(', ')}`);

	const block =
		options.inBlock === false
			? null
			: await prisma.mesocycle.findFirst({ where: { userId, startDate: { not: null }, endDate: null } });
	const startedAt = options.startedAt ?? new Date();
	const { workoutId } = await caller.workouts.create({
		timeZone: options.timeZone ?? 'UTC',
		workoutData: {
			startedAt,
			...(options.startedAt ? { endedAt: new Date(startedAt.getTime() + 2000) } : {}),
			routineName: options.routineName,
			userBodyweight: options.userBodyweight ?? 100,
			countsForProgression: options.countsForProgression ?? true,
			...(block ? { workoutOfMesocycle: { mesocycle: { id: block.id } } } : {})
		},
		workoutExercises: kept.map(({ id, exerciseSplitDayId, exerciseIndex, sets, ...template }, index) => ({
			...template,
			exerciseIndex: index,
			weightUnit,
			exerciseNote: null
		})),
		workoutExercisesSets: kept.map((template) =>
			options.exercises[template.name].map((set, setIndex) => ({ ...set, skipped: false, setIndex }))
		),
		workoutExercisesMiniSets: kept.map((template) => options.exercises[template.name].map(() => []))
	});
	return prisma.workout.findUniqueOrThrow({ where: { id: workoutId } });
}
