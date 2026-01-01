/**
 * Browser-configured GoogleOAuthAdapter singleton.
 *
 * TEMPORARY: This provides a pre-configured auth adapter for browser use.
 * Will be removed when components are refactored to receive auth via context.
 *
 * @module infrastructure/auth/browserAuth
 */

import { GoogleOAuthAdapter } from './googleOAuth';
import { LocalStorageAdapter, SessionStorageAdapter } from '$lib/infrastructure/storage';

let instance: GoogleOAuthAdapter | null = null;
let initPromise: Promise<void> | null = null;

export interface BrowserAuthAdapterOptions {
	/** Navigation function (e.g., SvelteKit's goto) */
	navigate?: (url: string) => Promise<void>;
	/** Google OAuth client ID */
	clientId?: string;
}

/**
 * Get the browser-configured GoogleOAuthAdapter singleton.
 * Returns null during SSR.
 */
export function getBrowserAuthAdapter(options?: BrowserAuthAdapterOptions): GoogleOAuthAdapter | null {
	if (typeof window === 'undefined') {
		return null;
	}

	if (!instance) {
		instance = new GoogleOAuthAdapter({
			storage: new LocalStorageAdapter(),
			sessionStorage: new SessionStorageAdapter(),
			navigate: options?.navigate ?? ((url: string) => {
				window.location.href = url;
				return Promise.resolve();
			}),
			getOrigin: () => window.location.origin,
			clientId: options?.clientId
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
