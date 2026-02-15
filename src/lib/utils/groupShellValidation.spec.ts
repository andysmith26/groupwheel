import { describe, it, expect } from 'vitest';
import { validateGroupShells } from './groupShellValidation';
import type { GroupShell } from './groupShellValidation';

describe('validateGroupShells', () => {
	it('should return true for valid groups', () => {
		const groups: GroupShell[] = [
			{ name: 'Group A', capacity: 5 },
			{ name: 'Group B', capacity: null }
		];
		expect(validateGroupShells(groups)).toBe(true);
	});

	it('should return false for empty array', () => {
		expect(validateGroupShells([])).toBe(false);
	});

	it('should return false for empty group name', () => {
		const groups: GroupShell[] = [{ name: '', capacity: 5 }];
		expect(validateGroupShells(groups)).toBe(false);
	});

	it('should return false for whitespace-only group name', () => {
		const groups: GroupShell[] = [{ name: '   ', capacity: 5 }];
		expect(validateGroupShells(groups)).toBe(false);
	});

	it('should return false for duplicate names (case-insensitive)', () => {
		const groups: GroupShell[] = [
			{ name: 'Group A', capacity: null },
			{ name: 'group a', capacity: null }
		];
		expect(validateGroupShells(groups)).toBe(false);
	});

	it('should return false for zero capacity', () => {
		const groups: GroupShell[] = [{ name: 'Group A', capacity: 0 }];
		expect(validateGroupShells(groups)).toBe(false);
	});

	it('should return false for negative capacity', () => {
		const groups: GroupShell[] = [{ name: 'Group A', capacity: -1 }];
		expect(validateGroupShells(groups)).toBe(false);
	});

	it('should allow null capacity (unlimited)', () => {
		const groups: GroupShell[] = [{ name: 'Group A', capacity: null }];
		expect(validateGroupShells(groups)).toBe(true);
	});

	it('should allow positive capacity', () => {
		const groups: GroupShell[] = [{ name: 'Group A', capacity: 10 }];
		expect(validateGroupShells(groups)).toBe(true);
	});

	it('should validate multiple groups independently', () => {
		const groups: GroupShell[] = [
			{ name: 'Group A', capacity: 5 },
			{ name: '', capacity: 3 }
		];
		expect(validateGroupShells(groups)).toBe(false);
	});
});
