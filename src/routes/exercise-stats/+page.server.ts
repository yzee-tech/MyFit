import { redirect } from '@sveltejs/kit';

// Exercise stats is now the Exercises tab of Stats
export const load = ({ url }) => {
	const exercise = url.searchParams.get('exercise');
	redirect(301, exercise === null ? '/stats?tab=exercises' : `/stats?exercise=${encodeURIComponent(exercise)}`);
};
