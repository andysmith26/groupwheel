/**
 * Google Sheets Sync Manager.
 *
 * Orchestrates data synchronization between local storage and a Google Sheet.
 * Implements the SyncService port, using a Google Sheet as the sync target.
 *
 * Each entity type is stored in a separate tab within the spreadsheet.
 * Entities are serialized as JSON in a single column for simplicity.
 *
 * @module infrastructure/sync/googleSheetsSyncManager
 */

import type {
	SyncService,
	SyncStatus,
	SyncEntityType,
	SyncPushResult,
	SyncPullResult,
	StoragePort,
	NetworkStatusPort,
	GoogleSheetsService
} from '$lib/application/ports';

interface QueuedOperation {
	entityType: SyncEntityType;
	operation: 'save' | 'delete';
	entityId: string;
	timestamp: number;
}

const SYNC_QUEUE_KEY = 'groupwheel_sheets_sync_queue';
const SHEETS_CONFIG_KEY = 'groupwheel_sheets_sync_config';

/**
 * Configuration for Google Sheets sync.
 */
export interface GoogleSheetsSyncConfig {
	/** The spreadsheet ID to sync with */
	spreadsheetId: string;
	/** Human-readable name of the spreadsheet */
	spreadsheetName?: string;
	/** Last successful sync timestamp */
	lastSyncedAt?: string;
}

/**
 * Tab names for each entity type.
 */
const ENTITY_TAB_NAMES: Record<SyncEntityType, string> = {
	students: '_gw_students',
	staff: '_gw_staff',
	pools: '_gw_pools',
	programs: '_gw_programs',
	scenarios: '_gw_scenarios',
	sessions: '_gw_sessions',
	placements: '_gw_placements',
	preferences: '_gw_preferences',
	groupTemplates: '_gw_groupTemplates'
};

export interface GoogleSheetsSyncManagerDeps {
	storage: StoragePort;
	networkStatus: NetworkStatusPort;
	sheetsService: GoogleSheetsService;
	getAccessToken: () => Promise<string | null>;
}

/**
 * Google Sheets sync manager implementing SyncService.
 *
 * Uses a Google Sheet as the sync backend instead of a server.
 * Data is stored as JSON in each tab.
 */
export class GoogleSheetsSyncManager implements SyncService {
	private enabled = false;
	private syncing = false;
	private queue: QueuedOperation[] = [];
	private lastSyncedAt: Date | null = null;
	private lastError: string | null = null;
	private listeners: Set<(status: SyncStatus) => void> = new Set();
	private unsubscribeNetworkStatus: (() => void) | null = null;

	private config: GoogleSheetsSyncConfig | null = null;

	private readonly storage: StoragePort;
	private readonly networkStatus: NetworkStatusPort;
	private readonly sheetsService: GoogleSheetsService;
	private readonly getAccessToken: () => Promise<string | null>;

	constructor(deps: GoogleSheetsSyncManagerDeps) {
		this.storage = deps.storage;
		this.networkStatus = deps.networkStatus;
		this.sheetsService = deps.sheetsService;
		this.getAccessToken = deps.getAccessToken;
	}

