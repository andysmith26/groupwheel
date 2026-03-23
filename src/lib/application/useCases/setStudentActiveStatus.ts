import type { Pool, MemberStatus } from '$lib/domain/pool';
import { setMemberStatus } from '$lib/domain/pool';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface SetStudentActiveStatusInput {
  poolId: string;
  studentId: string;
  status: MemberStatus;
}

export type SetStudentActiveStatusError =
  | { type: 'POOL_NOT_FOUND'; poolId: string }
  | { type: 'STUDENT_NOT_IN_POOL'; studentId: string };

export async function setStudentActiveStatus(
  deps: { poolRepo: PoolRepository },
  input: SetStudentActiveStatusInput
): Promise<Result<Pool, SetStudentActiveStatusError>> {
  const pool = await deps.poolRepo.getById(input.poolId);
  if (!pool) {
    return err({ type: 'POOL_NOT_FOUND', poolId: input.poolId });
  }

  if (!pool.memberIds.includes(input.studentId)) {
    return err({ type: 'STUDENT_NOT_IN_POOL', studentId: input.studentId });
  }

  const updatedPool = setMemberStatus(pool, input.studentId, input.status);
  await deps.poolRepo.update(updatedPool);

  return ok(updatedPool);
}
