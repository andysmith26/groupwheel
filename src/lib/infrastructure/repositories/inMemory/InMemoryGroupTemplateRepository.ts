/**
 * In-memory implementation of GroupTemplateRepository.
 *
 * Used for testing and SSR where IndexedDB is not available.
 *
 * @module infrastructure/repositories/inMemory/InMemoryGroupTemplateRepository
 */

import type { GroupTemplate } from '$lib/domain';
import type { GroupTemplateRepository } from '$lib/application/ports';

export class InMemoryGroupTemplateRepository implements GroupTemplateRepository {
	private readonly templates = new Map<string, GroupTemplate>();

	constructor(initialTemplates: GroupTemplate[] = []) {
		for (const template of initialTemplates) {
			this.templates.set(template.id, this.clone(template));
		}
	}

	async getById(id: string): Promise<GroupTemplate | null> {
		const template = this.templates.get(id);
		return template ? this.clone(template) : null;
	}

	async listByOwnerId(staffId: string): Promise<GroupTemplate[]> {
		const results: GroupTemplate[] = [];
		for (const template of this.templates.values()) {
			if (template.ownerStaffId === staffId) {
				results.push(this.clone(template));
			}
		}
		// Sort by most recently updated
		return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	}

	async listAll(userId?: string): Promise<GroupTemplate[]> {
		let results = Array.from(this.templates.values()).map((t) => this.clone(t));

		// Filter by userId when provided
		if (userId !== undefined) {
			results = results.filter((t) => t.userId === userId);
		}

		// Sort by most recently updated
		return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	}

	async save(template: GroupTemplate): Promise<void> {
		this.templates.set(template.id, this.clone(template));
	}

	async update(template: GroupTemplate): Promise<void> {
		if (!this.templates.has(template.id)) {
			throw new Error(`GroupTemplate not found: ${template.id}`);
		}
		this.templates.set(template.id, this.clone(template));
	}

	async delete(id: string): Promise<void> {
		this.templates.delete(id);
	}

	/**
	 * Deep clone a template to prevent external mutation.
	 */
	private clone(template: GroupTemplate): GroupTemplate {
		return {
			...template,
			groups: template.groups.map((g) => ({ ...g })),
			createdAt: new Date(template.createdAt),
			updatedAt: new Date(template.updatedAt)
		};
	}
}
