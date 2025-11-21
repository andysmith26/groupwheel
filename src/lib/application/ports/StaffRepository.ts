import type { Staff } from '$lib/domain';

export interface StaffRepository {
	getById(id: string): Promise<Staff | null>;
	getByIds?(ids: string[]): Promise<Staff[]>;
}