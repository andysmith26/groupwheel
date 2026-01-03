import type { Session } from '$lib/domain';
import { createSession as createSessionEntity } from '$lib/domain/session';
import type {
	ProgramRepository,
	SessionRepository,
	IdGenerator,
	Clock
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

/**
 * Input for creating a Session.
 */
export interface CreateSessionInput {
	programId: string;
	name: string;
	academicYear: string;
	startDate: Date;
	endDate: Date;
	createdByStaffId?: string;
	userId?: string;
}

/**
 * Specific failure modes for Session creation.
 */
export type CreateSessionError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'DOMAIN_VALIDATION_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * Create a new Session for a Program.
 */
export async function createSession(
	deps: {
		programRepo: ProgramRepository;
		sessionRepo: SessionRepository;
		idGenerator: IdGenerator;
		clock: Clock;
	},
	input: CreateSessionInput
): Promise<Result<Session, CreateSessionError>> {
	// Verify program exists
	const program = await deps.programRepo.getById(input.programId);
	if (!program) {
		return err({
			type: 'PROGRAM_NOT_FOUND',
			programId: input.programId
		});
	}

	// Create the session entity
	let session: Session;
	try {
		session = createSessionEntity({
			id: deps.idGenerator.generateId(),
			programId: input.programId,
			name: input.name,
			academicYear: input.academicYear,
			startDate: input.startDate,
			endDate: input.endDate,
			createdAt: deps.clock.now(),
			createdByStaffId: input.createdByStaffId,
			userId: input.userId
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown domain validation error';
		return err({
			type: 'DOMAIN_VALIDATION_FAILED',
			message
		});
	}

	// Persist the session
	try {
		await deps.sessionRepo.save(session);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}

	return ok(session);
}
