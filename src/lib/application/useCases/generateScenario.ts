import type { Scenario } from '$lib/domain';
import { createScenario } from '$lib/domain/scenario';
import type {
	ProgramRepository,
	PoolRepository,
	StudentRepository,
	ScenarioRepository,
	IdGenerator,
	Clock,
	GroupingAlgorithm
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

/**
 * Input for generating a single Scenario for a Program.
 */
export interface GenerateScenarioInput {
	programId: string;
	createdByStaffId?: string;
	algorithmConfig?: unknown;
}

/**
 * Specific failure modes for Scenario generation.
 */
export type GenerateScenarioError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'POOL_HAS_NO_MEMBERS'; poolId: string }
	| { type: 'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM'; programId: string; scenarioId: string }
	| { type: 'GROUPING_ALGORITHM_FAILED'; message: string }
	| { type: 'DOMAIN_VALIDATION_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * MVP use case: generate a single Scenario for a Program.
 *
 * From docs/use_cases.md:
 * - Resolve Pool memberIds and write Scenario.participantSnapshot.
 * - Produce groups via the grouping algorithm.
 * - Persist Scenario.
 * - Enforce single scenario per Program in MVP.
 */
export async function generateScenarioForProgram(
	deps: {
		programRepo: ProgramRepository;
		poolRepo: PoolRepository;
		studentRepo: StudentRepository; // reserved for future richer algorithms
		scenarioRepo: ScenarioRepository;
		idGenerator: IdGenerator;
		clock: Clock;
		groupingAlgorithm: GroupingAlgorithm;
	},
	input: GenerateScenarioInput
): Promise<Result<Scenario, GenerateScenarioError>> {
	// Load Program.
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

	// Enforce single scenario per Program for MVP.
	const existingScenario = await deps.scenarioRepo.getByProgramId(program.id);
	if (existingScenario) {
		return err({
			type: 'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM',
			programId: program.id,
			scenarioId: existingScenario.id
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

	// Call grouping algorithm.
	const groupingResult = await deps.groupingAlgorithm.generateGroups({
		programId: program.id,
		studentIds: pool.memberIds,
		algorithmConfig: input.algorithmConfig
	});

	if (!groupingResult.success) {
		return err({
			type: 'GROUPING_ALGORITHM_FAILED',
			message: groupingResult.message
		});
	}

	// Map algorithm groups into domain Scenario.
	const createdAt = deps.clock.now();
	let scenario: Scenario;
	try {
		scenario = createScenario({
			id: deps.idGenerator.generateId(),
			programId: program.id,
			groups: groupingResult.groups.map((g) => ({
				id: g.id,
				name: g.name,
				capacity: g.capacity,
				memberIds: g.memberIds
			})),
			participantIds: pool.memberIds,
			createdAt,
			createdByStaffId: input.createdByStaffId,
			algorithmConfig: input.algorithmConfig
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown domain validation error';
		return err({
			type: 'DOMAIN_VALIDATION_FAILED',
			message
		});
	}

	try {
		await deps.scenarioRepo.save(scenario);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}

	return ok(scenario);
}
