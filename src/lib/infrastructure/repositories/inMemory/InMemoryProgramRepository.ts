import type { Program } from '$lib/domain';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';

/**
 * In-memory ProgramRepository.
 */
export class InMemoryProgramRepository implements ProgramRepository {
	private readonly programs = new Map<string, Program>();

	constructor(initialPrograms: Program[] = []) {
		for (const program of initialPrograms) {
			this.programs.set(program.id, {
				...program,
				poolIds: [...program.poolIds],
				ownerStaffIds: program.ownerStaffIds ? [...program.ownerStaffIds] : undefined
			});
		}
	}

	async getById(id: string): Promise<Program | null> {
		const program = this.programs.get(id);
		return program
			? {
					...program,
					poolIds: [...program.poolIds],
					ownerStaffIds: program.ownerStaffIds ? [...program.ownerStaffIds] : undefined
				}
			: null;
	}

	async save(program: Program): Promise<void> {
		this.programs.set(program.id, {
			...program,
			poolIds: [...program.poolIds],
			ownerStaffIds: program.ownerStaffIds ? [...program.ownerStaffIds] : undefined
		});
	}

	async update(program: Program): Promise<void> {
		if (!this.programs.has(program.id)) {
			throw new Error(`Program with id ${program.id} does not exist`);
		}
		this.programs.set(program.id, {
			...program,
			poolIds: [...program.poolIds],
			ownerStaffIds: program.ownerStaffIds ? [...program.ownerStaffIds] : undefined
		});
	}

	async listAll(userId?: string): Promise<Program[]> {
		let programs = Array.from(this.programs.values()).map((p) => ({
			...p,
			poolIds: [...p.poolIds],
			ownerStaffIds: p.ownerStaffIds ? [...p.ownerStaffIds] : undefined
		}));

		// Filter by userId when provided
		if (userId !== undefined) {
			programs = programs.filter((p) => p.userId === userId);
		}

		return programs;
	}
}
