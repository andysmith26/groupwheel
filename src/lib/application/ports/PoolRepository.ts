import type { Pool } from '$lib/domain';

export interface PoolRepository {
	getById(id: string): Promise<Pool | null>;
	save(pool: Pool): Promise<void>;
	update(pool: Pool): Promise<void>;

	/**
	 * List all pools.
	 * When userId is provided, filters to only pools owned by that user.
	 * When userId is undefined, returns all local pools (anonymous mode).
	 */
	listAll(userId?: string): Promise<Pool[]>;
}
