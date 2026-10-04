import { redirect } from '@sveltejs/kit';

/** Old links to a routine library: everyone has one list of routines now */
export const load = () => redirect(308, '/exercise-splits');
