import { expect, test } from '../fixtures';
import { createMesocycle } from './commonFunctions';
import { PrismaClient, type MuscleGroup } from '@prisma/client';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

type SeedSet = { reps: number; load: number; skipped?: boolean };

/** A saved workout, `daysAgo` days ago, lasting `minutes`, with one exercise */
async function seedWorkout(
	userId: string,
	daysAgo: number,
	minutes: number,
	exercise: {
		name: string;
		muscle: MuscleGroup;
		customMuscleGroup?: string;
		bodyweightFraction?: number;
		sets: SeedSet[];
	}
) {
	const linked = await prisma.exercise.upsert({
		where: { userId_name: { userId, name: exercise.name } },
		create: {
			userId,
			name: exercise.name,
			targetMuscleGroup: exercise.muscle,
			customMuscleGroup: exercise.customMuscleGroup ?? null
		},
		update: {}
	});
	const startedAt = new Date(Date.now() - daysAgo * DAY);
	return prisma.workout.create({
		data: {
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + minutes * 60000),
			workoutExercises: {
				create: [
					{
						exerciseIndex: 0,
						name: exercise.name,
						exerciseId: linked.id,
						targetMuscleGroup: exercise.muscle,
						customMuscleGroup: exercise.customMuscleGroup ?? null,
						bodyweightFraction: exercise.bodyweightFraction ?? null,
						setType: 'Straight',
						repRangeStart: 8,
						repRangeEnd: 15,
						sets: {
							create: exercise.sets.map((set, setIndex) => ({
								setIndex,
								reps: set.reps,
								load: set.load,
								RIR: 2,
								skipped: set.skipped ?? false
							}))
						}
					}
				]
			}
		}
	});
}

const raises = (sets: SeedSet[]) => ({ name: 'Lateral raises', muscle: 'SideDelts' as const, sets });

test('Stats overview: workouts, time, volume and sets for the last 30 days against the 30 before, per area and muscle', async ({
	page,
	userData
}) => {
	// Only these workouts
	await prisma.workout.deleteMany({ where: { userId: userData.userId } });
	// Last 30 days: 45 min and 60 min of lateral raises (a skipped set doesn't count), calf raises
	await seedWorkout(
		userData.userId,
		10,
		45,
		raises([
			{ reps: 15, load: 10 },
			{ reps: 15, load: 10 },
			{ reps: 15, load: 10, skipped: true }
		])
	);
	await seedWorkout(
		userData.userId,
		3,
		60,
		raises([
			{ reps: 12, load: 10 },
			{ reps: 12, load: 10 }
		])
	);
	await seedWorkout(userData.userId, 2, 20, {
		name: 'Seated calf raises',
		muscle: 'Custom',
		customMuscleGroup: 'Soleus',
		sets: [{ reps: 20, load: 30 }]
	});
	// The 30 days before: pull-ups at bodyweight, 2 × 10 at 80 kg
	await seedWorkout(userData.userId, 40, 30, {
		name: 'Pull-ups',
		muscle: 'Lats',
		bodyweightFraction: 1,
		sets: [
			{ reps: 10, load: 0 },
			{ reps: 10, load: 0 }
		]
	});

	await page.goto('/stats');
	await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active');
	await page.getByLabel('Last 30 days').click();
	await expect(page.getByTestId('stats-workouts-current')).toHaveText('3');
	await expect(page.getByTestId('stats-workouts-previous')).toHaveText('1 before');
	await expect(page.getByTestId('stats-duration-current')).toHaveText('2 h 5 min');
	await expect(page.getByTestId('stats-duration-note')).toHaveText('avg 42 min');
	await expect(page.getByTestId('stats-duration-previous')).toHaveText('30 min before');
	// 2 × 15 × 10 + 2 × 12 × 10 + 20 × 30 = 1140 kg; before: 2 × 10 × 80 = 1600 kg
	await expect(page.getByTestId('stats-volume-current')).toHaveText('1,140 kg');
	await expect(page.getByTestId('stats-volume-previous')).toHaveText('1,600 kg before');
	await expect(page.getByTestId('stats-sets-current')).toHaveText('5');
	await expect(page.getByTestId('stats-sets-previous')).toHaveText('2 before');
	await expect(page.getByTestId('stats-radar')).toBeVisible();
	const muscles = page.getByTestId('stats-muscles').getByRole('listitem');
	await expect(muscles).toHaveText(['Side delts 4 · 0', 'Soleus 1 · 0', 'Lats 0 · 2']);

	// The last 7 days: only the latest two
	await page.getByLabel('Last 7 days').click();
	await expect(page.getByTestId('stats-workouts-current')).toHaveText('2');
	await expect(page.getByTestId('stats-sets-current')).toHaveText('3');
});

