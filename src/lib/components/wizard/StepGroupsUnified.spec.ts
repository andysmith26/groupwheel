/**
 * StepGroupsUnified validation logic test
 * 
 * Tests the validation function that determines if groups are valid.
 * This is used to restore validity when navigating back to the step
 * with previously valid groups in specific mode.
 */

import { describe, it, expect } from 'vitest';

interface GroupShell {
	name: string;
	capacity: number | null;
}

// Extract the validation logic from StepGroupsUnified for testing
function validateShellGroups(groups: GroupShell[]): boolean {
	if (groups.length === 0) return false;

	const seenNames = new Set<string>();
	for (const group of groups) {
		const trimmedName = group.name.trim();
		
		// Empty name is invalid
		if (trimmedName.length === 0) return false;
		
		// Duplicate names are invalid
		if (seenNames.has(trimmedName.toLowerCase())) return false;
		seenNames.add(trimmedName.toLowerCase());
		
		// Negative or zero capacity is invalid
		if (group.capacity !== null && group.capacity <= 0) return false;
	}
	
	return true;
}

describe('StepGroupsUnified - validation logic', () => {
	it('validates groups with valid names and capacities', () => {
		const validGroups = [
			{ name: 'Team Alpha', capacity: 2 },
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateShellGroups(validGroups)).toBe(true);
	});

	it('validates groups with null capacities (unlimited)', () => {
		const validGroups = [
			{ name: 'Team Alpha', capacity: null },
			{ name: 'Team Beta', capacity: 5 }
		];

		expect(validateShellGroups(validGroups)).toBe(true);
	});

	it('invalidates empty group list', () => {
		expect(validateShellGroups([])).toBe(false);
	});

	it('invalidates groups with empty names', () => {
		const invalidGroups = [
			{ name: '', capacity: 2 },
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateShellGroups(invalidGroups)).toBe(false);
	});

	it('invalidates groups with whitespace-only names', () => {
		const invalidGroups = [
			{ name: '   ', capacity: 2 },
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateShellGroups(invalidGroups)).toBe(false);
	});

	it('invalidates groups with duplicate names (case-insensitive)', () => {
		const duplicateGroups = [
			{ name: 'Team Alpha', capacity: 2 },
			{ name: 'team alpha', capacity: 3 } // Duplicate, different case
		];

		expect(validateShellGroups(duplicateGroups)).toBe(false);
	});

	it('invalidates groups with zero capacity', () => {
		const invalidGroups = [
			{ name: 'Team Alpha', capacity: 0 }, // Zero is invalid
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateShellGroups(invalidGroups)).toBe(false);
	});

	it('invalidates groups with negative capacity', () => {
		const invalidGroups = [
			{ name: 'Team Alpha', capacity: -1 }, // Negative is invalid
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateShellGroups(invalidGroups)).toBe(false);
	});

	it('validates groups with trimmed names', () => {
		const validGroups = [
			{ name: '  Team Alpha  ', capacity: 2 }, // Has whitespace
			{ name: 'Team Beta', capacity: 3 }
		];

		// Should be valid because we trim before checking
		expect(validateShellGroups(validGroups)).toBe(true);
	});
});
