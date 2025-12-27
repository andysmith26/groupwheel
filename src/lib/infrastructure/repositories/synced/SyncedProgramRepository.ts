/**
 * Synced Program Repository.
 *
 * Wraps a local ProgramRepository and adds sync capability.
 */

import type { ProgramRepository, SyncService } from '$lib/application/ports';
import type { Program } from '$lib/domain';

export class SyncedProgramRepository implements ProgramRepository {
	constructor(
		private readonly local: ProgramRepository,
		private readonly sync: SyncService
	) {}

	async getById(id: string): Promise<Program | null> {
		return this.local.getById(id);
	}

	async save(program: Program): Promise<void> {
		await this.local.save(program);

		if (this.sync.isEnabled()) {
			this.sync.queueForSync('programs', 'save', program.id);
		}
	}

	async update(program: Program): Promise<void> {
		await this.local.update(program);

		if (this.sync.isEnabled()) {
			this.sync.queueForSync('programs', 'save', program.id);
		}
	}

	async listAll(): Promise<Program[]> {
		return this.local.listAll();
	}
}
