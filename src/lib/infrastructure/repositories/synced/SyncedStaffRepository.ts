/**
 * Synced Staff Repository.
 *
 * Wraps a local StaffRepository and adds sync capability.
 * Staff data is typically read-only in the client, so sync is minimal.
 */

import type { StaffRepository } from '$lib/application/ports';
import type { Staff } from '$lib/domain';

export class SyncedStaffRepository implements StaffRepository {
	constructor(private readonly local: StaffRepository) {}

	async getById(id: string): Promise<Staff | null> {
		return this.local.getById(id);
	}

	async getByIds(ids: string[]): Promise<Staff[]> {
		if (this.local.getByIds) {
			return this.local.getByIds(ids);
		}
		// Fallback: fetch one by one
		const results = await Promise.all(ids.map((id) => this.local.getById(id)));
		return results.filter((s): s is Staff => s !== null);
	}
}
