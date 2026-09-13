import { describe, expect, it } from 'vitest';
import type { IdGenerator } from '$lib/application/ports';
import { InMemoryTagRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryTagRepository';
import { createTagUseCase } from './createTag';

class FixedIdGenerator implements IdGenerator {
  generateId(): string {
    return 'tag-new';
  }
}

describe('createTagUseCase', () => {
  it('creates a tag', async () => {
    const tagRepo = new InMemoryTagRepository();
    const result = await createTagUseCase(
      { tagRepo, idGenerator: new FixedIdGenerator() },
      { programId: 'program-1', name: 'Honors', colorIndex: 3 }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.id).toBe('tag-new');
    expect(result.value.name).toBe('Honors');
  });

  it('rejects case-insensitive duplicates within a program', async () => {
    const tagRepo = new InMemoryTagRepository([
      { id: 'tag-1', programId: 'program-1', name: 'Honors', colorIndex: 0 }
    ]);

    const result = await createTagUseCase(
      { tagRepo, idGenerator: new FixedIdGenerator() },
      { programId: 'program-1', name: ' honors ' }
    );

    expect(result).toEqual({
      status: 'err',
      error: { type: 'DUPLICATE_NAME', message: 'A tag with this name already exists.' }
    });
  });
});
