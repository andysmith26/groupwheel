import type { Scenario } from '$lib/domain';

export interface ScenarioRepository {
	getById(id: string): Promise<Scenario | null>;
	getByProgramId(programId: string): Promise<Scenario | null>;
	save(scenario: Scenario): Promise<void>;
	update(scenario: Scenario): Promise<void>;
}
