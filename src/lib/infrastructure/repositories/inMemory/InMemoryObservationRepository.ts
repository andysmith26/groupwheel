import type { Observation } from '$lib/domain';
import type { ObservationRepository } from '$lib/application/ports/ObservationRepository';

/**
 * In-memory ObservationRepository for testing and development.
 */
export class InMemoryObservationRepository implements ObservationRepository {
  private observations: Map<string, Observation> = new Map();

  constructor(initialObservations: Observation[] = []) {
    for (const observation of initialObservations) {
      this.observations.set(observation.id, observation);
    }
  }

  async getById(id: string): Promise<Observation | null> {
    return this.observations.get(id) ?? null;
  }

  async listByProgramId(programId: string): Promise<Observation[]> {
    return Array.from(this.observations.values()).filter((o) => o.programId === programId);
  }

  async listBySessionId(sessionId: string): Promise<Observation[]> {
    return Array.from(this.observations.values()).filter((o) => o.sessionId === sessionId);
  }

  async listByGroupId(groupId: string): Promise<Observation[]> {
    return Array.from(this.observations.values()).filter((o) => o.groupId === groupId);
  }

  async save(observation: Observation): Promise<void> {
    this.observations.set(observation.id, observation);
  }

  async delete(id: string): Promise<void> {
    this.observations.delete(id);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    for (const [id, observation] of this.observations) {
      if (observation.sessionId === sessionId) {
        this.observations.delete(id);
      }
    }
  }

  async listAll(userId?: string): Promise<Observation[]> {
    const all = Array.from(this.observations.values());
    if (userId) {
      return all.filter((o) => o.userId === userId);
    }
    return all;
  }

  /**
   * Clear all observations (useful for testing).
   */
  clear(): void {
    this.observations.clear();
  }
}
