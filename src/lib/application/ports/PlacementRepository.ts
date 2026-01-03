import type { Placement } from '$lib/domain';

export interface PlacementRepository {
	getById(id: string): Promise<Placement | null>;
	listBySessionId(sessionId: string): Promise<Placement[]>;
	listByStudentId(studentId: string): Promise<Placement[]>;
	save(placement: Placement): Promise<void>;
	saveBatch(placements: Placement[]): Promise<void>;
	delete(id: string): Promise<void>;
	deleteBySessionId(sessionId: string): Promise<void>;
}
