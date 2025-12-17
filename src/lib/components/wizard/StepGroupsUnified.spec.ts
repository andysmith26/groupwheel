/**
 * StepGroupsUnified validation logic test
 *
 * Tests the validation function that determines if groups are valid.
 * This is used to restore validity when navigating back to the step
 * with previously valid groups in specific mode.
 */

import { describe, it, expect } from 'vitest';
import { validateGroupShells, type GroupShell } from '$lib/utils/groupShellValidation';

describe('StepGroupsUnified - validation logic', () => {
	it('validates groups with valid names and capacities', () => {
		const validGroups: GroupShell[] = [
			{ name: 'Team Alpha', capacity: 2 },
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateGroupShells(validGroups)).toBe(true);
	});

	it('validates groups with null capacities (unlimited)', () => {
		const validGroups: GroupShell[] = [
			{ name: 'Team Alpha', capacity: null },
			{ name: 'Team Beta', capacity: 5 }
		];

		expect(validateGroupShells(validGroups)).toBe(true);
	});

	it('invalidates empty group list', () => {
		expect(validateGroupShells([])).toBe(false);
	});

	it('invalidates groups with empty names', () => {
		const invalidGroups: GroupShell[] = [
			{ name: '', capacity: 2 },
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateGroupShells(invalidGroups)).toBe(false);
	});

	it('invalidates groups with whitespace-only names', () => {
		const invalidGroups: GroupShell[] = [
			{ name: '   ', capacity: 2 },
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateGroupShells(invalidGroups)).toBe(false);
	});

	it('invalidates groups with duplicate names (case-insensitive)', () => {
		const duplicateGroups: GroupShell[] = [
			{ name: 'Team Alpha', capacity: 2 },
			{ name: 'team alpha', capacity: 3 } // Duplicate, different case
		];

		expect(validateGroupShells(duplicateGroups)).toBe(false);
	});

	it('invalidates groups with zero capacity', () => {
		const invalidGroups: GroupShell[] = [
			{ name: 'Team Alpha', capacity: 0 }, // Zero is invalid
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateGroupShells(invalidGroups)).toBe(false);
	});

	it('invalidates groups with negative capacity', () => {
		const invalidGroups: GroupShell[] = [
			{ name: 'Team Alpha', capacity: -1 }, // Negative is invalid
			{ name: 'Team Beta', capacity: 3 }
		];

		expect(validateGroupShells(invalidGroups)).toBe(false);
	});

	it('validates groups with trimmed names', () => {
		const validGroups: GroupShell[] = [
			{ name: '  Team Alpha  ', capacity: 2 }, // Has whitespace
			{ name: 'Team Beta', capacity: 3 }
		];

		// Should be valid because we trim before checking
		expect(validateGroupShells(validGroups)).toBe(true);
	});
});
