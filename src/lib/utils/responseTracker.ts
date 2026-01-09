/**
 * Response Tracker utilities for matching roster to form responses.
 *
 * This module provides pure functions for:
 * - Matching roster students to form responses by email
 * - Extracting choices from Google Forms responses
 * - Deduplicating responses (keeping most recent)
 *
 * @module utils/responseTracker
 */

import type { RawSheetData, RawSheetRow } from '$lib/domain/import';
import { extractChoiceRank } from './matrixPreferenceParser';

// =============================================================================
// Types
// =============================================================================

/**
 * A student from the roster with their email.
 */
export interface RosterStudent {
	/** 1-based row index */
	rowIndex: number;
	/** Student name (first cell or combined) */
	name: string;
	/** Student email (lowercase, trimmed) */
	email: string;
	/** Original row data */
	row: RawSheetRow;
}

/**
 * A form response with extracted data.
 */
export interface FormResponse {
	/** 1-based row index */
	rowIndex: number;
	/** Respondent email (lowercase, trimmed) */
	email: string;
	/** Respondent name from form (if available) */
	name: string;
	/** Extracted choices in ranked order */
	choices: string[];
	/** Original row data */
	row: RawSheetRow;
}

/**
 * Result of matching roster to responses.
 */
export interface MatchResult {
	/** Students who have submitted */
	submitted: SubmittedStudent[];
	/** Students who have NOT submitted */
	notSubmitted: RosterStudent[];
	/** Roster entries without valid email */
	cantTrack: RosterStudent[];
}

/**
 * A student who has submitted with their response data.
 */
export interface SubmittedStudent {
	/** Student from roster */
	student: RosterStudent;
	/** Their form response */
	response: FormResponse;
}

// =============================================================================
// Email Column Detection
// =============================================================================

/**
 * Common patterns for email column headers.
 */
const EMAIL_HEADER_PATTERNS = [
	/^e-?mail$/i,
	/^email\s*address$/i,
	/^student\s*e-?mail$/i,
	/^your\s*e-?mail$/i
];

/**
 * Find the column index containing email addresses.
 * Checks headers first, then falls back to detecting email patterns in data.
 *
 * @param headers - Column headers
 * @param rows - Data rows (used for fallback detection)
 * @returns 0-based column index, or -1 if not found
 */
export function findEmailColumn(headers: string[], rows: RawSheetRow[] = []): number {
	// First, try to match by header name
	for (let i = 0; i < headers.length; i++) {
		const header = headers[i].trim();
		if (EMAIL_HEADER_PATTERNS.some((pattern) => pattern.test(header))) {
			return i;
		}
	}

	// Fallback: look for column with email-like values
	if (rows.length > 0) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		for (let col = 0; col < headers.length; col++) {
			let emailCount = 0;
			const sampleSize = Math.min(rows.length, 5);
			for (let r = 0; r < sampleSize; r++) {
				const value = rows[r]?.cells[col]?.trim() ?? '';
				if (emailRegex.test(value)) {
					emailCount++;
				}
			}
			// If most cells look like emails, assume this is the email column
			if (emailCount >= sampleSize * 0.6) {
				return col;
			}
		}
	}

	return -1;
}

/**
 * Find the column index containing student names.
 *
 * @param headers - Column headers
 * @returns 0-based column index, or -1 if not found
 */
export function findNameColumn(headers: string[]): number {
	const namePatterns = [
		/^name$/i,
		/^student\s*name$/i,
		/^full\s*name$/i,
		/^first\s*name$/i,
		/^student$/i
	];

	for (let i = 0; i < headers.length; i++) {
		const header = headers[i].trim();
		if (namePatterns.some((pattern) => pattern.test(header))) {
			return i;
		}
	}

	// Default to first column if no match
	return 0;
}

// =============================================================================
// Email Validation & Normalization
// =============================================================================

/**
 * Normalize an email address for matching.
 *
 * @param email - Raw email string
 * @returns Lowercase, trimmed email or empty string
 */
export function normalizeEmail(email: string): string {
	return (email ?? '').trim().toLowerCase();
}

/**
 * Check if a string looks like a valid email.
 *
 * @param email - String to check
 * @returns true if it looks like an email
 */
export function isValidEmail(email: string): boolean {
	const normalized = normalizeEmail(email);
	// Simple check: contains @ and at least one .
	return normalized.includes('@') && normalized.includes('.') && normalized.length > 5;
}

// =============================================================================
// Response Processing
// =============================================================================

/**
 * Extract choices from a response row.
 * Looks for columns with "Choice" headers and extracts values, OR
 * looks for matrix-format rankings (1st Choice, 2nd Choice, etc.)
 *
 * @param row - The response row
 * @param headers - Column headers
 * @returns Array of choices in ranked order
 */