test('exercise stats: each workout once, reps-only exercises chart reps, and old links still work', async ({
	page,
	userData
}) => {
	await prisma.workout.deleteMany({ where: { userId: userData.userId } });
	await seedWorkout(
		userData.userId,
		5,
		40,
		raises([
			{ reps: 15, load: 10 },
			{ reps: 15, load: 10 }
		])
	);
	const latest = await seedWorkout(
		userData.userId,
		1,
		40,
		raises([
			{ reps: 15, load: 10 },
			{ reps: 15, load: 10 }
		])
	);

	// An old link opens the Exercises tab with the exercise picked; each workout listed once
	await page.goto('/exercise-stats?exercise=Lateral%20raises');
	await page.waitForURL('/stats?exercise=Lateral%20raises');
	await expect(page.getByRole('tab', { name: 'Exercises' })).toHaveAttribute('data-state', 'active');
	// The shown tab's workouts (the overview's muscle list is there too, hidden)
	const cards = page.getByRole('tabpanel').getByText('Side delts', { exact: true });
	await expect(cards).toHaveCount(2);
	// Scrolling to the end loads nothing twice
	await page.mouse.wheel(0, 3000);
	await expect(page.getByText("That's all")).toBeVisible();
	await expect(cards).toHaveCount(2);

	// Weighted: overload, load and reps; "Show sets"
	await page.getByLabel('Menu').click();
	await expect(page.getByLabel('Relative overload')).toBeVisible();
	await expect(page.getByText('Show sets')).toBeVisible();
	await page.keyboard.press('Escape');

	// Reps only, never with a weight: reps alone
	await prisma.exercise.update({
		where: { userId_name: { userId: userData.userId, name: 'Lateral raises' } },
		data: { repsOnly: true }
	});
	await prisma.workoutExerciseSet.updateMany({
		where: { workoutExercise: { name: 'Lateral raises', workout: { userId: userData.userId } } },
		data: { load: 0 }
	});
	try {
		await page.reload();
		await expect(cards).toHaveCount(2);
		await page.getByLabel('Menu').click();
		await expect(page.getByLabel('Reps')).toBeChecked();
		await expect(page.getByLabel('Relative overload')).toHaveCount(0);
		await expect(page.getByLabel('Absolute load')).toHaveCount(0);
		await expect(page.getByLabel('Load', { exact: true })).toHaveCount(0);
	} finally {
		await prisma.exercise.update({
			where: { userId_name: { userId: userData.userId, name: 'Lateral raises' } },
			data: { repsOnly: false }
		});
	}

	// A saved workout's charts: sets per muscle, no more rep ranges or set types
	await page.goto(`/workouts/${latest.id}`);
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await page.getByRole('button', { name: 'Stats' }).click();
	await expect(page.getByTestId('sets-per-muscle-chart')).toBeVisible();
	await expect(page.getByText('Chart type')).toHaveCount(0);
});

test('a block’s stats: named after the block, a labelled Stats button, sets per muscle and per routine by name', async ({
	page,
	userData
}) => {
	await createMesocycle(page);
	const block = await prisma.mesocycle.findFirstOrThrow({
		where: { userId: userData.userId, name: 'MyMeso' },
		orderBy: { startDate: 'desc' }
	});
	await page.goto(`/mesocycles/${block.id}`);
	await expect(page.getByRole('heading', { level: 2 })).toContainText('MyMeso');
	await page.getByRole('tab', { name: 'Routines' }).click();
	await page.getByRole('button', { name: 'Stats' }).click();
	await expect(page.getByTestId('sets-per-muscle-chart')).toBeVisible();
	await page.getByRole('tab', { name: 'Per routine' }).click();
	await expect(page.getByTestId('sets-per-routine-chart')).toBeVisible();
	await page.getByRole('button', { name: 'Details' }).click();
	await expect(page.getByTestId('sets-per-routine-chart')).toHaveCount(0);
});
