/**
 * Validation utilities for group shells in the wizard
 */

export interface GroupShell {
	name: string;
	capacity: number | null;
}

/**
 * Validates a list of group shells.
 *
 * A group shell list is valid if:
 * - It contains at least one group
 * - All groups have non-empty names (after trimming whitespace)
 * - No duplicate names (case-insensitive)
 * - All capacities are either null (unlimited) or positive numbers
 *
 * @param groups - The list of group shells to validate
 * @returns true if the groups are valid, false otherwise
 */
export function validateGroupShells(groups: GroupShell[]): boolean {
	if (groups.length === 0) return false;

	const seenNames = new Set<string>();
	for (const group of groups) {
		const trimmedName = group.name.trim();

		// Empty name is invalid
		if (trimmedName.length === 0) return false;

		// Duplicate names are invalid (case-insensitive)
		if (seenNames.has(trimmedName.toLowerCase())) return false;
		seenNames.add(trimmedName.toLowerCase());

		// Negative or zero capacity is invalid
		if (group.capacity !== null && group.capacity <= 0) return false;
	}

	return true;
}
