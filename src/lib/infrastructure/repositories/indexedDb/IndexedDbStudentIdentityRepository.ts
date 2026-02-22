/**
 * IndexedDB-backed StudentIdentityRepository.
 *
 * @module infrastructure/repositories/indexedDb/IndexedDbStudentIdentityRepository
 */

import type { StudentIdentity } from '$lib/domain';
import type {
  StudentIdentityRepository,
  StudentIdentitySearchQuery
} from '$lib/application/ports/StudentIdentityRepository';
import { openDb } from './db';

const STORE_NAME = 'studentIdentities';

export class IndexedDbStudentIdentityRepository implements StudentIdentityRepository {
  async getById(id: string): Promise<StudentIdentity | null> {
    if (typeof indexedDB === 'undefined') return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Deserialize Date
          result.createdAt = new Date(result.createdAt);
        }
        resolve(result || null);
      };
    });
  }

  async getByIds(ids: string[]): Promise<StudentIdentity[]> {
    if (typeof indexedDB === 'undefined') return [];
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const identities: StudentIdentity[] = [];
      let completed = 0;

      if (ids.length === 0) {
        resolve([]);
        return;
      }

      ids.forEach((id) => {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            const result = request.result;
            result.createdAt = new Date(result.createdAt);
            identities.push(result);
          }
          completed++;
          if (completed === ids.length) {
            resolve(identities);
          }
        };
        request.onerror = () => {
          completed++;
          if (completed === ids.length) {
            resolve(identities);
          }
        };
      });
    });
  }

  async search(query: StudentIdentitySearchQuery): Promise<StudentIdentity[]> {
    if (typeof indexedDB === 'undefined') return [];
    const allIdentities = await this.listAll(query.userId);
    const firstNameLower = query.firstName?.toLowerCase();
    const lastNameLower = query.lastName?.toLowerCase();

    return allIdentities.filter((identity) => {
      // Check display name
      const displayNameLower = identity.displayName.toLowerCase();
      if (firstNameLower && displayNameLower.includes(firstNameLower)) {
        return true;
      }
      if (lastNameLower && displayNameLower.includes(lastNameLower)) {
        return true;
      }

      // Check known variants
      for (const variant of identity.knownVariants) {
        if (firstNameLower && variant.firstName.toLowerCase().includes(firstNameLower)) {
          return true;
        }
        if (lastNameLower && variant.lastName?.toLowerCase().includes(lastNameLower)) {
          return true;
        }
      }

      return false;
    });
  }

  async listAll(userId?: string): Promise<StudentIdentity[]> {
    if (typeof indexedDB === 'undefined') return [];
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      let request: IDBRequest;
      if (userId) {
        const index = store.index('userId');
        request = index.getAll(userId);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = (request.result || []).map((item: StudentIdentity) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }));
        resolve(results);
      };
    });
  }

  async save(identity: StudentIdentity): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Serialize Date to ISO string for storage
      const toStore = {
        ...identity,
        createdAt: identity.createdAt.toISOString()
      };
      const request = store.add(toStore);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async update(identity: StudentIdentity): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Serialize Date to ISO string for storage
      const toStore = {
        ...identity,
        createdAt: identity.createdAt.toISOString()
      };
      const request = store.put(toStore);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
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
