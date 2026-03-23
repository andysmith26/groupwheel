import { describe, it, expect } from 'vitest';
import { createPool, getActiveMemberIds, setMemberStatus } from './pool';
import type { Pool } from './pool';

describe('getActiveMemberIds', () => {
  const basePool: Pool = createPool({
    id: 'pool-1',
    name: 'Test',
    type: 'CLASS',
    memberIds: ['s1', 's2', 's3', 's4']
  });

  it('returns all members when memberStatuses is undefined', () => {
    expect(getActiveMemberIds(basePool)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('returns all members when memberStatuses is empty', () => {
    const pool = { ...basePool, memberStatuses: {} };
    expect(getActiveMemberIds(pool)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('returns all members when all are explicitly active', () => {
    const pool = {
      ...basePool,
      memberStatuses: {
        s1: 'active' as const,
        s2: 'active' as const,
        s3: 'active' as const,
        s4: 'active' as const
      }
    };
    expect(getActiveMemberIds(pool)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('filters out inactive members', () => {
    const pool = {
      ...basePool,
      memberStatuses: { s2: 'inactive' as const, s4: 'inactive' as const }
    };
    expect(getActiveMemberIds(pool)).toEqual(['s1', 's3']);
  });

  it('returns empty when all are inactive', () => {
    const pool = {
      ...basePool,
      memberStatuses: {
        s1: 'inactive' as const,
        s2: 'inactive' as const,
        s3: 'inactive' as const,
        s4: 'inactive' as const
      }
    };
    expect(getActiveMemberIds(pool)).toEqual([]);
  });
});

describe('setMemberStatus', () => {
  const basePool: Pool = createPool({
    id: 'pool-1',
    name: 'Test',
    type: 'CLASS',
    memberIds: ['s1', 's2', 's3']
  });

  it('sets a member to inactive', () => {
    const updated = setMemberStatus(basePool, 's2', 'inactive');
    expect(updated.memberStatuses).toEqual({ s2: 'inactive' });
  });

  it('sets a member back to active', () => {
    const pool = { ...basePool, memberStatuses: { s2: 'inactive' as const } };
    const updated = setMemberStatus(pool, 's2', 'active');
    expect(updated.memberStatuses).toEqual({ s2: 'active' });
  });

  it('does not mutate the original pool', () => {
    const original = { ...basePool, memberStatuses: { s1: 'active' as const } };
    const updated = setMemberStatus(original, 's2', 'inactive');
    expect(original.memberStatuses).toEqual({ s1: 'active' });
    expect(updated.memberStatuses).toEqual({ s1: 'active', s2: 'inactive' });
  });

  it('preserves existing statuses for other members', () => {
    const pool = {
      ...basePool,
      memberStatuses: { s1: 'inactive' as const, s3: 'active' as const }
    };
    const updated = setMemberStatus(pool, 's2', 'inactive');
    expect(updated.memberStatuses).toEqual({
      s1: 'inactive',
      s2: 'inactive',
      s3: 'active'
    });
  });

  it('preserves all other pool properties', () => {
    const updated = setMemberStatus(basePool, 's1', 'inactive');
    expect(updated.id).toBe(basePool.id);
    expect(updated.name).toBe(basePool.name);
    expect(updated.type).toBe(basePool.type);
    expect(updated.memberIds).toEqual(basePool.memberIds);
  });
});
