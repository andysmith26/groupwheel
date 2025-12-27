/**
 * Google OAuth adapter.
 *
 * Implements the AuthService port for Google OAuth authentication.
 * Uses SvelteKit server-side endpoints for the OAuth flow.
 *
 * @module infrastructure/auth/googleOAuth
 */

import type { AuthService, AuthUser } from '$lib/application/ports';
import { authStore } from '$lib/stores/authStore.svelte';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

/**
 * Google OAuth configuration.
 * These should be set via environment variables.
 */
export interface GoogleOAuthConfig {
	clientId: string;
	redirectUri: string;
}

/**
 * Google OAuth adapter implementing AuthService.
 */
export class GoogleOAuthAdapter implements AuthService {
	private listeners: Set<(user: AuthUser | null) => void> = new Set();
	private unsubscribeFromStore: (() => void) | null = null;

	constructor() {
		// Subscribe to auth store changes and forward to listeners
		if (browser) {
			this.unsubscribeFromStore = authStore.subscribe((user) => {
				for (const listener of this.listeners) {
					listener(user);
				}
			});
		}
	}

	/**
	 * Initiate Google OAuth login flow.
	 * Redirects to the login page which handles the OAuth redirect.
	 */
	async login(): Promise<void> {
		if (!browser) return;
		// Navigate to the login page which will redirect to Google
		await goto('/auth/login');
	}

	/**
	 * Log out the current user.
	 */
	async logout(): Promise<void> {
		if (!browser) return;

		// Call the logout endpoint to clear server-side session
		try {
			await fetch('/auth/logout', { method: 'POST' });
		} catch {
			// Ignore network errors, still clear client state
		}

		// Clear client-side auth state
		authStore.clearUser();
	}

	/**
	 * Get the currently authenticated user.
	 */
	async getUser(): Promise<AuthUser | null> {
		return authStore.user;
	}

	/**
	 * Get the current access token for API calls.
	 */
	async getAccessToken(): Promise<string | null> {
		return authStore.accessToken;
	}

	/**
	 * Subscribe to authentication state changes.
	 */
	onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
		this.listeners.add(callback);
		// Immediately call with current state
		callback(authStore.user);
		return () => {
			this.listeners.delete(callback);
		};
	}

	/**
	 * Check if the user is currently authenticated.
	 */
	isAuthenticated(): boolean {
		return authStore.isAuthenticated;
	}

	/**
	 * Clean up subscriptions.
	 */
	destroy() {
		if (this.unsubscribeFromStore) {
			this.unsubscribeFromStore();
		}
		this.listeners.clear();
	}
}

/**
 * Singleton instance of the Google OAuth adapter.
 */
export const googleOAuth = new GoogleOAuthAdapter();
