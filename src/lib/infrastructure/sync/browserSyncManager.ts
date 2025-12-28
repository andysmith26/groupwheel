/**
 * Browser-configured SyncManager singleton.
 *
 * TEMPORARY: This provides a pre-configured SyncManager for browser use.
 * Will be removed when components are refactored to receive SyncManager via context.
 *
 * @module infrastructure/sync/browserSyncManager
 */

import { SyncManager } from './syncManager';
import { LocalStorageAdapter } from '$lib/infrastructure/storage';
import { BrowserNetworkStatusAdapter } from '$lib/infrastructure/network';
import { getBrowserAuthAdapter } from '$lib/infrastructure/auth/browserAuth';

let instance: SyncManager | null = null;

/**
 * Get the browser-configured SyncManager singleton.
 * Returns null during SSR.
 */
export function getBrowserSyncManager(): SyncManager | null {
	if (typeof window === 'undefined') {
		return null;
	}

	if (!instance) {
		const authAdapter = getBrowserAuthAdapter();
		instance = new SyncManager({
			storage: new LocalStorageAdapter(),
			networkStatus: new BrowserNetworkStatusAdapter(),
			getAccessToken: () => authAdapter?.getAccessTokenSync() ?? null
		});
		// Initialize asynchronously
		instance.initialize();
	}

	return instance;
}
