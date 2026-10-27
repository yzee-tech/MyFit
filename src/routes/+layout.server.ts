import { prisma } from '$lib/prisma';
import type { WeightUnit } from '@prisma/client';
import { type WeightSetLike } from '$lib/utils/weightSets';
import { userExerciseResources } from '$lib/server/weightSets';
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
		const [userSettings, resources] = await Promise.all([
			prisma.userSettings.findUnique({ where: { userId: session.user.id }, select: { homeWeightUnit: true } }),
			userExerciseResources(session.user.id)
		]);
		homeWeightUnit = userSettings?.homeWeightUnit ?? 'KG';
		weightSets = resources.weightSets;
		cardioExercises = resources.cardioExercises;
	}
	return { session, homeWeightUnit, weightSets, cardioExercises };
};
