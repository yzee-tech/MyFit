import { test, expect, type Page } from '../fixtures';
import {
	createMesocycle,
	createTemplateExerciseSplit,
	deleteRoutine,
	editRoutine,
	pickExercise,
	saveRoutine
} from './commonFunctions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.beforeEach(async ({ page }) => {
	await page.goto('/exercise-splits');
});

async function editExercise(page: Page, exerciseName: string, change: () => Promise<void>) {
	await page.getByLabel(`${exerciseName} options`).click();
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	await change();
	await page.getByRole('button', { name: 'Edit exercise' }).click();
}

const cardNames = (page: Page) => page.getByTestId('routine-card-name').allTextContents();
const card = (page: Page, name: string) =>
	page
		.getByTestId('routine-card')
		.filter({ has: page.getByTestId('routine-card-name').getByText(name, { exact: true }) });
const menuItem = async (page: Page, routine: string, item: string) => {
	// One menu open at a time
	await expect(page.getByRole('menu')).toHaveCount(0);
	await page.getByLabel(`Routine ${routine} options`, { exact: true }).click();
	return page.getByRole('menuitem', { name: item, exact: true });
};

/** My routines as saved: names in order, with each routine's exercises */
async function savedRoutines(userId: string) {
	const list = await prisma.exerciseSplit.findUnique({
		where: { userId },
		include: {
			exerciseSplitDays: {
				orderBy: { dayIndex: 'asc' },
				include: { exercises: { orderBy: { exerciseIndex: 'asc' } } }
			}
		}
	});
	return (list?.exerciseSplitDays ?? []).map((routine) => ({
		name: routine.name,
		weightUnit: routine.weightUnit,
		exercises: routine.exercises.map(({ name, sets, setType, repRangeStart, repRangeEnd }) => ({
			name,
			sets,
			setType,
			repRangeStart,
			repRangeEnd
		}))
	}));
}

test('create a routine from scratch: name and exercises on one page', async ({ page }) => {
	await expect(page.getByTestId('my-routines-count')).toHaveText('No routines yet');
	await expect(page.getByRole('main')).toContainText('Create a routine for each workout you do');
	await page.getByRole('link', { name: 'New routine' }).click();
	await page.waitForURL('/exercise-splits/edit?new');
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('New routine');

	// Needs a name and an exercise
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Give the routine a name' })).toBeVisible();
	await page.getByLabel('Name', { exact: true }).fill('Pull');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Add at least one exercise' })).toBeVisible();

	// A new exercise, made from the picker
	await page.getByLabel('add-exercise').click();
	await page.getByLabel('Pick an exercise').click();
	await page.getByRole('button', { name: 'New exercise' }).click();
	await page.locator('#exercise-form-name').fill('Custom exercise');
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

	await saveRoutine(page);
	await expect(page.getByRole('heading', { level: 2 })).toHaveText('My routines');
	await expect(page.getByTestId('my-routines-count')).toHaveText('1 routine');
	await expect(card(page, 'Pull')).toContainText('1 exercise · KG');
	await expect(card(page, 'Pull')).toContainText('Soleus');
});

