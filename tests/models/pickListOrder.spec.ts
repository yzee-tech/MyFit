import { test, expect, type Page } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { createExercises } from './commonFunctions';

const prisma = new PrismaClient();

/** The options of the list that is open, as shown */
async function optionTexts(page: Page) {
	return (await page.getByRole('option').allTextContents()).map((text) => text.trim());
}

const ALPHABETICAL_MUSCLE_GROUPS = [
	'Abductors',
	'Abs',
	'Adductors',
	'Biceps',
	'Calves',
	'Cardio',
	'Chest',
	'Forearms',
	'Front delts',
	'Glutes',
	'Hamstrings',
	'Lats',
	'Neck',
	'Quads',
	'Rear delts',
	'Side delts',
	'Traps',
	'Triceps',
	'Custom'
];

/** Exercises whose names sort in a different order than their muscle groups: the old order was by name */
const SPREAD = [
	{ name: 'Anchor row', targetMuscleGroup: 'Traps' as const },
	{ name: 'Bench', targetMuscleGroup: 'Chest' as const },
	{ name: 'Curl', targetMuscleGroup: 'Biceps' as const },
	{ name: 'Dip', targetMuscleGroup: 'Triceps' as const }
];
const SPREAD_GROUPS = ['Biceps', 'Chest', 'Traps', 'Triceps'];

test('Muscle group, when making an exercise: A to Z, Custom last', async ({ page }) => {
	await page.goto('/exercises');
	await page.getByRole('button', { name: 'New exercise', exact: true }).click();
	await page.getByRole('combobox', { name: 'Muscle group' }).click();
	expect(await optionTexts(page)).toEqual(ALPHABETICAL_MUSCLE_GROUPS);
});

test('Filter by muscle group: its buttons are A to Z in Add exercises and in the routine exercise picker', async ({
	page,
	userData
}) => {
	await createExercises(userData.userId, SPREAD);
	const buttons = async () =>
		(await page.locator('h4:has-text("Filter by muscle group") ~ div.grid button').allTextContents()).map((text) =>
			text.trim()
		);

	// Add exercises, in a workout
	await page.goto('/workouts');
	await page.getByLabel('create-workout').click();
	await page.getByPlaceholder('Type here').fill('80');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.waitForURL(/\/workouts\/manage\/exercises/);
	await page.getByLabel('add-exercise').click();
	const sheet = page.getByRole('dialog').filter({ hasText: 'Add exercises' });
	await expect(sheet.getByRole('checkbox', { name: 'Curl', exact: true })).toBeVisible();
	await page.getByLabel('Filter by muscle group').click();
	await expect.poll(buttons).toEqual(SPREAD_GROUPS);

	// The picker of the routine editor
	await page.goto('/exercise-splits/edit?new');
	await page.getByLabel('add-exercise').click();
	await page.getByLabel('Pick an exercise').click();
	await expect(page.getByRole('option', { name: 'Curl', exact: true })).toBeVisible();
	await page.getByLabel('Filter by muscle group').click();
	await expect.poll(buttons).toEqual(SPREAD_GROUPS);
});

/** A block with one workout of an exercise in it; `endDate` set makes it a finished block */
async function seedBlock(
	userId: string,
	name: string,
	startDate: Date,
	options: { routineName?: string; exercise?: string; finished?: boolean } = {}
) {
	const mesocycle = await prisma.mesocycle.create({
		data: {
			userId,
			name,
			weeklyRIR: [3, 2, 1, 0],
			startDate,
			endDate: options.finished ? new Date(startDate.getTime() + 7 * 86400000) : null,
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	const startedAt = new Date(startDate.getTime() + 86400000);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 3600000),
			routineName: options.routineName ?? null,
			workoutOfMesocycle: { create: { mesocycleId: mesocycle.id } },
			workoutExercises: {
				create: {
					exerciseIndex: 0,
					name: options.exercise ?? 'Curl',
					targetMuscleGroup: 'Biceps',
					setType: 'Straight',
					repRangeStart: 8,
					repRangeEnd: 12,
					sets: { create: [{ setIndex: 0, reps: 10, load: 20, RIR: 2, skipped: false }] }
				}
			}
		}
	});
	return mesocycle;
}

test('Workouts filter: blocks A to Z, one restarted newest first, "Non-meso workouts" first', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	const zeta = await seedBlock(userId, 'Zeta', new Date(2026, 0, 5, 9));
	const olderAlpha = await seedBlock(userId, 'Alpha', new Date(2026, 2, 2, 9));
	const newerAlpha = await seedBlock(userId, 'Alpha', new Date(2026, 2, 12, 9));
	await page.goto('/workouts');
	await page.getByLabel('search').click();
	await page.getByRole('combobox').click();
	const started = (date: Date) =>
		date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	expect(await optionTexts(page)).toEqual([
		'Non-meso workouts',
		`Alpha · ${started(newerAlpha.startDate!)}`,
		`Alpha · ${started(olderAlpha.startDate!)}`,
		zeta.name
	]);
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
});

async function openStatsFor(page: Page, exercise: string) {
	await page.goto(`/stats?exercise=${encodeURIComponent(exercise)}`);
	await expect(page.getByRole('combobox').filter({ hasText: exercise })).toBeVisible();
}

