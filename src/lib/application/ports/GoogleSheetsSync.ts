/**
 * Google Sheets sync-specific contracts.
 *
 * Defines configuration and capabilities used when SyncService
 * is backed by Google Sheets.
 *
 * @module application/ports/GoogleSheetsSync
 */

import type { SyncService } from './SyncService';

/**
 * Configuration for Google Sheets sync.
 */
export interface GoogleSheetsSyncConfig {
  /** The spreadsheet ID to sync with */
  spreadsheetId: string;
  /** Human-readable name of the spreadsheet */
  spreadsheetName?: string;
  /** Last successful sync timestamp */
  lastSyncedAt?: string;
}

/**
 * Sync service capabilities required for Google Sheets-backed storage.
 */
export interface GoogleSheetsConfigurableSyncService extends SyncService {
  configure(config: GoogleSheetsSyncConfig): Promise<void>;
  getConfig(): GoogleSheetsSyncConfig | null;
  clearConfig(): Promise<void>;
}
