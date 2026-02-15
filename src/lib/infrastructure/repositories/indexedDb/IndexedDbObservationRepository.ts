import type { Observation } from '$lib/domain';
import type { ObservationRepository } from '$lib/application/ports/ObservationRepository';
import { openDb } from './db';

const STORE_NAME = 'observations';

/**
 * Serialize an Observation for storage in IndexedDB.
 * Converts Date objects to ISO strings for storage.
 */
function serializeObservation(observation: Observation): object {
	return {
		...observation,
		createdAt: observation.createdAt.toISOString()
	};
}

/**
 * Deserialize an Observation from IndexedDB storage.
 * Converts ISO string dates back to Date objects.
 */
function deserializeObservation(data: Record<string, unknown>): Observation {
	return {
		...(data as unknown as Observation),
		createdAt: new Date(data.createdAt as string)
	};
}

/**
 * IndexedDB-backed ObservationRepository for cross-session persistence.
 */
export class IndexedDbObservationRepository implements ObservationRepository {
	async getById(id: string): Promise<Observation | null> {
		if (typeof indexedDB === 'undefined') return null;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result;
				resolve(data ? deserializeObservation(data) : null);
			};
		});
	}

	async listByProgramId(programId: string): Promise<Observation[]> {
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
				resolve(data.map(deserializeObservation));
			};
		});
	}

	async listBySessionId(sessionId: string): Promise<Observation[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('sessionId');
			const request = index.getAll(sessionId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result || [];
				resolve(data.map(deserializeObservation));
			};
		});
	}

	async listByGroupId(groupId: string): Promise<Observation[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('groupId');
			const request = index.getAll(groupId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result || [];
				resolve(data.map(deserializeObservation));
			};
		});
	}

	async save(observation: Observation): Promise<void> {
		if (typeof indexedDB === 'undefined') return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(serializeObservation(observation));

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

	async deleteBySessionId(sessionId: string): Promise<void> {
		if (typeof indexedDB === 'undefined') return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('sessionId');
			const request = index.getAllKeys(sessionId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const keys = request.result || [];
				if (keys.length === 0) {
					resolve();
					return;
				}

				let completed = 0;
				let hasError = false;

				for (const key of keys) {
					const deleteRequest = store.delete(key);
					deleteRequest.onerror = () => {
						if (!hasError) {
							hasError = true;
							reject(deleteRequest.error);
						}
					};
					deleteRequest.onsuccess = () => {
						completed++;
						if (completed === keys.length && !hasError) {
							resolve();
						}
					};
				}
			};
		});
	}

	async listAll(userId?: string): Promise<Observation[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				let data = (request.result || []).map(deserializeObservation);
				if (userId) {
					data = data.filter((o) => o.userId === userId);
				}
				resolve(data);
			};
		});
	}
}
