import type { Scenario } from '$lib/domain';
import type {
	ScenarioRepository,
	ProgramRepository,
	PoolRepository,
	StudentRepository,
	IdGenerator,
	Clock,
	GroupingAlgorithm
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, isOk } from '$lib/types/result';
import { generateScenarioForProgram } from './generateScenario';

/**
 * Input for resetting (regenerating) a scenario for a program.
 */
export interface ResetScenarioInput {
	programId: string;
}

/**
 * Specific failure modes for scenario reset.
 */
export type ResetScenarioError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'POOL_HAS_NO_MEMBERS'; poolId: string }
	| { type: 'GROUPING_ALGORITHM_FAILED'; message: string }
	| { type: 'DOMAIN_VALIDATION_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * Reset a scenario: delete existing scenario (if any) and generate a new one.
 *
 * This is the "Start Over" functionality that allows teachers to discard
 * their current groups and regenerate fresh ones from the algorithm.
 */
export async function resetScenario(
	deps: {
		scenarioRepo: ScenarioRepository;
		programRepo: ProgramRepository;
		poolRepo: PoolRepository;
		studentRepo: StudentRepository;
		idGenerator: IdGenerator;
		clock: Clock;
		groupingAlgorithm: GroupingAlgorithm;
	},
	input: ResetScenarioInput
): Promise<Result<Scenario, ResetScenarioError>> {
	// 1. Delete existing scenario if present
	const existing = await deps.scenarioRepo.getByProgramId(input.programId);
	if (existing) {
		await deps.scenarioRepo.delete(existing.id);
	}

	// 2. Generate fresh scenario (reuse existing use case logic)
	// The generateScenarioForProgram use case would normally error if a scenario exists,
	// but we've deleted it, so it should proceed normally.
	const result = await generateScenarioForProgram(deps, { programId: input.programId });

	// Map the error types (they're compatible but for type safety we handle explicitly)
	if (isOk(result)) {
		return result;
	}

	// Map generateScenario errors to resetScenario errors
	const error = result.error;
	switch (error.type) {
		case 'PROGRAM_NOT_FOUND':
			return err({ type: 'PROGRAM_NOT_FOUND', programId: error.programId });
		case 'POOL_NOT_FOUND':
			return err({ type: 'POOL_NOT_FOUND', poolId: error.poolId });
		case 'POOL_HAS_NO_MEMBERS':
			return err({ type: 'POOL_HAS_NO_MEMBERS', poolId: error.poolId });
		case 'GROUPING_ALGORITHM_FAILED':
			return err({ type: 'GROUPING_ALGORITHM_FAILED', message: error.message });
		case 'DOMAIN_VALIDATION_FAILED':
			return err({ type: 'DOMAIN_VALIDATION_FAILED', message: error.message });
		case 'INTERNAL_ERROR':
			return err({ type: 'INTERNAL_ERROR', message: error.message });
		case 'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM':
			// This shouldn't happen since we deleted, but handle gracefully
			return err({
				type: 'INTERNAL_ERROR',
				message: `Unexpected: scenario still exists after deletion for program ${error.programId}`
			});
		default:
			return err({ type: 'INTERNAL_ERROR', message: 'Unknown error during scenario reset' });
	}
}