test('Stats › Exercises: its exercise list is A to Z by muscle group, and its block filter A to Z', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	await seedBlock(userId, 'Zeta', new Date(2026, 0, 5, 9), { exercise: 'Curl' });
	await seedBlock(userId, 'Alpha', new Date(2026, 2, 2, 9), { exercise: 'Curl' });
	// Outside any block, and one exercise per muscle group, in names that sort the other way round
	const outside = new Date(2026, 3, 1, 9);
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: outside,
			endedAt: new Date(outside.getTime() + 3600000),
			workoutExercises: {
				create: [
					['Anchor row', 'Traps', 'Traps'],
					['Zed curl', 'Biceps', 'Biceps'],
					['Alpha curl', 'Biceps', 'Biceps'],
					['Bench', 'Chest', 'Chest'],
					['Front raise', 'FrontDelts', 'FrontDelts'],
					['Curl', 'Biceps', 'Biceps']
				].map(([name, group], exerciseIndex) => ({
					exerciseIndex,
					name,
					targetMuscleGroup: group as 'Traps' | 'Biceps' | 'Chest' | 'FrontDelts',
					setType: 'Straight' as const,
					repRangeStart: 8,
					repRangeEnd: 12,
					sets: { create: [{ setIndex: 0, reps: 10, load: 20, RIR: 2, skipped: false }] }
				}))
			}
		}
	});

	await page.goto('/stats?tab=exercises');
	await expect(async () => {
		await page.getByRole('combobox').filter({ hasText: 'Search for an exercise' }).click();
		await expect(page.getByPlaceholder('Type here')).toBeVisible({ timeout: 1000 });
	}).toPass();
	const headings = page.locator('[data-cmdk-group-heading]');
	await expect(headings.first()).toBeVisible();
	expect(await headings.allTextContents()).toEqual(['Biceps', 'Chest', 'Front delts', 'Traps']);
	// The exercises of a section A to Z too
	const bicepsGroup = page.locator('[data-cmdk-group]').filter({ has: page.getByText('Biceps', { exact: true }) });
	expect(await bicepsGroup.locator('[data-cmdk-item]').allTextContents()).toEqual(['Alpha curl', 'Curl', 'Zed curl']);

	// The block filter of an exercise done in two blocks and outside any
	await page.keyboard.press('Escape');
	await openStatsFor(page, 'Curl');
	await page.getByLabel('Filter exercises').click();
	await page.getByRole('combobox').filter({ hasText: 'All mesocycles' }).click();
	expect(await optionTexts(page)).toEqual(['Non-mesocycle', 'Alpha', 'Zeta']);
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
});

test('A block’s workouts chart: its routines follow My routines while it runs, A to Z once it is finished', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	// My routines, in an order that is not A to Z
	await prisma.exerciseSplit.create({
		data: {
			userId,
			name: 'My routines',
			exerciseSplitDays: {
				create: ['Zebra day', 'Mid day', 'Alpha day'].map((name, dayIndex) => ({
					name,
					dayIndex,
					exercises: {
						create: [
							{
								exerciseIndex: 0,
								name: 'Curl',
								targetMuscleGroup: 'Biceps',
								sets: 3,
								setType: 'Straight',
								repRangeStart: 8,
								repRangeEnd: 12
							}
						]
					}
				}))
			}
		}
	});
	const running = await seedBlock(userId, 'Running block', new Date(2026, 0, 5, 9), { routineName: 'Alpha day' });
	for (const routineName of ['Zebra day', 'Gone day', 'Mid day']) {
		const startedAt = new Date(2026, 0, 6, 10);
		await prisma.workout.create({
			data: {
				userId,
				userBodyweight: 80,
				startedAt,
				endedAt: new Date(startedAt.getTime() + 3600000),
				routineName,
				workoutOfMesocycle: { create: { mesocycleId: running.id } }
			}
		});
	}
	const finished = await seedBlock(userId, 'Finished block', new Date(2025, 5, 1, 9), {
		routineName: 'Zebra day',
		finished: true
	});
	await prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt: new Date(2025, 5, 3, 10),
			endedAt: new Date(2025, 5, 3, 11),
			routineName: 'Alpha day',
			workoutOfMesocycle: { create: { mesocycleId: finished.id } }
		}
	});

	const routineOptions = async (mesocycleId: string) => {
		await page.goto(`/mesocycles/${mesocycleId}`);
		await page.getByRole('tab', { name: 'Workouts', exact: true }).click();
		await page.getByRole('button', { name: 'Stats', exact: true }).click();
		await page.getByRole('combobox').click();
		return optionTexts(page);
	};
	// Running: My routines order (Zebra, Mid, Alpha), the one that is gone after them
	expect(await routineOptions(running.id)).toEqual(['Zebra day', 'Mid day', 'Alpha day', 'Gone day']);
	// Finished: A to Z
	expect(await routineOptions(finished.id)).toEqual(['Alpha day', 'Zebra day']);
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	await prisma.exerciseSplit.deleteMany({ where: { userId } });
});
