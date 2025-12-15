/**
 * Get a pool with its associated students.
 *
 * This use case loads a pool and all its member students in a single call.
 */

import type { Pool, Student } from '$lib/domain';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface GetPoolWithStudentsInput {
	poolId: string;
}

export interface PoolWithStudents {
	pool: Pool;
	students: Student[];
}

export type GetPoolWithStudentsError =
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'LOAD_FAILED'; message: string };

export async function getPoolWithStudents(
	deps: {
		poolRepo: PoolRepository;
		studentRepo: StudentRepository;
	},
	input: GetPoolWithStudentsInput
): Promise<Result<PoolWithStudents, GetPoolWithStudentsError>> {
	try {
		const pool = await deps.poolRepo.getById(input.poolId);
		if (!pool) {
			return err({ type: 'POOL_NOT_FOUND', poolId: input.poolId });
		}

		const students = await deps.studentRepo.getByIds(pool.memberIds);

		return ok({ pool, students });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error loading pool with students';
		return err({ type: 'LOAD_FAILED', message });
	}
}
