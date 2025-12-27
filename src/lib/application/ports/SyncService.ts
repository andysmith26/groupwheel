/**
 * Sync service port.
 *
 * Defines how the application layer interacts with server synchronization.
 * Implemented by sync adapters in the infrastructure layer.
 *
 * @module application/ports/SyncService
 */

/**
 * Entity types that can be synced.
 */
export type SyncEntityType =
	| 'students'
	| 'staff'
	| 'pools'
	| 'programs'
	| 'scenarios'
	| 'preferences'
	| 'groupTemplates';

/**
 * Result of a sync push operation.
 */
export interface SyncPushResult {
	success: boolean;
	syncedCount: number;
	failedCount: number;
	errors?: string[];
}

/**
 * Result of a sync pull operation.
 */
export interface SyncPullResult<T> {
	success: boolean;
	entities: T[];
	lastSyncedAt: Date;
	errors?: string[];
}

/**
 * Current sync status.
 */
export interface SyncStatus {
	/**
	 * Whether sync is currently enabled (user is authenticated).
	 */
	enabled: boolean;

	/**
	 * Whether a sync operation is in progress.
	 */
	syncing: boolean;

	/**
	 * Number of pending changes waiting to be synced.
	 */
	pendingChanges: number;

	/**
	 * Whether the device is currently online.
	 */
	online: boolean;

	/**
	 * Timestamp of the last successful sync, or null if never synced.
	 */
	lastSyncedAt: Date | null;

	/**
	 * Last sync error message, or null if no error.
	 */
	lastError: string | null;
}

/**
 * Sync service interface.
 *
 * Provides methods for syncing data to/from the server.
 * Sync is only enabled when a user is authenticated.
 */
export interface SyncService {
	/**
	 * Push local changes to the server.
	 * @param entityType Type of entities to push
	 * @param entities Entities to sync
	 */
	push<T>(entityType: SyncEntityType, entities: T[]): Promise<SyncPushResult>;

	/**
	 * Pull changes from the server.
	 * @param entityType Type of entities to pull
	 * @param since Only fetch changes since this timestamp (incremental sync)
	 */
	pull<T>(entityType: SyncEntityType, since?: Date): Promise<SyncPullResult<T>>;

	/**
	 * Perform a full sync (push pending changes, then pull updates).
	 */
	sync(): Promise<void>;

	/**
	 * Get current sync status.
	 */
	getStatus(): SyncStatus;

	/**
	 * Subscribe to sync status changes.
	 * @param callback Called when sync status changes
	 * @returns Unsubscribe function
	 */
	onStatusChange(callback: (status: SyncStatus) => void): () => void;

	/**
	 * Enable or disable sync (tied to authentication state).
	 */
	setEnabled(enabled: boolean): void;

	/**
	 * Check if sync is currently enabled.
	 */
	isEnabled(): boolean;

	/**
	 * Queue an entity for sync (used by synced repositories).
	 * Queued items are synced on next sync() call or when online.
	 */
	queueForSync(
		entityType: SyncEntityType,
		operation: 'save' | 'delete',
		entityId: string
	): Promise<void>;
}
