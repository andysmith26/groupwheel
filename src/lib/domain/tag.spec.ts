import { describe, expect, it } from 'vitest';
import { createTag } from './tag';

describe('createTag', () => {
  it('creates a valid tag', () => {
    const tag = createTag({ id: 'tag-1', programId: 'program-1', name: 'Honors', colorIndex: 2 });
    expect(tag).toEqual({ id: 'tag-1', programId: 'program-1', name: 'Honors', colorIndex: 2 });
  });

  it('trims id/program/name', () => {
    const tag = createTag({ id: ' tag-1 ', programId: ' program-1 ', name: ' Honors ' });
    expect(tag.id).toBe('tag-1');
    expect(tag.programId).toBe('program-1');
    expect(tag.name).toBe('Honors');
  });

  it('throws for empty name', () => {
    expect(() => createTag({ id: 'tag-1', programId: 'program-1', name: '   ' })).toThrow(
      'Tag name must not be empty'
    );
  });
});
