import type { GroupingAlgorithm, IdGenerator, PreferenceRepository } from '$lib/application/ports';
import type { Group } from '$lib/domain';
import {
	buildGroups,
	parseGroupingConfig,
	shuffleWithSeed,
	seededRandom
} from '$lib/infrastructure/algorithms/groupingUtils';
import { scoreGroups } from '$lib/infrastructure/algorithms/scoreGroups';

/**
 * Simulated annealing grouping algorithm.
 * Iteratively swaps students between groups to improve preference satisfaction.
 */
export class SimulatedAnnealingGroupingAlgorithm implements GroupingAlgorithm {
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
		const seed = config.seed ?? Date.now();
		const rng = seededRandom(seed);
		const groups = buildGroups(params.studentIds.length, config, this.idGenerator);
		const order = shuffleWithSeed(params.studentIds, seed);

		let groupIndex = 0;
		for (const studentId of order) {
			let attempts = 0;
			let assigned = false;
			while (attempts < groups.length) {
				const group = groups[groupIndex % groups.length];
				groupIndex++;
				attempts++;
				const hasCapacity = group.capacity === null || group.memberIds.length < group.capacity;
				if (hasCapacity) {
					group.memberIds.push(studentId);
					assigned = true;
					break;
				}
			}
			if (!assigned) {
				return { success: false, message: 'All groups are at capacity' };
			}
		}

		const preferences = await this.preferenceRepo.listByProgramId(params.programId);
		const studentIds = [...params.studentIds];
		const studentToGroup = new Map<string, Group>();
		for (const group of groups) {
			for (const member of group.memberIds) {
				studentToGroup.set(member, group);
			}
		}

		const maxIterations = Math.min(400, studentIds.length * 12);
		let temperature = 1.0;
		const coolingRate = 0.95;

		let { score: currentScore } = scoreGroups({
			groups,
			preferences,
			participantIds: params.studentIds
		});
		let bestScore = currentScore;
		let bestGroups = groups.map((group) => ({
			...group,
			memberIds: [...group.memberIds]
		}));

		for (let i = 0; i < maxIterations; i++) {
			const aIndex = Math.floor(rng() * studentIds.length);
			let bIndex = Math.floor(rng() * studentIds.length);
			if (bIndex === aIndex) {
				bIndex = (bIndex + 1) % studentIds.length;
			}

			const studentA = studentIds[aIndex];
			const studentB = studentIds[bIndex];
			const groupA = studentToGroup.get(studentA);
			const groupB = studentToGroup.get(studentB);
			if (!groupA || !groupB || groupA === groupB) {
				temperature *= coolingRate;
				continue;
			}

			const indexA = groupA.memberIds.indexOf(studentA);
			const indexB = groupB.memberIds.indexOf(studentB);
			if (indexA < 0 || indexB < 0) {
				temperature *= coolingRate;
				continue;
			}

			groupA.memberIds[indexA] = studentB;
			groupB.memberIds[indexB] = studentA;
			studentToGroup.set(studentA, groupB);
			studentToGroup.set(studentB, groupA);

			const { score: candidateScore } = scoreGroups({
				groups,
				preferences,
				participantIds: params.studentIds
			});

			const delta = candidateScore - currentScore;
			if (delta > 0 || Math.exp(delta / temperature) > rng()) {
				currentScore = candidateScore;
				if (candidateScore > bestScore) {
					bestScore = candidateScore;
					bestGroups = groups.map((group) => ({
						...group,
						memberIds: [...group.memberIds]
					}));
				}
			} else {
				groupA.memberIds[indexA] = studentA;
				groupB.memberIds[indexB] = studentB;
				studentToGroup.set(studentA, groupA);
				studentToGroup.set(studentB, groupB);
			}

			temperature *= coolingRate;
			if (temperature < 0.01) {
				temperature = 0.01;
			}
		}

		return {
			success: true,
			groups: bestGroups.map((group) => ({
				id: group.id,
				name: group.name,
				capacity: group.capacity,
				memberIds: group.memberIds
			}))
		};
	}
}
