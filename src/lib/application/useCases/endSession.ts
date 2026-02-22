import type { SessionRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Input for ending (archiving) active sessions.
 */
export interface EndSessionInput {
  programId: string;
}

/**
 * Archive all PUBLISHED sessions for a program.
 *
 * This enforces the "one active session per program" constraint
 * by transitioning all PUBLISHED sessions to ARCHIVED status.
 *
 * Returns the number of sessions archived.
 */
export async function endSession(
  deps: {
    sessionRepo: SessionRepository;
  },
  input: EndSessionInput
): Promise<Result<number, never>> {
  const sessions = await deps.sessionRepo.listByProgramId(input.programId);
  const published = sessions.filter((s) => s.status === 'PUBLISHED');

  for (const session of published) {
    await deps.sessionRepo.update({
      ...session,
      status: 'ARCHIVED'
    });
  }

  return ok(published.length);
}
