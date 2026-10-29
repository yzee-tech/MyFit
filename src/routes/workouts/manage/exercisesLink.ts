/**
 * The link to a workout's exercises. It carries what the suggestions need (the routine, the bodyweight, the
 * block, the gym's unit), so opening it can load or retry them. The start page and the workout panel both use
 * it; a link without them asks for nothing
 */
type LinkedWorkout = {
	userBodyweight: number | null;
	routineName?: string | null;
	workoutOfMesocycle?: unknown;
	sessionWeightUnit?: string;
	sessionWeightSetId?: string;
};

export function exercisesLink(
	workout: LinkedWorkout,
	{
		userBodyweightKg = workout.userBodyweight,
		keepCurrent = false,
		welcomeBack = false
	}: { userBodyweightKg?: number | null; keepCurrent?: boolean; welcomeBack?: boolean } = {}
) {
	const { workoutOfMesocycle, routineName } = workout;
	const fromRoutine = workoutOfMesocycle !== undefined || Boolean(routineName);
	let link = `/workouts/manage/exercises?userBodyweight=${userBodyweightKg}`;
	// A routine of My routines, done in the active block (its settings and week) or not
	if (routineName) link += `&routine=${encodeURIComponent(routineName)}`;
	if (workoutOfMesocycle) link += '&useActiveMesocycle';
	if (keepCurrent) link += '&keepCurrent';
	if (fromRoutine && welcomeBack) link += '&welcomeBack';
	if (fromRoutine && workout.sessionWeightUnit) link += `&sessionUnit=${workout.sessionWeightUnit}`;
	if (fromRoutine && workout.sessionWeightSetId) link += `&sessionWeightSetId=${workout.sessionWeightSetId}`;
	return link;
}
