import type { Pool } from '$lib/domain';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';

/**
 * In-memory PoolRepository.
 */
export class InMemoryPoolRepository implements PoolRepository {
  private readonly pools = new Map<string, Pool>();

  constructor(initialPools: Pool[] = []) {
    for (const pool of initialPools) {
      this.pools.set(pool.id, InMemoryPoolRepository.clone(pool));
    }
  }

  private static clone(pool: Pool): Pool {
    return {
      ...pool,
      memberIds: [...pool.memberIds],
      ...(pool.memberStatuses ? { memberStatuses: { ...pool.memberStatuses } } : {})
    };
  }

  async getById(id: string): Promise<Pool | null> {
    const pool = this.pools.get(id);
    return pool ? InMemoryPoolRepository.clone(pool) : null;
  }

  async save(pool: Pool): Promise<void> {
    this.pools.set(pool.id, InMemoryPoolRepository.clone(pool));
  }

  async update(pool: Pool): Promise<void> {
    if (!this.pools.has(pool.id)) {
      throw new Error(`Pool with id ${pool.id} does not exist`);
    }
    this.pools.set(pool.id, InMemoryPoolRepository.clone(pool));
  }

  async listAll(userId?: string): Promise<Pool[]> {
    let pools = Array.from(this.pools.values()).map((p) => InMemoryPoolRepository.clone(p));

    // Filter by userId when provided
    if (userId !== undefined) {
      pools = pools.filter((p) => p.userId === userId);
    }

    return pools;
  }
}
