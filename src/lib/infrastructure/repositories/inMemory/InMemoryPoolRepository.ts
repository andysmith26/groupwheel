import type { Pool } from '$lib/domain';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';

/**
 * In-memory PoolRepository.
 */
export class InMemoryPoolRepository implements PoolRepository {
	private readonly pools = new Map<string, Pool>();

	constructor(initialPools: Pool[] = []) {
		for (const pool of initialPools) {
			this.pools.set(pool.id, { ...pool, memberIds: [...pool.memberIds] });
		}
	}

	async getById(id: string): Promise<Pool | null> {
		const pool = this.pools.get(id);
		return pool ? { ...pool, memberIds: [...pool.memberIds] } : null;
	}

	async save(pool: Pool): Promise<void> {
		this.pools.set(pool.id, { ...pool, memberIds: [...pool.memberIds] });
	}

	async update(pool: Pool): Promise<void> {
		if (!this.pools.has(pool.id)) {
			throw new Error(`Pool with id ${pool.id} does not exist`);
		}
		this.pools.set(pool.id, { ...pool, memberIds: [...pool.memberIds] });
	}

	async listAll(): Promise<Pool[]> {
		return Array.from(this.pools.values()).map((p) => ({
			...p,
			memberIds: [...p.memberIds]
		}));
	}
}
