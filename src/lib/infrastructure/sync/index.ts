/**
 * Sync infrastructure.
 *
 * @module infrastructure/sync
 */

export { SyncManager, type SyncManagerDeps } from './syncManager';
export {
	GoogleSheetsSyncManager,
	type GoogleSheetsSyncManagerDeps
} from './googleSheetsSyncManager';
export type { GoogleSheetsSyncConfig } from '$lib/application/ports';
export {
	getBrowserGoogleSheetsSyncManager,
	clearBrowserGoogleSheetsSyncManager,
	type BrowserGoogleSheetsSyncManagerOptions
} from './browserGoogleSheetsSyncManager';
export { InMemoryGoogleSheetsSyncManager } from './InMemoryGoogleSheetsSyncManager';
