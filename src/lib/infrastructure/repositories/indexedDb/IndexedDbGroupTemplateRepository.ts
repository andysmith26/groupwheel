/**
 * IndexedDB-backed GroupTemplateRepository for cross-session persistence.
 *
 * Persists group templates to IndexedDB, allowing teachers to create
 * reusable group sets that survive browser sessions.
 *
 * @module infrastructure/repositories/indexedDb/IndexedDbGroupTemplateRepository
 */

import type { GroupTemplate } from '$lib/domain';
import type { GroupTemplateRepository } from '$lib/application/ports/GroupTemplateRepository';
import { openDb } from './db';

const STORE_NAME = 'groupTemplates';

/**
 * Serialize a GroupTemplate for storage in IndexedDB.
 * Converts Date objects to ISO strings.
 */
function serialize(template: GroupTemplate): object {
	return {
		...template,
		createdAt: template.createdAt.toISOString(),
		updatedAt: template.updatedAt.toISOString()
	};
}

/**
 * Deserialize a GroupTemplate from IndexedDB storage.
 * Converts ISO string dates back to Date objects.
 */
function deserialize(data: Record<string, unknown>): GroupTemplate {
	return {
		...(data as unknown as GroupTemplate),
		createdAt: new Date(data.createdAt as string),
		updatedAt: new Date(data.updatedAt as string)
	};
}

export class IndexedDbGroupTemplateRepository implements GroupTemplateRepository {
	async getById(id: string): Promise<GroupTemplate | null> {
		if (typeof indexedDB === 'undefined') return null;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result;
				resolve(data ? deserialize(data) : null);
			};
		});
	}

	async listByOwnerId(staffId: string): Promise<GroupTemplate[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('ownerStaffId');
			const request = index.getAll(staffId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const results = (request.result || []).map(deserialize);
				// Sort by most recently updated
				results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
				resolve(results);
			};
		});
	}

	async listAll(userId?: string): Promise<GroupTemplate[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				let results = (request.result || []).map(deserialize);

				// Filter by userId when provided
				if (userId !== undefined) {
					results = results.filter((t) => t.userId === userId);
				}

				// Sort by most recently updated
				results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
				resolve(results);
			};
		});
	}

	async save(template: GroupTemplate): Promise<void> {
		if (typeof indexedDB === 'undefined') return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(serialize(template));

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async update(template: GroupTemplate): Promise<void> {
		// In IndexedDB, put() handles both insert and update
		return this.save(template);
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
