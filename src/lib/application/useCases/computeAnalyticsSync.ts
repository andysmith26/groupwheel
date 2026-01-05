import { computeScenarioSatisfaction } from '$lib/domain/analytics';
import type { Group, Preference, Scenario, ScenarioSatisfaction } from '$lib/domain';

/**
 * Synchronous analytics computation that avoids repository lookups.
 *
 * Used by the editing experience to recompute satisfaction metrics directly
 * from the in-memory scenario state.
 */
export function computeAnalyticsSync(params: {
	groups: Group[];
	preferences: Preference[];
	participantSnapshot: string[];
	programId?: string;
}): ScenarioSatisfaction {
	const scenario: Scenario = {
		id: 'scenario-analytics-snapshot',
		programId: params.programId ?? 'unknown-program',
		status: 'DRAFT',
		groups: params.groups.map((group) => ({
			...group,
			memberIds: [...group.memberIds]
		})),
		participantSnapshot: [...params.participantSnapshot],
		createdAt: new Date(0),
		lastModifiedAt: new Date(0)
	};

	return computeScenarioSatisfaction({
		scenario,
		preferences: params.preferences,
		students: []
	});
}
