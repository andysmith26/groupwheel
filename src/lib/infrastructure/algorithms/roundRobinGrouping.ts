import type { GroupingAlgorithm, IdGenerator } from '$lib/application/ports';
import type { Group } from '$lib/domain';
import {
	buildGroups,
	parseGroupingConfig,
	shuffleWithSeed,
	hasRemainingCapacity
} from '$lib/infrastructure/algorithms/groupingUtils';

/**
 * Round-robin grouping algorithm.
 * Distributes students evenly across groups in a cycling order.
 */
export class RoundRobinGroupingAlgorithm implements GroupingAlgorithm {
	constructor(private idGenerator: IdGenerator) {}

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

		let index = 0;
		for (const studentId of order) {
			let attempts = 0;
			let assigned = false;
			while (attempts < groups.length) {
				const group = groups[index % groups.length];
				index++;
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
			groups: groups.map((group: Group) => ({
				id: group.id,
				name: group.name,
				capacity: group.capacity,
				memberIds: group.memberIds
			}))
		};
	}
}
