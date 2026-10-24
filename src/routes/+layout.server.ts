import { prisma } from '$lib/prisma';
import type { WeightUnit } from '@prisma/client';
import { type WeightSetLike } from '$lib/utils/weightSets';
import { userWeightSets } from '$lib/server/weightSets';

export const load = async ({ locals, depends }) => {
	depends('settings:userSettings');
	const session = await locals.auth();

	// Unit for bodyweight, charts and stats (weights are stored in kg)
	let homeWeightUnit: WeightUnit = 'KG';
	// Weights each gym has, for suggestions and the exercise editors, and each machine's levels or weights
	let weightSets: WeightSetLike[] = [];
	if (session?.user?.id) {
		const [userSettings, allWeightSets] = await Promise.all([
			prisma.userSettings.findUnique({ where: { userId: session.user.id }, select: { homeWeightUnit: true } }),
			userWeightSets(session.user.id)
		]);
		homeWeightUnit = userSettings?.homeWeightUnit ?? 'KG';
		weightSets = allWeightSets;
	}
	return { session, homeWeightUnit, weightSets };
};
