/**
 * Google Sheets Service
 *
 * Fetches publicly shared Google Sheets as CSV data.
 * Handles URL parsing for various Google Sheets URL formats.
 *
 * Requirements:
 * - Sheet must be shared as "Anyone with the link can view"
 * - No OAuth required (uses public export endpoint)
 *
 * @module services/googleSheets
 */

import type { RawSheetData, RawSheetRow } from '$lib/domain/import';

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed Google Sheets URL components.
 */
export interface GoogleSheetUrlParts {
	/** The spreadsheet ID (from the URL path) */
	sheetId: string;
	/** Optional sheet tab ID (gid parameter) */
	gid?: string;
}

/**
 * Result of fetching a Google Sheet.
 */
export interface FetchSheetResult {
	success: boolean;
	data?: RawSheetData;
	error?: string;
}

// =============================================================================
// URL Parsing
// =============================================================================

/**
 * Regular expressions for matching various Google Sheets URL formats.
 */
const SHEETS_URL_PATTERNS = [
	// Standard edit/view URL: https://docs.google.com/spreadsheets/d/{id}/edit#gid=0
	/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
	// Direct export URL: https://docs.google.com/spreadsheets/d/{id}/export
	/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/export/
];

/**
 * Extract the gid (sheet tab ID) from a URL.
 */
function extractGid(url: string): string | undefined {
	// Check URL hash: #gid=123
	const hashMatch = url.match(/#gid=(\d+)/);
	if (hashMatch) return hashMatch[1];

	// Check query parameter: ?gid=123
	const queryMatch = url.match(/[?&]gid=(\d+)/);
	if (queryMatch) return queryMatch[1];

	return undefined;
}

/**
 * Parse a Google Sheets URL into its components.
 *
 * Supports various URL formats:
 * - https://docs.google.com/spreadsheets/d/{id}/edit#gid=0
 * - https://docs.google.com/spreadsheets/d/{id}/edit?usp=sharing
 * - https://docs.google.com/spreadsheets/d/{id}/export?format=csv
 *
 * @returns Parsed URL parts, or null if URL is not a valid Google Sheets URL
 */
export function parseGoogleSheetsUrl(url: string): GoogleSheetUrlParts | null {
	if (!url || typeof url !== 'string') return null;

	const trimmedUrl = url.trim();

	for (const pattern of SHEETS_URL_PATTERNS) {
		const match = trimmedUrl.match(pattern);
		if (match) {
			return {
				sheetId: match[1],
				gid: extractGid(trimmedUrl)
			};
		}
	}

	return null;
}

/**
 * Build the CSV export URL for a Google Sheet.
 */
export function buildExportUrl(parts: GoogleSheetUrlParts): string {
	let url = `https://docs.google.com/spreadsheets/d/${parts.sheetId}/export?format=csv`;
	if (parts.gid) {
		url += `&gid=${parts.gid}`;
	}
	return url;
}

// =============================================================================
// CSV Parsing
// =============================================================================

/**
 * Parse CSV text into RawSheetData.
 * Handles quoted fields and various delimiters.
 */
export function parseCsvToSheetData(csvText: string): RawSheetData {
	const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

	if (lines.length === 0) {
		return { headers: [], rows: [] };
	}

	// Detect delimiter (tab or comma)
	const delimiter = lines[0].includes('\t') ? '\t' : ',';

	// Parse header row
	const headers = parseCsvRow(lines[0], delimiter);

	// Parse data rows
	const rows: RawSheetRow[] = [];
	for (let i = 1; i < lines.length; i++) {
		const cells = parseCsvRow(lines[i], delimiter);
		// Ensure all rows have the same number of columns as header
		while (cells.length < headers.length) {
			cells.push('');
		}
		rows.push({
			rowIndex: i + 1, // 1-based (row 1 is header, row 2 is first data row)
			cells
		});
	}

	return { headers, rows };
}

/**
 * Parse a single CSV row, handling quoted fields.
 */
function parseCsvRow(row: string, delimiter: string): string[] {
	if (delimiter === '\t') {
		return row.split('\t').map((cell) => cell.trim());
	}

	// CSV parsing with quote handling
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < row.length; i++) {
		const char = row[i];

		if (char === '"') {
			if (inQuotes && row[i + 1] === '"') {
				// Escaped quote inside quoted field
				current += '"';
				i++;
			} else {
				// Toggle quote state
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	result.push(current.trim());
	return result;
}

// =============================================================================
// Fetch Function
// =============================================================================

/**
 * Fetch a publicly shared Google Sheet and parse it as raw sheet data.
 *
 * @param url - Any valid Google Sheets URL
 * @returns FetchSheetResult with either data or an error message
 */
export async function fetchGoogleSheet(url: string): Promise<FetchSheetResult> {
	// Parse the URL
	const urlParts = parseGoogleSheetsUrl(url);
	if (!urlParts) {
		return {
			success: false,
			error:
				'Invalid Google Sheets URL. Please paste a URL like: https://docs.google.com/spreadsheets/d/...'
		};
	}

	// Build the export URL
	const exportUrl = buildExportUrl(urlParts);

	try {
		const response = await fetch(exportUrl);

		if (!response.ok) {
			if (response.status === 404) {
				return {
					success: false,
					error: 'Sheet not found. Please check the URL is correct.'
				};
			}
			if (response.status === 403 || response.status === 401) {
				return {
					success: false,
					error:
						'Cannot access this sheet. Make sure sharing is set to "Anyone with the link can view".'
				};
			}
			return {
				success: false,
				error: `Failed to fetch sheet (HTTP ${response.status}). Please try again.`
			};
		}

		const csvText = await response.text();

		// Check if we got an HTML error page instead of CSV
		if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
			return {
				success: false,
				error:
					'Cannot access this sheet. Make sure sharing is set to "Anyone with the link can view".'
			};
		}

		if (!csvText.trim()) {
			return {
				success: false,
				error: 'The sheet appears to be empty.'
			};
		}

		const data = parseCsvToSheetData(csvText);

		if (data.rows.length === 0) {
			return {
				success: false,
				error: 'The sheet has no data rows (only a header row was found).'
			};
		}

		return {
			success: true,
			data
		};
	} catch (error) {
		// Network errors, CORS issues, etc.
		const message = error instanceof Error ? error.message : 'Unknown error';

		if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
			return {
				success: false,
				error:
					'Could not connect to Google Sheets. Please check your internet connection and try again.'
			};
		}

		return {
			success: false,
			error: `Error fetching sheet: ${message}`
		};
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate that a URL is a Google Sheets URL (without fetching).
 */
export function isGoogleSheetsUrl(url: string): boolean {
	return parseGoogleSheetsUrl(url) !== null;
}

/**
 * Get a preview of the sheet data (first N rows).
 */
export function getPreviewRows(data: RawSheetData, maxRows: number = 10): RawSheetData {
	return {
		headers: data.headers,
		rows: data.rows.slice(0, maxRows)
	};
}
