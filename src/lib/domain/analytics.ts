import type { Scenario } from './scenario';
import type { Preference } from './preference';
import type { Student } from './student';

export interface ScenarioSatisfaction {
	/**
	 * Percentage of students assigned to their first choice (0–100).
	 */
	percentAssignedTopChoice: number;

	/**
	 * Mean numeric rank of assigned choice (lower is better).
	 * If there are no usable preferences, this may be NaN or a sentinel.
	 */
	averagePreferenceRankAssigned: number;

	/**
	 * Optional: percentage assigned to one of their top 2 choices (0–100).
	 */
	percentAssignedTop2?: number;
}

/**
 * Placeholder contract for MVP analytics.
 *
 * We declare the signature now so use cases and UI can depend on it,
 * but will implement the actual logic when we refactor the statistics panel.
 */
export function computeScenarioSatisfaction(params: {
	scenario: Scenario;
	preferences: Preference[];
	students: Student[];
}): ScenarioSatisfaction {
	// TODO: implement analytics logic based on Preference payload structure
	// For now, return a neutral stub so callers can compile and tests can be written.
	return {
		percentAssignedTopChoice: 0,
		averagePreferenceRankAssigned: NaN
	};
}