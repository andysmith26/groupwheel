/**
 * Sheet Connection domain types.
 *
 * Represents a connection to a Google Spreadsheet for data import.
 * Used to track the source sheet for an activity and cache tab metadata.
 *
 * @module domain/sheetConnection
 */

/**
 * Represents a single tab (sheet) within a Google Spreadsheet.
 */
export interface SheetTab {
	/** The tab's unique identifier (gid) */
	gid: string;
	/** The tab's display name */
	title: string;
	/** 0-based index of this tab in the spreadsheet */
	index: number;
}

/**
 * A connection to a Google Spreadsheet with cached metadata.
 * This is a value object used during the wizard flow.
 */
export interface SheetConnection {
	/** The spreadsheet's unique identifier */
	spreadsheetId: string;
	/** The original URL used to connect */
	url: string;
	/** The spreadsheet's title */
	title: string;
	/** List of all tabs in the spreadsheet */
	tabs: SheetTab[];
	/** When this metadata was fetched (epoch ms) */
	fetchedAt: number;
}

/**
 * Minimal sheet reference stored on a Program.
 * Only stores essential info to re-connect to the sheet.
 */
export interface SheetReference {
	/** The spreadsheet's unique identifier */
	spreadsheetId: string;
	/** The original URL for display/re-use */
	url: string;
}

/**
 * Create a sheet reference from a connection.
 */
export function createSheetReference(connection: SheetConnection): SheetReference {
	return {
		spreadsheetId: connection.spreadsheetId,
		url: connection.url
	};
}
