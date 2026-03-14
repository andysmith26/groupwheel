import type { SessionRepository } from '$lib/application/ports/SessionRepository';
import type { PlacementRepository } from '$lib/application/ports/PlacementRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface DeleteSessionInput {
  sessionId: string;
}

export type DeleteSessionError =
  | { type: 'SESSION_NOT_FOUND'; sessionId: string }
  | { type: 'INTERNAL_ERROR'; message: string };

/**
 * Delete a session and all its placement records (cascade).
 */
export async function deleteSession(
  deps: {
    sessionRepo: SessionRepository;
    placementRepo: PlacementRepository;
  },
  input: DeleteSessionInput
): Promise<Result<{ sessionId: string }, DeleteSessionError>> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return err({ type: 'SESSION_NOT_FOUND', sessionId: input.sessionId });
  }

  try {
    await deps.placementRepo.deleteBySessionId(input.sessionId);
    await deps.sessionRepo.delete(input.sessionId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err({ type: 'INTERNAL_ERROR', message });
  }

  return ok({ sessionId: input.sessionId });
}
