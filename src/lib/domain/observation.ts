/**
 * Observation entity - captures teacher notes about group effectiveness.
 *
 * Observations allow teachers to record qualitative feedback about how well
 * groups worked together. This data can inform future grouping decisions.
 *
 * @module domain/observation
 */

/**
 * Sentiment rating for an observation.
 */
export type ObservationSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

/**
 * A teacher's observation about a group's effectiveness.
 *
 * Observations are typically made after a session when the teacher
 * has had time to see how well the group dynamics worked.
 */
export interface Observation {
	id: string;
	/** The program this observation relates to. */
	programId: string;
	/** The session during which this observation was made (optional). */
	sessionId?: string;
	/** The group being observed. */
	groupId: string;
	/** Snapshot of group name for display even if group is renamed. */
	groupName: string;
	/** The staff member who made the observation. */
	createdByStaffId?: string;
	/** Free-text observation content. */
	content: string;
	/** Overall sentiment of the observation. */
	sentiment?: ObservationSentiment;
	/** Optional tags for categorization (e.g., "collaboration", "conflict"). */
	tags?: string[];
	/** When the observation was created. */
	createdAt: Date;
	/** User ID for multi-tenant data isolation. */
	userId?: string;
}

export interface CreateObservationParams {
	id: string;
	programId: string;
	sessionId?: string;
	groupId: string;
	groupName: string;
	createdByStaffId?: string;
	content: string;
	sentiment?: ObservationSentiment;
	tags?: string[];
	createdAt: Date;
	userId?: string;
}

/**
 * Factory function to create an Observation with validation.
 *
 * @throws {Error} If required fields are missing or invalid
 */
export function createObservation(params: CreateObservationParams): Observation {
	if (!params.programId) {
		throw new Error('Observation requires programId');
	}

	if (!params.groupId) {
		throw new Error('Observation requires groupId');
	}

	const groupName = params.groupName?.trim();
	if (!groupName) {
		throw new Error('Observation requires groupName');
	}

	const content = params.content?.trim();
	if (!content) {
		throw new Error('Observation requires content');
	}

	// Validate tags if provided
	const tags = params.tags?.filter((t) => t.trim().length > 0).map((t) => t.trim().toLowerCase());

	return {
		id: params.id,
		programId: params.programId,
		sessionId: params.sessionId,
		groupId: params.groupId,
		groupName,
		createdByStaffId: params.createdByStaffId,
		content,
		sentiment: params.sentiment,
		tags: tags && tags.length > 0 ? tags : undefined,
		createdAt: params.createdAt,
		userId: params.userId
	};
}
