import type { TagRepository } from '$lib/application/ports/TagRepository';
import type { Tag } from '$lib/domain/tag';

function cloneTag(tag: Tag): Tag {
  return { ...tag };
}

export class InMemoryTagRepository implements TagRepository {
  private readonly tags = new Map<string, Tag>();

  constructor(initialTags: Tag[] = []) {
    for (const tag of initialTags) {
      this.tags.set(tag.id, cloneTag(tag));
    }
  }

  async listByProgramId(programId: string): Promise<Tag[]> {
    return Array.from(this.tags.values())
      .filter((tag) => tag.programId === programId)
      .map(cloneTag);
  }

  async getById(id: string): Promise<Tag | null> {
    const tag = this.tags.get(id);
    return tag ? cloneTag(tag) : null;
  }

  async save(tag: Tag): Promise<void> {
    this.tags.set(tag.id, cloneTag(tag));
  }

  async update(tag: Tag): Promise<void> {
    if (!this.tags.has(tag.id)) {
      throw new Error(`Tag with id ${tag.id} does not exist`);
    }
    this.tags.set(tag.id, cloneTag(tag));
  }

  async delete(id: string): Promise<void> {
    this.tags.delete(id);
  }
}
