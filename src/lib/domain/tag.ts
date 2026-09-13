/**
 * Tag entity for the Groupwheel domain.
 *
 * Tags are program-scoped labels teachers assign to students.
 * They support a persisted colorIndex for visual grouping on the class canvas.
 *
 * @module domain/tag
 */

export interface Tag {
  id: string;
  programId: string;
  name: string;
  colorIndex?: number;
}

export function createTag(input: {
  id: string;
  programId: string;
  name: string;
  colorIndex?: number;
}): Tag {
  if (!input.id || typeof input.id !== 'string') {
    throw new Error('Tag id is required and must be a string');
  }
  if (!input.programId || typeof input.programId !== 'string') {
    throw new Error('Tag programId is required and must be a string');
  }
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw new Error('Tag name must not be empty');
  }

  return {
    id: input.id.trim(),
    programId: input.programId.trim(),
    name: input.name.trim(),
    colorIndex: input.colorIndex
  };
}
