/**
 * Update a student's editable fields.
 *
 * Loads the existing student record, merges the provided changes,
 * validates, and persists. The student's ID cannot be changed.
 */

import type { Student } from '$lib/domain';
import { createStudent } from '$lib/domain/student';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface UpdateStudentInput {
  studentId: string;
  firstName?: string;
  lastName?: string;
  gradeLevel?: string;
  gender?: string;
}

export type UpdateStudentError =
  | { type: 'STUDENT_NOT_FOUND'; studentId: string }
  | { type: 'VALIDATION_ERROR'; message: string };

export interface UpdateStudentResult {
  student: Student;
}

export async function updateStudent(
  deps: {
    studentRepo: StudentRepository;
  },
  input: UpdateStudentInput
): Promise<Result<UpdateStudentResult, UpdateStudentError>> {
  try {
    const existing = await deps.studentRepo.getById(input.studentId);
    if (!existing) {
      return err({ type: 'STUDENT_NOT_FOUND', studentId: input.studentId });
    }

    const updated = createStudent({
      id: existing.id,
      canonicalId: existing.canonicalId,
      firstName: input.firstName !== undefined ? input.firstName : existing.firstName,
      lastName: input.lastName !== undefined ? input.lastName : existing.lastName,
      gradeLevel: input.gradeLevel !== undefined ? input.gradeLevel : existing.gradeLevel,
      gender: input.gender !== undefined ? input.gender : existing.gender,
      meta: existing.meta
    });

    await deps.studentRepo.saveMany([updated]);

    return ok({ student: updated });
  } catch (e) {
    return err({
      type: 'VALIDATION_ERROR',
      message: e instanceof Error ? e.message : 'Unknown error updating student'
    });
  }
}
