import type { Preference } from '$lib/domain';
import type { PreferenceRepository } from '$lib/application/ports/PreferenceRepository';

/**
 * In-memory PreferenceRepository.
 */
export class InMemoryPreferenceRepository implements PreferenceRepository {
	private readonly byProgram = new Map<string, Preference[]>();

	constructor(initialPreferences: Preference[] = []) {
		for (const pref of initialPreferences) {
			const list = this.byProgram.get(pref.programId) ?? [];
			list.push({ ...pref });
			this.byProgram.set(pref.programId, list);
		}
	}

	async listByProgramId(programId: string): Promise<Preference[]> {
		const prefs = this.byProgram.get(programId) ?? [];
		return prefs.map((p) => ({ ...p }));
	}

	/**
	 * Convenience for seeding/updating preferences.
	 */
	setForProgram(programId: string, preferences: Preference[]): void {
		this.byProgram.set(
			programId,
			preferences.map((p) => ({ ...p }))
		);
	}
}