import type { Group } from './group';

export type ScenarioStatus = 'DRAFT' | 'ADOPTED' | 'ARCHIVED';

/**
 * MVP Scenario model — matches docs/domain_model.md.
 */
export interface Scenario {
	id: string;
	programId: string;
	status: ScenarioStatus;
	groups: Group[];
	participantSnapshot: string[];
	createdAt: Date;
	/** When the scenario was last modified (groups changed, etc.) */
	lastModifiedAt: Date;
	createdByStaffId?: string;
	algorithmConfig?: unknown;
	// parentScenarioId?: string; // Planned (not used in MVP)
}

/**
 * Construct a Scenario with an immutable participant snapshot.
 * Throws if group membership is inconsistent with participantIds.
 */
export function createScenario(params: {
	id: string;
	programId: string;
	groups: Group[];
	participantIds: string[];
	createdAt: Date;
	createdByStaffId?: string;
	algorithmConfig?: unknown;
}): Scenario {
	const participantSnapshot = Array.from(new Set(params.participantIds));

	const participantSet = new Set(participantSnapshot);
	for (const group of params.groups) {
		for (const memberId of group.memberIds) {
			if (!participantSet.has(memberId)) {
				throw new Error(
					`Group member ${memberId} is not in participant snapshot for program ${params.programId}`
				);
			}
		}
	}

	return {
		id: params.id,
		programId: params.programId,
		status: 'DRAFT',
		groups: params.groups.map((g) => ({
			...g,
			memberIds: [...g.memberIds]
		})),
		participantSnapshot,
		createdAt: params.createdAt,
		lastModifiedAt: params.createdAt, // Initialize to createdAt
		createdByStaffId: params.createdByStaffId,
		algorithmConfig: params.algorithmConfig
	};
}
