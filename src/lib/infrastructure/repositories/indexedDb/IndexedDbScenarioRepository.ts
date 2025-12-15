import type { Scenario } from '$lib/domain';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';
import { browser } from '$app/environment';
import { openDb } from './db';

const STORE_NAME = 'scenarios';

/**
 * Serialize a Scenario for storage in IndexedDB.
 * Converts Date objects to ISO strings for storage.
 */
function serializeScenario(scenario: Scenario): object {
	const serializable = {
		...scenario,
		createdAt: scenario.createdAt.toISOString(),
		// Ensure algorithmConfig is cloneable; fall back to null if not
		algorithmConfig: sanitizeConfig(scenario.algorithmConfig)
	};

	// Ensure the whole payload is structured-cloneable for IndexedDB
	try {
		// structuredClone available in modern browsers
		return structuredClone(serializable);
	} catch (error) {
		console.warn('Structured clone failed for scenario; falling back to JSON clone', {
			scenarioId: scenario.id,
			error
		});
		try {
			return JSON.parse(JSON.stringify(serializable));
		} catch (jsonError) {
			console.error('Failed to serialize scenario for IndexedDB', {
				scenarioId: scenario.id,
				error: jsonError
			});
			// Last resort: drop algorithmConfig to maximize chance of persistence
			return {
				...serializable,
				algorithmConfig: null
			};
		}
	}
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
 * Attempts to make an arbitrary config value safe for structured cloning / IndexedDB.
 */
function sanitizeConfig(config: unknown): unknown {
	if (config === undefined) return undefined;

	try {
		return structuredClone(config);
	} catch {
		// Ignore and try JSON clone
	}

	try {
		return JSON.parse(JSON.stringify(config));
	} catch (error) {
		console.warn('Dropping non-serializable algorithmConfig', { error });
		return null;
	}
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
