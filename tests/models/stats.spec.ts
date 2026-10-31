import { expect, test } from '../fixtures';
import { createMesocycle } from './commonFunctions';
import { createId } from '@paralleldrive/cuid2';
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

	// Progress over the 30 days: one bar a day; the totals match the cards
	await expect(page.getByTestId('stats-progress-chart')).toHaveAttribute('data-bars', '30');
	await expect(page.getByTestId('stats-progress')).toContainText('2 h 5 min in the last 30 days');
	await page.getByRole('radio', { name: 'Volume' }).click();
	await expect(page.getByRole('radio', { name: 'Volume' })).toHaveAttribute('aria-checked', 'true');
	await expect(page.getByTestId('stats-progress-total')).toHaveText('1,140 kg');
	// 15 + 15 + 12 + 12 + 20 (the skipped set doesn't count)
	await page.getByRole('radio', { name: 'Reps' }).click();
	await expect(page.getByTestId('stats-progress-total')).toHaveText('74 reps');

	// The last 7 days: only the latest two
	await page.getByLabel('Last 7 days').click();
	await expect(page.getByTestId('stats-workouts-current')).toHaveText('2');
	await expect(page.getByTestId('stats-sets-current')).toHaveText('3');
	await expect(page.getByTestId('stats-progress-chart')).toHaveAttribute('data-bars', '7');
	await expect(page.getByTestId('stats-progress-total')).toHaveText('44 reps');

	// The year so far, against the same dates last year (none then)
	const daysAgo = [10, 3, 2, 40].map((days) => new Date(Date.now() - days * 86400000));
	const thisYear = daysAgo.filter((date) => date.getFullYear() === new Date().getFullYear()).length;
	await page.getByLabel('Year to date').click();
	await expect(page.getByTestId('stats-workouts-current')).toHaveText(String(thisYear));
	await expect(page.getByTestId('stats-workouts-previous')).toHaveText('0 before');
	await expect(page.getByTestId('stats-workouts-previous')).toHaveAttribute('title', 'The same dates last year');

	// All time: every workout, nothing to compare with
	await page.getByLabel('All time').click();
	await expect(page.getByTestId('stats-workouts-current')).toHaveText('4');
	await expect(page.getByTestId('stats-workouts-previous')).toHaveCount(0);
	await expect(page.getByTestId('stats-progress')).toContainText('in all time');
	await expect(muscles).toHaveText(['Side delts 4', 'Lats 2', 'Soleus 1']);
	await expect(page.getByText('now · before')).toHaveCount(0);
});

test('the last 7 days are today and the 6 calendar days before: the cards and the chart count the same workouts', async ({
	page,
	userData
}) => {
	await prisma.workout.deleteMany({ where: { userId: userData.userId } });
	// The page's clock stays at midday today, so passing midnight during the test can't move the days
	const midday = new Date();
	midday.setHours(12, 0, 0, 0);
	await page.clock.setFixedTime(midday);
	const at = (daysBack: number, hours: number, minutes: number) => {
		const date = new Date(midday);
		date.setDate(date.getDate() - daysBack);
		date.setHours(hours, minutes, 0, 0);
		return (Date.now() - date.getTime()) / DAY;
	};
	// The first of the 7 days, just after midnight: counted
	await seedWorkout(userData.userId, at(6, 0, 30), 30, raises([{ reps: 10, load: 10 }]));
	// The day before, late in the evening: the week before, whatever the time now
	await seedWorkout(userData.userId, at(7, 23, 30), 45, raises([{ reps: 10, load: 10 }]));

	await page.goto('/stats');
	await page.getByLabel('Last 7 days').click();
	await expect(page.getByTestId('stats-workouts-current')).toHaveText('1');
	await expect(page.getByTestId('stats-workouts-previous')).toHaveText('1 before');
	await expect(page.getByTestId('stats-duration-current')).toHaveText('30 min');
	await expect(page.getByTestId('stats-progress-chart')).toHaveAttribute('data-bars', '7');
	await expect(page.getByTestId('stats-progress-total')).toHaveText('30 min');
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
	// Every session loaded at once, nothing twice, and nothing left loading
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '2');
	await page.mouse.wheel(0, 3000);
	await expect(page.getByText('Loading…')).toHaveCount(0);
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
		await expect(page.getByLabel('Estimated 1RM')).toHaveCount(0);
		await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-type', 'reps');
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

/** `count` sessions of lateral raises, one a day back from yesterday: created in bulk */
async function seedSessions(userId: string, count: number) {
	await prisma.workout.deleteMany({ where: { userId } });
	const exercise = await prisma.exercise.upsert({
		where: { userId_name: { userId, name: 'Lateral raises' } },
		create: { userId, name: 'Lateral raises', targetMuscleGroup: 'SideDelts' },
		update: {}
	});
	const ids = Array.from({ length: count }, (_, idx) => ({
		workout: createId(),
		exercise: createId(),
		startedAt: new Date(Date.now() - (idx + 1) * DAY)
	}));
	await prisma.workout.createMany({
		data: ids.map(({ workout, startedAt }) => ({
			id: workout,
			userId,
			userBodyweight: 80,
			startedAt,
			endedAt: new Date(startedAt.getTime() + 40 * 60000)
		}))
	});
	await prisma.workoutExercise.createMany({
		data: ids.map(({ workout, exercise: id }) => ({
			id,
			workoutId: workout,
			exerciseId: exercise.id,
			exerciseIndex: 0,
			name: 'Lateral raises',
			targetMuscleGroup: 'SideDelts' as const,
			setType: 'Straight' as const,
			repRangeStart: 10,
			repRangeEnd: 15
		}))
	});
	await prisma.workoutExerciseSet.createMany({
		data: ids.map(({ exercise: id }) => ({
			workoutExerciseId: id,
			setIndex: 0,
			reps: 12,
			load: 10,
			RIR: 2,
			skipped: false
		}))
	});
	return ids;
}

const medium = (date: Date) => date.toLocaleDateString('en-US', { dateStyle: 'medium' });

test('exercise stats: the chart has every session (not just the first 10), and the date filter covers them', async ({
	page,
	userData
}) => {
	const sessions = await seedSessions(userData.userId, 25);
	await page.goto('/stats?exercise=Lateral%20raises');
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '25');
	await expect(page.getByTestId('sessions-limit')).toHaveCount(0);
	// The date filter: from the first session to the last
	await page.getByLabel('Filter exercises').click();
	const range = `${medium(sessions[24].startedAt)} - ${medium(sessions[0].startedAt)}`;
	await expect(page.getByRole('button', { name: range })).toBeVisible();
});

