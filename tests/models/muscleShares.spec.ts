import { expect, test, type Page } from '../fixtures';
import { PrismaClient, type MuscleGroup } from '@prisma/client';
import { createExercises, pickRoutine, quickAdd, saveWorkout } from './commonFunctions';

const prisma = new PrismaClient();

/**
 * Secondary muscles and Whole body on the screens: picked on an exercise's form (two at most), shown
 * on its page, and counted as half sets on Stats and the workout's own chart
 */

const secondaryPicker = (page: Page) => page.getByTestId('secondary-muscles');
const muscle = (page: Page, name: string) => secondaryPicker(page).getByRole('button', { name, exact: true });

async function pickMuscleGroup(page: Page, name: string) {
	await page.getByRole('combobox', { name: 'Muscle group' }).click();
	await page.getByRole('option', { name, exact: true }).click();
}

test('New exercise: up to two muscles it also works, kept in step with its muscle group', async ({
	page,
	userData
}) => {
	await page.goto('/exercises');
	await page.getByRole('button', { name: 'New exercise' }).click();
	await page.getByLabel('Name').fill('Close-grip bench');
	// Nothing to pick before it has a muscle group
	await expect(secondaryPicker(page)).toHaveCount(0);
	await pickMuscleGroup(page, 'Chest');
	await expect(secondaryPicker(page)).toContainText('Secondary muscle group(s)');
	await expect(page.getByText('Primary muscle group', { exact: true })).toBeVisible();
	// Single muscles only, and not the muscle group itself
	for (const name of ['Chest', 'Cardio', 'Custom', 'Whole body']) await expect(muscle(page, name)).toHaveCount(0);

	await muscle(page, 'Triceps').click();
	await muscle(page, 'Front delts').click();
	await expect(muscle(page, 'Triceps')).toHaveAttribute('aria-pressed', 'true');
	await expect(muscle(page, 'Front delts')).toHaveAttribute('aria-pressed', 'true');
	// Two at most: the others wait until one is given up
	await expect(muscle(page, 'Abs')).toBeDisabled();
	await muscle(page, 'Front delts').click();
	await expect(muscle(page, 'Abs')).toBeEnabled();
	await muscle(page, 'Front delts').click();

	// Its muscle group becomes one of them: that one is dropped, and Chest can now be picked
	await pickMuscleGroup(page, 'Triceps');
	await expect(muscle(page, 'Triceps')).toHaveCount(0);
	await expect(muscle(page, 'Front delts')).toHaveAttribute('aria-pressed', 'true');
	await expect(muscle(page, 'Chest')).toHaveAttribute('aria-pressed', 'false');
	// Whole body and cardio have none
	await pickMuscleGroup(page, 'Whole body');
	await expect(secondaryPicker(page)).toHaveCount(0);
	await pickMuscleGroup(page, 'Chest');
	await expect(secondaryPicker(page).getByRole('button', { pressed: true })).toHaveCount(0);

	await muscle(page, 'Triceps').click();
	await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
	await expect(page.getByTestId('exercise-secondary-muscles')).toHaveText('Secondary: Triceps');
	const created = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Close-grip bench' } }
	});
	expect(created).toMatchObject({ targetMuscleGroup: 'Chest', secondaryMuscleGroups: ['Triceps'] });

	// Edit: opens with what it has; a second one added, saved everywhere
	await page.getByLabel('exercise-options').click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await expect(muscle(page, 'Triceps')).toHaveAttribute('aria-pressed', 'true');
	await muscle(page, 'Front delts').click();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Exercise saved everywhere' })).toBeVisible();
	await expect(page.getByTestId('exercise-secondary-muscles')).toHaveText('Secondary: Triceps, Front delts');
});

test('a custom muscle group named like a built-in one is refused, with the reason', async ({ page, userData }) => {
	await page.goto('/exercises');
	await page.getByRole('button', { name: 'New exercise' }).click();
	await page.getByLabel('Name').fill('Bear crawl');
	await pickMuscleGroup(page, 'Custom');
	await page.getByLabel('Custom muscle group').fill('whole body');
	await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'pick it instead of Custom' })).toBeVisible();
	expect(await prisma.exercise.count({ where: { userId: userData.userId, name: 'Bear crawl' } })).toBe(0);
	// The form is still there with what was typed: picking Whole body saves it
	await pickMuscleGroup(page, 'Whole body');
	await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Bear crawl' })).toBeVisible();
	const created = await prisma.exercise.findUniqueOrThrow({
		where: { userId_name: { userId: userData.userId, name: 'Bear crawl' } }
	});
	expect(created).toMatchObject({ targetMuscleGroup: 'WholeBody', customMuscleGroup: null });
});

