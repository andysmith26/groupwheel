/**
 * Google Sheets API Adapter
 *
 * Implements GoogleSheetsService using the Google Sheets API v4.
 * Requires an authenticated user with spreadsheets.readonly scope.
 *
 * @module infrastructure/sheets/GoogleSheetsAdapter
 */

import type {
	GoogleSheetsService,
	SheetMetadata,
	SheetTab,
	GoogleSheetsError
} from '$lib/application/ports/GoogleSheetsService';
import type { AuthService } from '$lib/application/ports/AuthService';
import type { RawSheetData, RawSheetRow } from '$lib/domain/import';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Google Sheets API response types
 */
interface SheetsApiSpreadsheet {
	spreadsheetId: string;
	properties: {
		title: string;
	};
	sheets: Array<{
		properties: {
			sheetId: number;
			title: string;
			index: number;
		};
	}>;
}

interface SheetsApiValueRange {
	range: string;
	majorDimension: string;
	values?: string[][];
}

export interface GoogleSheetsAdapterDeps {
	authService: AuthService;
}

/**
 * Adapter for Google Sheets API v4.
 */
export class GoogleSheetsAdapter implements GoogleSheetsService {
	private readonly authService: AuthService;

	constructor(deps: GoogleSheetsAdapterDeps) {
		this.authService = deps.authService;
	}

	/**
	 * Parse a Google Sheets URL to extract the spreadsheet ID.
	 */
	parseSpreadsheetUrl(url: string): string | null {
		try {
			const parsed = new URL(url);

			// Must be a Google domain
			if (!parsed.hostname.endsWith('google.com')) {
				return null;
			}

			// Format: https://docs.google.com/spreadsheets/d/{spreadsheetId}/...
			const match = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
			if (match) {
				return match[1];
			}

			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Fetch metadata about a spreadsheet (title, tabs).
	 */
	async getSheetMetadata(spreadsheetId: string): Promise<SheetMetadata> {
		const token = await this.getToken();

		const url = `${SHEETS_API_BASE}/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`;

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			throw await this.handleApiError(response);
		}

		const data: SheetsApiSpreadsheet = await response.json();

		const tabs: SheetTab[] = data.sheets.map((sheet) => ({
			gid: String(sheet.properties.sheetId),
			title: sheet.properties.title,
			index: sheet.properties.index
		}));

		// Sort by index
		tabs.sort((a, b) => a.index - b.index);

		return {
			spreadsheetId: data.spreadsheetId,
			title: data.properties.title,
			tabs
		};
	}

	/**
	 * Fetch data from a specific tab.
	 */
	async getTabData(spreadsheetId: string, tabTitle: string): Promise<RawSheetData> {
		const token = await this.getToken();

		// URL-encode the tab title for the range parameter
		const range = encodeURIComponent(tabTitle);
		const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			throw await this.handleApiError(response);
		}

		const data: SheetsApiValueRange = await response.json();

		// Handle empty sheets
		if (!data.values || data.values.length === 0) {
			return {
				headers: [],
				rows: []
			};
		}

		// First row is headers
		const headers = data.values[0].map((h) => (h ?? '').toString());

		// Remaining rows are data
		const rows: RawSheetRow[] = data.values.slice(1).map((rowCells, index) => ({
			rowIndex: index + 2, // 1-based, accounting for header row
			cells: rowCells.map((c) => (c ?? '').toString())
		}));

		return {
			headers,
			rows
		};
	}

	/**
	 * Get the auth token, throwing if not authenticated.
	 */
	private async getToken(): Promise<string> {
		const token = await this.authService.getAccessToken();

		if (!token) {
			const error: GoogleSheetsError = {
				type: 'NOT_AUTHENTICATED',
				message: 'You must be signed in to access Google Sheets'
			};
			throw error;
		}

		return token;
	}

	/**
	 * Convert API error responses to GoogleSheetsError.
	 */
	private async handleApiError(response: Response): Promise<GoogleSheetsError> {
		let message = `Google Sheets API error (${response.status})`;

		try {
			const errorData = await response.json();
			if (errorData.error?.message) {
				message = errorData.error.message;
			}
		} catch {
			// Use default message
		}

		switch (response.status) {
			case 401:
				return {
					type: 'NOT_AUTHENTICATED',
					message: 'Your session has expired. Please sign in again.'
				};
			case 403:
				return {
					type: 'PERMISSION_DENIED',
					message: 'You do not have permission to access this spreadsheet.'
				};
			case 404:
				return {
					type: 'NOT_FOUND',
					message: 'Spreadsheet not found. Please check the URL.'
				};
			default:
				return {
					type: 'API_ERROR',
					message,
					statusCode: response.status
				};
		}
	}
}
