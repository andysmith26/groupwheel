/**
 * In-memory storage adapter implementing StoragePort.
 *
 * Used for testing and server-side rendering.
 *
 * @module infrastructure/storage/InMemoryStorageAdapter
 */

import type { StoragePort } from '$lib/application/ports/StoragePort';

export class InMemoryStorageAdapter implements StoragePort {
	private data = new Map<string, string>();

	async get(key: string): Promise<string | null> {
		return this.data.get(key) ?? null;
	}

	async set(key: string, value: string): Promise<void> {
		this.data.set(key, value);
	}

	async remove(key: string): Promise<void> {
		this.data.delete(key);
	}

	/**
	 * Clear all stored data. Useful for test cleanup.
	 */
	clear(): void {
		this.data.clear();
	}
}
