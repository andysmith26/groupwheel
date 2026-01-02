/**
 * importFromSheetTab use case.
 *
 * Fetches data from a specific tab of a connected Google Sheet.
 * Returns RawSheetData ready for column mapping.
 *
 * @module application/useCases/importFromSheetTab
 */

import type { GoogleSheetsService, GoogleSheetsError } from '$lib/application/ports';
import type { RawSheetData } from '$lib/domain/import';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

// =============================================================================
// Input Types
// =============================================================================

export interface ImportFromSheetTabInput {
	/** The spreadsheet ID */
	spreadsheetId: string;
	/** The tab title to fetch data from */
	tabTitle: string;
}

// =============================================================================
// Error Types
// =============================================================================

export type ImportFromSheetTabError =
	| { type: 'NOT_AUTHENTICATED'; message: string }
	| { type: 'PERMISSION_DENIED'; message: string }
	| { type: 'NOT_FOUND'; message: string }
	| { type: 'EMPTY_TAB'; message: string }
	| { type: 'API_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ImportFromSheetTabDeps {
	sheetsService: GoogleSheetsService;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Fetch data from a specific tab of a Google Sheet.
 *
 * @param deps - Service dependencies
 * @param input - The spreadsheet ID and tab title
 * @returns RawSheetData ready for column mapping
 */
export async function importFromSheetTab(
	deps: ImportFromSheetTabDeps,
	input: ImportFromSheetTabInput
): Promise<Result<RawSheetData, ImportFromSheetTabError>> {
	const { sheetsService } = deps;
	const { spreadsheetId, tabTitle } = input;

	try {
		const data = await sheetsService.getTabData(spreadsheetId, tabTitle);

		// Check if tab has any data
		if (data.headers.length === 0) {
			return err({
				type: 'EMPTY_TAB',
				message: `The tab "${tabTitle}" appears to be empty`
			});
		}

		return ok(data);
	} catch (error) {
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
					message: sheetsError.message || 'Failed to fetch tab data'
				});
		}
	}
}
