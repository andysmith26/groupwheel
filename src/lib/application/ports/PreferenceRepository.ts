import type { Preference } from '$lib/domain';

export interface PreferenceRepository {
	/**
	 * Return all preferences for a given Program.
	 */
	listByProgramId(programId: string): Promise<Preference[]>;

	/**
	 * Persist a single preference.
	 */
	save(preference: Preference): Promise<void>;

	/**
	 * Optional bulk helper for tests or batch imports.
	 */
	setForProgram?(programId: string, preferences: Preference[]): Promise<void>;
}
