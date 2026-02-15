/**
 * Hint State Store
 *
 * Manages contextual hint dismissals and user pattern tracking.
 * Persisted to localStorage so hints stay dismissed across sessions.
 *
 * Hints are identified by a hintId, and some hints can be dismissed
 * per-activity (e.g., "repeatedGrouping" hint is per-activity).
 */

const STORAGE_KEY = 'groupwheel-hints';

interface HintState {
	dismissed: {
		repeatedGrouping?: Record<string, boolean>; // activityId -> dismissed
		preferenceDetected?: boolean;
		observationPrompt?: boolean;
		analyticsHint?: boolean;
	};
	patterns: {
		hasUsedObservations?: boolean;
		hasImportedPreferences?: boolean;
	};
}

const DEFAULT_STATE: HintState = {
	dismissed: {},
	patterns: {}
};

function readStoredState(): HintState {
	if (typeof window === 'undefined') return DEFAULT_STATE;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return DEFAULT_STATE;
		const parsed = JSON.parse(stored);
		return {
			dismissed: parsed.dismissed ?? {},
			patterns: parsed.patterns ?? {}
		};
	} catch {
		return DEFAULT_STATE;
	}
}

function writeStoredState(state: HintState): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// localStorage might be full or disabled
	}
}

export class HintStateStore {
	private state = $state<HintState>(DEFAULT_STATE);

	constructor() {
		this.state = readStoredState();
	}

	/**
	 * Check if a hint has been dismissed.
	 * For per-activity hints (like repeatedGrouping), pass the activityId.
	 */
	isDismissed(hintId: string, activityId?: string): boolean {
		if (hintId === 'repeatedGrouping' && activityId) {
			return this.state.dismissed.repeatedGrouping?.[activityId] ?? false;
		}
		return (this.state.dismissed as Record<string, boolean | undefined>)[hintId] ?? false;
	}

	/**
	 * Dismiss a hint permanently.
	 * For per-activity hints, pass the activityId.
	 */
	dismiss(hintId: string, activityId?: string): void {
		if (hintId === 'repeatedGrouping' && activityId) {
			this.state = {
				...this.state,
				dismissed: {
					...this.state.dismissed,
					repeatedGrouping: {
						...this.state.dismissed.repeatedGrouping,
						[activityId]: true
					}
				}
			};
		} else {
			this.state = {
				...this.state,
				dismissed: {
					...this.state.dismissed,
					[hintId]: true
				}
			};
		}
		writeStoredState(this.state);
	}

	/**
	 * Record a user pattern (e.g., "hasUsedObservations").
	 */
	recordPattern(pattern: keyof HintState['patterns']): void {
		this.state = {
			...this.state,
			patterns: {
				...this.state.patterns,
				[pattern]: true
			}
		};
		writeStoredState(this.state);
	}

	/**
	 * Check if a user pattern has been recorded.
	 */
	hasPattern(pattern: keyof HintState['patterns']): boolean {
		return this.state.patterns[pattern] ?? false;
	}

	/**
	 * Reset all hint state (useful for testing).
	 */
	reset(): void {
		this.state = DEFAULT_STATE;
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
		}
	}
}

export const hintState = new HintStateStore();
