import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Redirect /groups/[id]/students to /activities/[id]/present
 * Part of UX Overhaul (Approach C) route restructure.
 */
export const load: PageServerLoad = async ({ params }) => {
	redirect(301, `/activities/${params.id}/present`);
};
