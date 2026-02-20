/**
 * createDemoActivity use case.
 *
 * Creates a single demo activity with pre-generated groups, published session,
 * and placements. The teacher sees groups immediately on the live view.
 *
 * This is separate from the developer demo seeder (demoSeeder.ts) which creates
 * 8 programs with complex data. The onboarding demo is intentionally minimal:
 * 24 students, 6 groups of 4, one published session.
 *
 * Demo activities are identified by the "Demo: " prefix in the program name.
 *
 * @module application/useCases/createDemoActivity
 */

import type {
	IdGenerator,
	StudentRepository,
	PoolRepository,
	ProgramRepository,
	ScenarioRepository,
	SessionRepository,
	PlacementRepository
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';
import { generateOnboardingDemoData } from '$lib/infrastructure/demo/demoOnboarding';

// =============================================================================
// Input / Output / Error Types
// =============================================================================

export interface CreateDemoActivityInput {
	staffId: string;
}

export interface CreateDemoActivityResult {
	programId: string;
	scenarioId: string;
	sessionId: string;
}

export type CreateDemoActivityError = { type: 'PERSISTENCE_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface CreateDemoActivityDeps {
	idGenerator: IdGenerator;
	studentRepository: StudentRepository;
	poolRepository: PoolRepository;
	programRepository: ProgramRepository;
	scenarioRepository: ScenarioRepository;
	sessionRepository: SessionRepository;
	placementRepository: PlacementRepository;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

export async function createDemoActivity(
	deps: CreateDemoActivityDeps,
	input: CreateDemoActivityInput
): Promise<Result<CreateDemoActivityResult, CreateDemoActivityError>> {
	try {
		const data = generateOnboardingDemoData(deps.idGenerator, input.staffId);

		// Persist all entities
		await deps.studentRepository.saveMany(data.students);
		await deps.poolRepository.save(data.pool);
		await deps.programRepository.save(data.program);
		await deps.scenarioRepository.save(data.scenario);
		await deps.sessionRepository.save(data.session);
		await deps.placementRepository.saveBatch(data.placements);

		return ok({
			programId: data.program.id,
			scenarioId: data.scenario.id,
			sessionId: data.session.id
		});
	} catch (e) {
		return err({
			type: 'PERSISTENCE_ERROR',
			message: e instanceof Error ? e.message : 'Failed to create demo activity'
		});
	}
}
