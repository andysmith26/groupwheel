/**
 * Sync settings store.
 *
 * Controls whether authenticated users enable server sync.
 * Persists to localStorage in the browser.
 */

const STORAGE_KEY = 'groupwheel-sync-enabled';
const DEFAULT_SYNC_ENABLED = false;

function readStoredValue(): boolean | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'true') return true;
	if (stored === 'false') return false;
	return null;
}

export class SyncSettingsStore {
	syncEnabled = $state(DEFAULT_SYNC_ENABLED);

	constructor() {
		const stored = readStoredValue();
		if (stored !== null) {
			this.syncEnabled = stored;
		}
	}

	setSyncEnabled(enabled: boolean) {
		this.syncEnabled = enabled;
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
		}
	}

	toggle() {
		this.setSyncEnabled(!this.syncEnabled);
	}
}

export const syncSettings = new SyncSettingsStore();
