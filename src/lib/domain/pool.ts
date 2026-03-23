export type PoolType = 'SCHOOL' | 'GRADE' | 'CLASS' | 'TRIP' | 'CUSTOM';

export type PoolStatus = 'ACTIVE' | 'ARCHIVED';

export type PoolSource = 'IMPORT' | 'MANUAL';

export type MemberStatus = 'active' | 'inactive';

export interface PoolTimeSpan {
  start: Date;
  end?: Date;
}

/**
 * MVP Pool model — matches docs/domain_model.md.
 */
export interface Pool {
  id: string;
  schoolId?: string;
  name: string;
  type: PoolType;
  memberIds: string[];
  primaryStaffOwnerId?: string;
  ownerStaffIds?: string[];
  timeSpan?: PoolTimeSpan;
  status: PoolStatus;
  source?: PoolSource;
  parentPoolId?: string;
  /**
   * Per-member participation status. Missing entries or missing map = 'active'.
   * Used to exclude students from scenarios without removing them from the roster.
   */
  memberStatuses?: Record<string, MemberStatus>;
  /**
   * ID of the authenticated user who owns this pool.
   * Used for multi-tenant data isolation.
   * Undefined for anonymous/local-only data.
   */
  userId?: string;
}

/**
 * Minimal factory to centralize defaults and basic invariants.
 * Throws on obviously invalid input (empty name), since domain is
 * used from higher-level use cases that will translate errors.
 */
export function createPool(params: {
  id: string;
  name: string;
  type: PoolType;
  memberIds: string[];
  schoolId?: string;
  primaryStaffOwnerId?: string;
  ownerStaffIds?: string[];
  timeSpan?: PoolTimeSpan;
  status?: PoolStatus;
  source?: PoolSource;
  parentPoolId?: string;
  memberStatuses?: Record<string, MemberStatus>;
  userId?: string;
}): Pool {
  const name = params.name.trim();
  if (!name) {
    throw new Error('Pool name must not be empty');
  }

  const uniqueMemberIds = Array.from(new Set(params.memberIds));

  return {
    id: params.id,
    name,
    type: params.type,
    memberIds: uniqueMemberIds,
    schoolId: params.schoolId,
    primaryStaffOwnerId: params.primaryStaffOwnerId,
    ownerStaffIds: params.ownerStaffIds,
    timeSpan: params.timeSpan,
    status: params.status ?? 'ACTIVE',
    source: params.source,
    parentPoolId: params.parentPoolId,
    memberStatuses: params.memberStatuses,
    userId: params.userId
  };
}

/**
 * Return only member IDs whose status is 'active' (or unset, which defaults to active).
 */
export function getActiveMemberIds(pool: Pool): string[] {
  if (!pool.memberStatuses) return pool.memberIds;
  return pool.memberIds.filter(
    (id) => !pool.memberStatuses![id] || pool.memberStatuses![id] === 'active'
  );
}

/**
 * Return a new Pool with the given member's status updated.
 * Does not mutate the original pool.
 */
export function setMemberStatus(pool: Pool, studentId: string, status: MemberStatus): Pool {
  return {
    ...pool,
    memberStatuses: {
      ...pool.memberStatuses,
      [studentId]: status
    }
  };
}
