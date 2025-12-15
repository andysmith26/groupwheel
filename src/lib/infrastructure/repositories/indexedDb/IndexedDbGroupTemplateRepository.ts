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
import { browser } from '$app/environment';

const DB_NAME = 'groupwheel';
const DB_VERSION = 2; // Bumped to add groupTemplates store
const STORE_NAME = 'groupTemplates';

/**
 * Open the IndexedDB database, creating object stores if needed.
 */
function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!browser) {
			reject(new Error('IndexedDB not available on server'));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create scenarios store if it doesn't exist (from v1)
			if (!db.objectStoreNames.contains('scenarios')) {
				const scenarioStore = db.createObjectStore('scenarios', { keyPath: 'id' });
				scenarioStore.createIndex('programId', 'programId', { unique: true });
			}

			// Create groupTemplates store (v2)
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('ownerStaffId', 'ownerStaffId', { unique: false });
			}
		};
	});
}

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
		if (!browser) return null;

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
		if (!browser) return [];

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

	async listAll(): Promise<GroupTemplate[]> {
		if (!browser) return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const results = (request.result || []).map(deserialize);
				// Sort by most recently updated
				results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
				resolve(results);
			};
		});
	}

	async save(template: GroupTemplate): Promise<void> {
		if (!browser) return;

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
		if (!browser) return;

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
