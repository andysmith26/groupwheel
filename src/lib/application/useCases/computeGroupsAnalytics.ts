import type { Group, Preference, ScenarioSatisfaction } from '$lib/domain';
import { computeScenarioSatisfaction } from '$lib/domain/analytics';

/**
 * Input for computing analytics from in-memory groups.
 */
export interface ComputeGroupsAnalyticsInput {
	groups: Group[];
	preferences: Preference[];
	participantSnapshot: string[];
}

/**
 * Compute satisfaction metrics from in-memory groups.
 *
 * Unlike computeScenarioAnalytics (which fetches from repo),
 * this accepts groups directly for real-time UI updates during editing.
 * This allows the UI to recalculate metrics as the teacher drags
 * students between groups without persisting intermediate states.
 */
export function computeGroupsAnalytics(input: ComputeGroupsAnalyticsInput): ScenarioSatisfaction {
	// Build a pseudo-scenario object for the existing analytics function
	const pseudoScenario = {
		id: 'transient',
		programId: 'transient',
		groups: input.groups,
		participantSnapshot: input.participantSnapshot,
		status: 'DRAFT' as const,
		createdAt: new Date()
	};

	return computeScenarioSatisfaction({
		scenario: pseudoScenario,
		preferences: input.preferences,
		students: [] // Not used by current implementation
	});
}
