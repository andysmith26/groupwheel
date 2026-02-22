import type { Observation } from '$lib/domain';
import type { ObservationRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Input for listing observations by program.
 */
export interface ListObservationsByProgramInput {
  programId: string;
}

/**
 * Input for listing observations by session.
 */
export interface ListObservationsBySessionInput {
  sessionId: string;
}

/**
 * Input for listing observations by group.
 */
export interface ListObservationsByGroupInput {
  groupId: string;
}

/**
 * Result containing a list of observations.
 */
export interface ObservationListResult {
  observations: Observation[];
  count: number;
}

/**
 * List all observations for a specific program.
 */
export async function listObservationsByProgram(
  deps: {
    observationRepo: ObservationRepository;
  },
  input: ListObservationsByProgramInput
): Promise<Result<ObservationListResult, never>> {
  const observations = await deps.observationRepo.listByProgramId(input.programId);

  // Sort by createdAt descending (most recent first)
  observations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return ok({
    observations,
    count: observations.length
  });
}

/**
 * List all observations for a specific session.
 */
export async function listObservationsBySession(
  deps: {
    observationRepo: ObservationRepository;
  },
  input: ListObservationsBySessionInput
): Promise<Result<ObservationListResult, never>> {
  const observations = await deps.observationRepo.listBySessionId(input.sessionId);

  // Sort by createdAt descending (most recent first)
  observations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return ok({
    observations,
    count: observations.length
  });
}

/**
 * List all observations for a specific group (across all sessions).
 */
export async function listObservationsByGroup(
  deps: {
    observationRepo: ObservationRepository;
  },
  input: ListObservationsByGroupInput
): Promise<Result<ObservationListResult, never>> {
  const observations = await deps.observationRepo.listByGroupId(input.groupId);

  // Sort by createdAt descending (most recent first)
  observations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return ok({
    observations,
    count: observations.length
  });
}
