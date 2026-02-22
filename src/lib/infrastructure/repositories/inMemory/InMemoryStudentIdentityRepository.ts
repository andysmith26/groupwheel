/**
 * In-memory implementation of StudentIdentityRepository.
 *
 * This is intended for:
 * - Tests
 * - Local demos
 * - A reference implementation for future persistence adapters
 *
 * @module infrastructure/repositories/inMemory/InMemoryStudentIdentityRepository
 */

import type { StudentIdentity } from '$lib/domain';
import type {
  StudentIdentityRepository,
  StudentIdentitySearchQuery
} from '$lib/application/ports/StudentIdentityRepository';

export class InMemoryStudentIdentityRepository implements StudentIdentityRepository {
  private readonly identities = new Map<string, StudentIdentity>();

  constructor(initialIdentities: StudentIdentity[] = []) {
    for (const identity of initialIdentities) {
      this.identities.set(identity.id, { ...identity });
    }
  }

  async getById(id: string): Promise<StudentIdentity | null> {
    const identity = this.identities.get(id);
    return identity ? { ...identity } : null;
  }

  async getByIds(ids: string[]): Promise<StudentIdentity[]> {
    const results: StudentIdentity[] = [];
    for (const id of ids) {
      const identity = this.identities.get(id);
      if (identity) {
        results.push({ ...identity });
      }
    }
    return results;
  }

  async search(query: StudentIdentitySearchQuery): Promise<StudentIdentity[]> {
    const results: StudentIdentity[] = [];
    const firstNameLower = query.firstName?.toLowerCase();
    const lastNameLower = query.lastName?.toLowerCase();

    for (const identity of this.identities.values()) {
      // Filter by userId if provided
      if (query.userId && identity.userId !== query.userId) {
        continue;
      }

      let matches = false;

      // Check display name
      const displayNameLower = identity.displayName.toLowerCase();
      if (firstNameLower && displayNameLower.includes(firstNameLower)) {
        matches = true;
      }
      if (lastNameLower && displayNameLower.includes(lastNameLower)) {
        matches = true;
      }

      // Check known variants
      if (!matches) {
        for (const variant of identity.knownVariants) {
          if (firstNameLower && variant.firstName.toLowerCase().includes(firstNameLower)) {
            matches = true;
            break;
          }
          if (lastNameLower && variant.lastName?.toLowerCase().includes(lastNameLower)) {
            matches = true;
            break;
          }
        }
      }

      if (matches) {
        results.push({ ...identity });
      }
    }

    return results;
  }

  async listAll(userId?: string): Promise<StudentIdentity[]> {
    const results: StudentIdentity[] = [];
    for (const identity of this.identities.values()) {
      if (userId && identity.userId !== userId) {
        continue;
      }
      results.push({ ...identity });
    }
    return results;
  }

  async save(identity: StudentIdentity): Promise<void> {
    this.identities.set(identity.id, { ...identity });
  }

  async update(identity: StudentIdentity): Promise<void> {
    this.identities.set(identity.id, { ...identity });
  }

  async delete(id: string): Promise<void> {
    this.identities.delete(id);
  }
}
