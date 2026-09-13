import type { Tag } from '$lib/domain/tag';

export interface TagRepository {
  listByProgramId(programId: string): Promise<Tag[]>;
  getById(id: string): Promise<Tag | null>;
  save(tag: Tag): Promise<void>;
  update(tag: Tag): Promise<void>;
  delete(id: string): Promise<void>;
}
