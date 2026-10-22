import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Deletes test users and everything of theirs. Their workouts go first: a workout's exercises point
 * at the user's exercises (no cascade), and deleting the user alone removes the two in whichever
 * order the database created their links, which differs between migrations and db push
 */
export async function deleteTestUsers(prisma: PrismaClient, where: Prisma.UserWhereInput) {
	await prisma.workout.deleteMany({ where: { user: where } });
	await prisma.user.deleteMany({ where });
}
