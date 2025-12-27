/**
 * Browser network status adapter implementing NetworkStatusPort.
 *
 * Uses browser navigator.onLine and network events.
 *
 * @module infrastructure/network/BrowserNetworkStatusAdapter
 */

import type { NetworkStatusPort } from '$lib/application/ports/NetworkStatusPort';

export class BrowserNetworkStatusAdapter implements NetworkStatusPort {
	isOnline(): boolean {
		if (typeof navigator === 'undefined') {
			return true; // SSR fallback
		}
		return navigator.onLine;
	}

	onStatusChange(callback: (online: boolean) => void): () => void {
		if (typeof window === 'undefined') {
			return () => {}; // SSR fallback
		}

		const handleOnline = () => callback(true);
		const handleOffline = () => callback(false);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}
}