test('a template’s routines are added straight to My routines; adding it again names the copies “(2)”', async ({
	page,
	userData
}) => {
	await createTemplateExerciseSplit(page);
	await expect(page.getByRole('status').filter({ hasText: 'Added 6 routines' })).toBeVisible();
	await expect(page.getByTestId('my-routines-count')).toHaveText('6 routines');
	await expect(page.getByRole('main')).not.toContainText('Rest');
	expect(await cardNames(page)).toEqual(['Pull A', 'Push A', 'Legs A', 'Pull B', 'Push B', 'Legs B']);

	// Each card: its size, unit and muscles; Show lists its exercises, Hide folds them away
	const pullA = card(page, 'Pull A');
	await expect(pullA).toContainText('4 exercises · KG');
	for (const muscle of ['Lats', 'Traps', 'Biceps', 'Rear delts']) await expect(pullA).toContainText(muscle);
	await expect(pullA.getByTestId('routine-card-exercises')).toHaveCount(0);
	await pullA.getByRole('button', { name: 'Show the exercises of Pull A' }).click();
	await expect(pullA.getByTestId('routine-card-exercises')).toContainText(
		'Pull-ups 3 Straight sets of 5 to 15 reps BW Lats Barbell rows 3 Straight sets of 10 to 15 reps Traps Dumbbell bicep curls 3 Straight sets of 10 to 20 reps Biceps Face pulls 3 Straight sets of 15 to 30 reps Rear delts'
	);
	await expect(pullA.getByRole('link', { name: 'Edit' })).toBeVisible();
	await pullA.getByRole('button', { name: 'Hide the exercises of Pull A' }).click();
	await expect(pullA.getByTestId('routine-card-exercises')).toHaveCount(0);

	// Again: after the ones you have, taken names get "(2)"; still one list
	await createTemplateExerciseSplit(page);
	await expect(page.getByTestId('my-routines-count')).toHaveText('12 routines');
	const lists = await prisma.exerciseSplit.findMany({ where: { userId: userData.userId } });
	expect(lists.map((list) => list.name)).toEqual(['My routines']);
	expect((await savedRoutines(userData.userId)).map((routine) => routine.name).slice(5, 8)).toEqual([
		'Legs B',
		'Pull A (2)',
		'Push A (2)'
	]);
});

test('edit one routine: just it changes; a taken name is refused; leaving with changes asks first', async ({
	page,
	userData
}) => {
	await createTemplateExerciseSplit(page);
	const before = await savedRoutines(userData.userId);

	// A name another routine has
	await editRoutine(page, 'Pull A');
	await page.getByLabel('Name', { exact: true }).fill('Push A');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'You already have a routine called “Push A”' })
	).toBeVisible();

	// Leaving with changes: Keep editing stays, Discard leaves it as it was
	await page.getByLabel('Name', { exact: true }).fill('Hotel – Pull');
	await page.getByRole('link', { name: 'Cancel' }).click();
	await expect(page.getByRole('dialog')).toContainText('Save your changes?');
	await page.getByRole('dialog').getByRole('button', { name: 'Keep editing' }).click();
	await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Hotel – Pull');
	await page.getByRole('link', { name: 'Cancel' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Discard changes' }).click();
	await page.waitForURL('/exercise-splits');
	expect(await savedRoutines(userData.userId)).toEqual(before);

	// Unchanged: leaving just goes
	await editRoutine(page, 'Pull A');
	await page.getByRole('link', { name: 'Cancel' }).click();
	await page.waitForURL('/exercise-splits');
	await expect(page.getByRole('dialog')).toHaveCount(0);

	// Renamed and 4 sets of rows; leaving through the menu, saved from the question
	await editRoutine(page, 'Pull A');
	await page.getByLabel('Name', { exact: true }).fill('Hotel – Pull');
	await editExercise(page, 'Barbell rows', async () => {
		await page.locator('#exercise-sets').fill('4');
	});
	await page.getByRole('link', { name: 'Workouts' }).first().click();
	await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
	await page.waitForURL('/workouts');

	const after = await savedRoutines(userData.userId);
	expect(after.map((routine) => routine.name)).toEqual(['Hotel – Pull', ...before.slice(1).map((r) => r.name)]);
	expect(after[0].exercises.find((exercise) => exercise.name === 'Barbell rows')!.sets).toEqual(4);
	// The others are untouched
	expect(after.slice(1)).toEqual(before.slice(1));
});

