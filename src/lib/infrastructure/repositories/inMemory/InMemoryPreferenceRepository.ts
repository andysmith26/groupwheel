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

	async save(preference: Preference): Promise<void> {
		const existing = this.byProgram.get(preference.programId) ?? [];
		const filtered = existing.filter(
			(p) => p.id !== preference.id && p.studentId !== preference.studentId
		);

		this.byProgram.set(preference.programId, [
			...filtered,
			{
				...preference,
				payload: { ...preference.payload }
			}
		]);
	}

	/**
	 * Convenience for seeding/updating preferences.
	 */
	async setForProgram(programId: string, preferences: Preference[]): Promise<void> {
		this.byProgram.set(programId, preferences.map((p) => ({ ...p })));
	}
}
