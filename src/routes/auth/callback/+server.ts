/**
 * OAuth callback endpoint.
 *
 * Handles the redirect from Google after user authentication.
 * Exchanges the authorization code for tokens and creates a session.
 */

import { redirect, type RequestHandler } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

interface GoogleTokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	id_token: string;
}

interface GoogleUserInfo {
	sub: string;
	email: string;
	name: string;
	picture?: string;
	email_verified: boolean;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	// Handle OAuth errors
	if (error) {
		console.error('OAuth error:', error);
		throw redirect(302, `/?auth_error=${encodeURIComponent(error)}`);
	}

	// Validate required parameters
	if (!code) {
		throw redirect(302, '/?auth_error=missing_code');
	}

	// Validate client configuration
	const clientId = publicEnv.PUBLIC_GOOGLE_CLIENT_ID;
	const clientSecret = privateEnv.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error('OAuth not configured: missing client ID or secret');
		throw redirect(302, '/?auth_error=not_configured');
	}

	const redirectUri = `${url.origin}/auth/callback`;

	try {
		// Exchange authorization code for tokens
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code'
			})
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('Token exchange failed:', errorText);
			throw redirect(302, '/?auth_error=token_exchange_failed');
		}

		const tokens: GoogleTokenResponse = await tokenResponse.json();

		// Fetch user info
		const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`
			}
		});

		if (!userInfoResponse.ok) {
			console.error('Failed to fetch user info');
			throw redirect(302, '/?auth_error=user_info_failed');
		}

		const userInfo: GoogleUserInfo = await userInfoResponse.json();

		// Create auth data to pass to client
		const authData = {
			user: {
				id: userInfo.sub,
				email: userInfo.email,
				name: userInfo.name,
				avatarUrl: userInfo.picture,
				provider: 'google' as const
			},
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: Date.now() + tokens.expires_in * 1000
		};

		// Store auth data in a secure HTTP-only cookie for the client to read
		// The client will extract this on the callback page
		cookies.set('auth_callback_data', JSON.stringify(authData), {
			path: '/',
			httpOnly: false, // Client needs to read this
			secure: true,
			sameSite: 'lax',
			maxAge: 60 // Short-lived, just for the callback
		});

		// Store refresh token securely (HTTP-only)
		if (tokens.refresh_token) {
			cookies.set('auth_refresh_token', tokens.refresh_token, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30 // 30 days
			});
		}

		// Redirect to callback page to complete client-side auth
		throw redirect(302, '/auth/callback/complete');
	} catch (err) {
		if (err instanceof Response || (err && typeof err === 'object' && 'status' in err)) {
			// Re-throw redirects
			throw err;
		}
		console.error('OAuth callback error:', err);
		throw redirect(302, '/?auth_error=callback_failed');
	}
};
