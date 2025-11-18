/**
 * Pure utility functions for working with student friendship data.
 *
 * These are extracted from components for three reasons:
 * 1. Unit testable without mounting components
 * 2. Reusable across multiple components (Inspector, future "Move to..." menu, etc.)
 * 3. Clear separation: components handle rendering, utils handle data transformation
 */

import type { Student, Group } from '$lib/types';

/**
 * Get the display name for a student (firstName + lastName).
 * Handles edge cases where either name might be missing.
 */
export function getDisplayName(student: Student): string {
	const first = student.firstName ?? '';
	const last = student.lastName ?? '';
	const combined = `${first} ${last}`.trim();
	if (combined.length > 0) {
		return combined;
	}
	const metaDisplayName =
		typeof student.meta?.displayName === 'string' ? student.meta.displayName : '';
	return metaDisplayName || student.id;
}

/**
 * Convert an array of friend IDs into displayable name objects.
 *
 * Defensive: If a friendId doesn't exist in studentsById (shouldn't happen
 * after validation, but could if data is corrupted), we return a fallback
 * instead of throwing. This keeps the UI functional even with bad data.
 *
 * The console.warn helps debug data integrity issues without crashing.
 */
export function resolveFriendNames(
	friendIds: string[],
	studentsById: Record<string, Student>
): Array<{ id: string; name: string }> {
	return friendIds.map((id) => {
		const student = studentsById[id];

		if (!student) {
			console.warn(`Friend ID "${id}" not found in studentsById. Data may be corrupted.`);
			return { id, name: `Unknown (${id})` };
		}

		return {
			id,
			name: getDisplayName(student)
		};
	});
}

/**
 * For each friend ID, determine which group they're in (or if unassigned).
 * Returns an array of location info for rendering badges like "Group 2" or "Unassigned".
 *
 * This is O(n * m) where n = friendIds.length and m = average group size.
 * For 30 students and 5 groups, that's ~150 checks worst case.
 * Acceptable for this use case. If performance becomes an issue, you could
 * precompute a studentId -> groupId map once per render.
 */
export function getFriendLocations(
	friendIds: string[],
	groups: Group[]
): Array<{ friendId: string; groupId: string | null; groupName: string }> {
	return friendIds.map((friendId) => {
		// Search all groups to find where this friend is placed
		for (const group of groups) {
			if (group.memberIds.includes(friendId)) {
				return {
					friendId,
					groupId: group.id,
					groupName: group.name
				};
			}
		}

		// Not found in any group = unassigned
		return {
			friendId,
			groupId: null,
			groupName: 'Unassigned'
		};
	});
}
