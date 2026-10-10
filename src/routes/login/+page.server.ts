import { safeRedirectPath } from '$lib/utils/safeRedirect';
import { redirect } from '@sveltejs/kit';

export const load = async ({ parent, url }) => {
	const { session } = await parent();
	const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'));
	// Already signed in: straight on
	if (session?.user) redirect(303, redirectTo);
	return { redirectTo };
};
