/**
 * Synced Preference Repository.
 *
 * Wraps a local PreferenceRepository and adds sync capability.
 */

import type { PreferenceRepository, SyncService } from '$lib/application/ports';
import type { Preference } from '$lib/domain';

export class SyncedPreferenceRepository implements PreferenceRepository {
	constructor(
		private readonly local: PreferenceRepository,
		private readonly sync: SyncService
	) {}

	async listByProgramId(programId: string): Promise<Preference[]> {
		return this.local.listByProgramId(programId);
	}

	async save(preference: Preference): Promise<void> {
		await this.local.save(preference);

		if (this.sync.isEnabled()) {
			// Use a composite ID for preferences since they don't have their own ID
			const prefId = `${preference.programId}:${preference.studentId}`;
			await this.sync.queueForSync('preferences', 'save', prefId);
		}
	}

	async setForProgram(programId: string, preferences: Preference[]): Promise<void> {
		if (this.local.setForProgram) {
			await this.local.setForProgram(programId, preferences);
		} else {
			// Fallback: save one by one
			for (const pref of preferences) {
				await this.local.save(pref);
			}
		}

		if (this.sync.isEnabled()) {
			for (const pref of preferences) {
				const prefId = `${pref.programId}:${pref.studentId}`;
				await this.sync.queueForSync('preferences', 'save', prefId);
			}
		}
	}
}
