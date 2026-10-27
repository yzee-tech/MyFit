import type { CardioExercises } from '$lib/utils/measure';
import { prisma } from '$lib/prisma';
import { levelSetsFor, machineSetsFor, type WeightSetLike } from '$lib/utils/weightSets';

/** A gym's weights (by name), and each machine's own levels or weights (from its exercise) */
export async function userExerciseResources(userId: string) {
	const [weightSets, machines] = await Promise.all([
		prisma.weightSet.findMany({
			where: { userId, unit: { not: 'LEVEL' } },
			select: { id: true, name: true, unit: true, weights: true, isAssistance: true },
			orderBy: { name: 'asc' }
		}),
		prisma.exercise.findMany({
			where: {
				userId,
				OR: [{ levelsFrom: { not: null } }, { machineWeights: { isEmpty: false } }, { measure: { not: 'Reps' } }]
			},
			select: {
				measure: true,
				distanceUnit: true,
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
	const cardioExercises: CardioExercises = Object.fromEntries(
		machines
			.filter((ex) => ex.measure !== 'Reps')
			.map((ex) => [ex.name, { measure: ex.measure, distanceUnit: ex.distanceUnit }])
	);
	return { weightSets: [...weightSets, ...levelSetsFor(machines), ...machineSetsFor(machines)], cardioExercises };
}

/** Weight suggestions without a second exercise query. */
export async function userWeightSets(userId: string): Promise<WeightSetLike[]> {
	return (await userExerciseResources(userId)).weightSets;
}
