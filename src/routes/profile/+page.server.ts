import { prisma } from '$lib/prisma.js';
import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
	const session = await event.locals.auth();
	if (!session) redirect(302, '/');

	// Workouts for the activity graph: its 53 weeks start up to 370 days back (the Sunday of the week a year
	// ago), counted in the phone's days; the extra days are for a timezone ahead of or behind the server's
	const graphStart = new Date(Date.now() - 372 * 24 * 60 * 60 * 1000);

	const workoutsForGraph = prisma.workout.findMany({
		where: {
			userId: session.user?.id,
			startedAt: { gte: graphStart }
		},
		select: { startedAt: true },
		orderBy: { startedAt: 'asc' }
	});

	return {
		userCounts: {
			workouts: prisma.workout.count({ where: { userId: session.user?.id } }),
			exercises: prisma.workoutExercise.count({ where: { workout: { userId: session.user?.id } } }),
			// Sets done: a skipped one isn't
			sets: prisma.workoutExerciseSet.count({
				where: { skipped: false, workoutExercise: { workout: { userId: session.user?.id } } }
			})
		},
		workoutsForGraph
	};
};
