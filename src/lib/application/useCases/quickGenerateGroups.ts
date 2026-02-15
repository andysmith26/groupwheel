import type { Scenario } from '$lib/domain';
import type {
	ProgramRepository,
	PoolRepository,
	PreferenceRepository,
	ScenarioRepository,
	IdGenerator,
	Clock,
	GroupingAlgorithm
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, isErr } from '$lib/types/result';
import { generateCandidate, type GenerateCandidateError } from './generateCandidate';
import {
	createScenarioFromGroups,
	type CreateScenarioFromGroupsError
} from './createScenarioFromGroups';

/**
 * Input for quick-generating groups from just a group size.
 */
export interface QuickGenerateGroupsInput {
	programId: string;
	/** Target number of students per group. */
	groupSize: number;
	/** Prefix for group names (default: "Group"). */
	groupNamePrefix?: string;
	/** Whether to avoid placing students with recent groupmates. */
	avoidRecentGroupmates?: boolean;
}

/**
 * Failure modes for quick group generation.
 */
export type QuickGenerateGroupsError = GenerateCandidateError | CreateScenarioFromGroupsError;

type QuickGenerateGroupsDeps = {
	programRepo: ProgramRepository;
	poolRepo: PoolRepository;
	preferenceRepo: PreferenceRepository;
	scenarioRepo: ScenarioRepository;
	idGenerator: IdGenerator;
	clock: Clock;
	groupingAlgorithm: GroupingAlgorithm;
};

/**
 * Quick-generate groups for a program from just a target group size.
 *
 * Composes generateCandidate + createScenarioFromGroups into a single
 * atomic operation for the "Start Session" flow.
 *
 * 1. Loads the program's pool to determine student count
 * 2. Computes group count from student count and group size
 * 3. Generates a candidate grouping via the balanced algorithm
 * 4. Persists as a scenario (replacing any existing draft)
 */
export async function quickGenerateGroups(
	deps: QuickGenerateGroupsDeps,
	input: QuickGenerateGroupsInput
): Promise<Result<Scenario, QuickGenerateGroupsError>> {
	const { programId, groupSize, groupNamePrefix = 'Group', avoidRecentGroupmates = false } = input;

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

	// Build group definitions from group size
	const studentCount = pool.memberIds.length;
	const groupCount = Math.ceil(studentCount / groupSize);
	const groups = Array.from({ length: groupCount }, (_, i) => ({
		name: `${groupNamePrefix} ${i + 1}`,
		capacity: null as number | null
	}));

	// Generate candidate via balanced algorithm
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
				avoidRecentGroupmates
			},
			seed: Date.now()
		}
	);

	if (isErr(candidateResult)) {
		return candidateResult;
	}

	// Persist as scenario, replacing any existing draft
	return createScenarioFromGroups(
		{
			programRepo: deps.programRepo,
			poolRepo: deps.poolRepo,
			scenarioRepo: deps.scenarioRepo,
			idGenerator: deps.idGenerator,
			clock: deps.clock
		},
		{
			programId,
			groups: candidateResult.value.groups,
			replaceExisting: true
		}
	);
}
