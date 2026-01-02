import { describe, expect, it } from 'vitest';
import type { RawSheetData } from '$lib/domain/import';
import {
	extractGroupNameFromHeader,
	extractChoiceRank,
	detectMatrixFormat,
	parseMatrixRow,
	findCommonHeaderPrefix,
	extractGroupsFromMatrix,
	parseAllMatrixPreferences
} from './matrixPreferenceParser';

describe('extractGroupNameFromHeader', () => {
	it('extracts group name from [brackets] format', () => {
		expect(extractGroupNameFromHeader('Please Request Four Clubs: [Chorus]')).toBe('Chorus');
		expect(extractGroupNameFromHeader('Please Request Four Clubs: [Outdoor Club]')).toBe(
			'Outdoor Club'
		);
		expect(extractGroupNameFromHeader("Please Request Four Clubs: [Scholar's Bowl]")).toBe(
			"Scholar's Bowl"
		);
		expect(extractGroupNameFromHeader('Please Request Four Clubs: [Card Games]')).toBe(
			'Card Games'
		);
	});

	it('extracts group name from (parentheses) format', () => {
		expect(extractGroupNameFromHeader('Rank your preferences (Art Club)')).toBe('Art Club');
		expect(extractGroupNameFromHeader('Select option (Drama)')).toBe('Drama');
	});

	it('extracts group name from "quotes" format', () => {
		expect(extractGroupNameFromHeader('Choose "Band"')).toBe('Band');
		expect(extractGroupNameFromHeader("Select 'Orchestra'")).toBe('Orchestra');
	});

	it('extracts group name from colon format', () => {
		expect(extractGroupNameFromHeader('Question: Choir')).toBe('Choir');
		expect(extractGroupNameFromHeader('Preference: Student Council')).toBe('Student Council');
	});

	it('extracts group name from dash format', () => {
		expect(extractGroupNameFromHeader('Club choice - Debate Team')).toBe('Debate Team');
	});

	it('returns null for headers without extractable group names', () => {
		expect(extractGroupNameFromHeader('')).toBeNull();
		expect(extractGroupNameFromHeader('First Name')).toBeNull();
		expect(extractGroupNameFromHeader('Email')).toBeNull();
		expect(extractGroupNameFromHeader('Timestamp')).toBeNull();
	});

	it('handles edge cases', () => {
		// Too short group name
		expect(extractGroupNameFromHeader('[A]')).toBeNull();
		// Just numbers
		expect(extractGroupNameFromHeader('[123]')).toBeNull();
		// Whitespace
		expect(extractGroupNameFromHeader('  [Chess Club]  ')).toBe('Chess Club');
	});
});

describe('extractChoiceRank', () => {
	it('extracts rank from "Nth Choice" format', () => {
		expect(extractChoiceRank('1st Choice')).toBe(1);
		expect(extractChoiceRank('2nd Choice')).toBe(2);
		expect(extractChoiceRank('3rd Choice')).toBe(3);
		expect(extractChoiceRank('4th Choice')).toBe(4);
		expect(extractChoiceRank('5th Choice')).toBe(5);
	});

	it('is case-insensitive', () => {
		expect(extractChoiceRank('1ST CHOICE')).toBe(1);
		expect(extractChoiceRank('2ND choice')).toBe(2);
		expect(extractChoiceRank('3RD CHOICE')).toBe(3);
	});

	it('extracts rank from "Choice N" format', () => {
		expect(extractChoiceRank('Choice 1')).toBe(1);
		expect(extractChoiceRank('choice 2')).toBe(2);
		expect(extractChoiceRank('CHOICE 3')).toBe(3);
	});

	it('extracts rank from "Rank N" format', () => {
		expect(extractChoiceRank('Rank 1')).toBe(1);
		expect(extractChoiceRank('rank 2')).toBe(2);
	});

	it('extracts rank from ordinal-only format', () => {
		expect(extractChoiceRank('1st')).toBe(1);
		expect(extractChoiceRank('2nd')).toBe(2);
		expect(extractChoiceRank('3rd')).toBe(3);
		expect(extractChoiceRank('4th')).toBe(4);
	});

	it('extracts rank from plain number format', () => {
		expect(extractChoiceRank('1')).toBe(1);
		expect(extractChoiceRank('2')).toBe(2);
		expect(extractChoiceRank('5')).toBe(5);
	});

	it('returns null for empty or invalid values', () => {
		expect(extractChoiceRank('')).toBeNull();
		expect(extractChoiceRank('   ')).toBeNull();
		expect(extractChoiceRank('Not a choice')).toBeNull();
		expect(extractChoiceRank('Chorus')).toBeNull();
	});

	it('handles whitespace', () => {
		expect(extractChoiceRank('  1st Choice  ')).toBe(1);
		expect(extractChoiceRank('\t2nd Choice\n')).toBe(2);
	});

	it('rejects unreasonably high ranks', () => {
		expect(extractChoiceRank('99th Choice')).toBeNull();
		expect(extractChoiceRank('100')).toBeNull();
	});
});

