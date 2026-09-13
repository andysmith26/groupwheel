import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import type { TagRepository } from '$lib/application/ports/TagRepository';
import type { Student } from '$lib/domain/student';
import { ok, err, type Result } from '$lib/types/result';

export interface DeleteTagInput {
  tagId: string;
}

export type DeleteTagError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'PROGRAM_NOT_FOUND'; message: string }
  | { type: 'INTERNAL_ERROR'; message: string };

export async function deleteTag(
  deps: {
    tagRepo: TagRepository;
    programRepo: ProgramRepository;
    poolRepo: PoolRepository;
    studentRepo: StudentRepository;
  },
  input: DeleteTagInput
): Promise<Result<void, DeleteTagError>> {
  const tag = await deps.tagRepo.getById(input.tagId);
  if (!tag) {
    return err({ type: 'NOT_FOUND', message: 'Tag not found.' });
  }

  const program = await deps.programRepo.getById(tag.programId);
  if (!program) {
    return err({ type: 'PROGRAM_NOT_FOUND', message: 'Program not found for tag.' });
  }

  try {
    const poolIds = new Set<string>();
    if (program.primaryPoolId) {
      poolIds.add(program.primaryPoolId);
    }
    for (const poolId of program.poolIds ?? []) {
      poolIds.add(poolId);
    }

    const studentIds = new Set<string>();
    for (const poolId of poolIds) {
      const pool = await deps.poolRepo.getById(poolId);
      if (!pool) continue;
      for (const studentId of pool.memberIds) {
        studentIds.add(studentId);
      }
    }

    const students = await deps.studentRepo.getByIds(Array.from(studentIds));
    const updatedStudents: Student[] = [];
    for (const student of students) {
      if (!student.tagIds?.includes(tag.id)) continue;
      const nextTagIds = student.tagIds.filter((tagId) => tagId !== tag.id);
      updatedStudents.push({ ...student, tagIds: nextTagIds });
    }

    if (updatedStudents.length > 0) {
      await deps.studentRepo.saveMany(updatedStudents);
    }

    await deps.tagRepo.delete(tag.id);
    return ok(undefined);
  } catch (e) {
    return err({
      type: 'INTERNAL_ERROR',
      message: e instanceof Error ? e.message : 'Unknown error deleting tag'
    });
  }
}
