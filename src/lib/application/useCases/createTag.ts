import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import type { TagRepository } from '$lib/application/ports/TagRepository';
import { createTag, type Tag } from '$lib/domain/tag';
import { ok, err, type Result } from '$lib/types/result';

export interface CreateTagInput {
  programId: string;
  name: string;
  colorIndex?: number;
}

export type CreateTagError =
  | { type: 'DUPLICATE_NAME'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string };

export async function createTagUseCase(
  deps: {
    tagRepo: TagRepository;
    idGenerator: IdGenerator;
  },
  input: CreateTagInput
): Promise<Result<Tag, CreateTagError>> {
  try {
    const existingTags = await deps.tagRepo.listByProgramId(input.programId);
    const normalizedName = input.name.trim().toLocaleLowerCase();

    if (existingTags.some((tag) => tag.name.trim().toLocaleLowerCase() === normalizedName)) {
      return err({ type: 'DUPLICATE_NAME', message: 'A tag with this name already exists.' });
    }

    const tag = createTag({
      id: deps.idGenerator.generateId(),
      programId: input.programId,
      name: input.name,
      colorIndex: input.colorIndex
    });

    await deps.tagRepo.save(tag);
    return ok(tag);
  } catch (e) {
    return err({
      type: 'VALIDATION_ERROR',
      message: e instanceof Error ? e.message : 'Unknown error creating tag'
    });
  }
}
