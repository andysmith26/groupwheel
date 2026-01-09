/**
 * configureSheetsSyncStorage use case.
 *
 * Configures a Google Sheet as the sync storage backend.
 * Validates access to the sheet and sets up the sync manager.
 *
 * @module application/useCases/configureSheetsSyncStorage
 */

import type { GoogleSheetsService, GoogleSheetsError, SyncService } from '$lib/application/ports';
import type { GoogleSheetsSyncManager, GoogleSheetsSyncConfig } from '$lib/infrastructure/sync';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

// =============================================================================
// Input Types
// =============================================================================

export interface ConfigureSheetsSyncStorageInput {
	/** The Google Sheets URL to use for storage */
	url: string;
}

// =============================================================================
// Output Types
// =============================================================================

export interface ConfigureSheetsSyncStorageOutput {
	/** The spreadsheet ID */
	spreadsheetId: string;
	/** The spreadsheet title */
	spreadsheetName: string;
	/** List of tabs in the spreadsheet */
	tabs: string[];
}

// =============================================================================
// Error Types
// =============================================================================

export type ConfigureSheetsSyncStorageError =
	| { type: 'INVALID_URL'; message: string }
	| { type: 'NOT_AUTHENTICATED'; message: string }
	| { type: 'PERMISSION_DENIED'; message: string }
	| { type: 'NOT_FOUND'; message: string }
	| { type: 'SYNC_NOT_AVAILABLE'; message: string }
	| { type: 'API_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ConfigureSheetsSyncStorageDeps {
	sheetsService: GoogleSheetsService;
	sheetsSyncService: SyncService;
}

// =============================================================================
// Type guard for GoogleSheetsSyncManager
// =============================================================================

function isGoogleSheetsSyncManager(
	service: SyncService
): service is GoogleSheetsSyncManager {
	return 'configure' in service && typeof (service as GoogleSheetsSyncManager).configure === 'function';
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Configure a Google Sheet as the sync storage backend.
 *
 * This validates access to the sheet and configures the sync manager
 * to use it for data storage.
 *
 * @param deps - Service dependencies
 * @param input - The sheet URL to configure
 * @returns Configuration result with sheet info, or an error
 */
export async function configureSheetsSyncStorage(
	deps: ConfigureSheetsSyncStorageDeps,
	input: ConfigureSheetsSyncStorageInput
): Promise<Result<ConfigureSheetsSyncStorageOutput, ConfigureSheetsSyncStorageError>> {
	const { sheetsService, sheetsSyncService } = deps;
	const { url } = input;

	// Verify we have a GoogleSheetsSyncManager
	if (!isGoogleSheetsSyncManager(sheetsSyncService)) {
		return err({
			type: 'SYNC_NOT_AVAILABLE',
			message: 'Google Sheets sync is not available'
		});
	}

	// Parse URL to get spreadsheet ID
	const spreadsheetId = sheetsService.parseSpreadsheetUrl(url);

	if (!spreadsheetId) {
		return err({
			type: 'INVALID_URL',
			message: 'Please enter a valid Google Sheets URL'
		});
	}

	try {
		// Fetch metadata to validate access
		const metadata = await sheetsService.getSheetMetadata(spreadsheetId);

		// Configure the sync manager
		const config: GoogleSheetsSyncConfig = {
			spreadsheetId: metadata.spreadsheetId,
			spreadsheetName: metadata.title
		};

		await sheetsSyncService.configure(config);

		// Enable sync
		sheetsSyncService.setEnabled(true);

		return ok({
			spreadsheetId: metadata.spreadsheetId,
			spreadsheetName: metadata.title,
			tabs: metadata.tabs.map((t) => t.title)
		});
	} catch (error) {
		// Handle GoogleSheetsError
		const sheetsError = error as GoogleSheetsError;

		switch (sheetsError.type) {
			case 'NOT_AUTHENTICATED':
				return err({
					type: 'NOT_AUTHENTICATED',
					message: sheetsError.message
				});
			case 'PERMISSION_DENIED':
				return err({
					type: 'PERMISSION_DENIED',
					message: sheetsError.message
				});
			case 'NOT_FOUND':
				return err({
					type: 'NOT_FOUND',
					message: sheetsError.message
				});
			default:
				return err({
					type: 'API_ERROR',
					message: sheetsError.message || 'Failed to configure Google Sheet sync'
				});
		}
	}
}

/**
 * Disconnect from Google Sheets sync storage.
 *
 * @param sheetsSyncService - The sync service to disconnect
 */
export async function disconnectSheetsSyncStorage(
	sheetsSyncService: SyncService
): Promise<void> {
	if (isGoogleSheetsSyncManager(sheetsSyncService)) {
		await sheetsSyncService.clearConfig();
	}
}

/**
 * Get the current sheets sync configuration.
 *
 * @param sheetsSyncService - The sync service to query
 * @returns The current configuration, or null if not configured
 */
export function getSheetsSyncConfig(
	sheetsSyncService: SyncService
): GoogleSheetsSyncConfig | null {
	if (isGoogleSheetsSyncManager(sheetsSyncService)) {
		return sheetsSyncService.getConfig();
	}
	return null;
}
