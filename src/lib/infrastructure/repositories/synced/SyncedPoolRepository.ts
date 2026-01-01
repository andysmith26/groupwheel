/**
 * Synced Pool Repository.
 *
 * Wraps a local PoolRepository and adds sync capability.
 */

import type { PoolRepository, SyncService } from '$lib/application/ports';
import type { Pool } from '$lib/domain';

export class SyncedPoolRepository implements PoolRepository {
	constructor(
		private readonly local: PoolRepository,
		private readonly sync: SyncService
	) {}

	async getById(id: string): Promise<Pool | null> {
		return this.local.getById(id);
	}

	async save(pool: Pool): Promise<void> {
		await this.local.save(pool);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('pools', 'save', pool.id);
		}
	}

	async update(pool: Pool): Promise<void> {
		await this.local.update(pool);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('pools', 'save', pool.id);
		}
	}

	async listAll(userId?: string): Promise<Pool[]> {
		return this.local.listAll(userId);
	}
}
