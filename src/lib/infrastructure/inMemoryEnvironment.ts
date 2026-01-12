import type {
	StudentRepository,
	StaffRepository,
	PoolRepository,
	ProgramRepository,
	ScenarioRepository,
	SessionRepository,
	PlacementRepository,
	PreferenceRepository,
	GroupTemplateRepository,
	IdGenerator,
	Clock,
	GroupingAlgorithm,
	AuthService,
	SyncService,
	ClipboardPort,
	GoogleSheetsService
} from '$lib/application/ports';
import {
	InMemoryStudentRepository,
	InMemoryStaffRepository,
	InMemoryPoolRepository,
	InMemoryProgramRepository,
	InMemoryScenarioRepository,
	InMemorySessionRepository,
	InMemoryPlacementRepository,
	InMemoryPreferenceRepository
} from '$lib/infrastructure/repositories/inMemory';
import { InMemoryGroupTemplateRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryGroupTemplateRepository';
import {
	IndexedDbScenarioRepository,
	IndexedDbSessionRepository,
	IndexedDbPlacementRepository,
	IndexedDbGroupTemplateRepository,
	IndexedDbProgramRepository,
	IndexedDbPoolRepository,
	IndexedDbStudentRepository,
	IndexedDbStaffRepository,
	IndexedDbPreferenceRepository
} from '$lib/infrastructure/repositories/indexedDb';
import {
	SyncedStudentRepository,
	SyncedStaffRepository,
	SyncedPoolRepository,
	SyncedProgramRepository,
	SyncedScenarioRepository,
	SyncedSessionRepository,
	SyncedPlacementRepository,
	SyncedPreferenceRepository,
	SyncedGroupTemplateRepository
} from '$lib/infrastructure/repositories/synced';
import { UuidIdGenerator, SystemClock } from '$lib/infrastructure/services';
import { BalancedGroupingAlgorithm } from '$lib/infrastructure/algorithms/balancedGrouping';
import { RandomGroupingAlgorithm } from '$lib/infrastructure/algorithms/randomGrouping';
import { RoundRobinGroupingAlgorithm } from '$lib/infrastructure/algorithms/roundRobinGrouping';
import { PreferenceFirstGroupingAlgorithm } from '$lib/infrastructure/algorithms/preferenceFirstGrouping';
import { SimulatedAnnealingGroupingAlgorithm } from '$lib/infrastructure/algorithms/simulatedAnnealingGrouping';
import { GeneticGroupingAlgorithm } from '$lib/infrastructure/algorithms/geneticGrouping';
import { FirstChoiceOnlyGroupingAlgorithm } from '$lib/infrastructure/algorithms/firstChoiceOnlyGrouping';
import { MultiAlgorithmGroupingAlgorithm } from '$lib/infrastructure/algorithms/multiAlgorithm';
import type {
	Pool,
	Program,
	Scenario,
	Session,
	Placement,
	Student,
	Staff,
	Preference,
	GroupTemplate
} from '$lib/domain';
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
	sessionRepo: SessionRepository;
	placementRepo: PlacementRepository;
	preferenceRepo: PreferenceRepository;
	groupTemplateRepo: GroupTemplateRepository;
	idGenerator: IdGenerator;
	clock: Clock;
	groupingAlgorithm: GroupingAlgorithm;
	authService?: AuthService;
	syncService?: SyncService;
	/** Google Sheets sync service (alternative to server sync) */
	sheetsSyncService?: SyncService;
	clipboard?: ClipboardPort;
	sheetsService?: GoogleSheetsService;
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

	/**
	 * Authentication service for user login/logout.
	 * When provided, enables authenticated features.
	 */
	authService?: AuthService;

	/**
	 * Enable server sync for authenticated users.
	 * When provided, repositories will queue changes for server sync.
	 */
	syncService?: SyncService;

	/**
	 * Google Sheets sync service (alternative to server sync).
	 * When provided, enables syncing data to a user-selected Google Sheet.
	 */
	sheetsSyncService?: SyncService;

	/**
	 * Clipboard service for copy operations.
	 */
	clipboard?: ClipboardPort;

	/**
	 * Google Sheets service for importing data from sheets.
	 */
	sheetsService?: GoogleSheetsService;
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
		sessions?: Session[];
		placements?: Placement[];
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
	// Use IndexedDB in browser mode by default for persistence
	// Caller should explicitly pass useIndexedDb: true in browser
	const useIndexedDb = options?.useIndexedDb ?? false;
	const authService = options?.authService;
	const syncService = options?.syncService;

	// Create base (local) repositories
	const baseStudentRepo = useIndexedDb
		? new IndexedDbStudentRepository()
		: new InMemoryStudentRepository(seed?.students ?? []);
	const baseStaffRepo = useIndexedDb
		? new IndexedDbStaffRepository()
		: new InMemoryStaffRepository([...(seed?.staff ?? []), ...defaultStaff]);
	const basePoolRepo = useIndexedDb
		? new IndexedDbPoolRepository()
		: new InMemoryPoolRepository(seed?.pools ?? []);
	const baseProgramRepo: ProgramRepository = useIndexedDb
		? new IndexedDbProgramRepository()
		: new InMemoryProgramRepository(seed?.programs ?? []);
	const basePreferenceRepo = useIndexedDb
		? new IndexedDbPreferenceRepository()
		: new InMemoryPreferenceRepository(seed?.preferences ?? []);
	const baseScenarioRepo: ScenarioRepository = useIndexedDb
		? new IndexedDbScenarioRepository()
		: new InMemoryScenarioRepository(seed?.scenarios ?? []);
	const baseGroupTemplateRepo: GroupTemplateRepository = useIndexedDb
		? new IndexedDbGroupTemplateRepository()
		: new InMemoryGroupTemplateRepository(seed?.groupTemplates ?? []);
	const baseSessionRepo: SessionRepository = useIndexedDb
		? new IndexedDbSessionRepository()
		: new InMemorySessionRepository(seed?.sessions ?? []);
	const basePlacementRepo: PlacementRepository = useIndexedDb
		? new IndexedDbPlacementRepository()
		: new InMemoryPlacementRepository(seed?.placements ?? []);

	// Wrap with sync capability if syncService is provided
	const studentRepo: StudentRepository = syncService
		? new SyncedStudentRepository(baseStudentRepo, syncService)
		: baseStudentRepo;
	const staffRepo: StaffRepository = syncService
		? new SyncedStaffRepository(baseStaffRepo)
		: baseStaffRepo;
	const poolRepo: PoolRepository = syncService
		? new SyncedPoolRepository(basePoolRepo, syncService)
		: basePoolRepo;
	const programRepo: ProgramRepository = syncService
		? new SyncedProgramRepository(baseProgramRepo, syncService)
		: baseProgramRepo;
	const preferenceRepo: PreferenceRepository = syncService
		? new SyncedPreferenceRepository(basePreferenceRepo, syncService)
		: basePreferenceRepo;
	const scenarioRepo: ScenarioRepository = syncService
		? new SyncedScenarioRepository(baseScenarioRepo, syncService)
		: baseScenarioRepo;
	const groupTemplateRepo: GroupTemplateRepository = syncService
		? new SyncedGroupTemplateRepository(baseGroupTemplateRepo, syncService)
		: baseGroupTemplateRepo;
	const sessionRepo: SessionRepository = syncService
		? new SyncedSessionRepository(baseSessionRepo, syncService)
		: baseSessionRepo;
	const placementRepo: PlacementRepository = syncService
		? new SyncedPlacementRepository(basePlacementRepo, syncService)
		: basePlacementRepo;

	const idGenerator = new UuidIdGenerator();
	const clock = new SystemClock();
	const groupingAlgorithm = new MultiAlgorithmGroupingAlgorithm(
		[
			{
				id: 'balanced',
				label: 'Balanced',
				algorithm: new BalancedGroupingAlgorithm(studentRepo, preferenceRepo, idGenerator)
			},
			{
				id: 'first-choice-only',
				label: 'First Choice Only',
				algorithm: new FirstChoiceOnlyGroupingAlgorithm(studentRepo, preferenceRepo, idGenerator)
			},
			{
				id: 'random',
				label: 'Random Shuffle',
				algorithm: new RandomGroupingAlgorithm(idGenerator)
			},
			{
				id: 'round-robin',
				label: 'Round Robin',
				algorithm: new RoundRobinGroupingAlgorithm(idGenerator)
			},
			{
				id: 'preference-first',
				label: 'Preference-First',
				algorithm: new PreferenceFirstGroupingAlgorithm(preferenceRepo, idGenerator)
			},
			{
				id: 'simulated-annealing',
				label: 'Simulated Annealing',
				algorithm: new SimulatedAnnealingGroupingAlgorithm(preferenceRepo, idGenerator)
			},
			{
				id: 'genetic',
				label: 'Genetic Algorithm',
				algorithm: new GeneticGroupingAlgorithm(preferenceRepo, idGenerator)
			}
		],
		'balanced'
	);

	return {
		studentRepo,
		staffRepo,
		poolRepo,
		programRepo,
		scenarioRepo,
		sessionRepo,
		placementRepo,
		preferenceRepo,
		groupTemplateRepo,
		idGenerator,
		clock,
		groupingAlgorithm,
		authService,
		syncService,
		sheetsSyncService: options?.sheetsSyncService,
		clipboard: options?.clipboard,
		sheetsService: options?.sheetsService
	};
}
