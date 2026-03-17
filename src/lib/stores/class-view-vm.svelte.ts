import type { AppEnvContext } from '$lib/contexts/appEnv';
import type { Group, Placement, Pool, Preference, Program, Scenario, Session, Student } from '$lib/domain';
import type { ScenarioSatisfaction } from '$lib/domain/analytics';
import type { StudentPreference } from '$lib/domain/preference';
import {
  getActivityData,
  getProgramPairingStats,
  quickGenerateGroups,
  generateCandidate,
  upgradeQuickStartRoster,
  addStudentToPool,
  updateStudent as updateStudentUseCase,
  removeStudentFromPool,
  showToClass,
  deleteSession as deleteSessionUseCase,
  type PairingStat
} from '$lib/services/appEnvUseCases';
import { isErr } from '$lib/types/result';
import {
  ScenarioEditingStore,
  type SaveStatus,
  type ScenarioEditingView
} from '$lib/stores/scenarioEditingStore';
import { getGenerationErrorMessage } from '$lib/utils/generationErrorMessages';
import { buildPreferenceMap } from '$lib/utils/preferenceAdapter';
import {
  getGenerationSettings,
  saveGenerationSettings
} from '$lib/utils/generationSettings';

/**
 * A snapshot of a past generation for the history panel.
 * Each time "Make Groups" is clicked, the previous groups are saved here.
 */
export interface GenerationHistoryEntry {
  groups: Group[];
  analytics: ScenarioSatisfaction | null;
  generatedAt: Date;
}

/**
 * State for scenario comparison overlay.
 */
export interface ComparisonState {
  alternativeGroups: Group[];
  alternativeAnalytics: ScenarioSatisfaction;
  isGenerating: boolean;
}

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

  // Derived lookups
  studentsById: Record<string, Student>;

  // Loading state
  loading: boolean;
  loadError: string | null;
  generationError: string | null;
  isGenerating: boolean;

  // Generation settings (persisted per-activity via localStorage)
  avoidRecentGroupmates: boolean;
  lookbackSessions: number;
  // Settings panel visibility
  settingsPanelOpen: boolean;

  // Editing
  editingStore: ScenarioEditingStore | null;
  view: ScenarioEditingView | null;
  lastSaveStatus: SaveStatus | null;

  // Live session — Phase 1: projection only; Phase 2: adds observation
  liveSessionStatus: LiveSessionStatus;

  // Data-state adaptation (Decision 4)
  hasPreferenceData: boolean;
  /** Number of students who have at least one preference. Analytics panel threshold: >=3. */
  studentsWithPreferencesCount: number;
  /** Lookup map: studentId → StudentPreference (derived from preferences[]) */
  preferenceMap: Record<string, StudentPreference>;
  /** Per-student preference rank in their current group (1 = 1st choice, null = no pref or unmatched) */
  studentPreferenceRanks: Map<string, number | null>;
  /** Per-student flag: does this student have any preferences at all? */
  studentHasPreferences: Map<string, boolean>;

  // Generation history (WP9)
  generationHistory: GenerationHistoryEntry[];
  /** Index into generationHistory being viewed, or -1 for current */
  selectedHistoryIndex: number;

  // Comparison state (WP9)
  comparison: ComparisonState | null;

  // History panel visibility (WP9)
  historyPanelOpen: boolean;

  // Viewing a past session's placements (read-only)
  viewingSessionId: string | null;
  viewingSessionGroups: Group[];

  // Publish state
  isPublished: boolean;
  isPublishing: boolean;

  // Unplaced student tracking
  unplacedStudentCount: number;

  // Quick Start upgrade path (WP11 / Decision 5, Banked Note #2)
  hasPlaceholderStudents: boolean;

  // Drag-drop state
  draggingId: string | null;

  // Keyboard drag-drop state
  pickedUpStudentId: string | null;
  pickedUpContainer: string | null;
  pickedUpIndex: number | null;

  // Group editing — tracks newly created group for auto-focus
  newGroupId: string | null;
}

