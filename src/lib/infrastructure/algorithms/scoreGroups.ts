import type { Group, Preference } from '$lib/domain';
import { computeScenarioSatisfaction } from '$lib/domain/analytics';

export function scoreGroups(params: {
	groups: Group[];
	preferences: Preference[];
	participantIds: string[];
}): { score: number } {
	const scenario = {
		id: 'transient',
		programId: 'transient',
		groups: params.groups,
		participantSnapshot: params.participantIds,
		status: 'DRAFT' as const,
		createdAt: new Date()
	};

	const satisfaction = computeScenarioSatisfaction({
		scenario,
		preferences: params.preferences,
		students: []
	});

	const avgRank = Number.isNaN(satisfaction.averagePreferenceRankAssigned)
		? 10
		: satisfaction.averagePreferenceRankAssigned;
	const topChoice = satisfaction.percentAssignedTopChoice;
	const top2 = satisfaction.percentAssignedTop2 ?? 0;

	const score = topChoice * 2 + top2 - avgRank * 10;
	return { score };
}
