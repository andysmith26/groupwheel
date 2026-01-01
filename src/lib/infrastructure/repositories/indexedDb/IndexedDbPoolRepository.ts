/**
 * IndexedDB-backed PoolRepository.
 *
 * @module infrastructure/repositories/indexedDb/IndexedDbPoolRepository
 */

import type { Pool } from '$lib/domain';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import { openDb } from './db';

const STORE_NAME = 'pools';

export class IndexedDbPoolRepository implements PoolRepository {
	async getById(id: string): Promise<Pool | null> {
		if (typeof indexedDB === 'undefined') return null;
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async save(pool: Pool): Promise<void> {
		if (typeof indexedDB === 'undefined') return;
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put(pool);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async update(pool: Pool): Promise<void> {
		return this.save(pool);
	}

	async listAll(userId?: string): Promise<Pool[]> {
		if (typeof indexedDB === 'undefined') return [];
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				let pools = request.result as Pool[];

				// Filter by userId when provided
				if (userId !== undefined) {
					pools = pools.filter((p) => p.userId === userId);
				}

				resolve(pools);
			};
		});
	}
}
