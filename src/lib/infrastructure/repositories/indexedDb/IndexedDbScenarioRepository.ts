import type { Scenario } from '$lib/domain';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';
import { browser } from '$app/environment';

const DB_NAME = 'turntable';
const DB_VERSION = 1;
const STORE_NAME = 'scenarios';

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
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('programId', 'programId', { unique: true });
			}
		};
	});
}

/**
 * Serialize a Scenario for storage in IndexedDB.
 * Converts Date objects to ISO strings for storage.
 */
function serializeScenario(scenario: Scenario): object {
	return {
		...scenario,
		createdAt: scenario.createdAt.toISOString()
	};
}

/**
 * Deserialize a Scenario from IndexedDB storage.
 * Converts ISO string dates back to Date objects.
 */
function deserializeScenario(data: Record<string, unknown>): Scenario {
	return {
		...(data as unknown as Scenario),
		createdAt: new Date(data.createdAt as string)
	};
}

/**
 * IndexedDB-backed ScenarioRepository for cross-session persistence.
 *
 * This repository persists scenarios to IndexedDB, allowing manual edits
 * to survive browser sessions. It mirrors the interface of InMemoryScenarioRepository.
 *
 * Note: IndexedDB is only available in the browser. Server-side rendering
 * should use InMemoryScenarioRepository as a fallback.
 */
export class IndexedDbScenarioRepository implements ScenarioRepository {
	async getById(id: string): Promise<Scenario | null> {
		if (!browser) return null;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result;
				resolve(data ? deserializeScenario(data) : null);
			};
		});
	}

	async getByProgramId(programId: string): Promise<Scenario | null> {
		if (!browser) return null;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const index = store.index('programId');
			const request = index.get(programId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const data = request.result;
				resolve(data ? deserializeScenario(data) : null);
			};
		});
	}

	async save(scenario: Scenario): Promise<void> {
		if (!browser) return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(serializeScenario(scenario));

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async update(scenario: Scenario): Promise<void> {
		// In IndexedDB, put() handles both insert and update
		return this.save(scenario);
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