test('duplicate, move and delete from the card menu, saved straight away', async ({ page, userData }) => {
	await createTemplateExerciseSplit(page);

	// The ends can't move further
	await expect(await menuItem(page, 'Pull A', 'Move up')).toHaveAttribute('data-disabled', '');
	await page.keyboard.press('Escape');
	await expect(await menuItem(page, 'Legs B', 'Move down')).toHaveAttribute('data-disabled', '');
	await page.keyboard.press('Escape');

	// Duplicate: a copy right below, same exercises
	await (await menuItem(page, 'Pull A', 'Duplicate')).click();
	await expect(page.getByRole('status').filter({ hasText: '“Pull A” duplicated' })).toBeVisible();
	await expect
		.poll(() => cardNames(page))
		.toEqual(['Pull A', 'Pull A (2)', 'Push A', 'Legs A', 'Pull B', 'Push B', 'Legs B']);
	const saved = await savedRoutines(userData.userId);
	expect(saved[1].exercises).toEqual(saved[0].exercises);

	// Move Legs B up
	await (await menuItem(page, 'Legs B', 'Move up')).click();
	await expect
		.poll(() => cardNames(page))
		.toEqual(['Pull A', 'Pull A (2)', 'Push A', 'Legs A', 'Pull B', 'Legs B', 'Push B']);

	// Delete: a warning first
	await (await menuItem(page, 'Push A', 'Delete…')).click();
	await expect(page.getByRole('dialog')).toContainText(
		'Push A has 4 exercises, which will be removed with it. Past workouts keep their records.'
	);
	await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
	await expect.poll(() => cardNames(page)).toEqual(['Pull A', 'Pull A (2)', 'Legs A', 'Pull B', 'Legs B', 'Push B']);
	expect((await savedRoutines(userData.userId)).map((routine) => routine.name)).toEqual(await cardNames(page));

	// The start page follows the order (no block)
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('radio').first()).toContainText('Pull A');
	const startNames = await page.getByRole('radio').allTextContents();
	expect(startNames.findIndex((text) => text.startsWith('Legs B'))).toBeLessThan(
		startNames.findIndex((text) => text.startsWith('Push B'))
	);
});

test('the last routine can go: then the empty state, with both ways to start', async ({ page, userData }) => {
	await prisma.exerciseSplit.create({
		data: {
			userId: userData.userId,
			name: 'My routines',
			exerciseSplitDays: {
				create: [
					{
						name: 'Only one',
						dayIndex: 0,
						isRestDay: false,
						exercises: {
							create: [
								{
									exerciseIndex: 0,
									name: 'Squats',
									targetMuscleGroup: 'Quads',
									sets: 3,
									setType: 'Straight',
									repRangeStart: 5,
									repRangeEnd: 10
								}
							]
						}
					}
				]
			}
		}
	});
	await page.reload();
	await expect(await menuItem(page, 'Only one', 'Move up')).toHaveAttribute('data-disabled', '');
	await expect(page.getByRole('menuitem', { name: 'Move down', exact: true })).toHaveAttribute('data-disabled', '');
	await page.keyboard.press('Escape');
	await deleteRoutine(page, 'Only one');
	await expect(page.getByTestId('my-routines-count')).toHaveText('No routines yet');
	await expect(page.getByRole('main').getByRole('link', { name: 'Add from a template' })).toBeVisible();
	await expect(page.getByRole('main').getByRole('button', { name: 'New routine' })).toBeVisible();
});

test('changed or deleted on another device while open: asked before overwriting', async ({ page, userData }) => {
	await createTemplateExerciseSplit(page);

	// Changed elsewhere: Cancel keeps theirs, Overwrite saves mine
	await editRoutine(page, 'Pull A');
	await editExercise(page, 'Barbell rows', async () => {
		await page.locator('#exercise-sets').fill('4');
	});
	await prisma.exerciseTemplate.updateMany({
		where: { name: 'Barbell rows', exerciseSplitDay: { name: 'Pull A', exerciseSplit: { userId: userData.userId } } },
		data: { sets: 5 }
	});
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	// (The exercise pop-up may still be closing: pick the question by its title)
	const conflict = page.getByRole('dialog').filter({ hasText: 'Changed on another device' });
	await expect(conflict).toContainText('This routine was changed on another device since you opened it.');
	await page.keyboard.press('Escape');
	const rowsSets = async () =>
		(await savedRoutines(userData.userId))
			.find((routine) => routine.name === 'Pull A')!
			.exercises.find((exercise) => exercise.name === 'Barbell rows')!.sets;
	expect(await rowsSets()).toEqual(5);
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await conflict.getByRole('button', { name: 'Overwrite with mine' }).click();
	await page.waitForURL('/exercise-splits');
	expect(await rowsSets()).toEqual(4);

	// Deleted elsewhere: it can be saved as a new routine (at the end)
	await editRoutine(page, 'Push A');
	await page.getByLabel('Name', { exact: true }).fill('Push A again');
	await prisma.exerciseSplitDay.deleteMany({
		where: { name: 'Push A', exerciseSplit: { userId: userData.userId } }
	});
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	const gone = page.getByRole('dialog').filter({ hasText: 'This routine is gone' });
	await expect(gone).toContainText('“Push A” was deleted or renamed on another device');
	await gone.getByRole('button', { name: 'Save as a new routine' }).click();
	await page.waitForURL('/exercise-splits');
	expect((await savedRoutines(userData.userId)).map((routine) => routine.name)).toEqual([
		'Pull A',
		'Legs A',
		'Pull B',
		'Push B',
		'Legs B',
		'Push A again'
	]);
});

