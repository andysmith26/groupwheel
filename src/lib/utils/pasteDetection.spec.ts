import { describe, it, expect } from 'vitest';
import { detectSimpleNameList } from './pasteDetection';

describe('detectSimpleNameList', () => {
	it('detects simple name list (no delimiters)', () => {
		const result = detectSimpleNameList('Alice Chen\nBob Park\nCarol Davis');
		expect(result.isSimpleNameList).toBe(true);
		if (result.isSimpleNameList) {
			expect(result.names).toEqual(['Alice Chen', 'Bob Park', 'Carol Davis']);
		}
	});

	it('rejects text with commas as not a simple list', () => {
		const result = detectSimpleNameList('Chen, Alice\nPark, Bob');
		expect(result.isSimpleNameList).toBe(false);
	});

	it('rejects text with tabs as not a simple list', () => {
		const result = detectSimpleNameList('Alice Chen\t12\nBob Park\t11');
		expect(result.isSimpleNameList).toBe(false);
	});

	it('handles blank lines between names', () => {
		const result = detectSimpleNameList('Alice Chen\n\nBob Park\n\nCarol Davis');
		expect(result.isSimpleNameList).toBe(true);
		if (result.isSimpleNameList) {
			expect(result.names).toEqual(['Alice Chen', 'Bob Park', 'Carol Davis']);
		}
	});

	it('requires minimum 2 non-empty lines', () => {
		const result = detectSimpleNameList('Alice Chen');
		expect(result.isSimpleNameList).toBe(false);
	});

	it('rejects lines over 100 characters', () => {
		const longLine = 'x'.repeat(101);
		const result = detectSimpleNameList(`Alice Chen\n${longLine}\nBob Park`);
		expect(result.isSimpleNameList).toBe(false);
	});

	it('trims whitespace from names', () => {
		const result = detectSimpleNameList('  Alice Chen  \n  Bob Park  ');
		expect(result.isSimpleNameList).toBe(true);
		if (result.isSimpleNameList) {
			expect(result.names).toEqual(['Alice Chen', 'Bob Park']);
		}
	});

	it('handles Windows-style line endings', () => {
		const result = detectSimpleNameList('Alice Chen\r\nBob Park\r\nCarol Davis');
		expect(result.isSimpleNameList).toBe(true);
		if (result.isSimpleNameList) {
			expect(result.names).toEqual(['Alice Chen', 'Bob Park', 'Carol Davis']);
		}
	});

	it('returns false for empty input', () => {
		const result = detectSimpleNameList('');
		expect(result.isSimpleNameList).toBe(false);
	});

	it('returns false for whitespace-only input', () => {
		const result = detectSimpleNameList('   \n   \n   ');
		expect(result.isSimpleNameList).toBe(false);
	});

	it('handles names with multiple spaces (Mary Jane Watson = one student)', () => {
		const result = detectSimpleNameList('Mary Jane Watson\nPeter Benjamin Parker');
		expect(result.isSimpleNameList).toBe(true);
		if (result.isSimpleNameList) {
			expect(result.names).toEqual(['Mary Jane Watson', 'Peter Benjamin Parker']);
		}
	});
});
