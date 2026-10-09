import { prisma } from '$lib/prisma';
import type { WeightUnit } from '@prisma/client';
import { levelSetsFor, type WeightSetLike } from '$lib/utils/weightSets';

export const load = async ({ locals, depends }) => {
	depends('settings:userSettings');
	const session = await locals.auth();

	// Unit for bodyweight, charts and stats (weights are stored in kg)
	let homeWeightUnit: WeightUnit = 'KG';
	// Weights each gym has, for suggestions and the exercise editors, and each machine's levels
	let weightSets: WeightSetLike[] = [];
	if (session?.user?.id) {
		const [userSettings, userWeightSets, levelExercises] = await Promise.all([
			prisma.userSettings.findUnique({ where: { userId: session.user.id }, select: { homeWeightUnit: true } }),
			prisma.weightSet.findMany({
				where: { userId: session.user.id, unit: { not: 'LEVEL' } },
				select: { id: true, name: true, unit: true, weights: true, isAssistance: true },
				orderBy: { name: 'asc' }
			}),
			prisma.exercise.findMany({
				where: { userId: session.user.id, levelsFrom: { not: null } },
				select: { id: true, name: true, levelsFrom: true, levelsTo: true, levelStep: true }
			})
		]);
		homeWeightUnit = userSettings?.homeWeightUnit ?? 'KG';
		weightSets = [...userWeightSets, ...levelSetsFor(levelExercises)];
	}
	return { session, homeWeightUnit, weightSets };
};
