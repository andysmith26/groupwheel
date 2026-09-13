import type { TagRepository } from '$lib/application/ports/TagRepository';
import { createTag, type Tag } from '$lib/domain/tag';
import { ok, err, type Result } from '$lib/types/result';

export interface UpdateTagInput {
  tagId: string;
  name?: string;
  colorIndex?: number;
}

export type UpdateTagError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'DUPLICATE_NAME'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string };

export async function updateTag(
  deps: {
    tagRepo: TagRepository;
  },
  input: UpdateTagInput
): Promise<Result<Tag, UpdateTagError>> {
  const existing = await deps.tagRepo.getById(input.tagId);
  if (!existing) {
    return err({ type: 'NOT_FOUND', message: 'Tag not found.' });
  }

  const nextName = input.name !== undefined ? input.name : existing.name;
  const normalizedName = nextName.trim().toLocaleLowerCase();
  const existingTags = await deps.tagRepo.listByProgramId(existing.programId);
  const duplicate = existingTags.find(
    (tag) => tag.id !== existing.id && tag.name.trim().toLocaleLowerCase() === normalizedName
  );
  if (duplicate) {
    return err({ type: 'DUPLICATE_NAME', message: 'A tag with this name already exists.' });
  }

  try {
    const updated = createTag({
      id: existing.id,
      programId: existing.programId,
      name: nextName,
      colorIndex: input.colorIndex !== undefined ? input.colorIndex : existing.colorIndex
    });

    await deps.tagRepo.update(updated);
    return ok(updated);
  } catch (e) {
    return err({
      type: 'VALIDATION_ERROR',
      message: e instanceof Error ? e.message : 'Unknown error updating tag'
    });
  }
}
