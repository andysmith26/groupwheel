import type { Program } from '$lib/domain';

export interface ProgramRepository {
	getById(id: string): Promise<Program | null>;
	save(program: Program): Promise<void>;
	update(program: Program): Promise<void>;

	/**
	 * Simple listing for MVP. Later we can add filters by owner, school, etc.
	 */
	listAll(): Promise<Program[]>;
}
