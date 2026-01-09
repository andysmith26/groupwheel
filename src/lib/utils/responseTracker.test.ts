/**
 * Unit tests for responseTracker utility functions.
 */

import { describe, it, expect } from 'vitest';
import type { RawSheetData, RawSheetRow } from '$lib/domain/import';
import {
	findEmailColumn,
	findNameColumn,
	normalizeEmail,
	isValidEmail,
	extractChoices,
	deduplicateResponses,
	parseRoster,
	parseResponses,
	matchRosterToResponses,
	processTracking
} from './responseTracker';

// =============================================================================
// Test Helpers
// =============================================================================

function makeRow(rowIndex: number, cells: string[]): RawSheetRow {
	return { rowIndex, cells };
}

function makeSheetData(headers: string[], rows: string[][]): RawSheetData {
	return {
		headers,
		rows: rows.map((cells, i) => makeRow(i + 2, cells)) // Start at row 2 (after header)
	};
}

// =============================================================================
// findEmailColumn Tests
// =============================================================================

describe('findEmailColumn', () => {
	it('finds column by "Email" header', () => {
		const headers = ['Name', 'Email', 'Grade'];
		expect(findEmailColumn(headers)).toBe(1);
	});

	it('finds column by "E-mail" header (hyphenated)', () => {
		const headers = ['Name', 'E-mail', 'Grade'];
		expect(findEmailColumn(headers)).toBe(1);
	});

	it('finds column by "Email Address" header', () => {
		const headers = ['Name', 'Email Address', 'Grade'];
		expect(findEmailColumn(headers)).toBe(1);
	});

	it('finds column by "Student Email" header', () => {
		const headers = ['Name', 'Student Email', 'Grade'];
		expect(findEmailColumn(headers)).toBe(1);
	});

	it('is case-insensitive', () => {
		const headers = ['Name', 'EMAIL', 'Grade'];
		expect(findEmailColumn(headers)).toBe(1);
	});

	it('returns -1 if no email column found by header', () => {
		const headers = ['Name', 'Grade', 'Class'];
		expect(findEmailColumn(headers)).toBe(-1);
	});

	it('falls back to data inspection for email-like values', () => {
		const headers = ['Name', 'Contact', 'Grade'];
		const rows = [
			makeRow(2, ['Alice', 'alice@school.edu', '5']),
			makeRow(3, ['Bob', 'bob@school.edu', '5']),
			makeRow(4, ['Carol', 'carol@school.edu', '5'])
		];
		expect(findEmailColumn(headers, rows)).toBe(1);
	});
});

// =============================================================================
// findNameColumn Tests
// =============================================================================

describe('findNameColumn', () => {
	it('finds column by "Name" header', () => {
		const headers = ['Name', 'Email', 'Grade'];
		expect(findNameColumn(headers)).toBe(0);
	});

	it('finds column by "Student Name" header', () => {
		const headers = ['ID', 'Student Name', 'Email'];
		expect(findNameColumn(headers)).toBe(1);
	});

	it('defaults to first column if no match', () => {
		const headers = ['ID', 'Email', 'Grade'];
		expect(findNameColumn(headers)).toBe(0);
	});
});

// =============================================================================
// Email Normalization Tests
// =============================================================================

describe('normalizeEmail', () => {
	it('trims whitespace', () => {
		expect(normalizeEmail('  alice@school.edu  ')).toBe('alice@school.edu');
	});

	it('lowercases email', () => {
		expect(normalizeEmail('Alice@School.EDU')).toBe('alice@school.edu');
	});

	it('handles empty string', () => {
		expect(normalizeEmail('')).toBe('');
	});

	it('handles null/undefined', () => {
		expect(normalizeEmail(null as unknown as string)).toBe('');
		expect(normalizeEmail(undefined as unknown as string)).toBe('');
	});
});

describe('isValidEmail', () => {
	it('returns true for valid email', () => {
		expect(isValidEmail('alice@school.edu')).toBe(true);
	});

	it('returns false for email without @', () => {
		expect(isValidEmail('alice.school.edu')).toBe(false);
	});

	it('returns false for email without dot', () => {
		expect(isValidEmail('alice@schooledu')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isValidEmail('')).toBe(false);
	});

	it('returns false for too-short string', () => {
		expect(isValidEmail('a@b.c')).toBe(false);
	});
});

