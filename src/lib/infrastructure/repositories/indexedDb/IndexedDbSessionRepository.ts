import type { Session } from '$lib/domain';
import type { SessionRepository } from '$lib/application/ports/SessionRepository';
import { openDb } from './db';

const STORE_NAME = 'sessions';

/**
 * Serialize a Session for storage in IndexedDB.
 * Converts Date objects to ISO strings for storage.
 */
function serializeSession(session: Session): object {
	return {
		...session,
		startDate: session.startDate.toISOString(),
		endDate: session.endDate.toISOString(),
		createdAt: session.createdAt.toISOString(),
		publishedAt: session.publishedAt?.toISOString()
	};
}

/**
 * Deserialize a Session from IndexedDB storage.
 * Converts ISO string dates back to Date objects.
 */
function deserializeSession(data: Record<string, unknown>): Session {
	return {
		...(data as unknown as Session),
		startDate: new Date(data.startDate as string),
		endDate: new Date(data.endDate as string),
		createdAt: new Date(data.createdAt as string),
		publishedAt: data.publishedAt ? new Date(data.publishedAt as string) : undefined
	};
}

/**
 * IndexedDB-backed SessionRepository for cross-session persistence.
 */
export class IndexedDbSessionRepository implements SessionRepository {
	async getById(id: string): Promise<Session | null> {
		if (typeof indexedDB === 'undefined') return null;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result;
				resolve(data ? deserializeSession(data) : null);
			};
		});
	}

	async listByProgramId(programId: string): Promise<Session[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('programId');
			const request = index.getAll(programId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result || [];
				resolve(data.map(deserializeSession));
			};
		});
	}

	async listByAcademicYear(academicYear: string): Promise<Session[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('academicYear');
			const request = index.getAll(academicYear);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result || [];
				resolve(data.map(deserializeSession));
			};
		});
	}

	async listAll(userId?: string): Promise<Session[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result || [];
				const sessions = data.map(deserializeSession);
				if (userId === undefined) {
					resolve(sessions);
				} else {
					resolve(sessions.filter((s) => s.userId === userId));
				}
			};
		});
	}

	async save(session: Session): Promise<void> {
		if (typeof indexedDB === 'undefined') return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(serializeSession(session));

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async update(session: Session): Promise<void> {
		return this.save(session);
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
