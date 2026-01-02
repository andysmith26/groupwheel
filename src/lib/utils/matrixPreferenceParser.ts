/**
 * Matrix preference parser for Google Forms "grid" format.
 *
 * This format is common when collecting ranked preferences via Google Forms.
 * Each column represents a group/option, and cell values indicate the rank.
 *
 * Example headers:
 * - "Please Request Four Clubs: [Chorus]"
 * - "Rank your preferences: [Option A]"
 * - "1st Choice [Art Club]"
 *
 * Example cell values:
 * - "1st Choice"
 * - "2nd Choice"
 * - "3rd Choice"
 * - "4th Choice"
 * - "5th Choice"
 * - "" (empty = not ranked)
 *
 * @module utils/matrixPreferenceParser
 */

import type { RawSheetData, RawSheetRow } from '$lib/domain/import';

// =============================================================================
// Types
// =============================================================================

/**
 * A parsed preference column from a matrix-format sheet.
 */
export interface MatrixPreferenceColumn {
	/** 0-based column index */
	columnIndex: number;
	/** Original header text */
	originalHeader: string;
	/** Extracted group/option name */
	groupName: string;
}

/**
 * A student's preferences extracted from a matrix-format row.
 */
export interface MatrixStudentPreference {
	/** Row index (1-based) for error messages */
	rowIndex: number;
	/** Group names in ranked order (index 0 = 1st choice) */
	rankedChoices: string[];
	/** Raw mapping of group name to rank (1-5) */
	choiceMap: Map<string, number>;
}

/**
 * Result of detecting matrix format columns.
 */
export interface MatrixFormatDetection {
	/** Whether this appears to be matrix format */
	isMatrixFormat: boolean;
	/** Detected preference columns (if matrix format) */
	columns: MatrixPreferenceColumn[];
	/** Common prefix pattern found in headers */
	headerPattern: string | null;
	/** Confidence score 0-1 */
	confidence: number;
}

// =============================================================================
// Header Parsing
// =============================================================================

/**
 * Patterns for extracting group names from column headers.
 * Order matters - more specific patterns should come first.
 */
const GROUP_NAME_PATTERNS = [
	// [Group Name] at end - most common Google Forms format
	/\[([^\]]+)\]\s*$/,
	// (Group Name) at end
	/\(([^)]+)\)\s*$/,
	// "Group Name" at end (quoted)
	/"([^"]+)"\s*$/,
	// 'Group Name' at end (single quoted)
	/'([^']+)'\s*$/,
	// After colon: "Question: Group Name"
	/:\s*([^:[\]()]+?)\s*$/,
	// After dash: "Question - Group Name"
	/-\s*([^-[\]()]+?)\s*$/
];

/**
 * Extract a group name from a matrix-format column header.
 *
 * @param header - The column header text
 * @returns The extracted group name, or null if not detected
 */
export function extractGroupNameFromHeader(header: string): string | null {
	const trimmed = header.trim();
	if (!trimmed) return null;

	for (const pattern of GROUP_NAME_PATTERNS) {
		const match = trimmed.match(pattern);
		if (match && match[1]) {
			const groupName = match[1].trim();
			// Ensure we got a reasonable group name (not too short, not just numbers)
			if (groupName.length >= 2 && !/^\d+$/.test(groupName)) {
				return groupName;
			}
		}
	}

	return null;
}

/**
 * Find the common prefix among multiple headers.
 * Used to identify the "question" part of matrix headers.
 */
