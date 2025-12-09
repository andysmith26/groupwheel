import type { Preference, StudentPreference } from '$lib/domain';
import { extractStudentPreference } from '$lib/domain/preference';

/**
 * Convert Preference entities into a lookup keyed by studentId.
 * Falls back to empty preferences when payloads are malformed.
 */
export function buildPreferenceMap(preferences: Preference[]): Record<string, StudentPreference> {
	const map: Record<string, StudentPreference> = {};

	for (const pref of preferences) {
		map[pref.studentId] = extractStudentPreference(pref);
	}

	return map;
}
