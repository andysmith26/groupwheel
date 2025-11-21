import type { Preference } from '$lib/domain';

export interface PreferenceRepository {
	/**
	 * Return all preferences for a given Program.
	 */
	listByProgramId(programId: string): Promise<Preference[]>;
}