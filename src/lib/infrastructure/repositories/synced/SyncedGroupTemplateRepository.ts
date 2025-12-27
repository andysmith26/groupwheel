/**
 * Synced GroupTemplate Repository.
 *
 * Wraps a local GroupTemplateRepository and adds sync capability.
 */

import type { GroupTemplateRepository, SyncService } from '$lib/application/ports';
import type { GroupTemplate } from '$lib/domain';

export class SyncedGroupTemplateRepository implements GroupTemplateRepository {
	constructor(
		private readonly local: GroupTemplateRepository,
		private readonly sync: SyncService
	) {}

	async getById(id: string): Promise<GroupTemplate | null> {
		return this.local.getById(id);
	}

	async listByOwnerId(staffId: string): Promise<GroupTemplate[]> {
		return this.local.listByOwnerId(staffId);
	}

	async listAll(): Promise<GroupTemplate[]> {
		return this.local.listAll();
	}

	async save(template: GroupTemplate): Promise<void> {
		await this.local.save(template);

		if (this.sync.isEnabled()) {
			this.sync.queueForSync('groupTemplates', 'save', template.id);
		}
	}

	async update(template: GroupTemplate): Promise<void> {
		await this.local.update(template);

		if (this.sync.isEnabled()) {
			this.sync.queueForSync('groupTemplates', 'save', template.id);
		}
	}

	async delete(id: string): Promise<void> {
		await this.local.delete(id);

		if (this.sync.isEnabled()) {
			this.sync.queueForSync('groupTemplates', 'delete', id);
		}
	}
}
