/**
 * Synced Student Repository.
 *
 * Wraps a local StudentRepository and adds sync capability.
 * All operations work locally first, then queue for server sync.
 */

import type { StudentRepository } from '$lib/application/ports';
import type { SyncService } from '$lib/application/ports';
import type { Student } from '$lib/domain';

export class SyncedStudentRepository implements StudentRepository {
	constructor(
		private readonly local: StudentRepository,
		private readonly sync: SyncService
	) {}

	async getById(id: string): Promise<Student | null> {
		return this.local.getById(id);
	}

	async getByIds(ids: string[]): Promise<Student[]> {
		return this.local.getByIds(ids);
	}

	async saveMany(students: Student[]): Promise<void> {
		await this.local.saveMany(students);

		if (this.sync.isEnabled()) {
			for (const student of students) {
				await this.sync.queueForSync('students', 'save', student.id);
			}
		}
	}
}
