import type { AppEnvContext } from '$lib/contexts/appEnv';
import type { Pool, Preference, Program, Scenario, Session, Student } from '$lib/domain';
import {
  getActivityData,
  getProgramPairingStats,
  quickGenerateGroups,
  generateCandidate,
  type PairingStat
} from '$lib/services/appEnvUseCases';
import { isErr } from '$lib/types/result';
import {
  ScenarioEditingStore,
  type SaveStatus,
  type ScenarioEditingView
} from '$lib/stores/scenarioEditingStore';

/**
 * Live session state for the Class View.
 *
 * Phase 1: Only 'PROJECTING' is used — enables projection mode.
 * Phase 2: 'OBSERVING' adds observation recording capabilities.
 *
 * See: project definition.md — Decision 3 (Full Session Lifecycle),
 * Part 5 Banked Note #4 (Live session state model)
 */
export type LiveSessionStatus = 'IDLE' | 'PROJECTING' | 'OBSERVING';

/**
 * Class View VM state — central view model for the Blizzard Class View.
 *
 * Replaces workspace-page-vm for the new two-screen architecture.
 * Manages roster, groups, generation, projection, analytics, and history.
 *
 * See: project definition.md — Decision 2 (Two-Screen Architecture),
 * Decision 4 (Data-State Adaptation), Part 3 (Class View),
 * Part 6 §6.3 (Stores)
 */
export interface ClassViewVmState {
  env: AppEnvContext;

  // Core data
  program: Program | null;
  pool: Pool | null;
  students: Student[];
  preferences: Preference[];
  scenario: Scenario | null;
  sessions: Session[];
  latestPublishedSession: Session | null;
  pairingStats: PairingStat[];

  // Loading state
  loading: boolean;
  loadError: string | null;
  generationError: string | null;

  // Editing
  editingStore: ScenarioEditingStore | null;
  view: ScenarioEditingView | null;
  lastSaveStatus: SaveStatus | null;

  // Live session — Phase 1: projection only; Phase 2: adds observation
  liveSessionStatus: LiveSessionStatus;

  // Data-state adaptation (Decision 4)
  hasPreferenceData: boolean;
}

export interface ClassViewVm {
  state: ClassViewVmState;
  actions: {
    init: (activityId: string) => Promise<void>;
    dispose: () => void;

    // Generation
    generateGroups: (groupSize: number) => Promise<void>;

    // Live session controls
    enterProjection: () => void;
    exitProjection: () => void;
  };
}

export function createClassViewVm(env: AppEnvContext): ClassViewVm {
  let unsubscribeEditingStore: (() => void) | null = null;
  let keyboardCleanup: (() => void) | null = null;

  let state = $state<ClassViewVmState>({
    env,

    program: null,
    pool: null,
    students: [],
    preferences: [],
    scenario: null,
    sessions: [],
    latestPublishedSession: null,
    pairingStats: [],

    loading: false,
    loadError: null,
    generationError: null,

    editingStore: null,
    view: null,
    lastSaveStatus: null,

    liveSessionStatus: 'IDLE',
    hasPreferenceData: false
  });

  function initializeEditingStore(scenario: Scenario) {
    unsubscribeEditingStore?.();
    unsubscribeEditingStore = null;
    state.editingStore?.destroy();

    const store = new ScenarioEditingStore({
      scenarioRepo: state.env.scenarioRepo,
      idGenerator: state.env.idGenerator
    });
    store.initialize(scenario, state.preferences);
    unsubscribeEditingStore = store.subscribe((value) => {
      state.view = value;
    });
    state.editingStore = store;
  }

  function setupKeyboardShortcuts() {
    if (typeof document === 'undefined') return;

    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac =
        typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      if (modKey && event.key === 'z') {
        if (event.shiftKey) {
          event.preventDefault();
          state.editingStore?.redo();
        } else {
          event.preventDefault();
          state.editingStore?.undo();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    keyboardCleanup = () => document.removeEventListener('keydown', handleKeydown);
  }

  async function init(activityId: string): Promise<void> {
    state.loading = true;
    state.loadError = null;

    setupKeyboardShortcuts();

    try {
      const result = await getActivityData(state.env, { programId: activityId });

      if (isErr(result)) {
        if (result.error.type === 'PROGRAM_NOT_FOUND') {
          state.loadError = `Activity not found: ${activityId}`;
        } else {
          state.loadError = result.error.message;
        }
        state.loading = false;
        return;
      }

      const data = result.value;
      state.program = data.program;
      state.pool = data.pool;
      state.students = data.students;
      state.preferences = data.preferences;
      state.scenario = data.scenario;
      state.sessions = data.sessions;
      state.latestPublishedSession = data.latestPublishedSession;
      state.hasPreferenceData = data.preferences.length > 0;

      // Load pairing stats if 2+ published sessions (for rotation avoidance)
      const publishedSessions = state.sessions.filter(
        (session) => session.status === 'PUBLISHED' || session.status === 'ARCHIVED'
      );
      if (publishedSessions.length >= 2) {
        const statsResult = await getProgramPairingStats(state.env, {
          programId: activityId
        });
        if (!isErr(statsResult)) {
          state.pairingStats = statsResult.value.pairs;
        }
      }

      if (state.scenario) {
        initializeEditingStore(state.scenario);
      }

      state.loading = false;
    } catch (e) {
      state.loadError = e instanceof Error ? e.message : 'Failed to load activity';
      state.loading = false;
    }
  }

  function dispose(): void {
    keyboardCleanup?.();
    keyboardCleanup = null;

    unsubscribeEditingStore?.();
    unsubscribeEditingStore = null;

    state.editingStore?.destroy();
    state.editingStore = null;

    state.liveSessionStatus = 'IDLE';
  }

  async function generateGroups(groupSize: number): Promise<void> {
    if (!state.program) return;

    state.generationError = null;

    if (state.scenario && state.editingStore) {
      // We already have a scenario, generate a candidate and regenerate the store
      const studentCount = state.students.length;
      const groupCount = Math.ceil(studentCount / groupSize);
      const groups = Array.from({ length: groupCount }, (_, i) => ({
        name: `Group ${i + 1}`,
        capacity: null as number | null
      }));

      const result = await generateCandidate(state.env, {
        programId: state.program.id,
        algorithmId: 'balanced',
        algorithmConfig: {
          groups,
          avoidRecentGroupmates: true, // Default to true per Decision 6
          lookbackSessions: 3
        }
      });

      if (isErr(result)) {
        state.generationError =
          'message' in result.error ? result.error.message : result.error.type;
        return;
      }

      await state.editingStore.regenerate(result.value.groups);
    } else {
      // No scenario yet, use quickGenerateGroups to create one
      const result = await quickGenerateGroups(state.env, {
        programId: state.program.id,
        groupSize,
        avoidRecentGroupmates: true,
        lookbackSessions: 3
      });

      if (isErr(result)) {
        state.generationError =
          'message' in result.error ? result.error.message : result.error.type;
        return;
      }

      state.scenario = result.value;
      initializeEditingStore(state.scenario);
    }
  }

  function enterProjection(): void {
    state.liveSessionStatus = 'PROJECTING';
  }

  function exitProjection(): void {
    state.liveSessionStatus = 'IDLE';
  }

  return {
    get state() {
      return state;
    },
    actions: {
      init,
      dispose,
      generateGroups,
      enterProjection,
      exitProjection
    }
  };
}
