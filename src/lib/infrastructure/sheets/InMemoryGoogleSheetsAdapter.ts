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
	SheetWriteData,
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

	// ─────────────────────────────────────────────────────────────────────────
	// Write Operations
	// ─────────────────────────────────────────────────────────────────────────

	async updateTabData(
		spreadsheetId: string,
		tabTitle: string,
		data: SheetWriteData
	): Promise<void> {
		this.checkAuth();

		const spreadsheet = this.getSpreadsheetOrThrow(spreadsheetId);

		// Convert SheetWriteData to RawSheetData
		const rawData: RawSheetData =
			data.rows.length === 0
				? { headers: [], rows: [] }
				: {
						headers: data.rows[0],
						rows: data.rows.slice(1).map((cells, index) => ({
							rowIndex: index + 2,
							cells
						}))
					};

		spreadsheet.tabData.set(tabTitle, rawData);
	}

	async clearTab(spreadsheetId: string, tabTitle: string): Promise<void> {
		this.checkAuth();

		const spreadsheet = this.getSpreadsheetOrThrow(spreadsheetId);
		spreadsheet.tabData.set(tabTitle, { headers: [], rows: [] });
	}

	async createTab(spreadsheetId: string, tabTitle: string): Promise<void> {
		this.checkAuth();

		const spreadsheet = this.getSpreadsheetOrThrow(spreadsheetId);

		// Check if tab already exists
		if (spreadsheet.tabData.has(tabTitle)) {
			const error: GoogleSheetsError = {
				type: 'API_ERROR',
				message: `Tab "${tabTitle}" already exists`,
				statusCode: 400
			};
			throw error;
		}

		// Add new tab to metadata
		const newTab = {
			gid: String(Date.now()),
			title: tabTitle,
			index: spreadsheet.metadata.tabs.length
		};
		spreadsheet.metadata.tabs.push(newTab);

		// Initialize empty tab data
		spreadsheet.tabData.set(tabTitle, { headers: [], rows: [] });
	}

	async ensureTab(spreadsheetId: string, tabTitle: string): Promise<boolean> {
		this.checkAuth();

		const spreadsheet = this.getSpreadsheetOrThrow(spreadsheetId);

		if (spreadsheet.tabData.has(tabTitle)) {
			return false;
		}

		await this.createTab(spreadsheetId, tabTitle);
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Private helpers
	// ─────────────────────────────────────────────────────────────────────────

	private checkAuth(): void {
		if (this.shouldFailAuth) {
			const error: GoogleSheetsError = {
				type: 'NOT_AUTHENTICATED',
				message: 'Not authenticated'
			};
			throw error;
		}
	}

	private getSpreadsheetOrThrow(spreadsheetId: string): MockSpreadsheet {
		const spreadsheet = this.spreadsheets.get(spreadsheetId);
		if (!spreadsheet) {
			const error: GoogleSheetsError = {
				type: 'NOT_FOUND',
				message: 'Spreadsheet not found'
			};
			throw error;
		}
		return spreadsheet;
	}
}
