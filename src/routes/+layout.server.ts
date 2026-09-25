import { prisma } from '$lib/prisma';
import type { WeightUnit } from '@prisma/client';

export const load = async ({ locals, depends }) => {
	depends('settings:userSettings');
	const session = await locals.auth();

	// Unit for bodyweight, charts and stats (weights are stored in kg)
	let homeWeightUnit: WeightUnit = 'KG';
	if (session?.user?.id) {
		const userSettings = await prisma.userSettings.findUnique({
			where: { userId: session.user.id },
			select: { homeWeightUnit: true }
		});
		homeWeightUnit = userSettings?.homeWeightUnit ?? 'KG';
	}
	return { session, homeWeightUnit };
};
