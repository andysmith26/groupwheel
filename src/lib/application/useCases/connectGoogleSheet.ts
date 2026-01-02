/**
 * connectGoogleSheet use case.
 *
 * Takes a Google Sheets URL, validates it, fetches metadata (title, tabs),
 * and returns a SheetConnection for use in the wizard.
 *
 * @module application/useCases/connectGoogleSheet
 */

import type { GoogleSheetsService, GoogleSheetsError } from '$lib/application/ports';
import type { SheetConnection } from '$lib/domain/sheetConnection';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

// =============================================================================
// Input Types
// =============================================================================

export interface ConnectGoogleSheetInput {
	/** The Google Sheets URL to connect to */
	url: string;
}

// =============================================================================
// Error Types
// =============================================================================

export type ConnectGoogleSheetError =
	| { type: 'INVALID_URL'; message: string }
	| { type: 'NOT_AUTHENTICATED'; message: string }
	| { type: 'PERMISSION_DENIED'; message: string }
	| { type: 'NOT_FOUND'; message: string }
	| { type: 'API_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ConnectGoogleSheetDeps {
	sheetsService: GoogleSheetsService;
	clock: { now(): Date };
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Connect to a Google Sheet and fetch its metadata.
 *
 * @param deps - Service dependencies
 * @param input - The sheet URL to connect to
 * @returns SheetConnection with metadata, or an error
 */
export async function connectGoogleSheet(
	deps: ConnectGoogleSheetDeps,
	input: ConnectGoogleSheetInput
): Promise<Result<SheetConnection, ConnectGoogleSheetError>> {
	const { sheetsService, clock } = deps;
	const { url } = input;

	// Parse URL to get spreadsheet ID
	const spreadsheetId = sheetsService.parseSpreadsheetUrl(url);

	if (!spreadsheetId) {
		return err({
			type: 'INVALID_URL',
			message: 'Please enter a valid Google Sheets URL'
		});
	}

	try {
		// Fetch metadata from Google Sheets API
		const metadata = await sheetsService.getSheetMetadata(spreadsheetId);

		const connection: SheetConnection = {
			spreadsheetId: metadata.spreadsheetId,
			url,
			title: metadata.title,
			tabs: metadata.tabs,
			fetchedAt: clock.now().getTime()
		};

		return ok(connection);
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
					message: sheetsError.message || 'Failed to connect to Google Sheet'
				});
		}
	}
}
