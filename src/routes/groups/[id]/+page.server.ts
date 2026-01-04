import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Redirect /groups/[id] to /activities/[id]
 * Part of UX Overhaul (Approach C) route restructure.
 */
export const load: PageServerLoad = async ({ params }) => {
	redirect(301, `/activities/${params.id}`);
};