export function findCommonHeaderPrefix(headers: string[]): string | null {
	if (headers.length < 2) return null;

	const first = headers[0];
	let prefixLength = 0;

	for (let i = 0; i < first.length; i++) {
		const char = first[i];
		if (headers.every((h) => h[i] === char)) {
			prefixLength = i + 1;
		} else {
			break;
		}
	}

	// Need at least 10 chars to be a meaningful prefix
	if (prefixLength < 10) return null;

	const prefix = first.substring(0, prefixLength).trim();
	// Should end with a delimiter like : [ ( or space
	if (!/[:\[(\s]$/.test(prefix)) {
		// Try trimming to the last delimiter
		const lastDelim = Math.max(
			prefix.lastIndexOf(':'),
			prefix.lastIndexOf('['),
			prefix.lastIndexOf('(')
		);
		if (lastDelim > 10) {
			return prefix.substring(0, lastDelim + 1).trim();
		}
	}

	return prefix;
}

// =============================================================================
// Cell Value Parsing
// =============================================================================

/**
 * Patterns for extracting choice rank from cell values.
 */
const CHOICE_RANK_PATTERNS = [
	// "1st Choice", "2nd Choice", etc.
	/^(\d+)(?:st|nd|rd|th)\s*choice/i,
	// "Choice 1", "Choice 2", etc.
	/^choice\s*(\d+)/i,
	// "Rank 1", "Rank 2", etc.
	/^rank\s*(\d+)/i,
	// Just "1st", "2nd", etc.
	/^(\d+)(?:st|nd|rd|th)$/i,
	// Just a number "1", "2", etc.
	/^(\d+)$/
];

/**
 * Extract the choice rank (1-5) from a cell value.
 *
 * @param value - The cell value
 * @returns The rank (1-5), or null if not a valid rank
 */
export function extractChoiceRank(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	for (const pattern of CHOICE_RANK_PATTERNS) {
		const match = trimmed.match(pattern);
		if (match && match[1]) {
			const rank = parseInt(match[1], 10);
			// Only accept ranks 1-10 (reasonable for school surveys)
			if (rank >= 1 && rank <= 10) {
				return rank;
			}
		}
	}

	return null;
}

// =============================================================================
// Format Detection
// =============================================================================

/**
 * Detect if sheet data appears to be in matrix preference format.
 *
 * Heuristics:
 * 1. Multiple columns with extractable group names from headers
 * 2. Common prefix pattern in those headers
 * 3. Cell values that look like choice ranks
 *
 * @param data - Raw sheet data
 * @returns Detection result with confidence score
 */
export function detectMatrixFormat(data: RawSheetData): MatrixFormatDetection {
	const { headers, rows } = data;

	// Find columns where we can extract group names
	const groupColumns: MatrixPreferenceColumn[] = [];

	for (let i = 0; i < headers.length; i++) {
		const groupName = extractGroupNameFromHeader(headers[i]);
		if (groupName) {
			groupColumns.push({
				columnIndex: i,
				originalHeader: headers[i],
				groupName
			});
		}
	}

	// Need at least 2 columns to be matrix format
	if (groupColumns.length < 2) {
		return {
			isMatrixFormat: false,
			columns: [],
			headerPattern: null,
			confidence: 0
		};
	}

	// Check for common header prefix
	const groupHeaders = groupColumns.map((c) => c.originalHeader);
	const headerPattern = findCommonHeaderPrefix(groupHeaders);

	// Sample cell values to check if they look like ranks
	let rankCellCount = 0;
	let totalCellCount = 0;
	const sampleSize = Math.min(rows.length, 10);

	for (let r = 0; r < sampleSize; r++) {
		for (const col of groupColumns) {
			const value = rows[r]?.cells[col.columnIndex];
			if (value !== undefined) {
				totalCellCount++;
				if (value === '' || extractChoiceRank(value) !== null) {
					rankCellCount++;
				}
			}
		}
	}

	// Calculate confidence
	let confidence = 0;

	// Having a common prefix is a strong signal
	if (headerPattern) {
		confidence += 0.4;
	}

	// Multiple group columns is a signal
	confidence += Math.min(0.3, groupColumns.length * 0.05);

	// Cell values looking like ranks is a strong signal
	if (totalCellCount > 0) {
		const rankRatio = rankCellCount / totalCellCount;
		confidence += rankRatio * 0.3;
	}

	const isMatrixFormat = confidence >= 0.5;

	return {
		isMatrixFormat,
		columns: isMatrixFormat ? groupColumns : [],
		headerPattern,
		confidence
	};
}

// =============================================================================
// Preference Extraction
// =============================================================================

/**
 * Parse a single row from matrix format into ranked choices.
 *
 * @param row - The raw sheet row
 * @param columns - Matrix preference columns to read from
 * @returns Parsed preferences for this row
 */
export function parseMatrixRow(
	row: RawSheetRow,
	columns: MatrixPreferenceColumn[]
): MatrixStudentPreference {
	const choiceMap = new Map<string, number>();

	// Extract rank for each group column
	for (const col of columns) {
		const cellValue = row.cells[col.columnIndex] ?? '';
		const rank = extractChoiceRank(cellValue);

		if (rank !== null) {
			// Handle potential duplicates by keeping the first (shouldn't happen in valid data)
			if (!choiceMap.has(col.groupName)) {
				choiceMap.set(col.groupName, rank);
			}
		}
	}

	// Convert to ranked array (sorted by rank, then alphabetically for ties)
	const entries = Array.from(choiceMap.entries());
	entries.sort((a, b) => {
		const rankDiff = a[1] - b[1];
		if (rankDiff !== 0) return rankDiff;
		return a[0].localeCompare(b[0]);
	});

	const rankedChoices = entries.map(([groupName]) => groupName);

	return {
		rowIndex: row.rowIndex,
		rankedChoices,
		choiceMap
	};
}

/**
 * Extract all group names from matrix format data.
 * Returns unique group names found in the column headers.
 *
 * @param data - Raw sheet data
 * @param columns - Detected matrix columns (from detectMatrixFormat)
 * @returns Array of unique group names
 */
export function extractGroupsFromMatrix(
	data: RawSheetData,
	columns: MatrixPreferenceColumn[]
): string[] {
	return columns.map((c) => c.groupName);
}

/**
 * Extract all student preferences from matrix format data.
 *
 * @param data - Raw sheet data
 * @param columns - Detected matrix columns (from detectMatrixFormat)
 * @returns Array of student preferences
 */
export function parseAllMatrixPreferences(
	data: RawSheetData,
	columns: MatrixPreferenceColumn[]
): MatrixStudentPreference[] {
	return data.rows.map((row) => parseMatrixRow(row, columns));
}