describe('findCommonHeaderPrefix', () => {
	it('finds common prefix in matrix headers', () => {
		const headers = [
			'Please Request Four Clubs: [Chorus]',
			'Please Request Four Clubs: [Outdoor Club]',
			'Please Request Four Clubs: [Drama]'
		];
		// Function includes the delimiter character '[' in prefix
		expect(findCommonHeaderPrefix(headers)).toBe('Please Request Four Clubs: [');
	});

	it('returns null for single header', () => {
		expect(findCommonHeaderPrefix(['Single Header'])).toBeNull();
	});

	it('returns null for headers with no common prefix', () => {
		const headers = ['First Name', 'Last Name', 'Email'];
		expect(findCommonHeaderPrefix(headers)).toBeNull();
	});
});

describe('detectMatrixFormat', () => {
	it('detects matrix format from user example data', () => {
		const data: RawSheetData = {
			headers: [
				'Student ID',
				'Please Request Four Clubs: [Chorus]',
				'Please Request Four Clubs: [Outdoor Club]',
				"Please Request Four Clubs: [Scholar's Bowl]",
				'Please Request Four Clubs: [Card Games]'
			],
			rows: [
				{ rowIndex: 2, cells: ['student1@school.edu', '1st Choice', '4th Choice', '', ''] },
				{ rowIndex: 3, cells: ['student2@school.edu', '', '2nd Choice', '3rd Choice', '4th Choice'] },
				{ rowIndex: 4, cells: ['student3@school.edu', '', '2nd Choice', '', '4th Choice'] }
			]
		};

		const result = detectMatrixFormat(data);

		expect(result.isMatrixFormat).toBe(true);
		expect(result.confidence).toBeGreaterThan(0.5);
		expect(result.columns).toHaveLength(4);
		expect(result.columns.map((c) => c.groupName)).toEqual([
			'Chorus',
			'Outdoor Club',
			"Scholar's Bowl",
			'Card Games'
		]);
		expect(result.headerPattern).toContain('Please Request Four Clubs:');
	});

	it('does not detect matrix format for standard roster data', () => {
		const data: RawSheetData = {
			headers: ['First Name', 'Last Name', 'Email', 'Grade'],
			rows: [
				{ rowIndex: 2, cells: ['Alice', 'Smith', 'alice@school.edu', '10'] },
				{ rowIndex: 3, cells: ['Bob', 'Jones', 'bob@school.edu', '11'] }
			]
		};

		const result = detectMatrixFormat(data);
		expect(result.isMatrixFormat).toBe(false);
		expect(result.columns).toHaveLength(0);
	});

	it('does not detect matrix format when fewer than 2 group columns', () => {
		const data: RawSheetData = {
			headers: ['Name', 'Preference: [Only One Option]'],
			rows: [{ rowIndex: 2, cells: ['Alice', '1st Choice'] }]
		};

		const result = detectMatrixFormat(data);
		expect(result.isMatrixFormat).toBe(false);
	});
});

