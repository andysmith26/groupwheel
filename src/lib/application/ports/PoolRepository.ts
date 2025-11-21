import type { Pool } from '$lib/domain';

export interface PoolRepository {
	getById(id: string): Promise<Pool | null>;
	save(pool: Pool): Promise<void>;
	update(pool: Pool): Promise<void>;

	/**
	 * MVP-friendly listing. We can refine later to support access control.
	 */
	listAll(): Promise<Pool[]>;
}