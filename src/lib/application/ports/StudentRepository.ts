import type { Student } from '$lib/domain';

/**
 * Query parameters for searching students.
 */
export interface StudentSearchQuery {
  /** First name to search for (case-insensitive) */
  firstName?: string;
  /** Last name to search for (case-insensitive) */
  lastName?: string;
}

export interface StudentRepository {
  getById(id: string): Promise<Student | null>;
  getByIds(ids: string[]): Promise<Student[]>;
  saveMany(students: Student[]): Promise<void>;

  /**
   * List all students with a given canonical ID.
   * Used to find all import instances of the same student identity.
   */
  listByCanonicalId(canonicalId: string): Promise<Student[]>;

  /**
   * Search for students matching the given name query.
   * Used for finding potential matches during import.
   */
  searchByName(query: StudentSearchQuery): Promise<Student[]>;

  /**
   * List all students.
   */
  listAll(): Promise<Student[]>;
}
