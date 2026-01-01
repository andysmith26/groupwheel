/**
 * GroupTemplateRepository port.
 *
 * Defines the interface for persisting and retrieving GroupTemplate entities.
 *
 * @module application/ports/GroupTemplateRepository
 */

import type { GroupTemplate } from '$lib/domain';

export interface GroupTemplateRepository {
	/**
	 * Get a template by its ID.
	 */
	getById(id: string): Promise<GroupTemplate | null>;

	/**
	 * List all templates owned by a staff member.
	 */
	listByOwnerId(staffId: string): Promise<GroupTemplate[]>;

	/**
	 * List all templates.
	 * When userId is provided, filters to only templates owned by that user.
	 * When userId is undefined, returns all local templates (anonymous mode).
	 */
	listAll(userId?: string): Promise<GroupTemplate[]>;

	/**
	 * Save a new template.
	 */
	save(template: GroupTemplate): Promise<void>;

	/**
	 * Update an existing template.
	 */
	update(template: GroupTemplate): Promise<void>;

	/**
	 * Delete a template by ID.
	 */
	delete(id: string): Promise<void>;
}
