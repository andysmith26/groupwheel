import { describe, expect, it } from 'vitest';
import type { IdGenerator } from '$lib/application/ports';
import { InMemoryTagRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryTagRepository';
import { resolveOrCreateTagsForProgram } from './resolveOrCreateTagsForProgram';

class SequenceIdGenerator implements IdGenerator {
  private ids = ['tag-new-1', 'tag-new-2'];
  generateId(): string {
    return this.ids.shift() ?? 'tag-fallback';
  }
}

describe('resolveOrCreateTagsForProgram', () => {
  it('resolves existing tags and creates missing tags', async () => {
    const tagRepo = new InMemoryTagRepository([
      { id: 'tag-honors', programId: 'program-1', name: 'Honors', colorIndex: 0 }
    ]);

    const result = await resolveOrCreateTagsForProgram(
      { tagRepo, idGenerator: new SequenceIdGenerator() },
      { programId: 'program-1', rawTagNames: [' honors ', 'ELL'] }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value).toEqual(['tag-honors', 'tag-new-1']);

    const tags = await tagRepo.listByProgramId('program-1');
    expect(tags.map((t) => t.name).sort()).toEqual(['ELL', 'Honors']);
  });

  it('returns empty list for empty input', async () => {
    const result = await resolveOrCreateTagsForProgram(
      { tagRepo: new InMemoryTagRepository(), idGenerator: new SequenceIdGenerator() },
      { programId: 'program-1', rawTagNames: undefined }
    );
    expect(result).toEqual({ status: 'ok', value: [] });
  });
});
