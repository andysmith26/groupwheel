/**
 * Network status port for online/offline detection.
 *
 * Abstracts browser navigator.onLine and network events.
 * Enables testing without browser APIs.
 *
 * @module application/ports/NetworkStatusPort
 */

export interface NetworkStatusPort {
	/**
	 * Check if currently online.
	 */
	isOnline(): boolean;

	/**
	 * Subscribe to online/offline status changes.
	 * @param callback Called when status changes (true = online, false = offline)
	 * @returns Unsubscribe function
	 */
	onStatusChange(callback: (online: boolean) => void): () => void;
}
