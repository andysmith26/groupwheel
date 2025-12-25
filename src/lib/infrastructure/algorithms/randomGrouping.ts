import type { GroupingAlgorithm, IdGenerator } from '$lib/application/ports';
import type { Group } from '$lib/domain';
import {
	buildGroups,
	parseGroupingConfig,
	shuffleWithSeed,
	seededRandom,
	hasRemainingCapacity
} from '$lib/infrastructure/algorithms/groupingUtils';

/**
 * Random shuffle grouping algorithm.
 * Assigns students to random groups while respecting capacity.
 */
export class RandomGroupingAlgorithm implements GroupingAlgorithm {
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
		const rng = config.seed !== undefined ? seededRandom(config.seed) : Math.random;

		for (const studentId of order) {
			const available = groups.filter(hasRemainingCapacity);
			if (available.length === 0) {
				return { success: false, message: 'All groups are at capacity' };
			}
			const index = Math.floor(rng() * available.length);
			available[index].memberIds.push(studentId);
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
