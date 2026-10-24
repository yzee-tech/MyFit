import { prisma } from '$lib/prisma';
import { levelSetsFor, machineSetsFor, type WeightSetLike } from '$lib/utils/weightSets';

/** A gym's weights (by name), and each machine's own levels or weights (from its exercise) */
export async function userWeightSets(userId: string): Promise<WeightSetLike[]> {
	const [weightSets, machines] = await Promise.all([
		prisma.weightSet.findMany({
			where: { userId, unit: { not: 'LEVEL' } },
			select: { id: true, name: true, unit: true, weights: true, isAssistance: true },
			orderBy: { name: 'asc' }
		}),
		prisma.exercise.findMany({
			where: { userId, OR: [{ levelsFrom: { not: null } }, { machineWeights: { isEmpty: false } }] },
			select: {
				id: true,
				name: true,
				levelsFrom: true,
				levelsTo: true,
				levelStep: true,
				machineWeights: true,
				machineUnit: true,
				assisted: true
			}
		})
	]);
	return [...weightSets, ...levelSetsFor(machines), ...machineSetsFor(machines)];
}
