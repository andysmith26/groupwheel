import { beforeEach, describe, expect, it } from 'vitest';
import { createStudent } from '$lib/domain/student';
import { InMemoryStudentRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryStudentRepository';
import { updateStudent } from './updateStudent';

describe('updateStudent', () => {
  let studentRepo: InMemoryStudentRepository;

  beforeEach(async () => {
    studentRepo = new InMemoryStudentRepository();
    await studentRepo.saveMany([
      createStudent({
        id: 'gw-student-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        meta: {
          sourceStudentId: 'S-1',
          homeroom: 'A'
        }
      })
    ]);
  });

  it('updates the editable source student id without changing the internal id', async () => {
    const result = await updateStudent(
      { studentRepo },
      {
        studentId: 'gw-student-1',
        sourceStudentId: 'S-99'
      }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.value.student.id).toBe('gw-student-1');
    expect(result.value.student.meta?.sourceStudentId).toBe('S-99');
    expect(result.value.student.meta?.homeroom).toBe('A');
  });

  it('updates the optional preferred name without changing the legal first name', async () => {
    const result = await updateStudent(
      { studentRepo },
      {
        studentId: 'gw-student-1',
        preferredName: 'Addy'
      }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.value.student.firstName).toBe('Ada');
    expect(result.value.student.preferredName).toBe('Addy');
  });

  it("replaces the student's tag ids", async () => {
    const result = await updateStudent(
      { studentRepo },
      {
        studentId: 'gw-student-1',
        tagIds: ['tag-1', 'tag-2']
      }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.value.student.tagIds).toEqual(['tag-1', 'tag-2']);
  });
});
