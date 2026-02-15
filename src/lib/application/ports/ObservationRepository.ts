import type { Observation } from '$lib/domain';

/**
 * Repository interface for Observation entities.
 *
 * Observations capture teacher notes about group effectiveness
 * and can be used to inform future grouping decisions.
 */
export interface ObservationRepository {
	/**
	 * Get an observation by its ID.
	 */
	getById(id: string): Promise<Observation | null>;

	/**
	 * List all observations for a specific program.
	 */
	listByProgramId(programId: string): Promise<Observation[]>;

	/**
	 * List all observations for a specific session.
	 */
	listBySessionId(sessionId: string): Promise<Observation[]>;

	/**
	 * List all observations for a specific group (across all sessions).
	 */
	listByGroupId(groupId: string): Promise<Observation[]>;

	/**
	 * Save an observation (create or update).
	 */
	save(observation: Observation): Promise<void>;

	/**
	 * Delete an observation by ID.
	 */
	delete(id: string): Promise<void>;

	/**
	 * Delete all observations for a session.
	 */
	deleteBySessionId(sessionId: string): Promise<void>;

	/**
	 * List all observations, optionally filtered by user ID.
	 */
	listAll(userId?: string): Promise<Observation[]>;
}
