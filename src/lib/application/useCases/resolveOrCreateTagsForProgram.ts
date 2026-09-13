import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import type { TagRepository } from '$lib/application/ports/TagRepository';
import { normalizeStudentTags } from '$lib/domain/student';
import { createTag } from '$lib/domain/tag';
import { randomColorIndex } from '$lib/utils/tagColors';
import { ok, err, type Result } from '$lib/types/result';

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

      const tag = createTag({
        id: deps.idGenerator.generateId(),
        programId: input.programId,
        name,
        colorIndex: randomColorIndex()
      });
      await deps.tagRepo.save(tag);
      tagsByName.set(key, { id: tag.id });
      resolvedTagIds.push(tag.id);
    }

    return ok(resolvedTagIds);
  } catch (e) {
    return err({
      type: 'INTERNAL_ERROR',
      message: e instanceof Error ? e.message : 'Unknown error resolving tags'
    });
  }
}
