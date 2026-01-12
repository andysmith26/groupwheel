/**
 * Token refresh endpoint. 
 * 
 * Exchanges a refresh token (from httpOnly cookie) for a new access token.
 * Called automatically by GoogleOAuthAdapter when token expires. 
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

interface GoogleTokenResponse {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
}

export const POST: RequestHandler = async ({ cookies }) => {
	const refreshToken = cookies.get('auth_refresh_token');

	if (!refreshToken) {
		return json({ error: 'No refresh token found' }, { status: 401 });
	}

	const clientId = publicEnv.PUBLIC_GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error('OAuth not configured');
		return json({ error: 'OAuth not configured' }, { status: 500 });
	}

	try {
		// Exchange refresh token for new access token
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				refresh_token: refreshToken,
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'refresh_token'
			})
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('Token refresh failed:', errorText);

			// Refresh token is invalid/expired, clear it
			cookies.delete('auth_refresh_token', { path: '/' });

			return json({ error: 'Refresh token expired' }, { status: 401 });
		}

		const tokens:  GoogleTokenResponse = await tokenResponse. json();

		return json({
			access_token:  tokens.access_token,
			expires_in: tokens.expires_in
		});
	} catch (err) {
		console.error('Token refresh error:', err);
		return json({ error: 'Token refresh failed' }, { status:  500 });
	}
};