test('the current block follows My routines: a rename, set counts, overrides, a removed routine, the order', async ({
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

	// Rename Pull A, 4 sets of rows with their own overload
	await editRoutine(page, 'Pull A');
	await page.getByLabel('Name', { exact: true }).fill('Hotel – Pull');
	await expect(page.getByTestId('block-follows-routines')).toBeVisible();
	await editExercise(page, 'Barbell rows', async () => {
		await page.locator('#exercise-sets').fill('4');
		await page.getByRole('button', { name: 'Overrides' }).click();
		await page.locator('#exercise-override-overload-percentage').click();
		await page.locator('#exercise-override-overload-percentage-value').fill('5');
		await page.getByRole('button', { name: 'Basics' }).click();
	});
	await saveRoutine(page);
	// Legs B removed; Pull B moved up
	await deleteRoutine(page, 'Legs B');
	await (await menuItem(page, 'Pull B', 'Move up')).click();
	await expect.poll(() => cardNames(page)).toEqual(['Hotel – Pull', 'Push A', 'Pull B', 'Legs A', 'Push B']);

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

	// The start page lists the block's routines in My routines order
	await page.goto('/workouts/manage/start');
	await expect(page.getByRole('radio').first()).toContainText('Hotel – Pull');
	const startNames = (await page.getByRole('radio').allTextContents()).map((text) => text.split(/ (Not|Done)/)[0]);
	expect(startNames.slice(0, 5)).toEqual(['Hotel – Pull', 'Push A', 'Pull B', 'Legs A', 'Push B']);

	// The block shows them read-only, without Legs B, with a way to edit My routines
	await page.goto(`/mesocycles/${block.id}`);
	await page.getByRole('tab', { name: 'Routines' }).click();
	await expect(page.getByTestId('mesocycle-routines-note')).toHaveText('This mesocycle uses My routines');
	await expect(page.getByRole('tab', { name: 'Legs B' })).toHaveCount(0);
	await expect(page.getByRole('tab', { name: 'Hotel – Pull' })).toBeVisible();
	await page.getByRole('link', { name: 'Edit routines' }).click();
	await page.waitForURL('/exercise-splits');
});

test('old links open My routines: a routine library, and the old all-routines editor', async ({ page }) => {
	for (const path of [
		'/exercise-splits/abc123',
		'/exercise-splits/manage/structure',
		'/exercise-splits/manage/exercises'
	]) {
		await page.goto(path);
		await page.waitForURL('/exercise-splits');
		await expect(page.getByRole('heading', { level: 2 })).toHaveText('My routines');
	}
});

test('adding an exercise by picking it in a new routine', async ({ page, userData }) => {
	await prisma.exercise.create({ data: { userId: userData.userId, name: 'Squats', targetMuscleGroup: 'Quads' } });
	await page.getByRole('link', { name: 'New routine' }).click();
	await page.getByLabel('Name', { exact: true }).fill('Legs');
	await page.getByLabel('add-exercise').click();
	await pickExercise(page, 'Squats');
	await page.getByLabel('Sets').fill('3');
	await page.getByRole('button', { name: 'Add exercise' }).click();
	await expect(page.getByTestId('routine-exercise-count')).toHaveText('1 exercise');
	await saveRoutine(page);
	const saved = await savedRoutines(userData.userId);
	expect(saved.map((routine) => [routine.name, routine.weightUnit])).toEqual([['Legs', 'KG']]);
	expect(saved[0].exercises.map((exercise) => [exercise.name, exercise.sets])).toEqual([['Squats', 3]]);
});
