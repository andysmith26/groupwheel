import type { ScenarioSatisfaction } from '$lib/domain';
import { computeScenarioSatisfaction } from '$lib/domain/analytics';
import type {
	ScenarioRepository,
	PreferenceRepository,
	StudentRepository
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

export type { ScenarioSatisfaction };

export interface ComputeScenarioAnalyticsInput {
	scenarioId: string;
}

/**
 * Failure modes for analytics computation.
 */
export type ComputeScenarioAnalyticsError =
	| { type: 'SCENARIO_NOT_FOUND'; scenarioId: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * MVP use case: compute analytics for a Scenario.
 *
 * From docs/use_cases.md:
 * - Compute PercentAssignedTopChoice and AveragePreferenceRankAssigned.
 * - Optionally PercentAssignedTop2.
 */
export async function computeScenarioAnalytics(
	deps: {
		scenarioRepo: ScenarioRepository;
		preferenceRepo: PreferenceRepository;
		studentRepo: StudentRepository;
	},
	input: ComputeScenarioAnalyticsInput
): Promise<Result<ScenarioSatisfaction, ComputeScenarioAnalyticsError>> {
	const scenario = await deps.scenarioRepo.getById(input.scenarioId);
	if (!scenario) {
		return err({
			type: 'SCENARIO_NOT_FOUND',
			scenarioId: input.scenarioId
		});
	}

	try {
		const [preferences, students] = await Promise.all([
			deps.preferenceRepo.listByProgramId(scenario.programId),
			deps.studentRepo.getByIds(scenario.participantSnapshot)
		]);

		const satisfaction = computeScenarioSatisfaction({
			scenario,
			preferences,
			students
		});

		return ok(satisfaction);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown analytics error';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}
}
