import type { Placement } from '$lib/domain';
import type { PlacementRepository } from '$lib/application/ports/PlacementRepository';

/**
 * In-memory PlacementRepository for tests and SSR fallback.
 */
export class InMemoryPlacementRepository implements PlacementRepository {
	private readonly placements = new Map<string, Placement>();

	constructor(initialPlacements: Placement[] = []) {
		for (const placement of initialPlacements) {
			this.placements.set(placement.id, this.clonePlacement(placement));
		}
	}

	async getById(id: string): Promise<Placement | null> {
		const placement = this.placements.get(id);
		return placement ? this.clonePlacement(placement) : null;
	}

	async listBySessionId(sessionId: string): Promise<Placement[]> {
		const results: Placement[] = [];
		for (const placement of this.placements.values()) {
			if (placement.sessionId === sessionId) {
				results.push(this.clonePlacement(placement));
			}
		}
		return results;
	}

	async listByStudentId(studentId: string): Promise<Placement[]> {
		const results: Placement[] = [];
		for (const placement of this.placements.values()) {
			if (placement.studentId === studentId) {
				results.push(this.clonePlacement(placement));
			}
		}
		return results;
	}

	async save(placement: Placement): Promise<void> {
		this.placements.set(placement.id, this.clonePlacement(placement));
	}

	async saveBatch(placements: Placement[]): Promise<void> {
		for (const placement of placements) {
			this.placements.set(placement.id, this.clonePlacement(placement));
		}
	}

	async delete(id: string): Promise<void> {
		this.placements.delete(id);
	}

	async deleteBySessionId(sessionId: string): Promise<void> {
		for (const [id, placement] of this.placements) {
			if (placement.sessionId === sessionId) {
				this.placements.delete(id);
			}
		}
	}

	private clonePlacement(placement: Placement): Placement {
		return {
			...placement,
			assignedAt: new Date(placement.assignedAt),
			startDate: new Date(placement.startDate),
			endDate: placement.endDate ? new Date(placement.endDate) : undefined,
			preferenceSnapshot: placement.preferenceSnapshot
				? [...placement.preferenceSnapshot]
				: undefined
		};
	}
}
