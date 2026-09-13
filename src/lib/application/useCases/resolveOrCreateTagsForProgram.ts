import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import type { TagRepository } from '$lib/application/ports/TagRepository';
import { normalizeStudentTags } from '$lib/domain/student';
import { randomColorIndex } from '$lib/utils/tagColors';
import { isErr, ok, err, type Result } from '$lib/types/result';
import { createTagUseCase } from './createTag';

export interface ResolveOrCreateTagsForProgramInput {
  programId: string;
  rawTagNames: readonly string[] | undefined;
}

export type ResolveOrCreateTagsForProgramError = { type: 'INTERNAL_ERROR'; message: string };

export async function resolveOrCreateTagsForProgram(
  deps: {
    tagRepo: TagRepository;
    idGenerator: IdGenerator;
  },
  input: ResolveOrCreateTagsForProgramInput
): Promise<Result<string[], ResolveOrCreateTagsForProgramError>> {
  try {
    const normalizedNames = normalizeStudentTags(input.rawTagNames);
    if (normalizedNames.length === 0) {
      return ok([]);
    }

    const existingTags = await deps.tagRepo.listByProgramId(input.programId);
    const tagsByName = new Map<string, { id: string }>(
      existingTags.map((tag) => [tag.name.trim().toLocaleLowerCase(), { id: tag.id }])
    );

    const resolvedTagIds: string[] = [];
    for (const name of normalizedNames) {
      const key = name.toLocaleLowerCase();
      const existing = tagsByName.get(key);
      if (existing) {
        resolvedTagIds.push(existing.id);
        continue;
      }

      const createResult = await createTagUseCase(
        {
          tagRepo: deps.tagRepo,
          idGenerator: deps.idGenerator
        },
        {
          programId: input.programId,
          name,
          colorIndex: randomColorIndex()
        }
      );

      if (isErr(createResult)) {
        if (createResult.error.type === 'DUPLICATE_NAME') {
          const refreshedTags = await deps.tagRepo.listByProgramId(input.programId);
          const match = refreshedTags.find(
            (tag) => tag.name.trim().toLocaleLowerCase() === key
          );
          if (match) {
            tagsByName.set(key, { id: match.id });
            resolvedTagIds.push(match.id);
            continue;
          }
        }
        return err({
          type: 'INTERNAL_ERROR',
          message: createResult.error.message
        });
      }

      tagsByName.set(key, { id: createResult.value.id });
      resolvedTagIds.push(createResult.value.id);
    }

    return ok(resolvedTagIds);
  } catch (e) {
    return err({
      type: 'INTERNAL_ERROR',
      message: e instanceof Error ? e.message : 'Unknown error resolving tags'
    });
  }
}
