import type { PoolRepository } from '$lib/application/ports';
import type { Pool } from '$lib/domain';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

export type ListPoolsError = { type: 'POOL_LIST_FAILED'; message: string };

/**
 * List all Pools.
 * 
 * MVP: Simple listing with no filtering.
 * Future: Add owner filtering, pagination, search.
 */
export async function listPools(
	deps: { poolRepo: PoolRepository }
): Promise<Result<Pool[], ListPoolsError>> {
	try {
		const pools = await deps.poolRepo.listAll();
		return ok(pools);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error listing pools';
		return err({ type: 'POOL_LIST_FAILED', message });
	}
}