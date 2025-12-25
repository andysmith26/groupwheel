import type { Group, ScenarioSatisfaction } from '$lib/domain';
import type {
	ProgramRepository,
	PoolRepository,
	PreferenceRepository,
	IdGenerator,
	Clock,
	GroupingAlgorithm
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';
import { computeGroupsAnalytics } from '$lib/application/useCases/computeGroupsAnalytics';

/**
 * Input for generating multiple candidate groupings for a Program.
 */
export interface GenerateMultipleCandidatesInput {
	programId: string;
	algorithmConfig?: unknown;
	count?: number;
}

/**
 * Candidate grouping result (not persisted).
 */
export interface CandidateGrouping {
	id: string;
	groups: Group[];
	analytics: ScenarioSatisfaction;
	generatedAt: Date;
	algorithmId: string;
	algorithmLabel: string;
	algorithmConfig: unknown;
}

/**
 * Specific failure modes for candidate generation.
 */
export type GenerateMultipleCandidatesError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'POOL_HAS_NO_MEMBERS'; poolId: string }
	| { type: 'GROUPING_ALGORITHM_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

function sanitizeAlgorithmConfig(config?: unknown): unknown {
	return config ? JSON.parse(JSON.stringify(config)) : undefined;
}

function applySeedToConfig(config: unknown, seed: number, algorithmId: string): unknown {
	if (config && typeof config === 'object' && !Array.isArray(config)) {
		return { ...(config as Record<string, unknown>), seed, algorithm: algorithmId };
	}

	return { seed, algorithm: algorithmId };
}

/**
 * Generate multiple grouping candidates for a Program without persisting them.
 */
export async function generateMultipleCandidates(
	deps: {
		programRepo: ProgramRepository;
		poolRepo: PoolRepository;
		preferenceRepo: PreferenceRepository;
		idGenerator: IdGenerator;
		clock: Clock;
		groupingAlgorithm: GroupingAlgorithm;
	},
	input: GenerateMultipleCandidatesInput
): Promise<Result<CandidateGrouping[], GenerateMultipleCandidatesError>> {
	const program = await deps.programRepo.getById(input.programId);
	if (!program) {
		return err({
			type: 'PROGRAM_NOT_FOUND',
			programId: input.programId
		});
	}

	const primaryPoolId = program.primaryPoolId ?? program.poolIds[0];
	if (!primaryPoolId) {
		return err({
			type: 'POOL_NOT_FOUND',
			poolId: '(none configured on Program)'
		});
	}

	const pool = await deps.poolRepo.getById(primaryPoolId);
	if (!pool) {
		return err({
			type: 'POOL_NOT_FOUND',
			poolId: primaryPoolId
		});
	}
	if (!pool.memberIds.length) {
		return err({
			type: 'POOL_HAS_NO_MEMBERS',
			poolId: primaryPoolId
		});
	}

	const preferences = await deps.preferenceRepo.listByProgramId(program.id);
	const sanitizedConfig = sanitizeAlgorithmConfig(input.algorithmConfig);
	const desiredCount = Math.max(1, Math.floor(input.count ?? 5));
	const seedBase = Date.now();
	const algorithms = [
		{ id: 'balanced', label: 'Balanced' },
		{ id: 'random', label: 'Random Shuffle' },
		{ id: 'round-robin', label: 'Round Robin' },
		{ id: 'preference-first', label: 'Preference-First' }
	];

	const candidates: CandidateGrouping[] = [];

	for (let i = 0; i < desiredCount; i++) {
		const seed = seedBase + i * 9973;
		const algorithm = algorithms[i % algorithms.length];
		const candidateConfig = applySeedToConfig(sanitizedConfig, seed, algorithm.id);
		const groupingResult = await deps.groupingAlgorithm.generateGroups({
			programId: program.id,
			studentIds: pool.memberIds,
			algorithmConfig: candidateConfig
		});

		if (!groupingResult.success) {
			return err({
				type: 'GROUPING_ALGORITHM_FAILED',
				message: groupingResult.message
			});
		}

		const groups: Group[] = groupingResult.groups.map((group) => ({
			id: group.id,
			name: group.name,
			capacity: group.capacity,
			memberIds: group.memberIds
		}));

		const analytics = computeGroupsAnalytics({
			groups,
			preferences,
			participantSnapshot: pool.memberIds
		});

		candidates.push({
			id: deps.idGenerator.generateId(),
			groups,
			analytics,
			generatedAt: deps.clock.now(),
			algorithmId: algorithm.id,
			algorithmLabel: algorithm.label,
			algorithmConfig: candidateConfig
		});
	}

	return ok(candidates);
}
