import type { Group } from '$lib/domain';
import type { ScenarioSatisfaction } from '$lib/domain/analytics';
import type {
	ProgramRepository,
	PoolRepository,
	PreferenceRepository,
	IdGenerator,
	Clock,
	GroupingAlgorithm
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, isErr, ok } from '$lib/types/result';
import { generateCandidate, type GenerateCandidateError } from './generateCandidate';

/**
 * Input for generating a comparison scenario.
 */
export interface GenerateComparisonInput {
	programId: string;
	groupSize?: number;
	groupNamePrefix?: string;
	groups?: Array<{ name: string; capacity: number | null }>;
	avoidRecentGroupmates?: boolean;
	lookbackSessions?: number;
}

/**
 * A comparison candidate — generated in-memory, never persisted.
 */
export interface ComparisonCandidate {
	groups: Group[];
	analytics: ScenarioSatisfaction;
	participantSnapshot: string[];
	algorithmConfig: unknown;
}

export type GenerateComparisonError = GenerateCandidateError;

type GenerateComparisonDeps = {
	programRepo: ProgramRepository;
	poolRepo: PoolRepository;
	preferenceRepo: PreferenceRepository;
	idGenerator: IdGenerator;
	clock: Clock;
	groupingAlgorithm: GroupingAlgorithm;
};

/**
 * Generate a comparison scenario without persisting it.
 *
 * Uses the same algorithm and constraints as quickGenerateGroups but does NOT
 * save the result to any repository. The comparison candidate lives in memory
 * only — if selected, the caller persists it via editingStore.regenerate().
 */
export async function generateComparisonScenario(
	deps: GenerateComparisonDeps,
	input: GenerateComparisonInput
): Promise<Result<ComparisonCandidate, GenerateComparisonError>> {
	const {
		programId,
		groupSize = 4,
		groupNamePrefix = 'Group',
		avoidRecentGroupmates = false,
		lookbackSessions
	} = input;

	// Load program to determine pool size for group count calculation
	const program = await deps.programRepo.getById(programId);
	if (!program) {
		return err({ type: 'PROGRAM_NOT_FOUND', programId });
	}

	const primaryPoolId = program.primaryPoolId ?? program.poolIds[0];
	if (!primaryPoolId) {
		return err({ type: 'POOL_NOT_FOUND', poolId: '(none configured on Program)' });
	}

	const pool = await deps.poolRepo.getById(primaryPoolId);
	if (!pool) {
		return err({ type: 'POOL_NOT_FOUND', poolId: primaryPoolId });
	}
	if (!pool.memberIds.length) {
		return err({ type: 'POOL_HAS_NO_MEMBERS', poolId: primaryPoolId });
	}

	// Build group definitions from explicit shells or group size
	const groups =
		input.groups && input.groups.length > 0
			? input.groups
			: (() => {
					const studentCount = pool.memberIds.length;
					const groupCount = Math.ceil(studentCount / groupSize);
					return Array.from({ length: groupCount }, (_, i) => ({
						name: `${groupNamePrefix} ${i + 1}`,
						capacity: null as number | null
					}));
				})();

	// Generate candidate via balanced algorithm (NOT persisted)
	const candidateResult = await generateCandidate(
		{
			programRepo: deps.programRepo,
			poolRepo: deps.poolRepo,
			preferenceRepo: deps.preferenceRepo,
			idGenerator: deps.idGenerator,
			clock: deps.clock,
			groupingAlgorithm: deps.groupingAlgorithm
		},
		{
			programId,
			algorithmId: 'balanced',
			algorithmConfig: {
				groups,
				avoidRecentGroupmates,
				lookbackSessions: lookbackSessions ?? 3
			},
			seed: Date.now()
		}
	);

	if (isErr(candidateResult)) {
		return candidateResult;
	}

	const candidate = candidateResult.value;

	return ok({
		groups: candidate.groups,
		analytics: candidate.analytics,
		participantSnapshot: pool.memberIds,
		algorithmConfig: candidate.algorithmConfig
	});
}
