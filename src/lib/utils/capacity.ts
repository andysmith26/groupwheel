/**
 * Utility functions for calculating group capacity status
 */

import type { Group } from '$lib/types';

export interface CapacityStatus {
	color: string;
	isWarning: boolean;
	isFull: boolean;
}

/**
 * Calculate capacity status for a group based on current member count and capacity limit.
 *
 * Returns color and warning state based on the following thresholds:
 * - null capacity: Gray (unlimited)
 * - >= 100%: Red (full/over capacity)
 * - >= 80%: Amber (approaching capacity)
 * - < 80%: Gray (normal)
 *
 * @param group - The group to calculate capacity status for
 * @returns CapacityStatus object with color, isWarning, and isFull flags
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
