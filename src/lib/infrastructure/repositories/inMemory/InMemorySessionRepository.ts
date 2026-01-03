import type { Session } from '$lib/domain';
import type { SessionRepository } from '$lib/application/ports/SessionRepository';

/**
 * In-memory SessionRepository for tests and SSR fallback.
 */
export class InMemorySessionRepository implements SessionRepository {
	private readonly sessions = new Map<string, Session>();

	constructor(initialSessions: Session[] = []) {
		for (const session of initialSessions) {
			this.sessions.set(session.id, this.cloneSession(session));
		}
	}

	async getById(id: string): Promise<Session | null> {
		const session = this.sessions.get(id);
		return session ? this.cloneSession(session) : null;
	}

	async listByProgramId(programId: string): Promise<Session[]> {
		const results: Session[] = [];
		for (const session of this.sessions.values()) {
			if (session.programId === programId) {
				results.push(this.cloneSession(session));
			}
		}
		return results;
	}

	async listByAcademicYear(academicYear: string): Promise<Session[]> {
		const results: Session[] = [];
		for (const session of this.sessions.values()) {
			if (session.academicYear === academicYear) {
				results.push(this.cloneSession(session));
			}
		}
		return results;
	}

	async listAll(userId?: string): Promise<Session[]> {
		const results: Session[] = [];
		for (const session of this.sessions.values()) {
			if (userId === undefined || session.userId === userId) {
				results.push(this.cloneSession(session));
			}
		}
		return results;
	}

	async save(session: Session): Promise<void> {
		this.sessions.set(session.id, this.cloneSession(session));
	}

	async update(session: Session): Promise<void> {
		if (!this.sessions.has(session.id)) {
			throw new Error(`Session with id ${session.id} does not exist`);
		}
		this.sessions.set(session.id, this.cloneSession(session));
	}

	async delete(id: string): Promise<void> {
		this.sessions.delete(id);
	}

	private cloneSession(session: Session): Session {
		return {
			...session,
			startDate: new Date(session.startDate),
			endDate: new Date(session.endDate),
			createdAt: new Date(session.createdAt),
			publishedAt: session.publishedAt ? new Date(session.publishedAt) : undefined
		};
	}
}
