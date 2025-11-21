import type {
	StudentRepository,
	StaffRepository,
	PoolRepository,
	ProgramRepository,
	ScenarioRepository,
	PreferenceRepository,
	IdGenerator,
	Clock
} from '$lib/application/ports';
import type { GroupingAlgorithm } from '$lib/application/useCases/generateScenario';
import {
	InMemoryStudentRepository,
	InMemoryStaffRepository,
	InMemoryPoolRepository,
	InMemoryProgramRepository,
	InMemoryScenarioRepository,
	InMemoryPreferenceRepository
} from '$lib/infrastructure/repositories/inMemory';
import { UuidIdGenerator, SystemClock } from '$lib/infrastructure/services';
import type { Pool, Program, Scenario, Student, Staff, Preference } from '$lib/domain';

/**
 * Simple "put everyone into one big group" grouping algorithm for development/testing.
 *
 * This is a placeholder until you wire in the real grouping logic.
 */
class TrivialGroupingAlgorithm implements GroupingAlgorithm {
	async generateGroups(params: {
		programId: string;
		studentIds: string[];
		algorithmConfig?: unknown;
	}): Promise<
		| { success: true; groups: { id: string; name: string; capacity: number | null; memberIds: string[] }[] }
		| { success: false; message: string }
	> {
		const groupId = `group-${params.programId}`;
		return {
			success: true,
			groups: [
				{
					id: groupId,
					name: 'All Students',
					capacity: null,
					memberIds: [...params.studentIds]
				}
			]
		};
	}
}

/**
 * The full set of dependencies needed by MVP use cases, backed by in-memory implementations.
 *
 * This environment can be:
 * - Created once at app startup and threaded through Svelte context.
 * - Re-created per test to have a clean, isolated state.
 */
export interface InMemoryEnvironment {
	studentRepo: StudentRepository;
	staffRepo: StaffRepository;
	poolRepo: PoolRepository;
	programRepo: ProgramRepository;
	scenarioRepo: ScenarioRepository;
	preferenceRepo: PreferenceRepository;
	idGenerator: IdGenerator;
	clock: Clock;
	groupingAlgorithm: GroupingAlgorithm;
}

/**
 * Factory for an InMemoryEnvironment with optional initial seed data.
 */
export function createInMemoryEnvironment(seed?: {
	students?: Student[];
	staff?: Staff[];
	pools?: Pool[];
	programs?: Program[];
	scenarios?: Scenario[];
	preferences?: Preference[];
}): InMemoryEnvironment {
	const studentRepo = new InMemoryStudentRepository(seed?.students ?? []);
	const staffRepo = new InMemoryStaffRepository(seed?.staff ?? []);
	const poolRepo = new InMemoryPoolRepository(seed?.pools ?? []);
	const programRepo = new InMemoryProgramRepository(seed?.programs ?? []);
	const scenarioRepo = new InMemoryScenarioRepository(seed?.scenarios ?? []);
	const preferenceRepo = new InMemoryPreferenceRepository(seed?.preferences ?? []);

	const idGenerator = new UuidIdGenerator();
	const clock = new SystemClock();
	const groupingAlgorithm = new TrivialGroupingAlgorithm();

	return {
		studentRepo,
		staffRepo,
		poolRepo,
		programRepo,
		scenarioRepo,
		preferenceRepo,
		idGenerator,
		clock,
		groupingAlgorithm
	};
}