/** A saved workout yesterday: each exercise with `sets` sets of 10 × 50 kg */
async function seedWorkout(
	userId: string,
	exercises: { name: string; muscle: MuscleGroup; secondaries?: MuscleGroup[]; sets: number }[]
) {
	const startedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const linked: { id: string }[] = [];
	for (const exercise of exercises) {
		linked.push(
			await prisma.exercise.create({
				data: {
					userId,
					name: exercise.name,
					targetMuscleGroup: exercise.muscle,
					secondaryMuscleGroups: exercise.secondaries ?? []
				}
			})
		);
	}
	return prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 30 * 60000),
			workoutExercises: {
				create: exercises.map((exercise, exerciseIndex) => ({
					exerciseIndex,
					name: exercise.name,
					exerciseId: linked[exerciseIndex].id,
					targetMuscleGroup: exercise.muscle,
					secondaryMuscleGroups: exercise.secondaries ?? [],
					setType: 'Straight' as const,
					repRangeStart: 8,
					repRangeEnd: 15,
					sets: {
						create: Array.from({ length: exercise.sets }, (_, setIndex) => ({
							setIndex,
							reps: 10,
							load: 50,
							RIR: 2,
							skipped: false
						}))
					}
				}))
			}
		}
	});
}

test('Stats and a saved workout count half sets, with Whole body as its own line', async ({ page, userData }) => {
	await prisma.workout.deleteMany({ where: { userId: userData.userId } });
	const workout = await seedWorkout(userData.userId, [
		{ name: 'Bench press', muscle: 'Chest', secondaries: ['Triceps', 'FrontDelts'], sets: 3 },
		{ name: 'Burpees', muscle: 'WholeBody', sets: 4 }
	]);

	await page.goto('/stats');
	await page.getByLabel('Last 30 days').click();
	// Whole sets done: the halves are only in the per-muscle and per-area counts
	await expect(page.getByTestId('stats-sets-current')).toHaveText('7');
	const muscles = page.getByTestId('stats-muscles').getByRole('listitem');
	await expect(muscles).toHaveText(['Whole body 4 · 0', 'Chest 3 · 0', 'Triceps 1.5 · 0', 'Front delts 1.5 · 0']);
	await expect(page.getByTestId('stats-muscles-note')).toContainText('counts half a set');
	// Burpees: 4 × half a set in every area; bench: 3 for chest, 1.5 each for arms and shoulders
	await expect(page.getByTestId('stats-radar')).toHaveAttribute(
		'data-areas',
		'Back 2, Chest 5, Core 2, Shoulders 3.5, Arms 3.5, Legs 2'
	);

	// The workout's own chart: the same counts, most sets first
	await page.goto(`/workouts/${workout.id}`);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await page.getByRole('button', { name: 'Stats' }).click();
	await expect(page.getByTestId('sets-per-muscle-chart')).toHaveAttribute(
		'data-sets',
		'Whole body 4, Chest 3, Triceps 1.5, Front delts 1.5'
	);
});

test('a workout in progress counts the half sets on its finish page, also one begun before the update', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, [
		{ name: 'Dips', targetMuscleGroup: 'Triceps', secondaryMuscleGroups: ['Chest'] },
		{ name: 'Hammer curls', targetMuscleGroup: 'Biceps', secondaryMuscleGroups: ['Forearms'] }
	]);
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	// With no routines, the start page is already a blank workout and has no picker
	if (await page.getByRole('radio', { name: /^Blank workout/ }).count()) await pickRoutine(page, 'Blank workout');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await quickAdd(page, ['Dips', 'Hammer curls']);
	for (const name of ['Dips', 'Hammer curls']) {
		await page.locator(`[id="${name}-set-1-reps"]`).fill('10');
		await page.locator(`[id="${name}-set-1-load"]`).fill('20');
		await page.locator(`[id="${name}-set-1-RIR"]`).fill('2');
		await page.getByTestId(`${name}-set-1-action`).click();
		await expect(page.getByTestId(`${name}-set-1-action`)).toHaveAttribute('aria-checked', 'true');
	}
	// As a workout begun before the update was stored: Hammer curls without the field
	await page.evaluate(() => {
		const state = JSON.parse(localStorage.getItem('workoutRunes') as string);
		delete state.workoutExercises[1].secondaryMuscleGroups;
		localStorage.setItem('workoutRunes', JSON.stringify(state));
	});
	await page.reload();

	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/overview/);
	await page.getByRole('tab', { name: 'Muscles' }).click();
	// Dips: a set for triceps, half for chest. Hammer curls: only its own muscle on this screen...
	await expect(page.getByTestId('sets-per-muscle-chart')).toHaveAttribute(
		'data-sets',
		'Triceps 1, Biceps 1, Chest 0.5'
	);
	await saveWorkout(page);
	// ...and the saved workout has both exercises' secondaries, from the exercises themselves
	const saved = await prisma.workout.findFirstOrThrow({
		where: { userId: userData.userId },
		orderBy: { startedAt: 'desc' },
		include: { workoutExercises: { orderBy: { exerciseIndex: 'asc' } } }
	});
	expect(saved.workoutExercises.map((exercise) => exercise.secondaryMuscleGroups)).toEqual([['Chest'], ['Forearms']]);
});
