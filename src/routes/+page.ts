import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const target = '/activities' + url.search;
	throw redirect(302, target);
};
