import type { Student } from '$lib/domain';
import type {
  StudentRepository,
  StudentSearchQuery
} from '$lib/application/ports/StudentRepository';

/**
 * Simple in-memory implementation of StudentRepository.
 *
 * This is intended for:
 * - Tests
 * - Local demos
 * - A reference implementation for future persistence adapters
 */
export class InMemoryStudentRepository implements StudentRepository {
  private readonly students = new Map<string, Student>();

  constructor(initialStudents: Student[] = []) {
    for (const student of initialStudents) {
      this.students.set(student.id, { ...student });
    }
  }

  async getById(id: string): Promise<Student | null> {
    const student = this.students.get(id);
    return student ? { ...student } : null;
  }

  async getByIds(ids: string[]): Promise<Student[]> {
    const results: Student[] = [];
    for (const id of ids) {
      const student = this.students.get(id);
      if (student) {
        results.push({ ...student });
      }
    }
    return results;
  }

  async saveMany(students: Student[]): Promise<void> {
    for (const student of students) {
      this.students.set(student.id, { ...student });
    }
  }

  async listByCanonicalId(canonicalId: string): Promise<Student[]> {
    const results: Student[] = [];
    for (const student of this.students.values()) {
      // A student's effective canonical ID is canonicalId if set, otherwise its own id
      const effectiveCanonicalId = student.canonicalId ?? student.id;
      if (effectiveCanonicalId === canonicalId) {
        results.push({ ...student });
      }
    }
    return results;
  }

  async searchByName(query: StudentSearchQuery): Promise<Student[]> {
    const results: Student[] = [];
    const firstNameLower = query.firstName?.toLowerCase();
    const lastNameLower = query.lastName?.toLowerCase();

    for (const student of this.students.values()) {
      let matches = true;

      if (firstNameLower) {
        matches = matches && student.firstName.toLowerCase().includes(firstNameLower);
      }

      if (lastNameLower && student.lastName) {
        matches = matches && student.lastName.toLowerCase().includes(lastNameLower);
      } else if (lastNameLower && !student.lastName) {
        matches = false;
      }

      if (matches) {
        results.push({ ...student });
      }
    }

    return results;
  }

  async listAll(): Promise<Student[]> {
    return Array.from(this.students.values()).map((s) => ({ ...s }));
  }
}
