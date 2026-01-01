/**
 * SessionStorage adapter implementing StoragePort.
 *
 * Uses browser sessionStorage for session-scoped persistence.
 * Data is cleared when the browser tab is closed.
 *
 * @module infrastructure/storage/SessionStorageAdapter
 */

import type { StoragePort } from '$lib/application/ports/StoragePort';

export class SessionStorageAdapter implements StoragePort {
	async get(key: string): Promise<string | null> {
		try {
			return sessionStorage.getItem(key);
		} catch {
			return null;
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			sessionStorage.setItem(key, value);
		} catch {
			// Ignore quota errors
		}
	}

	async remove(key: string): Promise<void> {
		try {
			sessionStorage.removeItem(key);
		} catch {
			// Ignore errors
		}
	}
}
