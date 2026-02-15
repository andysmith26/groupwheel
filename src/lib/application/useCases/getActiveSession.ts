import type { Session } from '$lib/domain';
import type { SessionRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Input for getting the active session.
 */
export interface GetActiveSessionInput {
	programId: string;
}

/**
 * Get the most recent PUBLISHED session for a program.
 *
 * Returns null if no active (PUBLISHED) session exists.
 */
export async function getActiveSession(
	deps: {
		sessionRepo: SessionRepository;
	},
	input: GetActiveSessionInput
): Promise<Result<Session | null, never>> {
	const sessions = await deps.sessionRepo.listByProgramId(input.programId);

	const published = sessions
		.filter((s) => s.status === 'PUBLISHED')
		.sort((a, b) => {
			const aTime = a.publishedAt?.getTime() ?? 0;
			const bTime = b.publishedAt?.getTime() ?? 0;
			return bTime - aTime;
		});

	return ok(published[0] ?? null);
}
