/**
 * In-memory network status adapter implementing NetworkStatusPort.
 *
 * Used for testing. Allows programmatic control of online/offline state.
 *
 * @module infrastructure/network/InMemoryNetworkStatusAdapter
 */

import type { NetworkStatusPort } from '$lib/application/ports/NetworkStatusPort';

export class InMemoryNetworkStatusAdapter implements NetworkStatusPort {
	private online = true;
	private listeners = new Set<(online: boolean) => void>();

	isOnline(): boolean {
		return this.online;
	}

	onStatusChange(callback: (online: boolean) => void): () => void {
		this.listeners.add(callback);
		return () => {
			this.listeners.delete(callback);
		};
	}

	/**
	 * Set online status. Useful for testing.
	 */
	setOnline(online: boolean): void {
		if (this.online !== online) {
			this.online = online;
			this.listeners.forEach((cb) => cb(online));
		}
	}

	/**
	 * Simulate going offline.
	 */
	goOffline(): void {
		this.setOnline(false);
	}

	/**
	 * Simulate going online.
	 */
	goOnline(): void {
		this.setOnline(true);
	}
}
