/**
 * Shared IndexedDB connection and schema management.
 *
 * Centralizes the database versioning and object store creation to ensure
 * consistency across all repositories.
 *
 * @module infrastructure/repositories/indexedDb/db
 */

export const DB_NAME = 'groupwheel';
export const DB_VERSION = 4; // Bumped to 4 to ensure all stores are created if v3 was partial

/**
 * Open the IndexedDB database, creating object stores if needed.
 * This function is shared by all repositories to ensure schema consistency.
 */
export function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB not available in this environment'));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// 1. Scenarios (v1)
			if (!db.objectStoreNames.contains('scenarios')) {
				const scenarioStore = db.createObjectStore('scenarios', { keyPath: 'id' });
				scenarioStore.createIndex('programId', 'programId', { unique: true });
			}

			// 2. Group Templates (v2)
			if (!db.objectStoreNames.contains('groupTemplates')) {
				const templateStore = db.createObjectStore('groupTemplates', { keyPath: 'id' });
				templateStore.createIndex('ownerStaffId', 'ownerStaffId', { unique: false });
			}

			// 3. Programs (v3)
			if (!db.objectStoreNames.contains('programs')) {
				db.createObjectStore('programs', { keyPath: 'id' });
			}

			// 4. Pools (v3)
			if (!db.objectStoreNames.contains('pools')) {
				db.createObjectStore('pools', { keyPath: 'id' });
			}

			// 5. Students (v3)
			if (!db.objectStoreNames.contains('students')) {
				db.createObjectStore('students', { keyPath: 'id' });
			}

			// 6. Staff (v3)
			if (!db.objectStoreNames.contains('staff')) {
				db.createObjectStore('staff', { keyPath: 'id' });
			}

			// 7. Preferences (v3)
			if (!db.objectStoreNames.contains('preferences')) {
				const prefStore = db.createObjectStore('preferences', { keyPath: 'id' });
				prefStore.createIndex('programId', 'programId', { unique: false });
			}
		};
	});
}
