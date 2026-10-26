import { prisma } from '$lib/prisma';
import type { WeightUnit } from '@prisma/client';
import { type WeightSetLike } from '$lib/utils/weightSets';
import { userWeightSets } from '$lib/server/weightSets';
import type { CardioExercises } from '$lib/utils/measure';

export const load = async ({ locals, depends }) => {
	depends('settings:userSettings');
	const session = await locals.auth();

	// Unit for bodyweight, charts and stats (weights are stored in kg)
	let homeWeightUnit: WeightUnit = 'KG';
	// Weights each gym has, for suggestions and the exercise editors, and each machine's levels or weights
	let weightSets: WeightSetLike[] = [];
	// The cardio exercises by name: how each is measured and the unit its distances show in (like a
	// machine's levels, known wherever an exercise is shown by name)
	let cardioExercises: CardioExercises = {};
	if (session?.user?.id) {
		const [userSettings, allWeightSets, cardio] = await Promise.all([
			prisma.userSettings.findUnique({ where: { userId: session.user.id }, select: { homeWeightUnit: true } }),
			userWeightSets(session.user.id),
			prisma.exercise.findMany({
				where: { userId: session.user.id, measure: { not: 'Reps' } },
				select: { name: true, measure: true, distanceUnit: true }
			})
		]);
		homeWeightUnit = userSettings?.homeWeightUnit ?? 'KG';
		weightSets = allWeightSets;
		cardioExercises = Object.fromEntries(
			cardio.map((exercise) => [exercise.name, { measure: exercise.measure, distanceUnit: exercise.distanceUnit }])
		);
	}
	return { session, homeWeightUnit, weightSets, cardioExercises };
};
