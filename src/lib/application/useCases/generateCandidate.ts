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
import { getAlgorithmLabel } from '$lib/application/algorithmCatalog';

/**
 * Input for generating a single candidate grouping for a Program.
 */
export interface GenerateCandidateInput {
	programId: string;
	algorithmId: string;
	algorithmConfig?: unknown;
	seed?: number;
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
export type GenerateCandidateError =
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
 * Generate a single grouping candidate for a Program without persisting it.
 */
export async function generateCandidate(
	deps: {
		programRepo: ProgramRepository;
		poolRepo: PoolRepository;
		preferenceRepo: PreferenceRepository;
		idGenerator: IdGenerator;
		clock: Clock;
		groupingAlgorithm: GroupingAlgorithm;
	},
	input: GenerateCandidateInput
): Promise<Result<CandidateGrouping, GenerateCandidateError>> {
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
	const seed = input.seed ?? Date.now();
	const candidateConfig = applySeedToConfig(sanitizedConfig, seed, input.algorithmId);

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

	return ok({
		id: deps.idGenerator.generateId(),
		groups,
		analytics,
		generatedAt: deps.clock.now(),
		algorithmId: input.algorithmId,
		algorithmLabel: getAlgorithmLabel(input.algorithmId),
		algorithmConfig: candidateConfig
	});
}
