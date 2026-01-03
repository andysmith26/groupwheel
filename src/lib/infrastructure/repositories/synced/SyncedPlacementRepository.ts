/**
 * Synced Placement Repository.
 *
 * Wraps a local PlacementRepository and adds sync capability.
 */

import type { PlacementRepository, SyncService } from '$lib/application/ports';
import type { Placement } from '$lib/domain';

export class SyncedPlacementRepository implements PlacementRepository {
	constructor(
		private readonly local: PlacementRepository,
		private readonly sync: SyncService
	) {}

	async getById(id: string): Promise<Placement | null> {
		return this.local.getById(id);
	}

	async listBySessionId(sessionId: string): Promise<Placement[]> {
		return this.local.listBySessionId(sessionId);
	}

	async listByStudentId(studentId: string): Promise<Placement[]> {
		return this.local.listByStudentId(studentId);
	}

	async save(placement: Placement): Promise<void> {
		await this.local.save(placement);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('placements', 'save', placement.id);
		}
	}

	async saveBatch(placements: Placement[]): Promise<void> {
		await this.local.saveBatch(placements);

		if (this.sync.isEnabled()) {
			for (const placement of placements) {
				await this.sync.queueForSync('placements', 'save', placement.id);
			}
		}
	}

	async delete(id: string): Promise<void> {
		await this.local.delete(id);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('placements', 'delete', id);
		}
	}

	async deleteBySessionId(sessionId: string): Promise<void> {
		// Get all placements for this session before deleting
		const placements = await this.local.listBySessionId(sessionId);
		await this.local.deleteBySessionId(sessionId);

		if (this.sync.isEnabled()) {
			for (const placement of placements) {
				await this.sync.queueForSync('placements', 'delete', placement.id);
			}
		}
	}
}
