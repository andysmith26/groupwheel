/**
 * In-Memory Google Sheets Sync Manager.
 *
 * Test implementation of GoogleSheetsSyncManager.
 * Simulates sync behavior without requiring actual Google Sheets access.
 *
 * @module infrastructure/sync/InMemoryGoogleSheetsSyncManager
 */

import type {
	SyncService,
	SyncStatus,
	SyncEntityType,
	SyncPushResult,
	SyncPullResult
} from '$lib/application/ports';
import type { GoogleSheetsSyncConfig } from './googleSheetsSyncManager';

/**
 * In-memory implementation of GoogleSheetsSyncManager for testing.
 */
export class InMemoryGoogleSheetsSyncManager implements SyncService {
	private enabled = false;
	private syncing = false;
	private lastSyncedAt: Date | null = null;
	private lastError: string | null = null;
	private listeners: Set<(status: SyncStatus) => void> = new Set();
	private config: GoogleSheetsSyncConfig | null = null;

	/** Stored entities by type - for testing assertions */
	private data = new Map<SyncEntityType, unknown[]>();

	/** Queue of pending operations - for testing assertions */
	private queue: Array<{ entityType: SyncEntityType; operation: 'save' | 'delete'; entityId: string }> = [];

	// ─────────────────────────────────────────────────────────────────────────
	// Test helpers
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Get stored entities for a type (for test assertions).
	 */
	getStoredEntities<T>(entityType: SyncEntityType): T[] {
		return (this.data.get(entityType) as T[]) ?? [];
	}

	/**
	 * Set stored entities for a type (for test setup).
	 */
	setStoredEntities<T>(entityType: SyncEntityType, entities: T[]): void {
		this.data.set(entityType, entities);
	}

	/**
	 * Get the pending queue (for test assertions).
	 */
	getQueue() {
		return [...this.queue];
	}

	/**
	 * Clear all stored data.
	 */
	clear(): void {
		this.data.clear();
		this.queue = [];
		this.config = null;
		this.enabled = false;
		this.lastSyncedAt = null;
		this.lastError = null;
	}

	/**
	 * Simulate a sync error.
	 */
	simulateError(message: string): void {
		this.lastError = message;
		this.notifyListeners();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// GoogleSheetsSyncManager-specific methods
	// ─────────────────────────────────────────────────────────────────────────

	async configure(config: GoogleSheetsSyncConfig): Promise<void> {
		this.config = config;
		this.notifyListeners();
	}

	getConfig(): GoogleSheetsSyncConfig | null {
		return this.config;
	}

	async clearConfig(): Promise<void> {
		this.config = null;
		this.enabled = false;
		this.notifyListeners();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// SyncService implementation
	// ─────────────────────────────────────────────────────────────────────────

	async push<T>(entityType: SyncEntityType, entities: T[]): Promise<SyncPushResult> {
		if (!this.enabled || !this.config) {
			return {
				success: false,
				syncedCount: 0,
				failedCount: entities.length,
				errors: ['Sync not enabled or not configured']
			};
		}

		// Store entities
		this.data.set(entityType, entities);
		this.lastSyncedAt = new Date();
		this.lastError = null;
		this.notifyListeners();

		return {
			success: true,
			syncedCount: entities.length,
			failedCount: 0
		};
	}

	async pull<T>(entityType: SyncEntityType): Promise<SyncPullResult<T>> {
		if (!this.enabled || !this.config) {
			return {
				success: false,
				entities: [],
				lastSyncedAt: new Date(),
				errors: ['Sync not enabled or not configured']
			};
		}

		const entities = (this.data.get(entityType) as T[]) ?? [];
		this.lastSyncedAt = new Date();
		this.lastError = null;
		this.notifyListeners();

		return {
			success: true,
			entities,
			lastSyncedAt: new Date()
		};
	}

	async sync(): Promise<void> {
		if (!this.enabled || this.syncing || !this.config) return;

		this.syncing = true;
		this.notifyListeners();

		// Simulate sync delay
		await new Promise((resolve) => setTimeout(resolve, 10));

		this.queue = [];
		this.lastSyncedAt = new Date();
		this.lastError = null;
		this.syncing = false;
		this.notifyListeners();
	}

	getStatus(): SyncStatus {
		return {
			enabled: this.enabled,
			syncing: this.syncing,
			pendingChanges: this.queue.length,
			online: true,
			lastSyncedAt: this.lastSyncedAt,
			lastError: this.lastError
		};
	}

	onStatusChange(callback: (status: SyncStatus) => void): () => void {
		this.listeners.add(callback);
		callback(this.getStatus());
		return () => {
			this.listeners.delete(callback);
		};
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled && this.config !== null;
		this.notifyListeners();
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	async queueForSync(
		entityType: SyncEntityType,
		operation: 'save' | 'delete',
		entityId: string
	): Promise<void> {
		this.queue = this.queue.filter(
			(q) => !(q.entityType === entityType && q.entityId === entityId)
		);
		this.queue.push({ entityType, operation, entityId });
		this.notifyListeners();
	}

	private notifyListeners(): void {
		const status = this.getStatus();
		for (const listener of this.listeners) {
			listener(status);
		}
	}
}
