/**
 * LocalStorage adapter implementing StoragePort.
 *
 * Uses browser localStorage for persistence.
 *
 * @module infrastructure/storage/LocalStorageAdapter
 */

import type { StoragePort } from '$lib/application/ports/StoragePort';

export class LocalStorageAdapter implements StoragePort {
	async get(key: string): Promise<string | null> {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	}

	async set(key: string, value: string): Promise<void> {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Ignore quota errors
		}
	}

	async remove(key: string): Promise<void> {
		try {
			localStorage.removeItem(key);
		} catch {
			// Ignore errors
		}
	}
}
