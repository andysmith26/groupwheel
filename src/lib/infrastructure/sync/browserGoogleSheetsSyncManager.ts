/**
 * Browser-configured GoogleSheetsSyncManager singleton.
 *
 * Provides a pre-configured GoogleSheetsSyncManager for browser use.
 * Requires sheetsService and authService to be provided at creation time.
 *
 * @module infrastructure/sync/browserGoogleSheetsSyncManager
 */

import { GoogleSheetsSyncManager } from './googleSheetsSyncManager';
import { LocalStorageAdapter } from '$lib/infrastructure/storage';
import { BrowserNetworkStatusAdapter } from '$lib/infrastructure/network';
import type { GoogleSheetsService, AuthService } from '$lib/application/ports';

let instance: GoogleSheetsSyncManager | null = null;

export interface BrowserGoogleSheetsSyncManagerOptions {
	sheetsService: GoogleSheetsService;
	authService: AuthService;
}

/**
 * Get the browser-configured GoogleSheetsSyncManager singleton.
 * Returns null during SSR.
 *
 * Unlike the regular SyncManager, this requires explicit initialization
 * with sheetsService and authService since it depends on authenticated
 * Google Sheets access.
 */
export function getBrowserGoogleSheetsSyncManager(
	options?: BrowserGoogleSheetsSyncManagerOptions
): GoogleSheetsSyncManager | null {
	if (typeof window === 'undefined') {
		return null;
	}

	// Return existing instance if available
	if (instance) {
		return instance;
	}

	// Require options for first-time creation
	if (!options) {
		return null;
	}

	instance = new GoogleSheetsSyncManager({
		storage: new LocalStorageAdapter(),
		networkStatus: new BrowserNetworkStatusAdapter(),
		sheetsService: options.sheetsService,
		getAccessToken: () => options.authService.getAccessToken()
	});

	// Initialize asynchronously
	instance.initialize();

	return instance;
}

/**
 * Clear the singleton instance.
 * Used for testing or when user logs out.
 */
export function clearBrowserGoogleSheetsSyncManager(): void {
	if (instance) {
		instance.dispose();
		instance = null;
	}
}
