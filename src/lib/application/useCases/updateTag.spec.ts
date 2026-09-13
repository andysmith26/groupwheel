import { describe, expect, it } from 'vitest';
import { InMemoryTagRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryTagRepository';
import { updateTag } from './updateTag';

describe('updateTag', () => {
  it('updates tag name and color', async () => {
    const tagRepo = new InMemoryTagRepository([
      { id: 'tag-1', programId: 'program-1', name: 'Honors', colorIndex: 0 }
    ]);

    const result = await updateTag(
      { tagRepo },
      { tagId: 'tag-1', name: 'ELL', colorIndex: 4 }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.name).toBe('ELL');
    expect(result.value.colorIndex).toBe(4);
  });

  it('rejects duplicate names in same program', async () => {
    const tagRepo = new InMemoryTagRepository([
      { id: 'tag-1', programId: 'program-1', name: 'Honors', colorIndex: 0 },
      { id: 'tag-2', programId: 'program-1', name: 'ELL', colorIndex: 1 }
    ]);

    const result = await updateTag({ tagRepo }, { tagId: 'tag-1', name: ' ell ' });

    expect(result.status).toBe('err');
    if (result.status !== 'err') return;
    expect(result.error.type).toBe('DUPLICATE_NAME');
  });
});
