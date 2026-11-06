import { trpc } from '$lib/trpc/client';
import { browserTimeZone } from '$lib/utils/workoutUtils';

/**
 * Pauses the person's block where its plan ended, if it has run all its planned weeks, counting days in the
 * phone's timezone (the server's own page loads don't know it). True when it made the pause; never throws:
 * offline or failing, the block simply stays as it was until the next time
 */
export async function reconcileEndOfPlanHere(): Promise<boolean> {
	try {
		const { created } = await trpc().mesocycles.reconcileEndOfPlan.mutate({ timeZone: browserTimeZone() });
		return created;
	} catch {
		return false;
	}
}
