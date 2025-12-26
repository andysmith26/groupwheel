import type { GroupingAlgorithm, IdGenerator, PreferenceRepository } from '$lib/application/ports';
import type { Group } from '$lib/domain';
import {
	buildGroups,
	parseGroupingConfig,
	shuffleWithSeed,
	seededRandom
} from '$lib/infrastructure/algorithms/groupingUtils';
import { scoreGroups } from '$lib/infrastructure/algorithms/scoreGroups';

interface Genome {
	order: string[];
	score: number;
}

/**
 * Genetic algorithm grouping.
 * Evolves student orderings to maximize preference satisfaction.
 */
export class GeneticGroupingAlgorithm implements GroupingAlgorithm {
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
		const baseGroups = buildGroups(params.studentIds.length, config, this.idGenerator);
		const preferences = await this.preferenceRepo.listByProgramId(params.programId);

		const populationSize = Math.min(12, Math.max(6, Math.ceil(params.studentIds.length / 4)));
		const generations = Math.min(8, Math.max(4, Math.ceil(params.studentIds.length / 10)));

		const createGroupsFromOrder = (order: string[]): Group[] => {
			const groups = baseGroups.map((group) => ({
				...group,
				memberIds: []
			}));
			let index = 0;
			for (const studentId of order) {
				let attempts = 0;
				let assigned = false;
				while (attempts < groups.length) {
					const group = groups[index % groups.length];
					index++;
					attempts++;
					const hasCapacity = group.capacity === null || group.memberIds.length < group.capacity;
					if (hasCapacity) {
						group.memberIds.push(studentId);
						assigned = true;
						break;
					}
				}
				if (!assigned) {
					return groups;
				}
			}
			return groups;
		};

		const scoreOrder = (order: string[]): number => {
			const groups = createGroupsFromOrder(order);
			return scoreGroups({
				groups,
				preferences,
				participantIds: params.studentIds
			}).score;
		};

		const population: Genome[] = [];
		for (let i = 0; i < populationSize; i++) {
			const order = shuffleWithSeed(params.studentIds, seed + i * 13);
			population.push({ order, score: scoreOrder(order) });
		}

		const selectParent = (pool: Genome[]): Genome => {
			const candidate = pool[Math.floor(rng() * pool.length)];
			const contender = pool[Math.floor(rng() * pool.length)];
			return contender.score > candidate.score ? contender : candidate;
		};

		const crossover = (parentA: string[], parentB: string[]): string[] => {
			const size = parentA.length;
			const start = Math.floor(rng() * size);
			const end = Math.min(size, start + Math.floor(rng() * (size - start)));
			const slice = parentA.slice(start, end);
			const remaining = parentB.filter((id) => !slice.includes(id));
			return [...slice, ...remaining];
		};

		const mutate = (order: string[]): string[] => {
			if (rng() > 0.2) return order;
			const mutated = [...order];
			const i = Math.floor(rng() * mutated.length);
			const j = Math.floor(rng() * mutated.length);
			[mutated[i], mutated[j]] = [mutated[j], mutated[i]];
			return mutated;
		};

		let current = population;

		for (let generation = 0; generation < generations; generation++) {
			current.sort((a, b) => b.score - a.score);
			const elites = current.slice(0, 2);
			const next: Genome[] = [...elites];

			while (next.length < populationSize) {
				const parentA = selectParent(current.slice(0, Math.max(3, populationSize / 2)));
				const parentB = selectParent(current.slice(0, Math.max(3, populationSize / 2)));
				const childOrder = mutate(crossover(parentA.order, parentB.order));
				next.push({ order: childOrder, score: scoreOrder(childOrder) });
			}

			current = next;
		}

		current.sort((a, b) => b.score - a.score);
		const bestOrder = current[0]?.order ?? params.studentIds;
		const finalGroups = createGroupsFromOrder(bestOrder);

		return {
			success: true,
			groups: finalGroups.map((group) => ({
				id: group.id,
				name: group.name,
				capacity: group.capacity,
				memberIds: group.memberIds
			}))
		};
	}
}
