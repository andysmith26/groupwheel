import type { Scenario, Student } from '$lib/domain';
import { browser } from '$app/environment';

const SCENARIO_STORAGE_KEY = 'friend-hat-scenarios';

interface StoredScenario {
	scenario: Scenario;
	students: Student[];
}

/**
 * Store a scenario and its associated students in localStorage for cross-tab access.
 */
export function storeScenarioForProjection(scenario: Scenario, students: Student[]): void {
	if (!browser) return;

	try {
		const existing = getStoredScenarios();
		existing[scenario.id] = { scenario, students };
		localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(existing));
	} catch (e) {
		console.warn('Failed to store scenario in localStorage:', e);
	}
}

/**
 * Retrieve a stored scenario and its students by ID.
 */
export function getStoredScenario(scenarioId: string): StoredScenario | null {
	if (!browser) return null;

	try {
		const stored = getStoredScenarios();
		return stored[scenarioId] ?? null;
	} catch (e) {
		console.warn('Failed to retrieve scenario from localStorage:', e);
		return null;
	}
}

function getStoredScenarios(): Record<string, StoredScenario> {
	try {
		const raw = localStorage.getItem(SCENARIO_STORAGE_KEY);
		if (!raw) return {};
		return JSON.parse(raw);
	} catch {
		return {};
	}
}
