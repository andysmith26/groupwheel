/**
 * Browser-configured GoogleOAuthAdapter singleton.
 *
 * TEMPORARY: This provides a pre-configured auth adapter for browser use.
 * Will be removed when components are refactored to receive auth via context.
 *
 * @module infrastructure/auth/browserAuth
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { GoogleOAuthAdapter } from './googleOAuth';
import { LocalStorageAdapter } from '$lib/infrastructure/storage';

let instance: GoogleOAuthAdapter | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Get the browser-configured GoogleOAuthAdapter singleton.
 * Returns null during SSR.
 */
export function getBrowserAuthAdapter(): GoogleOAuthAdapter | null {
	if (!browser) {
		return null;
	}

	if (!instance) {
		instance = new GoogleOAuthAdapter({
			storage: new LocalStorageAdapter(),
			navigate: goto
		});
		// Initialize asynchronously
		initPromise = instance.initialize();
	}

	return instance;
}

/**
 * Wait for the auth adapter to be initialized.
 */
export async function waitForAuthInit(): Promise<void> {
	if (initPromise) {
		await initPromise;
	}
}

/**
 * Legacy export for backwards compatibility with authStore interface.
 * Provides a store-like interface wrapping the GoogleOAuthAdapter.
 */
export const authStore = {
	get user() {
		const adapter = getBrowserAuthAdapter();
		return adapter?.getUserSync() ?? null;
	},

	get accessToken() {
		const adapter = getBrowserAuthAdapter();
		return adapter?.getAccessTokenSync() ?? null;
	},

	get isAuthenticated() {
		const adapter = getBrowserAuthAdapter();
		return adapter?.isAuthenticated() ?? false;
	},

	subscribe(callback: (user: unknown) => void): () => void {
		const adapter = getBrowserAuthAdapter();
		if (adapter) {
			return adapter.onAuthStateChange(callback);
		}
		callback(null);
		return () => {};
	},

	async setUser(user: unknown, accessToken: string): Promise<void> {
		const adapter = getBrowserAuthAdapter();
		if (adapter && user) {
			await adapter.setUser(
				user as { id: string; email: string; name: string; avatarUrl?: string; provider: 'google' },
				accessToken
			);
		}
	},

	async clearUser(): Promise<void> {
		const adapter = getBrowserAuthAdapter();
		if (adapter) {
			await adapter.clearUser();
		}
	}
};
