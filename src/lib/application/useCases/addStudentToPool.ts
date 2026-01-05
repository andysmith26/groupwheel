/**
 * Add a new student to an existing pool (roster).
 *
 * Creates a new student record and adds them to the pool's memberIds.
 * The student is immediately available for group assignment.
 */

import type { Student, Pool } from '$lib/domain';
import { createStudent } from '$lib/domain/student';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import { ok, err, type Result } from '$lib/types/result';

export interface AddStudentToPoolInput {
	poolId: string;
	firstName: string;
	lastName?: string;
	/** Optional student ID (e.g., email). If not provided, one will be generated. */
	studentId?: string;
	gradeLevel?: string;
	gender?: string;
	meta?: Record<string, unknown>;
}

export type AddStudentToPoolError =
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'STUDENT_ALREADY_EXISTS'; studentId: string }
	| { type: 'VALIDATION_ERROR'; message: string };

export interface AddStudentToPoolResult {
	student: Student;
	pool: Pool;
}

export async function addStudentToPool(
	deps: {
		studentRepo: StudentRepository;
		poolRepo: PoolRepository;
		idGenerator: IdGenerator;
	},
	input: AddStudentToPoolInput
): Promise<Result<AddStudentToPoolResult, AddStudentToPoolError>> {
	try {
		// Load the pool
		const pool = await deps.poolRepo.getById(input.poolId);
		if (!pool) {
			return err({ type: 'POOL_NOT_FOUND', poolId: input.poolId });
		}

		// Generate or use provided student ID
		const studentId = input.studentId?.trim() || deps.idGenerator.generateId();

		// Check if student already exists in pool
		if (pool.memberIds.includes(studentId)) {
			return err({ type: 'STUDENT_ALREADY_EXISTS', studentId });
		}

		// Check if student record already exists
		const existingStudent = await deps.studentRepo.getById(studentId);
		if (existingStudent) {
			// Student exists but not in this pool - just add to pool
			const updatedPool: Pool = {
				...pool,
				memberIds: [...pool.memberIds, studentId]
			};
			await deps.poolRepo.update(updatedPool);

			return ok({ student: existingStudent, pool: updatedPool });
		}

		// Create new student
		const student = createStudent({
			id: studentId,
			firstName: input.firstName,
			lastName: input.lastName,
			gradeLevel: input.gradeLevel,
			gender: input.gender,
			meta: input.meta
		});

		// Save student
		await deps.studentRepo.saveMany([student]);

		// Update pool with new member
		const updatedPool: Pool = {
			...pool,
			memberIds: [...pool.memberIds, student.id]
		};
		await deps.poolRepo.update(updatedPool);

		return ok({ student, pool: updatedPool });
	} catch (e) {
		return err({
			type: 'VALIDATION_ERROR',
			message: e instanceof Error ? e.message : 'Unknown error adding student'
		});
	}
}
