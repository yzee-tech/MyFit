import { test, expect, type Page } from '../fixtures';
import { createMesocycle, createTemplateExerciseSplit } from './commonFunctions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.beforeEach(async ({ page }) => {
	await page.goto('/exercise-splits');
});

async function saveRoutines(page: Page) {
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'My routines saved' })).toBeVisible({ timeout: 10000 });
	await page.waitForURL('/exercise-splits');
}

async function editExercise(page: Page, exerciseName: string, change: () => Promise<void>) {
	await page.getByLabel(`${exerciseName} options`).click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await change();
	await page.getByRole('button', { name: 'Edit exercise' }).click();
}

test('create My routines from scratch', async ({ page }) => {
	await expect(page.getByTestId('my-routines-count')).toHaveText('No routines yet');
	await page.getByRole('button', { name: 'Create' }).click();
	// One list per person: no name to give it, and it starts with a single routine
	await expect(page.getByLabel('Library name')).toHaveCount(0);
	await expect(page.getByLabel('Routine 2 name')).toHaveCount(0);
	await page.getByLabel('Routine 1 name').fill('Pull');
	await page.getByRole('button', { name: 'Next' }).click();

	// A new exercise, made from the picker
	await page.getByLabel('add-exercise').click();
	await page.getByLabel('Pick an exercise').click();
	await page.getByRole('button', { name: 'New exercise' }).click();
	await page.getByLabel('Name').fill('Custom exercise');
	await page.getByRole('combobox', { name: 'Muscle group' }).click();
	await page.getByRole('option', { name: 'Custom' }).click();
	await page.getByLabel('Custom muscle group').fill('Soleus');
	await page.getByLabel('Counts bodyweight').click();
	await page.getByLabel('Exercise note').fill('Custom note');
	await page.getByRole('button', { name: 'Create exercise' }).click();
	await expect(page.getByTestId('picked-exercise-details')).toContainText('Soleus 100% of bodyweight Custom note');
	await page.locator('button').filter({ hasText: 'Straight' }).click();
	await page.getByRole('option', { name: 'Drop' }).click();
	await page.getByLabel('Rep range start').fill('15');
	await page.getByLabel('Rep range end').fill('30');
	await page.locator('#exercise-set-decrement').fill('5');
	await page.getByPlaceholder('For this routine').fill('Seat on 4');
	await page.getByRole('button', { name: 'Add exercise' }).click();

	await saveRoutines(page);
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('My routines');
	await expect(page.getByTestId('my-routines-count')).toHaveText('1 routine');
});

test('a template’s routines are added to My routines; adding it again names the copies “(2)”', async ({
	page,
	userData
}) => {
	await createTemplateExerciseSplit(page);
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('My routines');
	await expect(page.getByTestId('my-routines-count')).toHaveText('6 routines');
	await expect(page.getByRole('main')).not.toContainText('Rest');
	await expect(page.getByRole('main')).toContainText(
		'Pull APush ALegs APull BPush BLegs B Pull A 4 exercises Pull-ups 3 Straight sets of 5 to 15 reps BW Lats Barbell rows 3 Straight sets of 10 to 15 reps Traps Dumbbell bicep curls 3 Straight sets of 10 to 20 reps Biceps Face pulls 3 Straight sets of 15 to 30 reps Rear delts'
	);

	// The template's routines go after the ones you have; the list keeps its name
	await createTemplateExerciseSplit(page);
	await expect(page.getByTestId('my-routines-count')).toHaveText('12 routines');
	const lists = await prisma.exerciseSplit.findMany({
		where: { userId: userData.userId },
		include: { exerciseSplitDays: { orderBy: { dayIndex: 'asc' } } }
	});
	expect(lists.map((list) => list.name)).toEqual(['My routines']);
	expect(lists[0].exerciseSplitDays.map((routine) => routine.name).slice(5, 8)).toEqual([
		'Legs B',
		'Pull A (2)',
		'Push A (2)'
	]);
});

test('edit My routines: delete a routine from the middle', async ({ page }) => {
	await createTemplateExerciseSplit(page);
	await page.getByRole('button', { name: 'Edit' }).click();
	// It has exercises, so confirm
	await page.getByLabel('Delete routine 4').click();
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page.getByLabel('Routine 4 name')).toHaveValue('Push B');
	await page.getByRole('button', { name: 'Next' }).click();
	await saveRoutines(page);
	await expect(page.getByTestId('my-routines-count')).toHaveText('5 routines');
	await expect(page.getByRole('main')).toContainText('Pull APush ALegs APush BLegs B');
});

test('the current block follows My routines: a rename, set counts, overrides, a removed routine', async ({
	page,
	userData
}) => {
	await createMesocycle(page);
	const block = await prisma.mesocycle.findFirstOrThrow({ where: { userId: userData.userId } });
	const blockRoutines = () =>
		prisma.mesocycleExerciseSplitDay.findMany({
			where: { mesocycleId: block.id },
			include: { mesocycleSplitDayExercises: { orderBy: { exerciseIndex: 'asc' } } },
			orderBy: { dayIndex: 'asc' }
		});
	const before = await blockRoutines();

	// Rename Pull A, 4 sets of rows with their own overload, Legs B removed
	await page.goto('/exercise-splits');
	await page.getByRole('button', { name: 'Edit' }).click();
	await page.getByLabel('Routine 1 name').fill('Hotel – Pull');
	await page.getByLabel('Delete routine 6').click();
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('block-follows-routines')).toBeVisible();
	await editExercise(page, 'Barbell rows', async () => {
		await page.locator('#exercise-sets').fill('4');
		await page.getByRole('button', { name: 'Overrides' }).click();
		await page.locator('#exercise-override-overload-percentage').click();
		await page.locator('#exercise-override-overload-percentage-value').fill('5');
		await page.getByRole('button', { name: 'Basics' }).click();
	});
	await saveRoutines(page);

	const after = await blockRoutines();
	// Same rows in the same places: past workouts keep pointing at the right routine
	expect(after.map((routine) => routine.id)).toEqual(before.map((routine) => routine.id));
	expect(after.map((routine) => [routine.name, routine.dayIndex, routine.hidden])).toEqual([
		['Hotel – Pull', 0, false],
		['Push A', 1, false],
		['Legs A', 2, false],
		['Pull B', 3, false],
		['Push B', 4, false],
		['Legs B', 5, true]
	]);
	const rows = after[0].mesocycleSplitDayExercises.find((exercise) => exercise.name === 'Barbell rows')!;
	expect([rows.sets, rows.overloadPercentage]).toEqual([4, 5]);

	// The block shows them read-only, without Legs B, with a way to edit My routines
	await page.goto(`/mesocycles/${block.id}`);
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByTestId('mesocycle-routines-note')).toHaveText('This mesocycle uses My routines');
	await expect(page.getByRole('tab', { name: 'Legs B' })).toHaveCount(0);
	await expect(page.getByRole('tab', { name: 'Hotel – Pull' })).toBeVisible();
	await page.getByRole('link', { name: 'Edit routines' }).click();
	await page.waitForURL('/exercise-splits');
});

test('old links to a routine library open My routines', async ({ page }) => {
	await page.goto('/exercise-splits/abc123');
	await page.waitForURL('/exercise-splits');
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('My routines');
});
