/**
 * Sync infrastructure.
 *
 * @module infrastructure/sync
 */

export { SyncManager, type SyncManagerDeps } from './syncManager';
export {
	GoogleSheetsSyncManager,
	type GoogleSheetsSyncManagerDeps,
	type GoogleSheetsSyncConfig
} from './googleSheetsSyncManager';
export {
	getBrowserGoogleSheetsSyncManager,
	clearBrowserGoogleSheetsSyncManager,
	type BrowserGoogleSheetsSyncManagerOptions
} from './browserGoogleSheetsSyncManager';
export { InMemoryGoogleSheetsSyncManager } from './InMemoryGoogleSheetsSyncManager';
