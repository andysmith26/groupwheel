import type {
	StudentRepository,
	StaffRepository,
	PoolRepository,
	ProgramRepository,
	ScenarioRepository,
	PreferenceRepository,
	GroupTemplateRepository,
	IdGenerator,
	Clock,
	GroupingAlgorithm
} from '$lib/application/ports';
import {
	InMemoryStudentRepository,
	InMemoryStaffRepository,
	InMemoryPoolRepository,
	InMemoryProgramRepository,
	InMemoryScenarioRepository,
	InMemoryPreferenceRepository
} from '$lib/infrastructure/repositories/inMemory';
import { InMemoryGroupTemplateRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryGroupTemplateRepository';
import { IndexedDbScenarioRepository } from '$lib/infrastructure/repositories/indexedDb';
import { IndexedDbGroupTemplateRepository } from '$lib/infrastructure/repositories/indexedDb/IndexedDbGroupTemplateRepository';
import { UuidIdGenerator, SystemClock } from '$lib/infrastructure/services';
import { BalancedGroupingAlgorithm } from '$lib/infrastructure/algorithms/balancedGrouping';
import type { Pool, Program, Scenario, Student, Staff, Preference, GroupTemplate } from '$lib/domain';
import { browser } from '$app/environment';

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
	groupTemplateRepo: GroupTemplateRepository;
	idGenerator: IdGenerator;
	clock: Clock;
	groupingAlgorithm: GroupingAlgorithm;
}

/**
 * Options for creating an InMemoryEnvironment.
 */
export interface CreateEnvironmentOptions {
	/**
	 * Use IndexedDB for persistence.
	 * When true, scenarios and group templates persist across browser sessions.
	 * Defaults to true in browser, false on server.
	 */
	useIndexedDb?: boolean;
}

/**
 * Factory for an InMemoryEnvironment with optional initial seed data.
 *
 * @param seed - Initial data to populate the repositories
 * @param options - Configuration options for the environment
 */
export function createInMemoryEnvironment(
	seed?: {
		students?: Student[];
		staff?: Staff[];
		pools?: Pool[];
		programs?: Program[];
		scenarios?: Scenario[];
		preferences?: Preference[];
		groupTemplates?: GroupTemplate[];
	},
	options?: CreateEnvironmentOptions
): InMemoryEnvironment {
	// Seed a default staff owner for MVP so ownerStaffId='owner-1' works out of the box.
	const defaultStaff: Staff[] = [
		{
			id: 'owner-1',
			name: 'Default Owner',
			roles: ['TEACHER']
		}
	];
	const studentRepo = new InMemoryStudentRepository(seed?.students ?? []);
	const staffRepo = new InMemoryStaffRepository([...(seed?.staff ?? []), ...defaultStaff]);
	const poolRepo = new InMemoryPoolRepository(seed?.pools ?? []);
	const programRepo = new InMemoryProgramRepository(seed?.programs ?? []);
	const preferenceRepo = new InMemoryPreferenceRepository(seed?.preferences ?? []);

	// Use IndexedDB in browser mode by default for persistence
	const useIndexedDb = options?.useIndexedDb ?? browser;

	const scenarioRepo: ScenarioRepository = useIndexedDb
		? new IndexedDbScenarioRepository()
		: new InMemoryScenarioRepository(seed?.scenarios ?? []);

	const groupTemplateRepo: GroupTemplateRepository = useIndexedDb
		? new IndexedDbGroupTemplateRepository()
		: new InMemoryGroupTemplateRepository(seed?.groupTemplates ?? []);

	const idGenerator = new UuidIdGenerator();
	const clock = new SystemClock();
	const groupingAlgorithm = new BalancedGroupingAlgorithm(studentRepo, preferenceRepo, idGenerator);

	return {
		studentRepo,
		staffRepo,
		poolRepo,
		programRepo,
		scenarioRepo,
		preferenceRepo,
		groupTemplateRepo,
		idGenerator,
		clock,
		groupingAlgorithm
	};
}
