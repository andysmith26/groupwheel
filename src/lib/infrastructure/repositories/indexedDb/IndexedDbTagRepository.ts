import type { TagRepository } from '$lib/application/ports/TagRepository';
import type { Tag } from '$lib/domain/tag';
import { openDb } from './db';

const STORE_NAME = 'tags';

export class IndexedDbTagRepository implements TagRepository {
  async listByProgramId(programId: string): Promise<Tag[]> {
    if (typeof indexedDB === 'undefined') return [];

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('programId');
      const request = index.getAll(programId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result as Tag[]) ?? []);
    });
  }

  async getById(id: string): Promise<Tag | null> {
    if (typeof indexedDB === 'undefined') return null;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result as Tag | undefined) ?? null);
    });
  }

  async save(tag: Tag): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(tag);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async update(tag: Tag): Promise<void> {
    await this.save(tag);
  }

  async delete(id: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
