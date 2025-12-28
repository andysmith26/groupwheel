/**
 * IndexedDB-backed ProgramRepository for cross-session persistence.
 *
 * Persists programs (activities) to IndexedDB.
 *
 * @module infrastructure/repositories/indexedDb/IndexedDbProgramRepository
 */

import type { Program, ProgramTimeSpan } from '$lib/domain';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';
import { openDb } from './db';

const STORE_NAME = 'programs';

/**
 * Serialize a Program for storage in IndexedDB.
 * Converts Date objects in timeSpan to ISO strings.
 */
function serialize(program: Program): object {
	const serializedTimeSpan =
		'start' in program.timeSpan
			? { start: program.timeSpan.start.toISOString(), end: program.timeSpan.end.toISOString() }
			: program.timeSpan;

	return {
		...program,
		timeSpan: serializedTimeSpan
	};
}

/**
 * Deserialize a Program from IndexedDB storage.
 * Converts ISO string dates back to Date objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(data: any): Program {
	let timeSpan: ProgramTimeSpan;
	if (data.timeSpan && 'start' in data.timeSpan) {
		timeSpan = {
			start: new Date(data.timeSpan.start),
			end: new Date(data.timeSpan.end)
		};
	} else {
		timeSpan = data.timeSpan;
	}

	return {
		...data,
		timeSpan
	};
}

export class IndexedDbProgramRepository implements ProgramRepository {
	async getById(id: string): Promise<Program | null> {
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

	async save(program: Program): Promise<void> {
		if (typeof indexedDB === 'undefined') return;

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(serialize(program));

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async update(program: Program): Promise<void> {
		return this.save(program);
	}

	async listAll(): Promise<Program[]> {
		if (typeof indexedDB === 'undefined') return [];

		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const data = request.result as any[];
				resolve(data.map(deserialize));
			};
		});
	}
}
