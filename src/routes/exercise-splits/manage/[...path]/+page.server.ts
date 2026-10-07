import { redirect } from '@sveltejs/kit';

/** The old all-routines editor: routines are now edited one at a time from My routines */
export const load = () => redirect(308, '/exercise-splits');
