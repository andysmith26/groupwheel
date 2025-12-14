/**
 * Group Request Import Service
 *
 * Parses CSV/TSV data containing student group requests.
 * Expected format:
 *   StudentID, Choice1, Choice2, Choice3, ...
 *
 * The choices are group names that get mapped to group IDs.
 *
 * @module services/groupRequestImport
 */

import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';

export interface GroupRequestImportResult {
	preferences: ParsedPreference[];
	warnings: string[];
	stats: {
		totalRows: number;
		imported: number;
		skipped: number;
		unknownStudents: string[];
		unknownGroups: string[];
	};
}

export interface GroupRequestImportOptions {
	/** Available group names (case-insensitive matching) */
	groupNames: string[];
	/** Available student IDs (case-insensitive matching) */
	studentIds: string[];
	/** Maximum number of choices to parse per student */
	maxChoices?: number;
}

/**
 * Parse group requests from pasted CSV/TSV text.
 *
 * Expected format:
 * - First row is headers (ignored)
 * - Subsequent rows: studentId, choice1, choice2, choice3, ...
 * - Choices are group names (case-insensitive match)
 * - Empty choices are skipped
 *
 * @param text Raw CSV/TSV text
 * @param options Validation options
 * @returns Parsed preferences with validation warnings
 */
export function parseGroupRequests(
	text: string,
	options: GroupRequestImportOptions
): GroupRequestImportResult {
	const warnings: string[] = [];
	const preferences: ParsedPreference[] = [];
	const unknownStudents = new Set<string>();
	const unknownGroups = new Set<string>();
	const maxChoices = options.maxChoices ?? 5;

	// Normalize lookups
	const studentIdLower = new Set(options.studentIds.map((id) => id.toLowerCase()));
	const groupNameMap = new Map<string, string>();
	for (const name of options.groupNames) {
		groupNameMap.set(name.toLowerCase().trim(), name);
	}

	// Parse lines
	const lines = text
		.trim()
		.split(/\r?\n/)
		.filter((l) => l.trim().length > 0);

	if (lines.length < 2) {
		return {
			preferences: [],
			warnings: ['Please paste at least a header row and one data row.'],
			stats: {
				totalRows: 0,
				imported: 0,
				skipped: 0,
				unknownStudents: [],
				unknownGroups: []
			}
		};
	}

	// Detect delimiter
	const delimiter = lines[0].includes('\t') ? '\t' : ',';

	// Parse header to find column indices
	const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
	const studentIdIdx = findColumnIndex(header, ['student id', 'studentid', 'id', 'email']);

	if (studentIdIdx === -1) {
		return {
			preferences: [],
			warnings: ['Could not find student ID column. Expected: "Student ID", "ID", or "Email".'],
			stats: {
				totalRows: lines.length - 1,
				imported: 0,
				skipped: lines.length - 1,
				unknownStudents: [],
				unknownGroups: []
			}
		};
	}

	// Find choice columns (any column with "choice" or numbered columns after ID)
	const choiceIndices = findChoiceColumns(header, studentIdIdx);

	let imported = 0;
	let skipped = 0;

	// Process data rows
	for (let i = 1; i < lines.length; i++) {
		const row = lines[i];
		const cells = splitRow(row, delimiter);
		const rowNum = i + 1;

		// Get student ID
		const rawStudentId = (cells[studentIdIdx] ?? '').trim();
		if (!rawStudentId) {
			skipped++;
			continue;
		}

		const studentId = rawStudentId.toLowerCase();

		// Validate student exists
		if (!studentIdLower.has(studentId)) {
			unknownStudents.add(rawStudentId);
			warnings.push(`Row ${rowNum}: Unknown student "${rawStudentId}"`);
			skipped++;
			continue;
		}

		// Parse group choices
		const likeGroupIds: string[] = [];
		for (let j = 0; j < Math.min(choiceIndices.length, maxChoices); j++) {
			const idx = choiceIndices[j];
			const rawChoice = (cells[idx] ?? '').trim();
			if (!rawChoice) continue;

			const matchedGroup = groupNameMap.get(rawChoice.toLowerCase());
			if (matchedGroup) {
				// Use the original group name as the ID (will be mapped later)
				likeGroupIds.push(matchedGroup);
			} else {
				unknownGroups.add(rawChoice);
				warnings.push(`Row ${rowNum}: Unknown group "${rawChoice}"`);
			}
		}

		// Create preference if there are any valid choices
		if (likeGroupIds.length > 0) {
			preferences.push({
				studentId,
				likeGroupIds
			});
			imported++;
		} else {
			// Student row exists but no valid group choices
			skipped++;
		}
	}

	return {
		preferences,
		warnings,
		stats: {
			totalRows: lines.length - 1,
			imported,
			skipped,
			unknownStudents: Array.from(unknownStudents),
			unknownGroups: Array.from(unknownGroups)
		}
	};
}

/**
 * Find a column index by trying multiple possible header names.
 */
function findColumnIndex(header: string[], possibleNames: string[]): number {
	for (const name of possibleNames) {
		const idx = header.findIndex((h) => h === name || h.includes(name));
		if (idx !== -1) return idx;
	}
	return -1;
}

/**
 * Find columns that contain group choices.
 * Looks for columns named "choice", "choice 1", "1st choice", etc.
 * Falls back to all columns after the student ID column.
 */
function findChoiceColumns(header: string[], studentIdIdx: number): number[] {
	const choicePattern = /choice|rank|preference|option/i;
	const indices: number[] = [];

	// First try to find explicitly named choice columns
	for (let i = 0; i < header.length; i++) {
		if (i === studentIdIdx) continue;
		if (choicePattern.test(header[i])) {
			indices.push(i);
		}
	}

	// If no explicit choice columns, use all columns after student ID
	if (indices.length === 0) {
		for (let i = 0; i < header.length; i++) {
			if (i !== studentIdIdx) {
				indices.push(i);
			}
		}
	}

	return indices;
}

/**
 * Split a CSV/TSV row, handling basic quoting.
 */
function splitRow(row: string, delimiter: string): string[] {
	// Simple split - handles most cases
	// For CSV with quoted fields containing commas, a more robust parser would be needed
	if (delimiter === '\t') {
		return row.split('\t');
	}

	// Basic CSV parsing with quote handling
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < row.length; i++) {
		const char = row[i];

		if (char === '"') {
			if (inQuotes && row[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i++;
			} else {
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

/**
 * Generate example CSV content for group requests.
 */
export function generateExampleCsv(groupNames: string[]): string {
	const choices = groupNames.slice(0, 3);
	const headers = ['Student ID', 'Choice 1', 'Choice 2', 'Choice 3'];
	const exampleRows = [
		['student@example.com', choices[0] ?? 'Group A', choices[1] ?? 'Group B', choices[2] ?? 'Group C'],
		['another@example.com', choices[1] ?? 'Group B', choices[0] ?? 'Group A', '']
	];

	return [headers.join(','), ...exampleRows.map((r) => r.join(','))].join('\n');
}
