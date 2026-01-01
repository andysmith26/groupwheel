import { describe, it, expect } from 'vitest';
import {
	parseGoogleSheetsUrl,
	buildExportUrl,
	parseCsvToSheetData,
	isGoogleSheetsUrl,
	getPreviewRows
} from './googleSheets';

describe('parseGoogleSheetsUrl', () => {
	it('parses standard edit URL', () => {
		const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
		const result = parseGoogleSheetsUrl(url);

		expect(result).toEqual({
			sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
			gid: undefined
		});
	});

	it('parses URL with gid in hash', () => {
		const url =
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123456';
		const result = parseGoogleSheetsUrl(url);

		expect(result).toEqual({
			sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
			gid: '123456'
		});
	});

	it('parses URL with gid in query string', () => {
		const url =
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=789';
		const result = parseGoogleSheetsUrl(url);

		expect(result).toEqual({
			sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
			gid: '789'
		});
	});

	it('parses URL with sharing parameter', () => {
		const url =
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
		const result = parseGoogleSheetsUrl(url);

		expect(result).toEqual({
			sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
			gid: undefined
		});
	});

	it('parses export URL', () => {
		const url =
			'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv';
		const result = parseGoogleSheetsUrl(url);

		expect(result).toEqual({
			sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
			gid: undefined
		});
	});

	it('returns null for invalid URLs', () => {
		expect(parseGoogleSheetsUrl('')).toBeNull();
		expect(parseGoogleSheetsUrl('https://google.com')).toBeNull();
		expect(parseGoogleSheetsUrl('https://docs.google.com/document/d/123')).toBeNull();
		expect(parseGoogleSheetsUrl('not a url')).toBeNull();
	});

	it('handles URLs with extra whitespace', () => {
		const url =
			'  https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit  ';
		const result = parseGoogleSheetsUrl(url);

		expect(result).toEqual({
			sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
			gid: undefined
		});
	});
});

describe('buildExportUrl', () => {
	it('builds URL without gid', () => {
		const url = buildExportUrl({ sheetId: 'abc123' });
		expect(url).toBe('https://docs.google.com/spreadsheets/d/abc123/export?format=csv');
	});

	it('builds URL with gid', () => {
		const url = buildExportUrl({ sheetId: 'abc123', gid: '456' });
		expect(url).toBe('https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=456');
	});
});

describe('parseCsvToSheetData', () => {
	it('parses simple CSV', () => {
		const csv = `First Name,Last Name,Choice 1
Alice,Smith,Art Club
Bob,Jones,Chess Club`;

		const result = parseCsvToSheetData(csv);

		expect(result.headers).toEqual(['First Name', 'Last Name', 'Choice 1']);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			cells: ['Alice', 'Smith', 'Art Club']
		});
		expect(result.rows[1]).toEqual({
			rowIndex: 3,
			cells: ['Bob', 'Jones', 'Chess Club']
		});
	});

	it('parses TSV format', () => {
		const tsv = `First Name\tLast Name
Alice\tSmith
Bob\tJones`;

		const result = parseCsvToSheetData(tsv);

		expect(result.headers).toEqual(['First Name', 'Last Name']);
		expect(result.rows).toHaveLength(2);
	});

	it('handles quoted fields with commas', () => {
		const csv = `Name,Notes
"Smith, Alice","Likes art, music"
Bob,Simple`;

		const result = parseCsvToSheetData(csv);

		expect(result.rows[0].cells).toEqual(['Smith, Alice', 'Likes art, music']);
		expect(result.rows[1].cells).toEqual(['Bob', 'Simple']);
	});

	it('handles escaped quotes', () => {
		const csv = `Name,Quote
Alice,"She said ""hello"""`;

		const result = parseCsvToSheetData(csv);

		expect(result.rows[0].cells).toEqual(['Alice', 'She said "hello"']);
	});

	it('handles empty cells', () => {
		const csv = `A,B,C
1,,3
,,`;

		const result = parseCsvToSheetData(csv);

		expect(result.rows[0].cells).toEqual(['1', '', '3']);
		expect(result.rows[1].cells).toEqual(['', '', '']);
	});

	it('pads short rows to match header length', () => {
		const csv = `A,B,C
1`;

		const result = parseCsvToSheetData(csv);

		expect(result.rows[0].cells).toEqual(['1', '', '']);
	});

	it('handles Windows line endings', () => {
		const csv = 'A,B\r\n1,2\r\n3,4';

		const result = parseCsvToSheetData(csv);

		expect(result.rows).toHaveLength(2);
		expect(result.rows[0].cells).toEqual(['1', '2']);
	});

	it('returns empty data for empty input', () => {
		const result = parseCsvToSheetData('');

		expect(result.headers).toEqual([]);
		expect(result.rows).toEqual([]);
	});
});

describe('isGoogleSheetsUrl', () => {
	it('returns true for valid URLs', () => {
		expect(
			isGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/abc123/edit')
		).toBe(true);
	});

	it('returns false for invalid URLs', () => {
		expect(isGoogleSheetsUrl('https://google.com')).toBe(false);
		expect(isGoogleSheetsUrl('')).toBe(false);
	});
});

describe('getPreviewRows', () => {
	it('returns limited rows', () => {
		const data = {
			headers: ['A'],
			rows: Array.from({ length: 20 }, (_, i) => ({
				rowIndex: i + 2,
				cells: [`Row ${i}`]
			}))
		};

		const preview = getPreviewRows(data, 5);

		expect(preview.headers).toEqual(['A']);
		expect(preview.rows).toHaveLength(5);
		expect(preview.rows[0].cells).toEqual(['Row 0']);
		expect(preview.rows[4].cells).toEqual(['Row 4']);
	});

	it('returns all rows if under limit', () => {
		const data = {
			headers: ['A'],
			rows: [
				{ rowIndex: 2, cells: ['1'] },
				{ rowIndex: 3, cells: ['2'] }
			]
		};

		const preview = getPreviewRows(data, 10);

		expect(preview.rows).toHaveLength(2);
	});
});