	/**
	 * Initialize the sync manager.
	 * Call this after construction to load config, queue, and setup listeners.
	 */
	async initialize(): Promise<void> {
		await this.loadConfig();
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
	 * Configure which spreadsheet to sync with.
	 */
	async configure(config: GoogleSheetsSyncConfig): Promise<void> {
		this.config = config;
		await this.storage.set(SHEETS_CONFIG_KEY, JSON.stringify(config));
		this.notifyListeners();
	}

	/**
	 * Get the current sync configuration.
	 */
	getConfig(): GoogleSheetsSyncConfig | null {
		return this.config;
	}

	/**
	 * Clear sync configuration (disconnect from spreadsheet).
	 */
	async clearConfig(): Promise<void> {
		this.config = null;
		await this.storage.remove(SHEETS_CONFIG_KEY);
		this.setEnabled(false);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// SyncService implementation
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Push entities to the Google Sheet.
	 */
	async push<T>(entityType: SyncEntityType, entities: T[]): Promise<SyncPushResult> {
		if (!this.enabled || !this.config) {
			return {
				success: false,
				syncedCount: 0,
				failedCount: entities.length,
				errors: ['Sync not enabled or not configured']
			};
		}

		const token = await this.getAccessToken();
		if (!token) {
			return {
				success: false,
				syncedCount: 0,
				failedCount: entities.length,
				errors: ['Not authenticated']
			};
		}

		try {
			const tabName = ENTITY_TAB_NAMES[entityType];

			// Ensure the tab exists
			await this.sheetsService.ensureTab(this.config.spreadsheetId, tabName);

			// Serialize entities to rows
			// Format: header row with ['id', 'data'], then data rows with [id, JSON]
			const rows: string[][] = [['id', 'data', 'updatedAt']];

			for (const entity of entities) {
				const entityObj = entity as { id?: string };
				const id = entityObj.id ?? 'unknown';
				rows.push([id, JSON.stringify(entity), new Date().toISOString()]);
			}

			// Write to sheet
			await this.sheetsService.updateTabData(this.config.spreadsheetId, tabName, { rows });

			this.lastSyncedAt = new Date();
			this.lastError = null;
			this.notifyListeners();

			return {
				success: true,
				syncedCount: entities.length,
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
	 * Pull entities from the Google Sheet.
	 */
	async pull<T>(entityType: SyncEntityType, _since?: Date): Promise<SyncPullResult<T>> {
		if (!this.enabled || !this.config) {
			return {
				success: false,
				entities: [],
				lastSyncedAt: new Date(),
				errors: ['Sync not enabled or not configured']
			};
		}

		const token = await this.getAccessToken();
		if (!token) {
			return {
				success: false,
				entities: [],
				lastSyncedAt: new Date(),
				errors: ['Not authenticated']
			};
		}

		try {
			const tabName = ENTITY_TAB_NAMES[entityType];

			// Try to get tab data
			let rawData;
			try {
				rawData = await this.sheetsService.getTabData(this.config.spreadsheetId, tabName);
			} catch (err) {
				// Tab might not exist yet
				const error = err as { type?: string };
				if (error.type === 'NOT_FOUND') {
					return {
						success: true,
						entities: [],
						lastSyncedAt: new Date()
					};
				}
				throw err;
			}

			// Parse entities from rows
			// Skip header row, parse JSON from 'data' column
			const entities: T[] = [];
			const dataColumnIndex = rawData.headers.indexOf('data');

			if (dataColumnIndex >= 0) {
				for (const row of rawData.rows) {
					const jsonData = row.cells[dataColumnIndex];
					if (jsonData) {
						try {
							entities.push(JSON.parse(jsonData) as T);
						} catch {
							// Skip malformed rows
						}
					}
				}
			}

			this.lastSyncedAt = new Date();
			this.lastError = null;
			this.notifyListeners();

			return {
				success: true,
				entities,
				lastSyncedAt: new Date()
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
	 *
	 * Note: For Sheets sync, we don't do automatic full sync.
	 * Use push/pull explicitly for the entity types you need.
	 */
	async sync(): Promise<void> {
		if (!this.enabled || this.syncing || !this.config) return;

		this.syncing = true;
		this.notifyListeners();

		try {
			// Clear the queue - in Sheets sync, we rely on manual push/pull
			// The queue is mainly for tracking that there are pending changes
			this.queue = [];
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
		this.enabled = enabled && this.config !== null;
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
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Private helpers
	// ─────────────────────────────────────────────────────────────────────────

	private async loadConfig(): Promise<void> {
		try {
			const stored = await this.storage.get(SHEETS_CONFIG_KEY);
			if (stored) {
				this.config = JSON.parse(stored);
				if (this.config?.lastSyncedAt) {
					this.lastSyncedAt = new Date(this.config.lastSyncedAt);
				}
			}
		} catch {
			this.config = null;
		}
	}

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

	private async saveQueue(): Promise<void> {
		await this.storage.set(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
	}

	private setupOnlineListener(): void {
		this.unsubscribeNetworkStatus = this.networkStatus.onStatusChange(() => {
			this.notifyListeners();
		});
	}

	private notifyListeners(): void {
		const status = this.getStatus();
		for (const listener of this.listeners) {
			listener(status);
		}
	}
}
