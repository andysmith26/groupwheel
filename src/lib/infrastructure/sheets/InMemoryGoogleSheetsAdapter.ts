/**
 * In-Memory Google Sheets Adapter
 *
 * Test implementation of GoogleSheetsService.
 * Allows setting up mock spreadsheet data for testing.
 *
 * @module infrastructure/sheets/InMemoryGoogleSheetsAdapter
 */

import type {
	GoogleSheetsService,
	SheetMetadata,
	GoogleSheetsError
} from '$lib/application/ports/GoogleSheetsService';
import type { RawSheetData } from '$lib/domain/import';

interface MockSpreadsheet {
	metadata: SheetMetadata;
	tabData: Map<string, RawSheetData>;
}

/**
 * In-memory implementation for testing.
 */
export class InMemoryGoogleSheetsAdapter implements GoogleSheetsService {
	private spreadsheets = new Map<string, MockSpreadsheet>();
	private shouldFailAuth = false;

	/**
	 * Add a mock spreadsheet for testing.
	 */
	addSpreadsheet(metadata: SheetMetadata, tabData: Record<string, RawSheetData>): void {
		this.spreadsheets.set(metadata.spreadsheetId, {
			metadata,
			tabData: new Map(Object.entries(tabData))
		});
	}

	/**
	 * Set whether auth should fail.
	 */
	setAuthFailure(shouldFail: boolean): void {
		this.shouldFailAuth = shouldFail;
	}

	/**
	 * Clear all mock data.
	 */
	clear(): void {
		this.spreadsheets.clear();
		this.shouldFailAuth = false;
	}

	parseSpreadsheetUrl(url: string): string | null {
		try {
			const parsed = new URL(url);
			const match = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
			return match ? match[1] : null;
		} catch {
			return null;
		}
	}

	async getSheetMetadata(spreadsheetId: string): Promise<SheetMetadata> {
		if (this.shouldFailAuth) {
			const error: GoogleSheetsError = {
				type: 'NOT_AUTHENTICATED',
				message: 'Not authenticated'
			};
			throw error;
		}

		const spreadsheet = this.spreadsheets.get(spreadsheetId);
		if (!spreadsheet) {
			const error: GoogleSheetsError = {
				type: 'NOT_FOUND',
				message: 'Spreadsheet not found'
			};
			throw error;
		}

		return spreadsheet.metadata;
	}

	async getTabData(spreadsheetId: string, tabTitle: string): Promise<RawSheetData> {
		if (this.shouldFailAuth) {
			const error: GoogleSheetsError = {
				type: 'NOT_AUTHENTICATED',
				message: 'Not authenticated'
			};
			throw error;
		}

		const spreadsheet = this.spreadsheets.get(spreadsheetId);
		if (!spreadsheet) {
			const error: GoogleSheetsError = {
				type: 'NOT_FOUND',
				message: 'Spreadsheet not found'
			};
			throw error;
		}

		const data = spreadsheet.tabData.get(tabTitle);
		if (!data) {
			const error: GoogleSheetsError = {
				type: 'NOT_FOUND',
				message: `Tab "${tabTitle}" not found`
			};
			throw error;
		}

		return data;
	}
}
