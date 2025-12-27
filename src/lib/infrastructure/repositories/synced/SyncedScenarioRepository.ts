/**
 * Synced Scenario Repository.
 *
 * Wraps a local ScenarioRepository and adds sync capability.
 */

import type { ScenarioRepository, SyncService } from '$lib/application/ports';
import type { Scenario } from '$lib/domain';

export class SyncedScenarioRepository implements ScenarioRepository {
	constructor(
		private readonly local: ScenarioRepository,
		private readonly sync: SyncService
	) {}

	async getById(id: string): Promise<Scenario | null> {
		return this.local.getById(id);
	}

	async getByProgramId(programId: string): Promise<Scenario | null> {
		return this.local.getByProgramId(programId);
	}

	async save(scenario: Scenario): Promise<void> {
		await this.local.save(scenario);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('scenarios', 'save', scenario.id);
		}
	}

	async update(scenario: Scenario): Promise<void> {
		await this.local.update(scenario);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('scenarios', 'save', scenario.id);
		}
	}

	async delete(id: string): Promise<void> {
		await this.local.delete(id);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('scenarios', 'delete', id);
		}
	}
}
