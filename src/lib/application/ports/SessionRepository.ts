import type { Session } from '$lib/domain';

export interface SessionRepository {
	getById(id: string): Promise<Session | null>;
	listByProgramId(programId: string): Promise<Session[]>;
	listByAcademicYear(academicYear: string): Promise<Session[]>;
	listAll(userId?: string): Promise<Session[]>;
	save(session: Session): Promise<void>;
	update(session: Session): Promise<void>;
	delete(id: string): Promise<void>;
}
