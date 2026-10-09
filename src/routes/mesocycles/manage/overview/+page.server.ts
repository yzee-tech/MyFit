import { redirect } from '@sveltejs/kit';

// The mesocycle's last step is Progression now: it saves
export const load = () => redirect(301, '/mesocycles/manage/progression');
