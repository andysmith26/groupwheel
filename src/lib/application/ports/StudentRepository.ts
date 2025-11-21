import type { Student } from '$lib/domain';

export interface StudentRepository {
	getById(id: string): Promise<Student | null>;
	getByIds(ids: string[]): Promise<Student[]>;
	saveMany(students: Student[]): Promise<void>;
}