export interface ClassViewVm {
  state: ClassViewVmState;
  actions: {
    init: (activityId: string) => Promise<void>;
    dispose: () => void;

    // Generation
    generateGroups: (groupCount?: number) => Promise<void>;
    assignAll: () => Promise<void>;
    shuffleGroups: () => Promise<void>;

    // Drag-drop editing
    moveStudent: (payload: {
      studentId: string;
      source: string;
      target: string;
      targetIndex?: number;
    }) => void;
    reorderStudent: (payload: {
      groupId: string;
      studentId: string;
      newIndex: number;
    }) => void;
    sortGroup: (groupId: string, sortBy: 'firstName' | 'lastName', direction: 'asc' | 'desc') => void;

    // Group CRUD
    createGroup: () => void;
    updateGroup: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
    deleteGroup: (groupId: string) => void;

    // Keyboard drag-drop
    keyboardPickUp: (studentId: string, container: string, index: number) => void;
    keyboardDrop: () => void;
    keyboardCancel: () => void;
    keyboardMove: (direction: 'up' | 'down' | 'left' | 'right') => void;

    // History & comparison (WP9)
    selectHistoryEntry: (index: number) => void;
    toggleHistoryPanel: () => void;
    selectSession: (sessionId: string | null) => Promise<void>;
    startComparison: () => Promise<void>;
    keepCurrentArrangement: () => void;
    useAlternativeArrangement: () => void;
    closeComparison: () => void;

    // Settings (WP10)
    setAvoidRecentGroupmates: (enabled: boolean) => void;
    setLookbackSessions: (sessions: number) => void;
    toggleSettingsPanel: () => void;

    // Live session controls
    enterProjection: () => void;
    exitProjection: () => void;

    // Quick Start upgrade (WP11)
    upgradeRoster: (students: Array<{ firstName: string; lastName: string }>) => Promise<void>;

    // Session lifecycle
    publishSession: () => Promise<void>;
    startNewSession: () => void;
    deleteSession: (sessionId: string) => Promise<void>;
    renameSession: (sessionId: string, name: string) => Promise<void>;

    // Student CRUD
    addStudent: (input: {
      firstName: string;
      lastName?: string;
      gradeLevel?: string;
      gender?: string;
    }) => Promise<{ success: boolean; studentId?: string }>;
    updateStudent: (input: {
      studentId: string;
      firstName?: string;
      lastName?: string;
      gradeLevel?: string;
      gender?: string;
    }) => Promise<boolean>;
    removeStudent: (studentId: string) => Promise<boolean>;
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

    studentsById: {},

    loading: false,
    loadError: null,
    generationError: null,
    isGenerating: false,

    avoidRecentGroupmates: true,
    lookbackSessions: 3,
    settingsPanelOpen: false,

    editingStore: null,
    view: null,
    lastSaveStatus: null,

    liveSessionStatus: 'IDLE',
    hasPreferenceData: false,
    studentsWithPreferencesCount: 0,
    preferenceMap: {},
    studentPreferenceRanks: new Map(),
    studentHasPreferences: new Map(),
    generationHistory: [],
    selectedHistoryIndex: -1,
    comparison: null,
    historyPanelOpen: false,

    viewingSessionId: null,
    viewingSessionGroups: [],

    isPublished: false,
    isPublishing: false,

    unplacedStudentCount: 0,

    hasPlaceholderStudents: false,

    draggingId: null,
    pickedUpStudentId: null,
    pickedUpContainer: null,
    pickedUpIndex: null,

    newGroupId: null
  });

  function rebuildStudentsById() {
    const map: Record<string, Student> = {};
    for (const student of state.students) {
      map[student.id] = student;
    }
    state.studentsById = map;
  }

  /**
   * Detect whether all students are quick-start placeholders ("Student 1", "Student 2", ...).
   * Used to show the upgrade prompt (WP11 / Decision 5, Banked Note #2).
   */
  function detectPlaceholderStudents() {
    state.hasPlaceholderStudents =
      state.students.length > 0 &&
      state.students.every(
        (s) => /^Student$/.test(s.firstName) && /^\d+$/.test(s.lastName ?? '')
      );
  }

  function persistSettings() {
    if (!state.program) return;
    saveGenerationSettings(state.program.id, {
      avoidRecentGroupmates: state.avoidRecentGroupmates,
      lookbackSessions: state.lookbackSessions
    });
  }

  function computePreferenceState() {
    const prefMap = buildPreferenceMap(state.preferences);
    state.preferenceMap = prefMap;

    // Count students with preferences and build the has-preferences map
    const hasPrefs = new Map<string, boolean>();
    let count = 0;
    for (const student of state.students) {
      const prefs = prefMap[student.id]?.likeGroupIds;
      const has = Boolean(prefs && prefs.length > 0);
      hasPrefs.set(student.id, has);
      if (has) count++;
    }
    state.studentHasPreferences = hasPrefs;
    state.studentsWithPreferencesCount = count;
    state.hasPreferenceData = count > 0;
  }

  function computePreferenceRanks() {
    const view = state.view;
    if (!view) {
      state.studentPreferenceRanks = new Map();
      return;
    }
    const ranks = new Map<string, number | null>();
    for (const group of view.groups) {
      for (const studentId of group.memberIds) {
        const prefs = state.preferenceMap[studentId]?.likeGroupIds;
        if (!prefs || prefs.length === 0) {
          ranks.set(studentId, null);
          continue;
        }
        const rank = prefs.indexOf(group.id);
        ranks.set(studentId, rank >= 0 ? rank + 1 : null);
      }
    }
    state.studentPreferenceRanks = ranks;
  }

  function computeUnplacedStudentCount() {
    if (!state.view || state.view.groups.length === 0) {
      state.unplacedStudentCount = 0;
      return;
    }
    const placedIds = new Set<string>();
    for (const group of state.view.groups) {
      for (const id of group.memberIds) {
        placedIds.add(id);
      }
    }
    state.unplacedStudentCount = state.students.filter((s) => !placedIds.has(s.id)).length;
  }

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
      computeUnplacedStudentCount();
      computePreferenceRanks();
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
        typeof navigator !== 'undefined' &&
        ('userAgentData' in navigator
          ? (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ===
            'macOS'
          : navigator.platform.toUpperCase().includes('MAC'));
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

      // Load persisted generation settings (WP10 — rotation avoidance)
      const savedSettings = getGenerationSettings(activityId);
      state.avoidRecentGroupmates = savedSettings.avoidRecentGroupmates;
      state.lookbackSessions = savedSettings.lookbackSessions;

      const data = result.value;
      state.program = data.program;
      state.pool = data.pool;
      state.students = data.students;
      state.preferences = data.preferences;
      state.scenario = data.scenario;
      state.sessions = data.sessions;
      state.latestPublishedSession = data.latestPublishedSession;
      computeIsPublished();
      rebuildStudentsById();
      detectPlaceholderStudents();
      computePreferenceState();

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

  /** Initial group creation (no groups exist yet). */
  async function generateGroups(groupCount?: number): Promise<void> {
    if (!state.program || state.isGenerating) return;

    state.generationError = null;
    state.isGenerating = true;

    try {
      const effectiveGroupCount = groupCount ?? Math.ceil(state.students.length / 4);
      const groupDefs = Array.from({ length: effectiveGroupCount }, (_, i) => ({
        name: `Group ${i + 1}`,
        capacity: null as number | null
      }));

      const result = await quickGenerateGroups(state.env, {
        programId: state.program.id,
        groupSize: Math.ceil(state.students.length / effectiveGroupCount),
        groups: groupDefs,
        avoidRecentGroupmates: state.avoidRecentGroupmates,
        lookbackSessions: state.lookbackSessions
      });

      if (isErr(result)) {
        state.generationError = getGenerationErrorMessage(result.error.type);
        return;
      }

      state.scenario = result.value;
      initializeEditingStore(state.scenario);
    } finally {
      state.isGenerating = false;
    }
  }

  /** Run the algorithm on existing groups, using a specific mode. */
  async function runGeneration(mode: 'fill' | 'shuffle'): Promise<void> {
    if (!state.program || state.isGenerating || !state.scenario || !state.editingStore) return;

    state.generationError = null;
    state.isGenerating = true;

    try {
      const existingGroups = state.view?.groups ?? [];

      // Save current arrangement to history before generating new one
      const currentAnalytics = state.view?.currentAnalytics ?? null;
      if (existingGroups.length > 0) {
        state.generationHistory = [
          {
            groups: existingGroups.map((g) => ({ ...g, memberIds: [...g.memberIds] })),
            analytics: currentAnalytics,
            generatedAt: new Date()
          },
          ...state.generationHistory
        ].slice(0, 10);
      }
      state.selectedHistoryIndex = -1;

      const groups = existingGroups.map((g) => ({
        id: g.id,
        name: g.name,
        capacity: g.capacity,
        memberIds: mode === 'fill' ? [...g.memberIds] : ([] as string[])
      }));

      const result = await generateCandidate(state.env, {
        programId: state.program.id,
        algorithmId: 'balanced',
        algorithmConfig: {
          groups,
          avoidRecentGroupmates: state.avoidRecentGroupmates,
          lookbackSessions: state.lookbackSessions
        }
      });

      if (isErr(result)) {
        state.generationError = getGenerationErrorMessage(result.error.type);
        return;
      }

      await state.editingStore.regenerate(result.value.groups);
    } finally {
      state.isGenerating = false;
    }
  }

  /** Place all unassigned students into existing groups, preserving current placements. */
  async function assignAll(): Promise<void> {
    await runGeneration('fill');
  }

  /** Re-run the placement algorithm on all students, clearing existing placements. */
  async function shuffleGroups(): Promise<void> {
    await runGeneration('shuffle');
  }

  function moveStudent(payload: {
    studentId: string;
    source: string;
    target: string;
    targetIndex?: number;
  }): void {
    if (!state.editingStore) return;

    // Normalize source: find the actual group the student is in
    const currentGroup = state.view?.groups.find((g) =>
      g.memberIds.includes(payload.studentId)
    );
    const normalizedSource = currentGroup ? currentGroup.id : 'unassigned';

    state.editingStore.dispatch({
      type: 'MOVE_STUDENT',
      studentId: payload.studentId,
      source: normalizedSource,
      target: payload.target,
      targetIndex: payload.targetIndex
    });
  }

  function reorderStudent(payload: {
    groupId: string;
    studentId: string;
    newIndex: number;
  }): void {
    if (!state.editingStore || !state.view) return;

    if (payload.groupId === 'unassigned') {
      const currentIndex = state.view.unassignedStudentIds.indexOf(payload.studentId);
      if (currentIndex === -1) return;

      const newOrder = [...state.view.unassignedStudentIds];
      newOrder.splice(currentIndex, 1);
      newOrder.splice(payload.newIndex, 0, payload.studentId);
      state.editingStore.reorderUnassigned(newOrder);
      return;
    }

    const group = state.view.groups.find((g) => g.id === payload.groupId);
    if (!group) return;

    const currentIndex = group.memberIds.indexOf(payload.studentId);
    if (currentIndex === -1) return;

    const newOrder = [...group.memberIds];
    newOrder.splice(currentIndex, 1);
    newOrder.splice(payload.newIndex, 0, payload.studentId);
    state.editingStore.reorderGroup(payload.groupId, newOrder);
  }

  function sortGroup(groupId: string, sortBy: 'firstName' | 'lastName', direction: 'asc' | 'desc'): void {
    if (!state.editingStore || !state.view) return;

    const group = state.view.groups.find((g) => g.id === groupId);
    if (!group) return;

    const sorted = [...group.memberIds].sort((a, b) => {
      const sa = state.studentsById[a];
      const sb = state.studentsById[b];
      if (!sa || !sb) return 0;
      const primary = sortBy === 'firstName'
        ? (sa.firstName ?? '').toLowerCase().localeCompare((sb.firstName ?? '').toLowerCase())
        : (sa.lastName ?? '').toLowerCase().localeCompare((sb.lastName ?? '').toLowerCase());
      if (primary !== 0) return direction === 'asc' ? primary : -primary;
      const secondary = sortBy === 'firstName'
        ? (sa.lastName ?? '').toLowerCase().localeCompare((sb.lastName ?? '').toLowerCase())
        : (sa.firstName ?? '').toLowerCase().localeCompare((sb.firstName ?? '').toLowerCase());
      return direction === 'asc' ? secondary : -secondary;
    });

    state.editingStore.reorderGroup(groupId, sorted);
  }

  // --- Group CRUD ---

  function createGroup(): void {
    if (!state.editingStore) return;
    const result = state.editingStore.createGroup();
    if (result.success && result.groupId) {
      state.newGroupId = result.groupId;
    }
  }

  function updateGroup(
    groupId: string,
    changes: Partial<Pick<Group, 'name' | 'capacity'>>
  ): void {
    if (!state.editingStore) return;
    state.editingStore.updateGroup(groupId, changes);
  }

  function deleteGroup(groupId: string): void {
    if (!state.editingStore) return;
    state.editingStore.deleteGroup(groupId);
  }

  // --- Group reordering ---

  function reorderGroups(payload: { draggedGroupId: string; targetGroupId: string; edge: 'left' | 'right' }): void {
    if (!state.editingStore || !state.view) return;

    const currentIds = state.view.groups.map((g) => g.id);
    const fromIndex = currentIds.indexOf(payload.draggedGroupId);
    const toIndex = currentIds.indexOf(payload.targetGroupId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const newIds = [...currentIds];
    newIds.splice(fromIndex, 1);
    let insertAt = newIds.indexOf(payload.targetGroupId);
    if (payload.edge === 'right') insertAt++;
    newIds.splice(insertAt, 0, payload.draggedGroupId);

    state.editingStore.reorderGroupColumns(newIds);
  }

  // --- Keyboard drag-drop ---

  function keyboardPickUp(studentId: string, container: string, index: number): void {
    state.pickedUpStudentId = studentId;
    state.pickedUpContainer = container;
    state.pickedUpIndex = index;
  }

  function keyboardDrop(): void {
    // Drop at current position (student has been moved via keyboardMove)
    state.pickedUpStudentId = null;
    state.pickedUpContainer = null;
    state.pickedUpIndex = null;
  }

  function keyboardCancel(): void {
    state.pickedUpStudentId = null;
    state.pickedUpContainer = null;
    state.pickedUpIndex = null;
  }

  function keyboardMove(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!state.pickedUpStudentId || !state.pickedUpContainer || !state.view) return;

    const groups = state.view.groups;
    const currentContainer = state.pickedUpContainer;

    if (direction === 'up' || direction === 'down') {
      // Move within same group/container
      if (currentContainer === 'unassigned') {
        const ids = state.view.unassignedStudentIds;
        const idx = ids.indexOf(state.pickedUpStudentId);
        if (idx === -1) return;
        const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(ids.length - 1, idx + 1);
        if (newIdx !== idx) {
          reorderStudent({ groupId: 'unassigned', studentId: state.pickedUpStudentId, newIndex: newIdx });
          state.pickedUpIndex = newIdx;
        }
      } else {
        const group = groups.find((g) => g.id === currentContainer);
        if (!group) return;
        const idx = group.memberIds.indexOf(state.pickedUpStudentId);
        if (idx === -1) return;
        const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(group.memberIds.length - 1, idx + 1);
        if (newIdx !== idx) {
          reorderStudent({ groupId: currentContainer, studentId: state.pickedUpStudentId, newIndex: newIdx });
          state.pickedUpIndex = newIdx;
        }
      }
    } else {
      // Move between groups (left/right)
      const groupIds = groups.map((g) => g.id);
      const currentGroupIndex = groupIds.indexOf(currentContainer);

      let targetGroupIndex: number;
      if (currentContainer === 'unassigned') {
        // From unassigned, right goes to first group
        if (direction === 'right' && groups.length > 0) {
          targetGroupIndex = 0;
        } else {
          return;
        }
      } else if (direction === 'left') {
        if (currentGroupIndex <= 0) {
          // Move to unassigned
          moveStudent({
            studentId: state.pickedUpStudentId,
            source: currentContainer,
            target: 'unassigned'
          });
          state.pickedUpContainer = 'unassigned';
          state.pickedUpIndex = state.view.unassignedStudentIds.length;
          return;
        }
        targetGroupIndex = currentGroupIndex - 1;
      } else {
        // right
        if (currentGroupIndex >= groupIds.length - 1) return;
        targetGroupIndex = currentGroupIndex + 1;
      }

      const targetGroup = groups[targetGroupIndex];
      moveStudent({
        studentId: state.pickedUpStudentId,
        source: currentContainer,
        target: targetGroup.id
      });
      state.pickedUpContainer = targetGroup.id;
      state.pickedUpIndex = targetGroup.memberIds.length;
    }
  }

  // --- History & Comparison (WP9) ---

  function selectHistoryEntry(index: number): void {
    state.selectedHistoryIndex = index;
  }

  function toggleHistoryPanel(): void {
    state.historyPanelOpen = !state.historyPanelOpen;
  }

  /**
   * Load a past session's placements and display them read-only on the canvas.
   * Pass null to return to the current editing session.
   */
  async function selectSession(sessionId: string | null): Promise<void> {
    if (sessionId === null) {
      state.viewingSessionId = null;
      state.viewingSessionGroups = [];
      state.selectedHistoryIndex = -1;
      return;
    }

    // Already viewing this session
    if (state.viewingSessionId === sessionId) return;

    const placements: Placement[] = await state.env.placementRepo.listBySessionId(sessionId);
    if (placements.length === 0) {
      state.viewingSessionId = null;
      state.viewingSessionGroups = [];
      return;
    }

    // Build Group[] from placements, grouping by groupId
    const groupMap = new Map<string, { id: string; name: string; memberIds: string[] }>();
    for (const p of placements) {
      let group = groupMap.get(p.groupId);
      if (!group) {
        group = { id: p.groupId, name: p.groupName, memberIds: [] };
        groupMap.set(p.groupId, group);
      }
      group.memberIds.push(p.studentId);
    }

    state.viewingSessionGroups = Array.from(groupMap.values()).map((g) => ({
      id: g.id,
      name: g.name,
      capacity: null,
      memberIds: g.memberIds
    }));
    state.viewingSessionId = sessionId;
    state.selectedHistoryIndex = -1;
  }

  async function startComparison(): Promise<void> {
    if (!state.program || !state.view || state.view.groups.length === 0) return;
    if (state.comparison?.isGenerating) return;

    state.comparison = {
      alternativeGroups: [],
      alternativeAnalytics: {
        percentAssignedTopChoice: 0,
        averagePreferenceRankAssigned: 0
      },
      isGenerating: true
    };

    try {
      const existingGroups = state.view.groups;
      const studentCount = state.students.length;
      const groupCount = existingGroups.length;
      const groups = Array.from({ length: groupCount }, (_, i) => ({
        name: i < existingGroups.length ? existingGroups[i].name : `Group ${i + 1}`,
        capacity: null as number | null
      }));

      const result = await generateCandidate(state.env, {
        programId: state.program.id,
        algorithmId: 'balanced',
        algorithmConfig: {
          groups,
          avoidRecentGroupmates: state.avoidRecentGroupmates,
          lookbackSessions: state.lookbackSessions
        }
      });

      if (isErr(result)) {
        state.comparison = null;
        state.generationError = getGenerationErrorMessage(result.error.type);
        return;
      }

      state.comparison = {
        alternativeGroups: result.value.groups,
        alternativeAnalytics: result.value.analytics,
        isGenerating: false
      };
    } catch {
      state.comparison = null;
    }
  }

  function keepCurrentArrangement(): void {
    state.comparison = null;
  }

  function useAlternativeArrangement(): void {
    if (!state.comparison || !state.editingStore) return;

    // Save current to history before adopting alternative
    const currentGroups = state.view?.groups ?? [];
    const currentAnalytics = state.view?.currentAnalytics ?? null;
    if (currentGroups.length > 0) {
      state.generationHistory = [
        {
          groups: currentGroups.map((g) => ({ ...g, memberIds: [...g.memberIds] })),
          analytics: currentAnalytics,
          generatedAt: new Date()
        },
        ...state.generationHistory
      ].slice(0, 10);
    }

    state.editingStore.regenerate(state.comparison.alternativeGroups);
    state.comparison = null;
    state.selectedHistoryIndex = -1;
  }

  function closeComparison(): void {
    state.comparison = null;
  }

  // --- Settings (WP10) ---

  function setAvoidRecentGroupmates(enabled: boolean): void {
    state.avoidRecentGroupmates = enabled;
    persistSettings();
  }

  function setLookbackSessions(sessions: number): void {
    state.lookbackSessions = Math.min(10, Math.max(1, Math.round(sessions)));
    persistSettings();
  }

  function toggleSettingsPanel(): void {
    state.settingsPanelOpen = !state.settingsPanelOpen;
  }

  function enterProjection(): void {
    state.liveSessionStatus = 'PROJECTING';
  }

  function exitProjection(): void {
    state.liveSessionStatus = 'IDLE';
  }

  /**
   * Replace placeholder students with real names (WP11 / Decision 5, Banked Note #2).
   *
   * When counts match, remaps student IDs in existing groups so the group structure
   * is preserved — the experience feels like "upgrading" not "starting over".
   * When counts differ, clears the scenario so the teacher regenerates.
   */
  async function upgradeRoster(
    students: Array<{ firstName: string; lastName: string }>
  ): Promise<void> {
    if (!state.pool) return;

    const result = await upgradeQuickStartRoster(state.env, {
      poolId: state.pool.id,
      students
    });

    if (isErr(result)) {
      state.generationError = result.error.message;
      return;
    }

    const { newStudents, countsMatch, idMapping } = result.value;

    // Update local state with new students
    state.students = newStudents;
    state.pool = { ...state.pool, memberIds: newStudents.map((s) => s.id) };
    rebuildStudentsById();
    state.hasPlaceholderStudents = false;

    if (countsMatch && state.editingStore && state.view) {
      // Remap student IDs in existing groups to preserve structure
      const remappedGroups = state.view.groups.map((group) => ({
        ...group,
        memberIds: group.memberIds.map((id) => idMapping.get(id) ?? id)
      }));
      await state.editingStore.regenerate(remappedGroups);
    } else {
      // Counts differ — clear scenario so teacher regenerates
      unsubscribeEditingStore?.();
      unsubscribeEditingStore = null;
      state.editingStore?.destroy();
      state.editingStore = null;
      state.view = null;
      state.scenario = null;
      state.generationHistory = [];
      state.selectedHistoryIndex = -1;
    }
  }

  // --- Publish state ---

  function computeIsPublished(): void {
    state.isPublished =
      state.latestPublishedSession !== null &&
      state.scenario !== null &&
      state.latestPublishedSession.scenarioId === state.scenario.id;
  }

  // --- Session Lifecycle ---

  async function publishSession(): Promise<void> {
    if (!state.program || !state.scenario || state.isPublishing) return;

    state.isPublishing = true;

    try {
      const result = await showToClass(state.env, {
        programId: state.program.id,
        scenarioId: state.scenario.id
      });

      if (isErr(result)) {
        state.generationError = 'Failed to publish session.';
        return;
      }

      const session = result.value;
      state.sessions = [...state.sessions, session];
      state.latestPublishedSession = session;
      computeIsPublished();

      // Enter projection mode on first publish
      state.liveSessionStatus = 'PROJECTING';
    } finally {
      state.isPublishing = false;
    }
  }

  function startNewSession(): void {
    if (!state.editingStore) return;

    // Clear groups to start fresh
    state.editingStore.regenerate([]);
    state.latestPublishedSession = null;
    state.isPublished = false;
    state.generationHistory = [];
    state.selectedHistoryIndex = -1;
    state.viewingSessionId = null;
    state.viewingSessionGroups = [];
  }

  async function deleteSessionAction(sessionId: string): Promise<void> {
    const result = await deleteSessionUseCase(state.env, { sessionId });
    if (isErr(result)) return;

    state.sessions = state.sessions.filter((s) => s.id !== sessionId);

    // If we deleted the latest published session, recompute
    if (state.latestPublishedSession?.id === sessionId) {
      const published = state.sessions
        .filter((s) => s.status === 'PUBLISHED')
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
      state.latestPublishedSession = published[0] ?? null;
      computeIsPublished();
    }

    // Refresh pairing stats since placements changed
    if (state.program) {
      const publishedSessions = state.sessions.filter(
        (s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED'
      );
      if (publishedSessions.length >= 2) {
        const statsResult = await getProgramPairingStats(state.env, {
          programId: state.program.id
        });
        if (!isErr(statsResult)) {
          state.pairingStats = statsResult.value.pairs;
        }
      } else {
        state.pairingStats = [];
      }
    }
  }

  async function renameSession(sessionId: string, name: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updated = { ...session, name: trimmedName };
    await state.env.sessionRepo.update(updated);
    state.sessions = state.sessions.map((s) => (s.id === sessionId ? updated : s));

    if (state.latestPublishedSession?.id === sessionId) {
      state.latestPublishedSession = updated;
    }
  }

  // --- Student CRUD ---

  async function addStudent(input: {
    firstName: string;
    lastName?: string;
    gradeLevel?: string;
    gender?: string;
  }): Promise<{ success: boolean; studentId?: string }> {
    if (!state.pool) return { success: false };

    const result = await addStudentToPool(state.env, {
      poolId: state.pool.id,
      ...input
    });

    if (isErr(result)) return { success: false };

    const { student, pool } = result.value;
    state.students = [...state.students, student];
    state.pool = pool;
    rebuildStudentsById();
    detectPlaceholderStudents();
    return { success: true, studentId: student.id };
  }

  async function updateStudentAction(input: {
    studentId: string;
    firstName?: string;
    lastName?: string;
    gradeLevel?: string;
    gender?: string;
  }): Promise<boolean> {
    const result = await updateStudentUseCase(state.env, input);

    if (isErr(result)) return false;

    const { student } = result.value;
    state.students = state.students.map((s) => (s.id === student.id ? student : s));
    rebuildStudentsById();
    return true;
  }

  async function removeStudentAction(studentId: string): Promise<boolean> {
    if (!state.pool || !state.program) return false;

    // If student is in a group, move them to unassigned first (editing store)
    if (state.editingStore && state.view) {
      const groupWithStudent = state.view.groups.find((g) =>
        g.memberIds.includes(studentId)
      );
      if (groupWithStudent) {
        state.editingStore.dispatch({
          type: 'MOVE_STUDENT',
          studentId,
          source: groupWithStudent.id,
          target: 'unassigned'
        });
      }
    }

    const result = await removeStudentFromPool(state.env, {
      poolId: state.pool.id,
      studentId,
      programId: state.program.id
    });

    if (isErr(result)) return false;

    state.students = state.students.filter((s) => s.id !== studentId);
    state.pool = { ...state.pool, memberIds: state.pool.memberIds.filter((id) => id !== studentId) };
    rebuildStudentsById();
    detectPlaceholderStudents();
    computeUnplacedStudentCount();
    return true;
  }

  return {
    get state() {
      return state;
    },
    actions: {
      init,
      dispose,
      generateGroups,
      assignAll,
      shuffleGroups,
      moveStudent,
      reorderStudent,
      sortGroup,
      createGroup,
      updateGroup,
      deleteGroup,
      keyboardPickUp,
      keyboardDrop,
      keyboardCancel,
      keyboardMove,
      selectHistoryEntry,
      toggleHistoryPanel,
      selectSession,
      startComparison,
      keepCurrentArrangement,
      useAlternativeArrangement,
      closeComparison,
      setAvoidRecentGroupmates,
      setLookbackSessions,
      toggleSettingsPanel,
      enterProjection,
      exitProjection,
      publishSession,
      startNewSession,
      deleteSession: deleteSessionAction,
      renameSession,
      upgradeRoster,
      addStudent,
      updateStudent: updateStudentAction,
      removeStudent: removeStudentAction
    }
  };
}
