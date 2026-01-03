/**
 * Synced Session Repository.
 *
 * Wraps a local SessionRepository and adds sync capability.
 */

import type { SessionRepository, SyncService } from '$lib/application/ports';
import type { Session } from '$lib/domain';

export class SyncedSessionRepository implements SessionRepository {
	constructor(
		private readonly local: SessionRepository,
		private readonly sync: SyncService
	) {}

	async getById(id: string): Promise<Session | null> {
		return this.local.getById(id);
	}

	async listByProgramId(programId: string): Promise<Session[]> {
		return this.local.listByProgramId(programId);
	}

	async listByAcademicYear(academicYear: string): Promise<Session[]> {
		return this.local.listByAcademicYear(academicYear);
	}

	async listAll(userId?: string): Promise<Session[]> {
		return this.local.listAll(userId);
	}

	async save(session: Session): Promise<void> {
		await this.local.save(session);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('sessions', 'save', session.id);
		}
	}

	async update(session: Session): Promise<void> {
		await this.local.update(session);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('sessions', 'save', session.id);
		}
	}

	async delete(id: string): Promise<void> {
		await this.local.delete(id);

		if (this.sync.isEnabled()) {
			await this.sync.queueForSync('sessions', 'delete', id);
		}
	}
}
