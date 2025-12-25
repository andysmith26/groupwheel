import type { GroupingAlgorithm, IdGenerator, PreferenceRepository } from '$lib/application/ports';
import type { Group, Preference } from '$lib/domain';
import {
	buildGroups,
	parseGroupingConfig,
	shuffleWithSeed,
	hasRemainingCapacity
} from '$lib/infrastructure/algorithms/groupingUtils';

function extractGroupChoices(pref: Preference): string[] {
	if (!pref.payload || typeof pref.payload !== 'object') {
		return [];
	}

	const payload = pref.payload as Record<string, unknown>;
	if (Array.isArray(payload.likeGroupIds)) {
		return payload.likeGroupIds.filter((id): id is string => typeof id === 'string');
	}

	return [];
}

/**
 * Preference-first grouping algorithm.
 * Assigns students to their highest-ranked available group, then fills remaining.
 */
export class PreferenceFirstGroupingAlgorithm implements GroupingAlgorithm {
	constructor(
		private preferenceRepo: PreferenceRepository,
		private idGenerator: IdGenerator
	) {}

	async generateGroups(params: {
		programId: string;
		studentIds: string[];
		algorithmConfig?: unknown;
	}): Promise<
		| {
				success: true;
				groups: { id: string; name: string; capacity: number | null; memberIds: string[] }[];
		  }
		| { success: false; message: string }
	> {
		if (!params.studentIds || params.studentIds.length === 0) {
			return { success: false, message: 'No students provided for grouping' };
		}

		const config = parseGroupingConfig(params.algorithmConfig);
		const groups = buildGroups(params.studentIds.length, config, this.idGenerator);
		const order = config.seed !== undefined
			? shuffleWithSeed(params.studentIds, config.seed)
			: [...params.studentIds];

		const preferences = await this.preferenceRepo.listByProgramId(params.programId);
		const preferenceMap = new Map<string, string[]>();
		for (const pref of preferences) {
			preferenceMap.set(pref.studentId, extractGroupChoices(pref));
		}

		const groupNameToId = new Map<string, string>();
		const groupById = new Map<string, Group>();
		for (const group of groups) {
			groupById.set(group.id, group);
			groupNameToId.set(group.name.toLowerCase(), group.id);
		}

		const remaining: string[] = [];

		for (const studentId of order) {
			const choices = preferenceMap.get(studentId) ?? [];
			let assigned = false;

			for (const choice of choices) {
				const groupId = groupById.has(choice)
					? choice
					: groupNameToId.get(choice.toLowerCase());
				if (!groupId) continue;
				const group = groupById.get(groupId);
				if (group && hasRemainingCapacity(group)) {
					group.memberIds.push(studentId);
					assigned = true;
					break;
				}
			}

			if (!assigned) {
				remaining.push(studentId);
			}
		}

		let roundRobinIndex = 0;
		for (const studentId of remaining) {
			let attempts = 0;
			let assigned = false;
			while (attempts < groups.length) {
				const group = groups[roundRobinIndex % groups.length];
				roundRobinIndex++;
				attempts++;
				if (hasRemainingCapacity(group)) {
					group.memberIds.push(studentId);
					assigned = true;
					break;
				}
			}

			if (!assigned) {
				return { success: false, message: 'All groups are at capacity' };
			}
		}

		return {
			success: true,
			groups: groups.map((group) => ({
				id: group.id,
				name: group.name,
				capacity: group.capacity,
				memberIds: group.memberIds
			}))
		};
	}
}
