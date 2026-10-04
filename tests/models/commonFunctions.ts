import { expect, type Page } from '../fixtures';
import { PrismaClient, type MuscleGroup } from '@prisma/client';
import { commonExercisePerMuscleGroup } from '../../src/lib/common/commonExercises';

const prisma = new PrismaClient();
const builtInExercises = commonExercisePerMuscleGroup.flatMap((group) => group.exercises);

type ExerciseDetails = {
	targetMuscleGroup: MuscleGroup;
	customMuscleGroup?: string | null;
	bodyweightFraction?: number | null;
	note?: string | null;
};

/**
 * Adds exercises to a user's list, as the Exercises page would: with a built-in exercise's details
 * when the name matches one, else the details given
 */
export async function createExercises(userId: string, exercises: (string | ({ name: string } & ExerciseDetails))[]) {
	await prisma.exercise.createMany({
		data: exercises.map((exercise) => {
			const name = typeof exercise === 'string' ? exercise : exercise.name;
			const builtIn = builtInExercises.find((ex) => ex.name === name);
			const given = typeof exercise === 'string' ? {} : exercise;
			return {
				userId,
				name,
				targetMuscleGroup: builtIn?.targetMuscleGroup ?? 'Chest',
				customMuscleGroup: builtIn?.customMuscleGroup ?? null,
				bodyweightFraction: builtIn?.bodyweightFraction ?? null,
				note: builtIn?.note ?? null,
				...given
			};
		}),
		skipDuplicates: true
	});
}

/** Picks one of your exercises in the add/edit exercise editor */
export async function pickExercise(page: Page, name: string) {
	// The editor slides in: a tap while it's moving can miss, so tap until the picker is open
	await expect(async () => {
		if (!(await page.getByPlaceholder('Search your exercises').isVisible())) {
			await page.getByLabel('Pick an exercise').click();
		}
		await expect(page.getByPlaceholder('Search your exercises')).toBeVisible({ timeout: 1000 });
	}).toPass();
	await page.getByPlaceholder('Search your exercises').fill(name);
	await page.getByRole('option', { name, exact: true }).click();
}

/** Adds a template's routines to My routines (from the My routines page) */
export async function createTemplateExerciseSplit(page: Page, template = 'Pull Push Legs 6 routines') {
	await page.getByLabel('my-routines-options').click();
	await page.getByRole('menuitem', { name: 'Add from a template' }).click();
	await page.getByRole('button', { name: template }).click();
	await page.waitForURL('/exercise-splits/manage/structure');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/exercise-splits/manage/exercises');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'My routines saved' })).toBeVisible({
		timeout: 10000
	});
	await page.waitForURL('/exercise-splits');
}

export async function createMesocycle(page: Page, options?: { exerciseSplitCreated: boolean }) {
	if (!options?.exerciseSplitCreated) {
		await page.goto('/exercise-splits');
		await createTemplateExerciseSplit(page);
	}
	await page.goto('/mesocycles');
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').click();
	await page.getByLabel('Mesocycle name').fill('MyMeso');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/mesocycles\/manage\/progression/);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/mesocycles\/manage\/overview/);
	await page.getByLabel('Start immediately').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Mesocycle created successfully' })).toBeVisible({
		timeout: 10000
	});
	await page.waitForURL('/mesocycles');
}

export async function pickRoutine(page: Page, routineName: string) {
	await page.getByRole('radio', { name: new RegExp(`^${routineName}`) }).click();
}

/**
 * Saves a workout from its Overview page. `routine` is the "Update routine?" question this test
 * expects (the changes it lists, and the answer); without it, the workout must match its routine
 * (or have none), so nothing is asked.
 */
export async function saveWorkout(
	page: Page,
	routine?: { changes: string[]; answer: 'Update routine' | 'Just this workout' }
) {
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	if (routine) {
		const changes = page.getByTestId('routine-changes');
		for (const change of routine.changes) await expect(changes).toContainText(change);
		await page.getByRole('button', { name: routine.answer, exact: true }).click();
	}
	await page.waitForURL('/workouts');
	await expect(page.getByTestId('routine-changes')).toHaveCount(0);
}
