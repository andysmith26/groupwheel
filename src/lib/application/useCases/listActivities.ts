/**
 * List all grouping activities with display metadata.
 *
 * This use case retrieves all programs along with their associated
 * pool data and scenario status, formatted for display in the
 * activities list page.
 */

import type { Program, Pool } from '$lib/domain';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface ActivityDisplay {
	program: Program;
	pool: Pool | null;
	studentCount: number;
	hasScenario: boolean;
}

export type ListActivitiesError = { type: 'LOAD_FAILED'; message: string };

export async function listActivities(deps: {
	programRepo: ProgramRepository;
	poolRepo: PoolRepository;
	scenarioRepo: ScenarioRepository;
}): Promise<Result<ActivityDisplay[], ListActivitiesError>> {
	try {
		// Load all programs and pools
		const programs = await deps.programRepo.listAll();
		const pools = await deps.poolRepo.listAll();

		const poolMap = new Map(pools.map((p) => [p.id, p]));

		// Check for scenarios
		const scenarioByProgram = new Map<string, boolean>();
		for (const program of programs) {
			const scenario = await deps.scenarioRepo.getByProgramId(program.id);
			scenarioByProgram.set(program.id, scenario !== null);
		}

		// Build activity display objects
		const activities = programs
			.map((program) => {
				const poolId = program.primaryPoolId ?? program.poolIds?.[0];
				const pool = poolId ? (poolMap.get(poolId) ?? null) : null;
				return {
					program,
					pool,
					studentCount: pool?.memberIds.length ?? 0,
					hasScenario: scenarioByProgram.get(program.id) ?? false
				};
			})
			.sort((a, b) => a.program.name.localeCompare(b.program.name));

		return ok(activities);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error loading activities';
		return err({ type: 'LOAD_FAILED', message });
	}
}
