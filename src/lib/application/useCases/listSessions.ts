import type { Session } from '$lib/domain';
import type { SessionRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Input for listing Sessions.
 */
export interface ListSessionsInput {
	programId?: string;
	academicYear?: string;
	userId?: string;
}

/**
 * List Sessions with optional filters.
 */
export async function listSessions(
	deps: {
		sessionRepo: SessionRepository;
	},
	input: ListSessionsInput
): Promise<Result<Session[], never>> {
	let sessions: Session[];

	if (input.programId) {
		sessions = await deps.sessionRepo.listByProgramId(input.programId);
	} else if (input.academicYear) {
		sessions = await deps.sessionRepo.listByAcademicYear(input.academicYear);
	} else {
		sessions = await deps.sessionRepo.listAll(input.userId);
	}

	// Sort by start date descending (most recent first)
	sessions.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

	return ok(sessions);
}