test('exercise stats: at most the latest 200 sessions, said only when there are more', async ({ page, userData }) => {
	await seedSessions(userData.userId, 200);
	await page.goto('/stats?exercise=Lateral%20raises');
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '200');
	await expect(page.getByText('Loading…')).toHaveCount(0);
	await expect(page.getByTestId('sessions-limit')).toHaveCount(0);

	await seedSessions(userData.userId, 201);
	await page.goto('/stats?exercise=Lateral%20raises');
	await expect(page.getByTestId('sessions-limit')).toHaveText('Showing the latest 200 sessions');
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '200');
});

test('exercise stats: an exercise picked from the list is still shown after a reload', async ({ page, userData }) => {
	await seedSessions(userData.userId, 3);
	await page.goto('/stats');
	await page.getByRole('tab', { name: 'Exercises' }).click();
	await page.getByRole('combobox').filter({ hasText: 'Search for an exercise' }).click();
	await page.getByRole('option', { name: 'Lateral raises' }).click();
	await expect(page).toHaveURL(/exercise=Lateral(\+|%20)raises/);
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '3');

	await page.reload();
	await expect(page.getByRole('combobox').filter({ hasText: 'Lateral raises' })).toBeVisible();
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '3');
});

test('exercise stats: a block filter is cleared when another exercise is picked, so its chart shows', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	await prisma.workout.deleteMany({ where: { userId } });
	await prisma.mesocycle.deleteMany({ where: { userId } });
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Hypertrophy',
			weeklyRIR: [3, 2, 1, 0],
			startDate: new Date(Date.now() - 20 * DAY),
			startOverloadPercentage: 2.5,
			lastSetToFailure: false,
			forceRIRMatching: false
		}
	});
	try {
		// Lateral raises in the block; calf raises outside it
		for (const daysAgo of [3, 2]) {
			const workout = await seedWorkout(userId, daysAgo, 40, raises([{ reps: 12, load: 10 }]));
			await prisma.workoutOfMesocycle.create({ data: { workoutId: workout.id, mesocycleId: block.id } });
		}
		for (const daysAgo of [5, 4]) {
			await seedWorkout(userId, daysAgo, 40, { name: 'Calf raises', muscle: 'Calves', sets: [{ reps: 15, load: 40 }] });
		}
		await page.goto('/stats?exercise=Lateral%20raises');
		await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '2');
		// Only the block's sessions
		await page.getByLabel('Filter exercises').click();
		await page.getByRole('combobox').filter({ hasText: 'All mesocycles' }).click();
		await page.getByRole('option', { name: 'Hypertrophy' }).click();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');

		// Another exercise: no block filter left over to hide all of its sessions
		await page.getByRole('combobox').filter({ hasText: 'Lateral raises' }).click();
		await page.getByPlaceholder('Type here').fill('Calf');
		await page.getByRole('option', { name: 'Calf raises' }).click();
		await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '2');
	} finally {
		await prisma.workout.deleteMany({ where: { userId } });
		await prisma.mesocycle.deleteMany({ where: { userId } });
	}
});

test('exercise stats: the clear button empties the search text and keeps the exercise and its chart', async ({
	page,
	userData
}) => {
	await seedSessions(userData.userId, 3);
	await page.goto('/stats?exercise=Lateral%20raises');
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '3');
	await page.getByRole('combobox').filter({ hasText: 'Lateral raises' }).click();
	const search = page.getByPlaceholder('Type here');
	await expect(search).toHaveValue('Lateral raises');
	await page.getByRole('button', { name: 'Clear search' }).click();
	await expect(search).toHaveValue('');
	await expect(search).toBeFocused();
	await expect(page.getByRole('button', { name: 'Clear search' })).toBeHidden();
	// The chart and the link stay as they were
	await expect(page.getByTestId('exercise-chart')).toHaveAttribute('data-points', '3');
	await expect(page).toHaveURL(/exercise=Lateral(\+|%20)raises/);
});
