/**
 * Placement entity - records a student's assignment to a group.
 *
 * Placements capture the preference rank at the time of assignment,
 * providing an immutable historical record even if preferences change later.
 *
 * @module domain/placement
 */

export type PlacementType = 'INITIAL' | 'TRANSFER' | 'CORRECTION';

/**
 * A record of a student being assigned to a group within a session.
 *
 * Placements are created when a session is published. They capture:
 * - Which group the student was assigned to
 * - What preference rank that group was (1st choice, 2nd, etc.)
 * - A snapshot of their full preference list at time of assignment
 */
export interface Placement {
	id: string;
	sessionId: string;
	studentId: string;
	groupId: string;
	/** Snapshot of group name for display even if group is renamed */
	groupName: string;
	/**
	 * The preference rank at time of assignment.
	 * 1 = first choice, 2 = second choice, etc.
	 * null = student had no preference or group not in their list
	 */
	preferenceRank: number | null;
	/**
	 * The full preference list at time of assignment (group IDs in rank order).
	 * Enables later analysis even if preferences change.
	 */
	preferenceSnapshot?: string[];
	/** When the placement was assigned */
	assignedAt: Date;
	assignedByStaffId?: string;
	/** Start date of this placement (for transfers, may differ from assignedAt) */
	startDate: Date;
	/** End date if student was transferred out (null = still active) */
	endDate?: Date;
	/** Type of placement record */
	type: PlacementType;
	/** For corrections: ID of the placement being corrected */
	correctsPlacementId?: string;
	/** Optional reason for transfer or correction */
	reason?: string;
}

export interface CreatePlacementParams {
	id: string;
	sessionId: string;
	studentId: string;
	groupId: string;
	groupName: string;
	preferenceRank: number | null;
	preferenceSnapshot?: string[];
	assignedAt: Date;
	assignedByStaffId?: string;
	startDate?: Date;
	type?: PlacementType;
	correctsPlacementId?: string;
	reason?: string;
}

/**
 * Factory function to create a Placement with validation.
 *
 * @throws {Error} If required fields are missing or preferenceRank is invalid
 */
export function createPlacement(params: CreatePlacementParams): Placement {
	if (!params.sessionId || !params.studentId || !params.groupId) {
		throw new Error('Placement requires sessionId, studentId, and groupId');
	}

	if (params.preferenceRank !== null && params.preferenceRank < 1) {
		throw new Error('preferenceRank must be >= 1 or null');
	}

	const groupName = params.groupName.trim();
	if (!groupName) {
		throw new Error('Placement requires groupName');
	}

	return {
		id: params.id,
		sessionId: params.sessionId,
		studentId: params.studentId,
		groupId: params.groupId,
		groupName,
		preferenceRank: params.preferenceRank,
		preferenceSnapshot: params.preferenceSnapshot,
		assignedAt: params.assignedAt,
		assignedByStaffId: params.assignedByStaffId,
		startDate: params.startDate ?? params.assignedAt,
		type: params.type ?? 'INITIAL',
		correctsPlacementId: params.correctsPlacementId,
		reason: params.reason
	};
}