// =============================================================================
// extractChoices Tests
// =============================================================================

describe('extractChoices', () => {
	it('extracts choices from matrix format (bracket headers)', () => {
		const headers = ['Email', 'Rank [Art]', 'Rank [Music]', 'Rank [Drama]'];
		const row = makeRow(2, ['alice@school.edu', '2nd Choice', '1st Choice', '3rd Choice']);

		const choices = extractChoices(row, headers);

		expect(choices).toEqual(['Music', 'Art', 'Drama']);
	});

	it('extracts choices from direct column format', () => {
		const headers = ['Email', '1st Choice', '2nd Choice', '3rd Choice'];
		const row = makeRow(2, ['alice@school.edu', 'Art', 'Music', 'Drama']);

		const choices = extractChoices(row, headers);

		expect(choices).toEqual(['Art', 'Music', 'Drama']);
	});

	it('handles empty choices gracefully', () => {
		const headers = ['Email', '1st Choice', '2nd Choice', '3rd Choice'];
		const row = makeRow(2, ['alice@school.edu', 'Art', '', '']);

		const choices = extractChoices(row, headers);

		expect(choices).toEqual(['Art']);
	});

	it('handles missing cells', () => {
		const headers = ['Email', '1st Choice', '2nd Choice', '3rd Choice'];
		const row = makeRow(2, ['alice@school.edu', 'Art']);

		const choices = extractChoices(row, headers);

		expect(choices).toEqual(['Art']);
	});
});

// =============================================================================
// deduplicateResponses Tests
// =============================================================================

describe('deduplicateResponses', () => {
	it('keeps only the last response for duplicate emails', () => {
		const rows = [
			makeRow(2, ['alice@school.edu', 'Art']),
			makeRow(3, ['bob@school.edu', 'Music']),
			makeRow(4, ['alice@school.edu', 'Drama']) // Duplicate, should keep this one
		];

		const result = deduplicateResponses(rows, 0);

		expect(result).toHaveLength(2);
		expect(result.find((r) => r.cells[0] === 'alice@school.edu')?.cells[1]).toBe('Drama');
	});

	it('handles case-insensitive email matching', () => {
		const rows = [
			makeRow(2, ['Alice@School.edu', 'Art']),
			makeRow(3, ['ALICE@school.EDU', 'Drama']) // Same email different case
		];

		const result = deduplicateResponses(rows, 0);

		expect(result).toHaveLength(1);
		expect(result[0].cells[1]).toBe('Drama');
	});

	it('preserves unique entries', () => {
		const rows = [
			makeRow(2, ['alice@school.edu', 'Art']),
			makeRow(3, ['bob@school.edu', 'Music']),
			makeRow(4, ['carol@school.edu', 'Drama'])
		];

		const result = deduplicateResponses(rows, 0);

		expect(result).toHaveLength(3);
	});
});

// =============================================================================
// parseRoster Tests
// =============================================================================

describe('parseRoster', () => {
	it('parses roster with name and email columns', () => {
		const data = makeSheetData(
			['Name', 'Email', 'Grade'],
			[
				['Alice Smith', 'alice@school.edu', '5'],
				['Bob Jones', 'bob@school.edu', '5']
			]
		);

		const roster = parseRoster(data, 1, 0);

		expect(roster).toHaveLength(2);
		expect(roster[0].name).toBe('Alice Smith');
		expect(roster[0].email).toBe('alice@school.edu');
		expect(roster[1].name).toBe('Bob Jones');
		expect(roster[1].email).toBe('bob@school.edu');
	});

	it('normalizes emails', () => {
		const data = makeSheetData(['Name', 'Email'], [['Alice', '  ALICE@School.EDU  ']]);

		const roster = parseRoster(data, 1, 0);

		expect(roster[0].email).toBe('alice@school.edu');
	});
});

// =============================================================================
// parseResponses Tests
// =============================================================================

