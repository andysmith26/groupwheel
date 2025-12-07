import type { Group } from '$lib/domain';

/**
 * Capacity status result containing color, warning state, and full state
 */
export interface CapacityStatus {
	color: string;
	isWarning: boolean;
	isFull: boolean;
}

/**
 * Calculate capacity status for a group (color and warning state)
 *
 * Returns an object with:
 * - color: Hex color code indicating status (gray, amber, or red)
 * - isWarning: Whether the group is at or near capacity (80%+)
 * - isFull: Whether the group is at or over capacity (100%+)
 *
 * @param group - The group to calculate capacity status for
 * @returns CapacityStatus object with color, isWarning, and isFull properties
 */
export function getCapacityStatus(group: Group): CapacityStatus {
	const currentCount = group.memberIds.length;

	if (group.capacity === null) {
		return { color: '#6b7280', isWarning: false, isFull: false }; // Gray for unlimited
	}

	const percentage = (currentCount / group.capacity) * 100;

	if (percentage >= 100) {
		return { color: '#dc2626', isWarning: true, isFull: true }; // Red for at/over capacity
	} else if (percentage >= 80) {
		return { color: '#f59e0b', isWarning: true, isFull: false }; // Amber for 80-99%
	} else {
		return { color: '#6b7280', isWarning: false, isFull: false }; // Gray for < 80%
	}
}
