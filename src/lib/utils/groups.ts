import type { Group } from '$lib/domain';

/**
 * Capacity status result containing color, warning state, full state, and over-enrollment info
 */
export interface CapacityStatus {
	color: string;
	isWarning: boolean;
	isFull: boolean;
	isOverEnrolled: boolean;
	overEnrollmentCount: number;
}

/**
 * Calculate capacity status for a group (color and warning state)
 *
 * Returns an object with:
 * - color: Hex color code indicating status (gray, amber, red, or purple for over-enrolled)
 * - isWarning: Whether the group is at or near capacity (80%+)
 * - isFull: Whether the group is at or over capacity (100%+)
 * - isOverEnrolled: Whether the group exceeds capacity (>100%)
 * - overEnrollmentCount: Number of members over capacity (0 if not over)
 *
 * @param group - The group to calculate capacity status for
 * @returns CapacityStatus object with color, isWarning, isFull, and over-enrollment properties
 */
export function getCapacityStatus(group: Group): CapacityStatus {
	const currentCount = group.memberIds.length;

	if (group.capacity === null) {
		return {
			color: '#6b7280',
			isWarning: false,
			isFull: false,
			isOverEnrolled: false,
			overEnrollmentCount: 0
		}; // Gray for unlimited
	}

	const percentage = (currentCount / group.capacity) * 100;
	const overCount = Math.max(0, currentCount - group.capacity);

	if (percentage > 100) {
		return {
			color: '#7c3aed',
			isWarning: true,
			isFull: true,
			isOverEnrolled: true,
			overEnrollmentCount: overCount
		}; // Purple for over capacity
	} else if (percentage >= 100) {
		return {
			color: '#dc2626',
			isWarning: true,
			isFull: true,
			isOverEnrolled: false,
			overEnrollmentCount: 0
		}; // Red for at capacity
	} else if (percentage >= 80) {
		return {
			color: '#f59e0b',
			isWarning: true,
			isFull: false,
			isOverEnrolled: false,
			overEnrollmentCount: 0
		}; // Amber for 80-99%
	} else {
		return {
			color: '#6b7280',
			isWarning: false,
			isFull: false,
			isOverEnrolled: false,
			overEnrollmentCount: 0
		}; // Gray for < 80%
	}
}

/**
 * Calculate how many grid rows a group card should span in the editing layout.
 *
 * Uses a simple capacity-based span so the drop zone fits the target capacity:
 * - 40px per row (student slot)
 * - 2 header rows for name/capacity/badge/padding
 * - Buffer of +2 slots when capacity is unlimited
 */
export function calculateRowSpan(group: Pick<Group, 'capacity' | 'memberIds'>): number {
	const HEADER_ROWS = 2;
	const MIN_CONTENT_ROWS = 1;
	const UNLIMITED_BUFFER = 2;

	const contentSlots =
		group.capacity !== null ? group.capacity : group.memberIds.length + UNLIMITED_BUFFER;

	return HEADER_ROWS + Math.max(MIN_CONTENT_ROWS, contentSlots);
}

/**
 * Calculate how many grid rows a group currently needs based on actual members.
 *
 * This is intended for layouts that should size themselves to the tallest rendered group.
 */
export function calculateVisibleRowSpan(group: Pick<Group, 'memberIds'>): number {
	const HEADER_ROWS = 2;
	const MIN_CONTENT_ROWS = 1;
	const DROP_BUFFER = 1;

	const contentRows = Math.max(MIN_CONTENT_ROWS, group.memberIds.length + DROP_BUFFER);
	return HEADER_ROWS + contentRows;
}
