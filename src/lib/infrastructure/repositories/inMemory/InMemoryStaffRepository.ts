import type { Staff } from '$lib/domain';
import type { StaffRepository } from '$lib/application/ports/StaffRepository';

/**
 * In-memory StaffRepository.
 *
 * MVP mostly needs this for pool/program ownership metadata.
 */
export class InMemoryStaffRepository implements StaffRepository {
	private readonly staff = new Map<string, Staff>();

	constructor(initialStaff: Staff[] = []) {
		for (const s of initialStaff) {
			this.staff.set(s.id, { ...s });
		}
	}

	async getById(id: string): Promise<Staff | null> {
		const staff = this.staff.get(id);
		return staff ? { ...staff } : null;
	}

	async getByIds(ids: string[]): Promise<Staff[]> {
		const results: Staff[] = [];
		for (const id of ids) {
			const staff = this.staff.get(id);
			if (staff) {
				results.push({ ...staff });
			}
		}
		return results;
	}

	/**
	 * Convenience for seeding/overriding Staff records.
	 */
	setMany(staff: Staff[]): void {
		for (const s of staff) {
			this.staff.set(s.id, { ...s });
		}
	}
}