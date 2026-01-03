import type { Placement } from '$lib/domain';
import type { PlacementRepository } from '$lib/application/ports/PlacementRepository';
import { openDb } from './db';

const STORE_NAME = 'placements';

/**
 * Serialize a Placement for storage in IndexedDB.
 * Converts Date objects to ISO strings for storage.
 */
function serializePlacement(placement: Placement): object {
	return {
		...placement,
		assignedAt: placement.assignedAt.toISOString(),
		startDate: placement.startDate.toISOString(),
		endDate: placement.endDate?.toISOString()
	};
}

/**
 * Deserialize a Placement from IndexedDB storage.
 * Converts ISO string dates back to Date objects.
 */
function deserializePlacement(data: Record<string, unknown>): Placement {
	return {
		...(data as unknown as Placement),
		assignedAt: new Date(data.assignedAt as string),
		startDate: new Date(data.startDate as string),
		endDate: data.endDate ? new Date(data.endDate as string) : undefined
	};
}

/**
 * IndexedDB-backed PlacementRepository for cross-session persistence.
 */
export class IndexedDbPlacementRepository implements PlacementRepository {
	async getById(id: string): Promise<Placement | null> {
		if (typeof indexedDB === 'undefined') return null;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result;
				resolve(data ? deserializePlacement(data) : null);
			};
		});
	}

	async listBySessionId(sessionId: string): Promise<Placement[]> {
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
				resolve(data.map(deserializePlacement));
			};
		});
	}

	async listByStudentId(studentId: string): Promise<Placement[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('studentId');
			const request = index.getAll(studentId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result || [];
				resolve(data.map(deserializePlacement));
			};
		});
	}

	async save(placement: Placement): Promise<void> {
		if (typeof indexedDB === 'undefined') return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(serializePlacement(placement));

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async saveBatch(placements: Placement[]): Promise<void> {
		if (typeof indexedDB === 'undefined') return;
		if (placements.length === 0) return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);

			let completed = 0;
			let hasError = false;

			for (const placement of placements) {
				const request = store.put(serializePlacement(placement));
				request.onerror = () => {
					if (!hasError) {
						hasError = true;
						reject(request.error);
					}
				};
				request.onsuccess = () => {
					completed++;
					if (completed === placements.length && !hasError) {
						resolve();
					}
				};
			}
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
}
