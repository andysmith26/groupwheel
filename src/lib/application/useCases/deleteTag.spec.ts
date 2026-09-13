import { describe, expect, it } from 'vitest';
import { InMemoryPoolRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryPoolRepository';
import { InMemoryProgramRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryProgramRepository';
import { InMemoryStudentRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryStudentRepository';
import { InMemoryTagRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryTagRepository';
import { deleteTag } from './deleteTag';

describe('deleteTag', () => {
  it('removes tag from all students in the program and deletes the tag', async () => {
    const tagRepo = new InMemoryTagRepository([
      { id: 'tag-1', programId: 'program-1', name: 'Honors', colorIndex: 0 }
    ]);
    const programRepo = new InMemoryProgramRepository([
      {
        id: 'program-1',
        name: 'Class',
        type: 'CLASS_ACTIVITY',
        poolIds: ['pool-1'],
        primaryPoolId: 'pool-1',
        ownerStaffIds: ['owner-1'],
        timeSpan: { termLabel: '2026' }
      }
    ]);
    const poolRepo = new InMemoryPoolRepository([
      {
        id: 'pool-1',
        name: 'Roster',
        type: 'CLASS',
        memberIds: ['s1', 's2'],
        status: 'ACTIVE',
        primaryStaffOwnerId: 'owner-1'
      }
    ]);
    const studentRepo = new InMemoryStudentRepository([
      { id: 's1', firstName: 'A', tagIds: ['tag-1', 'tag-2'] },
      { id: 's2', firstName: 'B', tagIds: ['tag-1'] }
    ]);

    const result = await deleteTag({ tagRepo, programRepo, poolRepo, studentRepo }, { tagId: 'tag-1' });

    expect(result.status).toBe('ok');
    expect(await tagRepo.getById('tag-1')).toBeNull();
    expect((await studentRepo.getById('s1'))?.tagIds).toEqual(['tag-2']);
    expect((await studentRepo.getById('s2'))?.tagIds).toEqual([]);
  });
});
