import { describe, it, expect, beforeEach } from 'vitest';
import { setStudentActiveStatus } from './setStudentActiveStatus';
import { InMemoryPoolRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryPoolRepository';
import { createPool } from '$lib/domain/pool';
import type { Pool } from '$lib/domain/pool';

describe('setStudentActiveStatus', () => {
  let poolRepo: InMemoryPoolRepository;
  let pool: Pool;

  beforeEach(async () => {
    poolRepo = new InMemoryPoolRepository();
    pool = createPool({
      id: 'pool-1',
      name: 'Test Pool',
      type: 'CLASS',
      memberIds: ['s1', 's2', 's3']
    });
    await poolRepo.save(pool);
  });

  it('marks a student inactive', async () => {
    const result = await setStudentActiveStatus(
      { poolRepo },
      { poolId: 'pool-1', studentId: 's2', status: 'inactive' }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.memberStatuses).toEqual({ s2: 'inactive' });
  });

  it('marks an inactive student back to active', async () => {
    // First make inactive
    await setStudentActiveStatus(
      { poolRepo },
      { poolId: 'pool-1', studentId: 's1', status: 'inactive' }
    );

    // Then make active again
    const result = await setStudentActiveStatus(
      { poolRepo },
      { poolId: 'pool-1', studentId: 's1', status: 'active' }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.memberStatuses).toEqual({ s1: 'active' });
  });

  it('persists the updated pool', async () => {
    await setStudentActiveStatus(
      { poolRepo },
      { poolId: 'pool-1', studentId: 's2', status: 'inactive' }
    );

    const saved = await poolRepo.getById('pool-1');
    expect(saved?.memberStatuses).toEqual({ s2: 'inactive' });
  });

  it('returns POOL_NOT_FOUND when pool does not exist', async () => {
    const result = await setStudentActiveStatus(
      { poolRepo },
      { poolId: 'nonexistent', studentId: 's1', status: 'inactive' }
    );

    expect(result.status).toBe('err');
    if (result.status !== 'err') return;
    expect(result.error.type).toBe('POOL_NOT_FOUND');
  });

  it('returns STUDENT_NOT_IN_POOL when student is not a member', async () => {
    const result = await setStudentActiveStatus(
      { poolRepo },
      { poolId: 'pool-1', studentId: 'nonexistent', status: 'inactive' }
    );

    expect(result.status).toBe('err');
    if (result.status !== 'err') return;
    expect(result.error.type).toBe('STUDENT_NOT_IN_POOL');
  });
});
