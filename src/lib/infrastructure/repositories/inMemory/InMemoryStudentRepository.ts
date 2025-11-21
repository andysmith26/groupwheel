import type { Student } from '$lib/domain';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';

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
}