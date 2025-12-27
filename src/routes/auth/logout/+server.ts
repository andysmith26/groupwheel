/**
 * Logout endpoint.
 *
 * Clears server-side auth state (cookies).
 */

import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear all auth-related cookies
	cookies.delete('auth_refresh_token', { path: '/' });
	cookies.delete('auth_callback_data', { path: '/' });

	return json({ success: true });
};
