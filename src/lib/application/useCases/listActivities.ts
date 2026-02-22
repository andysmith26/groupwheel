/**
 * List all grouping activities with display metadata.
 *
 * This use case retrieves all programs along with their associated
 * pool data and scenario status, formatted for display in the
 * activities list page.
 */

import type { Program, Pool, Session } from '$lib/domain';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';
import type { SessionRepository } from '$lib/application/ports/SessionRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface ActivityDisplay {
  program: Program;
  pool: Pool | null;
  studentCount: number;
  hasScenario: boolean;
  activeSession: Session | null;
  sessionCount: number;
}

export type ListActivitiesError = { type: 'LOAD_FAILED'; message: string };

export interface ListActivitiesInput {
  /** Filter by user ID (for multi-tenant isolation) */
  userId?: string;
}

export async function listActivities(
  deps: {
    programRepo: ProgramRepository;
    poolRepo: PoolRepository;
    scenarioRepo: ScenarioRepository;
    sessionRepo?: SessionRepository;
  },
  input?: ListActivitiesInput
): Promise<Result<ActivityDisplay[], ListActivitiesError>> {
  try {
    // Load all programs and pools, filtered by userId if provided
    const programs = await deps.programRepo.listAll(input?.userId);
    const pools = await deps.poolRepo.listAll(input?.userId);

    const poolMap = new Map(pools.map((p) => [p.id, p]));

    // Check for scenarios and sessions
    const scenarioByProgram = new Map<string, boolean>();
    const sessionDataByProgram = new Map<
      string,
      { activeSession: Session | null; sessionCount: number }
    >();

    for (const program of programs) {
      const scenario = await deps.scenarioRepo.getByProgramId(program.id);
      scenarioByProgram.set(program.id, scenario !== null);

      if (deps.sessionRepo) {
        const sessions = await deps.sessionRepo.listByProgramId(program.id);
        const published = sessions
          .filter((s) => s.status === 'PUBLISHED')
          .sort((a, b) => {
            const aTime = a.publishedAt?.getTime() ?? 0;
            const bTime = b.publishedAt?.getTime() ?? 0;
            return bTime - aTime;
          });
        sessionDataByProgram.set(program.id, {
          activeSession: published[0] ?? null,
          sessionCount: sessions.length
        });
      }
    }

    // Build activity display objects
    const activities = programs
      .map((program) => {
        const poolId = program.primaryPoolId ?? program.poolIds?.[0];
        const pool = poolId ? (poolMap.get(poolId) ?? null) : null;
        const sessionData = sessionDataByProgram.get(program.id);
        return {
          program,
          pool,
          studentCount: pool?.memberIds.length ?? 0,
          hasScenario: scenarioByProgram.get(program.id) ?? false,
          activeSession: sessionData?.activeSession ?? null,
          sessionCount: sessionData?.sessionCount ?? 0
        };
      })
      .sort((a, b) => a.program.name.localeCompare(b.program.name));

    return ok(activities);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error loading activities';
    return err({ type: 'LOAD_FAILED', message });
  }
}
