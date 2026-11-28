import { test, expect } from '../fixtures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

/**
 * A block's stats name muscles as they are read: "Front delts" for a built-in group, a custom group as typed ("TVA"),
 * and a muscle none of whose sets were done isn't "the one with the fewest sets"
 */

test('block stats: built-in muscles by their label, a custom group as typed, a muscle with no set done left out', async ({
	page,
	userData
}) => {
	const userId = userData.userId;
	const block = await prisma.mesocycle.create({
		data: {
			userId,
			name: 'Labels',
			weeklyRIR: [2, 1, -1],
			startOverloadPercentage: 1.25,
			lastSetToFailure: false,
			forceRIRMatching: false,
			startDate: new Date(Date.now() - 10 * DAY)
		}
	});
	const sets = (rows: [number, number, boolean?][]) => ({
		create: rows.map(([load, reps, skipped = false], setIndex) => ({ setIndex, load, reps, RIR: 2, skipped }))
	});
	const workout = async (daysAgo: number, exercises: Parameters<typeof exercise>[1][]) => {
		const startedAt = new Date(Date.now() - daysAgo * DAY);
		await prisma.workout.create({
			data: {
				userId,
				userBodyweight: 80,
				startedAt,
				endedAt: new Date(startedAt.getTime() + 3600000),
				workoutOfMesocycle: { create: { mesocycleId: block.id } },
				workoutExercises: { create: exercises.map((spec, exerciseIndex) => exercise(exerciseIndex, spec)) }
			}
		});
	};
	function exercise(
		exerciseIndex: number,
		spec: {
			name: string;
			muscle: 'FrontDelts' | 'Calves' | 'Custom';
			custom?: string;
			rows: [number, number, boolean?][];
		}
	) {
		return {
			exerciseIndex,
			name: spec.name,
			targetMuscleGroup: spec.muscle,
			customMuscleGroup: spec.custom ?? null,
			setType: 'Straight' as const,
			repRangeStart: 8,
			repRangeEnd: 15,
			sets: sets(spec.rows)
		};
	}
	// Front delts the most sets; TVA (custom) done at a growing load in both sessions; calves only skipped sets
	await workout(6, [
		{
			name: 'Front raises',
			muscle: 'FrontDelts',
			rows: [
				[10, 10],
				[10, 10],
				[10, 10]
			]
		},
		{ name: 'Dead bug', muscle: 'Custom', custom: 'TVA', rows: [[20, 10]] },
		{ name: 'Calf raises', muscle: 'Calves', rows: [[0, 0, true]] }
	]);
	await workout(2, [
		{
			name: 'Front raises',
			muscle: 'FrontDelts',
			rows: [
				[10, 10],
				[10, 10],
				[10, 10]
			]
		},
		{ name: 'Dead bug', muscle: 'Custom', custom: 'TVA', rows: [[25, 10]] },
		{ name: 'Calf raises', muscle: 'Calves', rows: [[0, 0, true]] }
	]);

	await page.goto(`/mesocycles/${block.id}`);
	await page.getByRole('button', { name: 'Stats', exact: true }).click();
	const card = (title: string) =>
		page.getByText(title, { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
	// By their labels, not "FrontDelts" or "Tva"
	await expect(card('Most sets')).toContainText('Front delts');
	await expect(card('Most sets')).not.toContainText('FrontDelts');
	await expect(card('Least sets')).toContainText('TVA');
	await expect(card('Least sets')).not.toContainText(/Tva/);
	// Calves had no set done: not the muscle with the fewest sets ("Total: 0 sets")
	await expect(card('Least sets')).not.toContainText('Calves');
	await expect(card('Least sets')).not.toContainText('Total: 0 sets');
	await expect(card('Best muscle')).toContainText('TVA');
	await expect(card('Best muscle')).not.toContainText(/Tva/);

	// The Stats page names them the same way: a custom group as typed
	await page.goto('/stats');
	await page.getByLabel('All time').click();
	const muscles = page.getByTestId('stats-muscles').getByRole('listitem');
	await expect(muscles.filter({ hasText: /TVA/ })).toHaveCount(1);
	await expect(muscles.filter({ hasText: /Tva/ })).toHaveCount(0);
	await expect(muscles.filter({ hasText: 'Front delts' })).toHaveCount(1);
});