export function extractChoices(row: RawSheetRow, headers: string[]): string[] {
	const choices: { rank: number; value: string }[] = [];

	// Strategy 1: Matrix format - columns with [Group Name] and cells like "1st Choice"
	// Check if headers have brackets (matrix format indicator)
	const bracketColumns = headers
		.map((h, i) => ({ header: h, index: i }))
		.filter(({ header }) => /\[([^\]]+)\]/.test(header));

	if (bracketColumns.length >= 2) {
		// Matrix format: extract group name from header, rank from cell
		for (const { header, index } of bracketColumns) {
			const groupMatch = header.match(/\[([^\]]+)\]/);
			if (groupMatch) {
				const groupName = groupMatch[1].trim();
				const cellValue = row.cells[index] ?? '';
				const rank = extractChoiceRank(cellValue);
				if (rank !== null) {
					choices.push({ rank, value: groupName });
				}
			}
		}
	} else {
		// Strategy 2: Direct column format - columns named "1st Choice", "2nd Choice", etc.
		for (let i = 0; i < headers.length; i++) {
			const header = headers[i];
			const rank = extractChoiceRank(header);
			if (rank !== null) {
				const value = (row.cells[i] ?? '').trim();
				if (value) {
					choices.push({ rank, value });
				}
			}
		}
	}

	// Sort by rank and return just values
	choices.sort((a, b) => a.rank - b.rank);
	return choices.map((c) => c.value);
}

/**
 * Deduplicate responses by email, keeping the most recent (last) entry.
 *
 * @param rows - Response rows
 * @param emailColumnIndex - Column containing email
 * @returns Deduplicated rows
 */
export function deduplicateResponses(rows: RawSheetRow[], emailColumnIndex: number): RawSheetRow[] {
	const byEmail = new Map<string, RawSheetRow>();

	for (const row of rows) {
		const email = normalizeEmail(row.cells[emailColumnIndex] ?? '');
		if (email) {
			// Later row overwrites earlier row
			byEmail.set(email, row);
		}
	}

	return Array.from(byEmail.values());
}

// =============================================================================
// Roster-Response Matching
// =============================================================================

/**
 * Parse roster data into RosterStudent objects.
 *
 * @param data - Raw roster sheet data
 * @param emailColumnIndex - Column containing email
 * @param nameColumnIndex - Column containing name
 * @returns Array of roster students
 */
export function parseRoster(
	data: RawSheetData,
	emailColumnIndex: number,
	nameColumnIndex: number
): RosterStudent[] {
	return data.rows.map((row) => ({
		rowIndex: row.rowIndex,
		name: (row.cells[nameColumnIndex] ?? '').trim(),
		email: normalizeEmail(row.cells[emailColumnIndex] ?? ''),
		row
	}));
}

/**
 * Parse response data into FormResponse objects.
 *
 * @param data - Raw responses sheet data
 * @param emailColumnIndex - Column containing email
 * @param nameColumnIndex - Column containing name (or -1)
 * @returns Array of form responses
 */
export function parseResponses(
	data: RawSheetData,
	emailColumnIndex: number,
	nameColumnIndex: number
): FormResponse[] {
	// Deduplicate by email first
	const uniqueRows = deduplicateResponses(data.rows, emailColumnIndex);

	return uniqueRows.map((row) => ({
		rowIndex: row.rowIndex,
		email: normalizeEmail(row.cells[emailColumnIndex] ?? ''),
		name: nameColumnIndex >= 0 ? (row.cells[nameColumnIndex] ?? '').trim() : '',
		choices: extractChoices(row, data.headers),
		row
	}));
}

/**
 * Match roster students to form responses by email.
 *
 * @param roster - Parsed roster students
 * @param responses - Parsed form responses
 * @returns Match result with submitted, notSubmitted, and cantTrack lists
 */
export function matchRosterToResponses(
	roster: RosterStudent[],
	responses: FormResponse[]
): MatchResult {
	// Build a lookup map from email to response
	const responseByEmail = new Map<string, FormResponse>();
	for (const response of responses) {
		if (response.email) {
			responseByEmail.set(response.email, response);
		}
	}

	const submitted: SubmittedStudent[] = [];
	const notSubmitted: RosterStudent[] = [];
	const cantTrack: RosterStudent[] = [];

	for (const student of roster) {
		if (!isValidEmail(student.email)) {
			cantTrack.push(student);
			continue;
		}

		const response = responseByEmail.get(student.email);
		if (response) {
			submitted.push({ student, response });
		} else {
			notSubmitted.push(student);
		}
	}

	return { submitted, notSubmitted, cantTrack };
}

/**
 * Full pipeline: process roster and responses data into match results.
 *
 * @param rosterData - Raw roster sheet data
 * @param responsesData - Raw responses sheet data
 * @param options - Optional column index overrides
 * @returns Match result
 */
export function processTracking(
	rosterData: RawSheetData,
	responsesData: RawSheetData,
	options?: {
		rosterEmailColumn?: number;
		rosterNameColumn?: number;
		responsesEmailColumn?: number;
		responsesNameColumn?: number;
	}
): MatchResult {
	// Auto-detect columns if not provided
	const rosterEmailCol =
		options?.rosterEmailColumn ?? findEmailColumn(rosterData.headers, rosterData.rows);
	const rosterNameCol = options?.rosterNameColumn ?? findNameColumn(rosterData.headers);
	const responsesEmailCol =
		options?.responsesEmailColumn ?? findEmailColumn(responsesData.headers, responsesData.rows);
	const responsesNameCol = options?.responsesNameColumn ?? findNameColumn(responsesData.headers);

	const roster = parseRoster(rosterData, rosterEmailCol, rosterNameCol);
	const responses = parseResponses(responsesData, responsesEmailCol, responsesNameCol);

	return matchRosterToResponses(roster, responses);
}
