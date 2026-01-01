import { describe, it, expect } from 'vitest';
import {
	hasRequiredMappings,
	getMissingRequiredFields,
	hasDuplicateMappings,
	validateMappedData,
	isChoiceField,
	getChoiceRank,
	generateStudentId,
	type ColumnMapping,
	type RawSheetData
} from './import';

describe('isChoiceField', () => {
	it('returns true for choice fields', () => {
		expect(isChoiceField('choice1')).toBe(true);
		expect(isChoiceField('choice5')).toBe(true);
	});

	it('returns false for non-choice fields', () => {
		expect(isChoiceField('firstName')).toBe(false);
		expect(isChoiceField('lastName')).toBe(false);
		expect(isChoiceField('ignore')).toBe(false);
	});
});

describe('getChoiceRank', () => {
	it('returns rank for choice fields', () => {
		expect(getChoiceRank('choice1')).toBe(1);
		expect(getChoiceRank('choice3')).toBe(3);
		expect(getChoiceRank('choice5')).toBe(5);
	});

	it('returns null for non-choice fields', () => {
		expect(getChoiceRank('firstName')).toBeNull();
		expect(getChoiceRank('ignore')).toBeNull();
	});
});

describe('hasRequiredMappings', () => {
	it('returns true when firstName is mapped', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'Name', mappedTo: 'firstName' }
		];

		expect(hasRequiredMappings(mappings)).toBe(true);
	});

	it('returns false when firstName is not mapped', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'Name', mappedTo: 'lastName' },
			{ columnIndex: 1, headerName: 'ID', mappedTo: null }
		];

		expect(hasRequiredMappings(mappings)).toBe(false);
	});

	it('returns false for empty mappings', () => {
		expect(hasRequiredMappings([])).toBe(false);
	});
});

describe('getMissingRequiredFields', () => {
	it('returns empty array when all required fields mapped', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'Name', mappedTo: 'firstName' }
		];

		expect(getMissingRequiredFields(mappings)).toEqual([]);
	});

	it('returns missing fields', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'ID', mappedTo: 'ignore' }
		];

		expect(getMissingRequiredFields(mappings)).toEqual(['firstName']);
	});
});

describe('hasDuplicateMappings', () => {
	it('returns empty array when no duplicates', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'Last', mappedTo: 'lastName' }
		];

		expect(hasDuplicateMappings(mappings)).toEqual([]);
	});

	it('returns duplicate fields', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'Name', mappedTo: 'firstName' }
		];

		expect(hasDuplicateMappings(mappings)).toEqual(['firstName']);
	});

	it('ignores duplicate ignore mappings', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'A', mappedTo: 'ignore' },
			{ columnIndex: 1, headerName: 'B', mappedTo: 'ignore' }
		];

		expect(hasDuplicateMappings(mappings)).toEqual([]);
	});

	it('ignores null mappings', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'A', mappedTo: null },
			{ columnIndex: 1, headerName: 'B', mappedTo: null }
		];

		expect(hasDuplicateMappings(mappings)).toEqual([]);
	});
});

describe('validateMappedData', () => {
	const sampleData: RawSheetData = {
		headers: ['First Name', 'Last Name', 'Choice 1'],
		rows: [
			{ rowIndex: 2, cells: ['Alice', 'Smith', 'Art Club'] },
			{ rowIndex: 3, cells: ['Bob', 'Jones', 'Chess Club'] },
			{ rowIndex: 4, cells: ['', 'Incomplete', ''] }
		]
	};

	const basicMappings: ColumnMapping[] = [
		{ columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
		{ columnIndex: 1, headerName: 'Last Name', mappedTo: 'lastName' },
		{ columnIndex: 2, headerName: 'Choice 1', mappedTo: 'choice1' }
	];

	it('validates rows correctly', () => {
		const result = validateMappedData(sampleData, basicMappings);

		expect(result.validRows).toHaveLength(2);
		expect(result.invalidRows).toHaveLength(1);
		expect(result.summary).toEqual({
			totalRows: 3,
			validCount: 2,
			invalidCount: 1
		});
	});

	it('extracts student data from valid rows', () => {
		const result = validateMappedData(sampleData, basicMappings);

		expect(result.validRows[0].student).toEqual({
			firstName: 'Alice',
			lastName: 'Smith'
		});
		expect(result.validRows[0].choices).toEqual(['Art Club']);
	});

	it('handles rows with missing lastName', () => {
		const data: RawSheetData = {
			headers: ['First', 'Choice'],
			rows: [{ rowIndex: 2, cells: ['Alice', 'Art'] }]
		};
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'Choice', mappedTo: 'choice1' }
		];

		const result = validateMappedData(data, mappings);

		expect(result.validRows[0].student).toEqual({
			firstName: 'Alice',
			lastName: undefined
		});
	});

	it('reports errors for empty firstName', () => {
		const result = validateMappedData(sampleData, basicMappings);

		expect(result.invalidRows[0].rowIndex).toBe(4);
		expect(result.invalidRows[0].errors).toContain('First name is empty');
	});

	it('collects multiple choice columns in order', () => {
		const data: RawSheetData = {
			headers: ['First', 'C1', 'C2', 'C3'],
			rows: [{ rowIndex: 2, cells: ['Alice', 'Art', 'Music', 'Drama'] }]
		};
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'C1', mappedTo: 'choice1' },
			{ columnIndex: 2, headerName: 'C2', mappedTo: 'choice2' },
			{ columnIndex: 3, headerName: 'C3', mappedTo: 'choice3' }
		];

		const result = validateMappedData(data, mappings);

		expect(result.validRows[0].choices).toEqual(['Art', 'Music', 'Drama']);
	});

	it('skips empty choice cells', () => {
		const data: RawSheetData = {
			headers: ['First', 'C1', 'C2'],
			rows: [{ rowIndex: 2, cells: ['Alice', 'Art', ''] }]
		};
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'C1', mappedTo: 'choice1' },
			{ columnIndex: 2, headerName: 'C2', mappedTo: 'choice2' }
		];

		const result = validateMappedData(data, mappings);

		expect(result.validRows[0].choices).toEqual(['Art']);
	});

	it('handles unmapped columns', () => {
		const data: RawSheetData = {
			headers: ['First', 'Extra', 'Choice'],
			rows: [{ rowIndex: 2, cells: ['Alice', 'Ignored', 'Art'] }]
		};
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'Extra', mappedTo: 'ignore' },
			{ columnIndex: 2, headerName: 'Choice', mappedTo: 'choice1' }
		];

		const result = validateMappedData(data, mappings);

		expect(result.validRows[0].student?.firstName).toBe('Alice');
		expect(result.validRows[0].choices).toEqual(['Art']);
	});
});

describe('generateStudentId', () => {
	it('generates ID from name and row index', () => {
		const id = generateStudentId('Alice', 'Smith', 5);
		expect(id).toBe('alicesmith-5');
	});

	it('handles missing last name', () => {
		const id = generateStudentId('Alice', undefined, 3);
		expect(id).toBe('alice-3');
	});

	it('handles names with spaces', () => {
		const id = generateStudentId('Mary Jane', 'Watson Smith', 7);
		// The function converts to lowercase and replaces spaces with dashes
		expect(id).toBe('mary-janewatson-smith-7');
	});
});
