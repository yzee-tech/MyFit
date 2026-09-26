import { z } from 'zod';
import { t } from '$lib/trpc/t';
import { prisma } from '$lib/prisma';
import { renameExercise } from '$lib/server/exercises';
import { QuotesDisplayModeSchema } from '$lib/zodSchemas';

export const users = t.router({
	getEntityCounts: t.procedure.query(async ({ ctx }) => {
		const queryResult = await prisma.user.findUnique({
			where: { id: ctx.userId },
			select: { _count: { select: { exerciseSplits: true, mesocycles: true, workouts: true } } }
		});
		if (!queryResult) {
			return null;
		}

		const startedMesocycles = await prisma.mesocycle.count({
			where: { userId: ctx.userId, startDate: { not: null } }
		});

		const entityCounts = { ...queryResult._count, startedMesocycles };
		return entityCounts;
	}),

	/** Renames an exercise everywhere: routines, blocks and past workouts */
	renameExercises: t.procedure
		.input(z.object({ oldName: z.string(), newName: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const exercise = await renameExercise(ctx.userId, input.oldName, input.newName);
			const count = await prisma.workoutExercise.count({ where: { exerciseId: exercise.id } });
			return { count };
		}),

	getUserSettings: t.procedure.query(async ({ ctx }) => {
		const userSettings = await prisma.userSettings.findUnique({
			where: { userId: ctx.userId },
			select: {
				id: true,
				quotesDisplayModes: true,
				motivationalQuotesEnabled: true,
				welcomeBackEnabled: true,
				welcomeBackAfterDays: true,
				homeWeightUnit: true
			}
		});

		if (!userSettings) {
			return null;
		}

		return userSettings;
	}),

	updateUserSettings: t.procedure
		.input(
			z.object({
				motivationalQuotesEnabled: z.boolean().optional(),
				quotesDisplayModes: z.array(QuotesDisplayModeSchema).min(1).optional(),
				welcomeBackEnabled: z.boolean().optional(),
				welcomeBackAfterDays: z.number().int().min(1).max(60).optional(),
				homeWeightUnit: z.enum(['KG', 'LB']).optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userSettings = await prisma.userSettings.upsert({
				where: { userId: ctx.userId },
				create: {
					userId: ctx.userId,
					quotesDisplayModes: input.quotesDisplayModes ?? ['PRE_WORKOUT'],
					motivationalQuotesEnabled: input.motivationalQuotesEnabled ?? false,
					welcomeBackEnabled: input.welcomeBackEnabled ?? true,
					welcomeBackAfterDays: input.welcomeBackAfterDays ?? 7,
					homeWeightUnit: input.homeWeightUnit ?? 'KG'
				},
				update: {
					...(input.motivationalQuotesEnabled !== undefined && {
						motivationalQuotesEnabled: input.motivationalQuotesEnabled
					}),
					...(input.quotesDisplayModes !== undefined && { quotesDisplayModes: input.quotesDisplayModes }),
					...(input.welcomeBackEnabled !== undefined && { welcomeBackEnabled: input.welcomeBackEnabled }),
					...(input.welcomeBackAfterDays !== undefined && { welcomeBackAfterDays: input.welcomeBackAfterDays }),
					...(input.homeWeightUnit !== undefined && { homeWeightUnit: input.homeWeightUnit })
				},
				select: {
					id: true,
					quotesDisplayModes: true,
					motivationalQuotesEnabled: true,
					welcomeBackEnabled: true,
					welcomeBackAfterDays: true,
					homeWeightUnit: true
				}
			});

			return userSettings;
		})
});