describe('parseResponses', () => {
	it('parses responses and extracts choices', () => {
		const data = makeSheetData(
			['Email', 'Name', '1st Choice', '2nd Choice'],
			[['alice@school.edu', 'Alice', 'Art', 'Music']]
		);

		const responses = parseResponses(data, 0, 1);

		expect(responses).toHaveLength(1);
		expect(responses[0].email).toBe('alice@school.edu');
		expect(responses[0].name).toBe('Alice');
		expect(responses[0].choices).toEqual(['Art', 'Music']);
	});

	it('deduplicates responses automatically', () => {
		const data = makeSheetData(
			['Email', '1st Choice'],
			[
				['alice@school.edu', 'Art'],
				['alice@school.edu', 'Music'] // Later entry wins
			]
		);

		const responses = parseResponses(data, 0, -1);

		expect(responses).toHaveLength(1);
		expect(responses[0].choices).toEqual(['Music']);
	});
});

// =============================================================================
// matchRosterToResponses Tests
// =============================================================================

describe('matchRosterToResponses', () => {
	it('correctly categorizes submitted, not submitted, and cant track', () => {
		const roster = [
			{ rowIndex: 2, name: 'Alice', email: 'alice@school.edu', row: makeRow(2, []) },
			{ rowIndex: 3, name: 'Bob', email: 'bob@school.edu', row: makeRow(3, []) },
			{ rowIndex: 4, name: 'Carol', email: '', row: makeRow(4, []) } // No email
		];

		const responses = [
			{
				rowIndex: 2,
				email: 'alice@school.edu',
				name: 'Alice',
				choices: ['Art'],
				row: makeRow(2, [])
			}
		];

		const result = matchRosterToResponses(roster, responses);

		expect(result.submitted).toHaveLength(1);
		expect(result.submitted[0].student.name).toBe('Alice');
		expect(result.notSubmitted).toHaveLength(1);
		expect(result.notSubmitted[0].name).toBe('Bob');
		expect(result.cantTrack).toHaveLength(1);
		expect(result.cantTrack[0].name).toBe('Carol');
	});

	it('matches emails case-insensitively', () => {
		const roster = [{ rowIndex: 2, name: 'Alice', email: 'alice@school.edu', row: makeRow(2, []) }];

		const responses = [
			{
				rowIndex: 2,
				email: 'alice@school.edu', // Already normalized
				name: 'Alice',
				choices: [],
				row: makeRow(2, [])
			}
		];

		const result = matchRosterToResponses(roster, responses);

		expect(result.submitted).toHaveLength(1);
	});
});

// =============================================================================
// processTracking (Full Pipeline) Tests
// =============================================================================

describe('processTracking', () => {
	it('processes full tracking pipeline', () => {
		const rosterData = makeSheetData(
			['Name', 'Email'],
			[
				['Alice Smith', 'alice@school.edu'],
				['Bob Jones', 'bob@school.edu'],
				['Carol White', 'carol@school.edu']
			]
		);

		const responsesData = makeSheetData(
			['Email', '1st Choice', '2nd Choice'],
			[
				['alice@school.edu', 'Art', 'Music'],
				['carol@school.edu', 'Drama', 'Art']
			]
		);

		const result = processTracking(rosterData, responsesData);

		expect(result.submitted).toHaveLength(2);
		expect(result.notSubmitted).toHaveLength(1);
		expect(result.notSubmitted[0].name).toBe('Bob Jones');
		expect(result.cantTrack).toHaveLength(0);

		// Check choices were extracted
		const aliceSubmission = result.submitted.find((s) => s.student.name === 'Alice Smith');
		expect(aliceSubmission?.response.choices).toEqual(['Art', 'Music']);
	});

	it('uses provided column indices', () => {
		const rosterData = makeSheetData(
			['ID', 'Full Name', 'Student Email'],
			[['1', 'Alice', 'alice@school.edu']]
		);

		const responsesData = makeSheetData(
			['Timestamp', 'Your Email', '1st Choice'],
			[['2024-01-01', 'alice@school.edu', 'Art']]
		);

		const result = processTracking(rosterData, responsesData, {
			rosterEmailColumn: 2,
			rosterNameColumn: 1,
			responsesEmailColumn: 1,
			responsesNameColumn: -1
		});

		expect(result.submitted).toHaveLength(1);
		expect(result.submitted[0].student.name).toBe('Alice');
	});
});
