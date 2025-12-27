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
	SyncPullResult,
	StoragePort,
	NetworkStatusPort
} from '$lib/application/ports';

interface QueuedOperation {
	entityType: SyncEntityType;
	operation: 'save' | 'delete';
	entityId: string;
	timestamp: number;
}

const SYNC_QUEUE_KEY = 'groupwheel_sync_queue';

export interface SyncManagerDeps {
	storage: StoragePort;
	networkStatus: NetworkStatusPort;
	getAccessToken: () => string | null;
}

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
	private unsubscribeNetworkStatus: (() => void) | null = null;

	private readonly storage: StoragePort;
	private readonly networkStatus: NetworkStatusPort;
	private readonly getAccessToken: () => string | null;

	constructor(deps: SyncManagerDeps) {
		this.storage = deps.storage;
		this.networkStatus = deps.networkStatus;
		this.getAccessToken = deps.getAccessToken;
	}

	/**
	 * Initialize the sync manager.
	 * Call this after construction to load queue and setup listeners.
	 */
	async initialize(): Promise<void> {
		await this.loadQueue();
		this.setupOnlineListener();
	}

	/**
	 * Cleanup resources.
	 */
	dispose(): void {
		if (this.unsubscribeNetworkStatus) {
			this.unsubscribeNetworkStatus();
			this.unsubscribeNetworkStatus = null;
		}
		this.listeners.clear();
	}

	/**
	 * Load pending operations from storage.
	 */
	private async loadQueue(): Promise<void> {
		try {
			const stored = await this.storage.get(SYNC_QUEUE_KEY);
			if (stored) {
				this.queue = JSON.parse(stored);
			}
		} catch {
			this.queue = [];
		}
	}

	/**
	 * Save queue to storage.
	 */
	private async saveQueue(): Promise<void> {
		await this.storage.set(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
	}

	/**
	 * Setup listener for online/offline events.
	 */
	private setupOnlineListener(): void {
		this.unsubscribeNetworkStatus = this.networkStatus.onStatusChange((online) => {
			if (online && this.enabled && this.queue.length > 0) {
				this.sync();
			}
			this.notifyListeners();
		});
	}

	/**
	 * Notify all status listeners.
	 */
	private notifyListeners(): void {
		const status = this.getStatus();
		for (const listener of this.listeners) {
			listener(status);
		}
	}

	/**
	 * Push entities to the server.
	 */
	async push<T>(entityType: SyncEntityType, entities: T[]): Promise<SyncPushResult> {
		const accessToken = this.getAccessToken();
		if (!this.enabled || !accessToken) {
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
					Authorization: `Bearer ${accessToken}`
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
		const accessToken = this.getAccessToken();
		if (!this.enabled || !accessToken) {
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
					Authorization: `Bearer ${accessToken}`
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

			await this.saveQueue();
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
			online: this.networkStatus.isOnline(),
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
		if (enabled && this.queue.length > 0 && this.networkStatus.isOnline()) {
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
	async queueForSync(
		entityType: SyncEntityType,
		operation: 'save' | 'delete',
		entityId: string
	): Promise<void> {
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

		await this.saveQueue();
		this.notifyListeners();

		// Trigger sync if online
		if (this.enabled && this.networkStatus.isOnline()) {
			// Debounce sync
			setTimeout(() => this.sync(), 1000);
		}
	}
}
