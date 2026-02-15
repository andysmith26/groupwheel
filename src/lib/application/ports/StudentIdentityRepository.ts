/**
 * Repository port for StudentIdentity persistence.
 *
 * @module application/ports/StudentIdentityRepository
 */

import type { StudentIdentity } from '$lib/domain';

/**
 * Query parameters for searching student identities.
 */
export interface StudentIdentitySearchQuery {
	/** First name to search for (case-insensitive) */
	firstName?: string;
	/** Last name to search for (case-insensitive) */
	lastName?: string;
	/** User ID for multi-tenant filtering */
	userId?: string;
}

/**
 * Repository interface for managing StudentIdentity records.
 */
export interface StudentIdentityRepository {
	/**
	 * Get a student identity by its ID.
	 */
	getById(id: string): Promise<StudentIdentity | null>;

	/**
	 * Get multiple student identities by their IDs.
	 */
	getByIds(ids: string[]): Promise<StudentIdentity[]>;

	/**
	 * Search for student identities matching the given query.
	 * Used for finding potential matches during import.
	 */
	search(query: StudentIdentitySearchQuery): Promise<StudentIdentity[]>;

	/**
	 * List all student identities, optionally filtered by userId.
	 */
	listAll(userId?: string): Promise<StudentIdentity[]>;

	/**
	 * Save a new student identity.
	 */
	save(identity: StudentIdentity): Promise<void>;

	/**
	 * Update an existing student identity.
	 */
	update(identity: StudentIdentity): Promise<void>;

	/**
	 * Delete a student identity by its ID.
	 */
	delete(id: string): Promise<void>;
}
