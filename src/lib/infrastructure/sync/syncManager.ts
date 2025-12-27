/**
 * Sync Manager.
 *
 * Orchestrates data synchronization between local storage and server.
 * Implements the SyncService port.
 *
 * @module infrastructure/sync/syncManager
 */

import type {
	SyncService,
	SyncStatus,
	SyncEntityType,
	SyncPushResult,
	SyncPullResult
} from '$lib/application/ports';
import { authStore } from '$lib/stores/authStore.svelte';
import { browser } from '$app/environment';

interface QueuedOperation {
	entityType: SyncEntityType;
	operation: 'save' | 'delete';
	entityId: string;
	timestamp: number;
}

const SYNC_QUEUE_KEY = 'groupwheel_sync_queue';

/**
 * Sync manager implementing SyncService.
 */
export class SyncManager implements SyncService {
	private enabled = false;
	private syncing = false;
	private queue: QueuedOperation[] = [];
	private lastSyncedAt: Date | null = null;
	private lastError: string | null = null;
	private listeners: Set<(status: SyncStatus) => void> = new Set();

	constructor() {
		if (browser) {
			this.loadQueue();
			this.setupOnlineListener();
		}
	}

	/**
	 * Load pending operations from localStorage.
	 */
	private loadQueue() {
		try {
			const stored = localStorage.getItem(SYNC_QUEUE_KEY);
			if (stored) {
				this.queue = JSON.parse(stored);
			}
		} catch {
			this.queue = [];
		}
	}

	/**
	 * Save queue to localStorage.
	 */
	private saveQueue() {
		if (!browser) return;
		localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
	}

	/**
	 * Setup listener for online/offline events.
	 */
	private setupOnlineListener() {
		if (!browser) return;

		window.addEventListener('online', () => {
			if (this.enabled && this.queue.length > 0) {
				this.sync();
			}
			this.notifyListeners();
		});

		window.addEventListener('offline', () => {
			this.notifyListeners();
		});
	}

	/**
	 * Notify all status listeners.
	 */
	private notifyListeners() {
		const status = this.getStatus();
		for (const listener of this.listeners) {
			listener(status);
		}
	}

	/**
	 * Push entities to the server.
	 */
	async push<T>(entityType: SyncEntityType, entities: T[]): Promise<SyncPushResult> {
		if (!this.enabled || !authStore.accessToken) {
			return {
				success: false,
				syncedCount: 0,
				failedCount: entities.length,
				errors: ['Sync not enabled or not authenticated']
			};
		}

		try {
			const response = await fetch('/api/sync', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authStore.accessToken}`
				},
				body: JSON.stringify({
					operation: 'push',
					entityType,
					entities
				})
			});

			if (!response.ok) {
				throw new Error(`Sync failed: ${response.statusText}`);
			}

			const result = await response.json();
			this.lastSyncedAt = new Date();
			this.lastError = null;
			this.notifyListeners();

			return {
				success: true,
				syncedCount: result.syncedCount ?? entities.length,
				failedCount: 0
			};
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			this.lastError = errorMessage;
			this.notifyListeners();

			return {
				success: false,
				syncedCount: 0,
				failedCount: entities.length,
				errors: [errorMessage]
			};
		}
	}

	/**
	 * Pull entities from the server.
	 */
	async pull<T>(entityType: SyncEntityType, since?: Date): Promise<SyncPullResult<T>> {
		if (!this.enabled || !authStore.accessToken) {
			return {
				success: false,
				entities: [],
				lastSyncedAt: new Date(),
				errors: ['Sync not enabled or not authenticated']
			};
		}

		try {
			const params = new URLSearchParams({
				entityType,
				...(since && { since: since.toISOString() })
			});

			const response = await fetch(`/api/sync?${params}`, {
				headers: {
					Authorization: `Bearer ${authStore.accessToken}`
				}
			});

			if (!response.ok) {
				throw new Error(`Sync failed: ${response.statusText}`);
			}

			const result = await response.json();
			this.lastSyncedAt = new Date();
			this.lastError = null;
			this.notifyListeners();

			return {
				success: true,
				entities: result.entities ?? [],
				lastSyncedAt: new Date(result.lastSyncedAt ?? Date.now())
			};
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			this.lastError = errorMessage;
			this.notifyListeners();

			return {
				success: false,
				entities: [],
				lastSyncedAt: new Date(),
				errors: [errorMessage]
			};
		}
	}

	/**
	 * Perform a full sync cycle.
	 */
	async sync(): Promise<void> {
		if (!this.enabled || this.syncing) return;

		this.syncing = true;
		this.notifyListeners();

		try {
			// Process queued operations
			const operations = [...this.queue];

			for (const op of operations) {
				// TODO: Fetch entity from local storage and push
				// For now, just clear the queue item
				const index = this.queue.findIndex(
					(q) => q.entityId === op.entityId && q.entityType === op.entityType
				);
				if (index >= 0) {
					this.queue.splice(index, 1);
				}
			}

			this.saveQueue();
			this.lastSyncedAt = new Date();
			this.lastError = null;
		} catch (err) {
			this.lastError = err instanceof Error ? err.message : 'Sync failed';
		} finally {
			this.syncing = false;
			this.notifyListeners();
		}
	}

	/**
	 * Get current sync status.
	 */
	getStatus(): SyncStatus {
		return {
			enabled: this.enabled,
			syncing: this.syncing,
			pendingChanges: this.queue.length,
			online: browser ? navigator.onLine : true,
			lastSyncedAt: this.lastSyncedAt,
			lastError: this.lastError
		};
	}

	/**
	 * Subscribe to status changes.
	 */
	onStatusChange(callback: (status: SyncStatus) => void): () => void {
		this.listeners.add(callback);
		callback(this.getStatus());
		return () => {
			this.listeners.delete(callback);
		};
	}

	/**
	 * Enable or disable sync.
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (enabled && this.queue.length > 0 && browser && navigator.onLine) {
			this.sync();
		}
		this.notifyListeners();
	}

	/**
	 * Check if sync is enabled.
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Queue an entity for sync.
	 */
	queueForSync(entityType: SyncEntityType, operation: 'save' | 'delete', entityId: string): void {
		// Remove any existing operation for this entity
		this.queue = this.queue.filter(
			(q) => !(q.entityType === entityType && q.entityId === entityId)
		);

		// Add new operation
		this.queue.push({
			entityType,
			operation,
			entityId,
			timestamp: Date.now()
		});

		this.saveQueue();
		this.notifyListeners();

		// Trigger sync if online
		if (this.enabled && browser && navigator.onLine) {
			// Debounce sync
			setTimeout(() => this.sync(), 1000);
		}
	}
}

/**
 * Singleton sync manager instance.
 */
export const syncManager = new SyncManager();
