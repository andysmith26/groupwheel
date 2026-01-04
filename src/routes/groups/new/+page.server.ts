import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Redirect /groups/new to /activities/new
 * Part of UX Overhaul (Approach C) route restructure.
 */
export const load: PageServerLoad = async () => {
	redirect(301, '/activities/new');
};
