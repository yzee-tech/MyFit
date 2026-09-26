import { t } from '$lib/trpc/t';
import { prisma } from '$lib/prisma';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { MAX_WEIGHTS_PER_SET, normalizeWeights } from '$lib/utils/weightSets';

const weightSetInput = z.strictObject({
	id: z.string().cuid2().optional(),
	name: z.string().trim().min(1).max(60),
	unit: z.enum(['KG', 'LB']),
	weights: z.array(z.number().positive().max(10000)).min(1).max(MAX_WEIGHTS_PER_SET),
	isAssistance: z.boolean().default(false)
});

export const weightSets = t.router({
	list: t.procedure.query(async ({ ctx }) => {
		return prisma.weightSet.findMany({
			where: { userId: ctx.userId },
			select: { id: true, name: true, unit: true, weights: true, isAssistance: true },
			orderBy: { name: 'asc' }
		});
	}),

	save: t.procedure.input(weightSetInput).mutation(async ({ ctx, input }) => {
		const data = {
			name: input.name,
			unit: input.unit,
			weights: normalizeWeights(input.weights),
			isAssistance: input.isAssistance
		};
		if (input.id === undefined) {
			return prisma.weightSet.create({ data: { ...data, userId: ctx.userId }, select: { id: true } });
		}
		const { count } = await prisma.weightSet.updateMany({ where: { id: input.id, userId: ctx.userId }, data });
		if (count === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Weight set not found' });
		return { id: input.id };
	}),

	delete: t.procedure.input(z.string().cuid2()).mutation(async ({ ctx, input }) => {
		const weightSet = await prisma.weightSet.findFirst({ where: { id: input, userId: ctx.userId } });
		if (!weightSet) throw new TRPCError({ code: 'NOT_FOUND', message: 'Weight set not found' });
		// Exercises linked to it go back to standard steps
		await prisma.$transaction([
			prisma.exerciseTemplate.updateMany({ where: { weightSetId: input }, data: { weightSetId: null } }),
			prisma.mesocycleExerciseTemplate.updateMany({ where: { weightSetId: input }, data: { weightSetId: null } }),
			prisma.weightSet.delete({ where: { id: input } })
		]);
		return { message: 'Weight set deleted' };
	})
});
