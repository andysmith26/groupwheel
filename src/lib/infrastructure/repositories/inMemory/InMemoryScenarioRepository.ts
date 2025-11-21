import type { Scenario } from '$lib/domain';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';

/**
 * In-memory ScenarioRepository.
 *
 * Note: This does NOT enforce the "single scenario per program" invariant
 * by itself; that logic lives in the generateScenarioForProgram use case.
 */
export class InMemoryScenarioRepository implements ScenarioRepository {
	private readonly scenarios = new Map<string, Scenario>();
	private readonly byProgramId = new Map<string, string>(); // programId -> scenarioId

	constructor(initialScenarios: Scenario[] = []) {
		for (const scenario of initialScenarios) {
			this.scenarios.set(scenario.id, this.cloneScenario(scenario));
			this.byProgramId.set(scenario.programId, scenario.id);
		}
	}

	async getById(id: string): Promise<Scenario | null> {
		const scenario = this.scenarios.get(id);
		return scenario ? this.cloneScenario(scenario) : null;
	}

	async getByProgramId(programId: string): Promise<Scenario | null> {
		const scenarioId = this.byProgramId.get(programId);
		if (!scenarioId) return null;
		const scenario = this.scenarios.get(scenarioId);
		return scenario ? this.cloneScenario(scenario) : null;
	}

	async save(scenario: Scenario): Promise<void> {
		this.scenarios.set(scenario.id, this.cloneScenario(scenario));
		this.byProgramId.set(scenario.programId, scenario.id);
	}

	async update(scenario: Scenario): Promise<void> {
		if (!this.scenarios.has(scenario.id)) {
			throw new Error(`Scenario with id ${scenario.id} does not exist`);
		}
		this.scenarios.set(scenario.id, this.cloneScenario(scenario));
		this.byProgramId.set(scenario.programId, scenario.id);
	}

	private cloneScenario(scenario: Scenario): Scenario {
		return {
			...scenario,
			groups: scenario.groups.map((g) => ({
				...g,
				memberIds: [...g.memberIds]
			})),
			participantSnapshot: [...scenario.participantSnapshot]
		};
	}
}