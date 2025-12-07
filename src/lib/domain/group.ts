/**
 * Group entity for the Friend Hat domain.
 *
 * Groups are containers into which students are assigned during a grouping
 * activity. They have a name, optional capacity limit, and a list of
 * assigned member IDs.
 *
 * @module domain/group
 */

/**
 * Represents a group into which students can be assigned.
 *
 * Groups are either predefined by the teacher or created automatically
 * by the grouping algorithm based on roster size.
 */
export interface Group {
	/**
	 * Unique identifier for this group.
	 * Referenced by StudentPreference.likeGroupIds and avoidGroupIds.
	 */
	id: string;

	/**
	 * Human-readable label (e.g., "Group 1", "Alpha Team", "Table A").
	 */
	name: string;

	/**
	 * Maximum number of students that can be assigned to this group.
	 * Null indicates no explicit limit.
	 */
	capacity: number | null;

	/**
	 * List of Student.id values currently assigned to this group.
	 * Maintained by grouping algorithms and manual adjustments.
	 */
	memberIds: string[];

	/**
	 * Optional staff member who leads this group.
	 * Used for advisory/homeroom scenarios.
	 */
	leaderStaffId?: string;
}

/**
 * Mode for creating groups.
 *
 * - COUNT: User specifies the number of groups to create
 * - SIZE: User specifies the target number of students per group
 *
 * The grouping algorithm interprets this to determine how many groups
 * to generate for a given roster size.
 */
export type GroupCreationMode = 'COUNT' | 'SIZE';

/**
 * @deprecated Use GroupCreationMode instead. Kept for backward compatibility.
 */
export type Mode = GroupCreationMode;

/**
 * Factory function to create a Group with validation.
 *
 * @throws Error if required fields are missing or invalid.
 */
export function createGroup(input: {
	id: string;
	name: string;
	capacity?: number | null;
	memberIds?: string[];
	leaderStaffId?: string;
}): Group {
	if (!input.id || typeof input.id !== 'string') {
		throw new Error('Group id is required and must be a string');
	}
	if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
		throw new Error('Group name must not be empty');
	}

	let normalizedCapacity: number | null = null;
	if (input.capacity === undefined || input.capacity === null) {
		normalizedCapacity = null;
	} else if (
		Number.isNaN(input.capacity) ||
		input.capacity === Infinity ||
		input.capacity === -Infinity
	) {
		normalizedCapacity = null;
	} else {
		normalizedCapacity = input.capacity;
	}

	const uniqueMemberIds = Array.from(
		new Set((input.memberIds ?? []).map((id) => id))
	);

	return {
		id: input.id,
		name: input.name.trim(),
		capacity: normalizedCapacity,
		memberIds: uniqueMemberIds,
		leaderStaffId: input.leaderStaffId
	};
}

/**
 * Calculate remaining capacity for a group.
 * Returns Infinity if the group has no capacity limit.
 */
export function getRemainingCapacity(group: Group): number {
	if (group.capacity === null) {
		return Infinity;
	}
	return Math.max(0, group.capacity - group.memberIds.length);
}

/**
 * Check if a group is at capacity.
 */
export function isGroupFull(group: Group): boolean {
	if (group.capacity === null) {
		return false;
	}
	return group.memberIds.length >= group.capacity;
}
