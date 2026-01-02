/**
 * Google Sheets service port.
 *
 * Defines how the application layer interacts with Google Sheets.
 * Implemented by GoogleSheetsAdapter in the infrastructure layer.
 *
 * @module application/ports/GoogleSheetsService
 */

import type { RawSheetData } from '$lib/domain/import';

/**
 * Represents a single tab (sheet) within a Google Spreadsheet.
 */
export interface SheetTab {
	/** The tab's unique identifier (gid) */
	gid: string;
	/** The tab's display name */
	title: string;
	/** 0-based index of this tab */
	index: number;
}

/**
 * Metadata about a Google Spreadsheet.
 */
export interface SheetMetadata {
	/** The spreadsheet's unique identifier */
	spreadsheetId: string;
	/** The spreadsheet's title */
	title: string;
	/** List of all tabs in the spreadsheet */
	tabs: SheetTab[];
}

/**
 * Error types for Google Sheets operations.
 */
export type GoogleSheetsError =
	| { type: 'NOT_AUTHENTICATED'; message: string }
	| { type: 'PERMISSION_DENIED'; message: string }
	| { type: 'NOT_FOUND'; message: string }
	| { type: 'INVALID_URL'; message: string }
	| { type: 'NETWORK_ERROR'; message: string }
	| { type: 'API_ERROR'; message: string; statusCode?: number };

/**
 * Google Sheets service interface.
 *
 * Provides methods for fetching spreadsheet metadata and tab data.
 * Requires the user to be authenticated with Google Sheets scope.
 */
export interface GoogleSheetsService {
	/**
	 * Fetch metadata about a spreadsheet (title, tabs).
	 *
	 * @param spreadsheetId The spreadsheet ID (from URL)
	 * @returns Sheet metadata with list of tabs
	 * @throws GoogleSheetsError on failure
	 */
	getSheetMetadata(spreadsheetId: string): Promise<SheetMetadata>;

	/**
	 * Fetch data from a specific tab.
	 *
	 * @param spreadsheetId The spreadsheet ID
	 * @param tabTitle The tab's title (sheet name)
	 * @returns Raw sheet data (headers + rows)
	 * @throws GoogleSheetsError on failure
	 */
	getTabData(spreadsheetId: string, tabTitle: string): Promise<RawSheetData>;

	/**
	 * Parse a Google Sheets URL to extract the spreadsheet ID.
	 *
	 * @param url Full Google Sheets URL
	 * @returns Spreadsheet ID, or null if URL is invalid
	 */
	parseSpreadsheetUrl(url: string): string | null;
}
