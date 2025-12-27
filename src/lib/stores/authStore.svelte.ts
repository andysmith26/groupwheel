/**
 * Auth Store: Authentication state management
 *
 * This store manages the current user's authentication state.
 * Uses Svelte 5 runes for reactive state.
 *
 * The store persists minimal auth state to localStorage so that
 * the user stays logged in across page refreshes.
 */

import type { AuthUser } from '$lib/application/ports';
import { browser } from '$app/environment';

const AUTH_STORAGE_KEY = 'groupwheel_auth';

interface PersistedAuthState {
	user: AuthUser | null;
	accessToken: string | null;
}

/**
 * Auth store implementation using Svelte 5 $state runes.
 */
export class AuthStore {
	user = $state<AuthUser | null>(null);
	accessToken = $state<string | null>(null);
	loading = $state(true);
	initialized = $state(false);

	private listeners: Set<(user: AuthUser | null) => void> = new Set();

	constructor() {
		// Load persisted state on initialization
		if (browser) {
			this.loadFromStorage();
		}
		this.loading = false;
		this.initialized = true;
	}

	/**
	 * Load auth state from localStorage.
	 */
	private loadFromStorage() {
		try {
			const stored = localStorage.getItem(AUTH_STORAGE_KEY);
			if (stored) {
				const parsed: PersistedAuthState = JSON.parse(stored);
				this.user = parsed.user;
				this.accessToken = parsed.accessToken;
			}
		} catch {
			// Ignore parse errors, start fresh
			this.clearStorage();
		}
	}

	/**
	 * Save auth state to localStorage.
	 */
	private saveToStorage() {
		if (!browser) return;

		const state: PersistedAuthState = {
			user: this.user,
			accessToken: this.accessToken
		};
		localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
	}

	/**
	 * Clear auth state from localStorage.
	 */
	private clearStorage() {
		if (!browser) return;
		localStorage.removeItem(AUTH_STORAGE_KEY);
	}

	/**
	 * Notify all listeners of auth state change.
	 */
	private notifyListeners() {
		for (const listener of this.listeners) {
			listener(this.user);
		}
	}

	/**
	 * Set the authenticated user (called after successful OAuth).
	 */
	setUser(user: AuthUser, accessToken: string) {
		this.user = user;
		this.accessToken = accessToken;
		this.saveToStorage();
		this.notifyListeners();
	}

	/**
	 * Clear authentication (logout).
	 */
	clearUser() {
		this.user = null;
		this.accessToken = null;
		this.clearStorage();
		this.notifyListeners();
	}

	/**
	 * Check if user is currently authenticated.
	 */
	get isAuthenticated(): boolean {
		return this.user !== null;
	}

	/**
	 * Subscribe to auth state changes.
	 * @returns Unsubscribe function
	 */
	subscribe(callback: (user: AuthUser | null) => void): () => void {
		this.listeners.add(callback);
		// Immediately call with current state
		callback(this.user);
		return () => {
			this.listeners.delete(callback);
		};
	}

	/**
	 * Update the access token (e.g., after refresh).
	 */
	updateAccessToken(token: string) {
		this.accessToken = token;
		this.saveToStorage();
	}
}

/**
 * Singleton auth store instance.
 */
export const authStore = new AuthStore();
