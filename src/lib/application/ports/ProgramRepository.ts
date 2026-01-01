import type { Program } from '$lib/domain';

export interface ProgramRepository {
	getById(id: string): Promise<Program | null>;
	save(program: Program): Promise<void>;
	update(program: Program): Promise<void>;

	/**
	 * List all programs.
	 * When userId is provided, filters to only programs owned by that user.
	 * When userId is undefined, returns all local programs (anonymous mode).
	 */
	listAll(userId?: string): Promise<Program[]>;
}
