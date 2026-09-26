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
	await page.getByLabel('Pick an exercise').click();
	await page.getByPlaceholder('Search your exercises').fill(name);
	await page.getByRole('option', { name, exact: true }).click();
}

export async function createTemplateExerciseSplit(page: Page) {
	await page.getByLabel('exercise-split-new-options').click();
	await page.getByRole('menuitem', { name: 'Use template' }).click();
	await page.getByRole('button', { name: 'Pull Push Legs 6 routines' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL('/exercise-splits/manage/exercises');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Routine library created' })).toBeVisible({
		timeout: 10000
	});
	await page.waitForURL('/exercise-splits');
}

export async function createMesocycle(page: Page, options?: { exerciseSplitCreated: boolean }) {
	if (!options?.exerciseSplitCreated) {
		await createTemplateExerciseSplit(page);
	}
	await page.goto('/mesocycles');
	await page.getByLabel('create-new-mesocycle').click();
	await page.getByLabel('Mesocycle name').click();
	await page.getByLabel('Mesocycle name').fill('MyMeso');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByText('Pick one').click();
	await page.getByRole('option', { name: 'Pull Push Legs' }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/mesocycles\/manage\/volume/);
	await page.getByRole('button', { name: 'Next' }).click();
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
