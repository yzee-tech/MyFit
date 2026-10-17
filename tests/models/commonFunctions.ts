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

/** Adds exercises to the workout in progress with Quick add, ticked in this order: 1 set each */
export async function quickAdd(page: Page, names: string[]) {
	await page.getByLabel('add-exercise').click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'Add exercises' });
	for (const name of names) {
		await sheet.getByPlaceholder('Search your exercises').fill(name);
		await sheet.getByRole('checkbox', { name, exact: true }).click();
	}
	await sheet.getByRole('button', { name: /^Add \d+ exercises?$/ }).click();
	await expect(sheet).toHaveCount(0);
}

/** Opens an exercise of the workout in progress in its full editor (⋯ → Edit) */
export async function editWorkoutExercise(page: Page, name: string) {
	await page.getByTestId(`${name}-menu-button`).click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
}

/** Adds a template's routines to My routines (from the My routines page) */
export async function createTemplateExerciseSplit(page: Page, template = 'Pull Push Legs 6 routines') {
	await page.getByLabel('my-routines-options').click();
	await page.getByRole('menuitem', { name: 'Add from a template' }).click();
	await page.getByRole('button', { name: template }).click();
	// Added straight to My routines
	await expect(page.getByRole('status').filter({ hasText: /Added \d+ routines?/ })).toBeVisible({
		timeout: 10000
	});
	await page.waitForURL('/exercise-splits');
	await expect(page.getByTestId('routine-card').first()).toBeVisible();
}

/** Opens a routine of My routines in the editor (from the My routines page) */
export async function editRoutine(page: Page, name: string) {
	if (new URL(page.url()).pathname !== '/exercise-splits') await page.goto('/exercise-splits');
	await page.getByLabel(`Routine ${name} options`, { exact: true }).click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await page.waitForURL(/\/exercise-splits\/edit\?routine=/);
	await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name);
}

/**
 * Saves the routine being edited (Save for a new one, Update for one already saved; it stays open),
 * then goes Back to My routines: nothing left to ask
 */
export async function saveRoutine(page: Page) {
	await page
		.getByRole('main')
		.getByRole('button', { name: /^(Save|Update)$/ })
		.click();
	await expect(page.getByRole('status').filter({ hasText: 'My routines saved' })).toBeVisible({ timeout: 10000 });
	expect(new URL(page.url()).pathname).toEqual('/exercise-splits/edit');
	await page.getByRole('main').getByRole('button', { name: 'Back', exact: true }).click();
	await page.waitForURL('/exercise-splits');
	await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Deletes a routine of My routines (from the My routines page), after its warning */
export async function deleteRoutine(page: Page, name: string) {
	await page.getByLabel(`Routine ${name} options`, { exact: true }).click();
	await page.getByRole('menuitem', { name: 'Delete…' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: `“${name}” deleted` })).toBeVisible({ timeout: 10000 });
	await expect(page.getByTestId('routine-card-name').filter({ hasText: new RegExp(`^${name}$`) })).toHaveCount(0);
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