describe('parseMatrixRow', () => {
	const columns = [
		{ columnIndex: 1, originalHeader: 'Clubs: [Chorus]', groupName: 'Chorus' },
		{ columnIndex: 2, originalHeader: 'Clubs: [Drama]', groupName: 'Drama' },
		{ columnIndex: 3, originalHeader: 'Clubs: [Art]', groupName: 'Art' },
		{ columnIndex: 4, originalHeader: 'Clubs: [Band]', groupName: 'Band' }
	];

	it('parses row with all choices filled', () => {
		const row = {
			rowIndex: 2,
			cells: ['student@school.edu', '1st Choice', '2nd Choice', '3rd Choice', '4th Choice']
		};

		const result = parseMatrixRow(row, columns);

		expect(result.rowIndex).toBe(2);
		expect(result.rankedChoices).toEqual(['Chorus', 'Drama', 'Art', 'Band']);
		expect(result.choiceMap.get('Chorus')).toBe(1);
		expect(result.choiceMap.get('Drama')).toBe(2);
		expect(result.choiceMap.get('Art')).toBe(3);
		expect(result.choiceMap.get('Band')).toBe(4);
	});

	it('parses row with some choices empty', () => {
		const row = {
			rowIndex: 3,
			cells: ['student@school.edu', '1st Choice', '', '3rd Choice', '']
		};

		const result = parseMatrixRow(row, columns);

		expect(result.rankedChoices).toEqual(['Chorus', 'Art']);
		expect(result.choiceMap.size).toBe(2);
		expect(result.choiceMap.get('Drama')).toBeUndefined();
	});

	it('handles non-sequential rankings', () => {
		const row = {
			rowIndex: 4,
			cells: ['student@school.edu', '3rd Choice', '1st Choice', '4th Choice', '2nd Choice']
		};

		const result = parseMatrixRow(row, columns);

		// Should be sorted by rank
		expect(result.rankedChoices).toEqual(['Drama', 'Band', 'Chorus', 'Art']);
	});

	it('handles empty row', () => {
		const row = {
			rowIndex: 5,
			cells: ['student@school.edu', '', '', '', '']
		};

		const result = parseMatrixRow(row, columns);

		expect(result.rankedChoices).toEqual([]);
		expect(result.choiceMap.size).toBe(0);
	});
});

describe('extractGroupsFromMatrix', () => {
	it('extracts all unique group names', () => {
		const data: RawSheetData = {
			headers: ['ID', 'Q: [A]', 'Q: [B]', 'Q: [C]'],
			rows: []
		};
		const columns = [
			{ columnIndex: 1, originalHeader: 'Q: [A]', groupName: 'A' },
			{ columnIndex: 2, originalHeader: 'Q: [B]', groupName: 'B' },
			{ columnIndex: 3, originalHeader: 'Q: [C]', groupName: 'C' }
		];

		const groups = extractGroupsFromMatrix(data, columns);
		expect(groups).toEqual(['A', 'B', 'C']);
	});
});

describe('parseAllMatrixPreferences', () => {
	it('parses all rows in matrix format', () => {
		const data: RawSheetData = {
			headers: ['ID', 'Q: [A]', 'Q: [B]'],
			rows: [
				{ rowIndex: 2, cells: ['s1', '1st Choice', '2nd Choice'] },
				{ rowIndex: 3, cells: ['s2', '2nd Choice', '1st Choice'] },
				{ rowIndex: 4, cells: ['s3', '', '1st Choice'] }
			]
		};
		const columns = [
			{ columnIndex: 1, originalHeader: 'Q: [A]', groupName: 'A' },
			{ columnIndex: 2, originalHeader: 'Q: [B]', groupName: 'B' }
		];

		const prefs = parseAllMatrixPreferences(data, columns);

		expect(prefs).toHaveLength(3);
		expect(prefs[0].rankedChoices).toEqual(['A', 'B']);
		expect(prefs[1].rankedChoices).toEqual(['B', 'A']);
		expect(prefs[2].rankedChoices).toEqual(['B']);
	});
});
