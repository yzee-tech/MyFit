import { prisma } from '$lib/prisma';
import type { WeightUnit } from '@prisma/client';
import type { WeightSetLike } from '$lib/utils/weightSets';

export const load = async ({ locals, depends }) => {
	depends('settings:userSettings');
	const session = await locals.auth();

	// Unit for bodyweight, charts and stats (weights are stored in kg)
	let homeWeightUnit: WeightUnit = 'KG';
	// Weights each gym has, for suggestions and the exercise editors
	let weightSets: WeightSetLike[] = [];
	if (session?.user?.id) {
		const [userSettings, userWeightSets] = await Promise.all([
			prisma.userSettings.findUnique({ where: { userId: session.user.id }, select: { homeWeightUnit: true } }),
			prisma.weightSet.findMany({
				where: { userId: session.user.id },
				select: { id: true, name: true, unit: true, weights: true },
				orderBy: { name: 'asc' }
			})
		]);
		homeWeightUnit = userSettings?.homeWeightUnit ?? 'KG';
		weightSets = userWeightSets;
	}
	return { session, homeWeightUnit, weightSets };
};
