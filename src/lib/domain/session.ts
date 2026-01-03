/**
 * Session entity - represents a time-bounded activity instance.
 *
 * A Session is a specific occurrence of a Program (e.g., "Clubs - Fall 2024 Session 1").
 * Multiple Sessions can exist per Program to support multiple activity periods per year.
 *
 * @module domain/session
 */

export type SessionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * A time-bounded instance of a grouping activity.
 *
 * Sessions track when assignments were published and link to the adopted scenario.
 * Once published, the session's placements become the historical record.
 */
export interface Session {
	id: string;
	programId: string;
	name: string;
	academicYear: string;
	startDate: Date;
	endDate: Date;
	status: SessionStatus;
	/** The adopted scenario for this session (set when published) */
	scenarioId?: string;
	/** When the session was published */
	publishedAt?: Date;
	/** Staff member who published the session */
	publishedByStaffId?: string;
	createdAt: Date;
	createdByStaffId?: string;
	/** User ID for multi-tenant data isolation */
	userId?: string;
}

export interface CreateSessionParams {
	id: string;
	programId: string;
	name: string;
	academicYear: string;
	startDate: Date;
	endDate: Date;
	createdAt: Date;
	createdByStaffId?: string;
	userId?: string;
}

/**
 * Factory function to create a Session with validation.
 *
 * @throws {Error} If name is empty or endDate is before startDate
 */
export function createSession(params: CreateSessionParams): Session {
	const name = params.name.trim();
	if (!name) {
		throw new Error('Session name must not be empty');
	}

	if (params.endDate < params.startDate) {
		throw new Error('Session endDate must be after startDate');
	}

	return {
		id: params.id,
		programId: params.programId,
		name,
		academicYear: params.academicYear,
		startDate: params.startDate,
		endDate: params.endDate,
		status: 'DRAFT',
		createdAt: params.createdAt,
		createdByStaffId: params.createdByStaffId,
		userId: params.userId
	};
}
