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
	 * List all templates (for admin or when owner filtering isn't needed).
	 */
	listAll(): Promise<GroupTemplate[]>;

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
