<script lang="ts">
  /**
   * ClassView — The product. Everything happens here.
   *
   * Two-panel layout: left roster, right groups (empty state for WP4).
   * Orchestrates the Class View VM, toolbar, roster panel, and import flow.
   *
   * See: project definition.md — Decision 2, Part 3 (Class View), WP4
   */

  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { createClassViewVm } from '$lib/stores/class-view-vm.svelte';
  import { addStudentToPool, resolveOrCreateTags } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';
  import { exportGroupsToColumnsTSV } from '$lib/utils/csvExport';
  import type { SortBy } from '$lib/utils/csvExport';
  import { downloadActivityFile, generateExportFilename } from '$lib/utils/activityFile';
  import { toPng } from 'html-to-image';
  import { prepareWorkspaceExport } from '$lib/services/appEnvUseCases';
  import { Alert, OverlaySheet } from '$lib/components/ui';
  import { parseRosterFromMappedData, parseRosterFromPaste } from '$lib/services/rosterImport';
  import { getSourceStudentId, getStudentGivenName, getStudentLongName } from '$lib/domain/student';
  import { detectSimpleNameList } from '$lib/utils/pasteDetection';
  import ClassViewToolbar from './ClassViewToolbar.svelte';
  import FloatingMiniToolbar from './FloatingMiniToolbar.svelte';
  import RosterPanel from './RosterPanel.svelte';
  import RosterImportModal from './RosterImportModal.svelte';
  import GroupsPanel from './GroupsPanel.svelte';
  import AnalyticsPanel from '$lib/components/editing/AnalyticsPanel.svelte';
  import ScenarioComparison from '$lib/components/editing/ScenarioComparison.svelte';
  import ContextualHint from '$lib/components/common/ContextualHint.svelte';
  import StudentDetailSidebar from '$lib/components/workspace/StudentDetailSidebar.svelte';
  import HistoryPopover from '$lib/components/workspace/HistoryPopover.svelte';
  import EditGroupModal from './EditGroupModal.svelte';
  import ManageTagsPanel from './ManageTagsPanel.svelte';
  import RemoveStudentConfirmDialog from './RemoveStudentConfirmDialog.svelte';
  import DeleteSessionConfirmDialog from './DeleteSessionConfirmDialog.svelte';
  import NewSessionConfirmDialog from './NewSessionConfirmDialog.svelte';
  import SortOrderDialog from './SortOrderDialog.svelte';
  import { hintState } from '$lib/stores/hintState.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';

  interface Props {
    activityId: string;
  }

  let { activityId }: Props = $props();

  let env = getAppEnvContext();
  let vm = createClassViewVm(env);

  let importModalOpen = $state(false);

  // Roster drawer: persist open/closed state per activity in localStorage
  const rosterStorageKey = `groupwheel:roster:${activityId}`;
  let rosterDrawerOpen = $state(
    (() => {
      try {
        const stored = localStorage.getItem(rosterStorageKey);
        return stored !== null ? stored === 'true' : false; // default closed on first visit
      } catch {
        return true;
      }
    })()
  );

  function handleToggleRoster() {
    const opening = !rosterDrawerOpen;
    rosterDrawerOpen = opening;
    try {
      localStorage.setItem(rosterStorageKey, String(rosterDrawerOpen));
    } catch {
      /* ignore */
    }
    // On mobile or when gap too small, auto-close student detail
    if (opening && studentSidebarOpen && (!isDesktop || !canCoexist())) {
      selectedStudentId = null;
      studentSidebarMode = 'view';
      studentDetailPanelOpen = false;
    }
  }

  // Responsive roster width: 280px at ≥1024, 320px at ≥1440
  let rosterWidth = $state(280);
  $effect(() => {
    const wide = window.matchMedia('(min-width: 1440px)');
    rosterWidth = wide.matches ? 320 : 280;
    function onChange(e: MediaQueryListEvent) {
      rosterWidth = e.matches ? 320 : 280;
    }
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  });

  // Student detail width
  const studentDetailWidth = 320; // w-80 = 320px

  // Coexistence rule: auto-close the older panel if gap < 400px on desktop (≥1024px)
  let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1280);
  $effect(() => {
    function onResize() {
      windowWidth = window.innerWidth;
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });
  const isDesktop = $derived(windowWidth >= 1024);
  const MIN_GAP = 400;

  /** Check whether both panels can coexist at the current viewport width */
  function canCoexist(): boolean {
    return isDesktop && windowWidth - rosterWidth - studentDetailWidth >= MIN_GAP;
  }

  // Derived state from VM
  let loading = $derived(vm.state.loading);
  let loadError = $derived(vm.state.loadError);
  let generationError = $derived(vm.state.generationError);
  let isGenerating = $derived(vm.state.isGenerating);
  let program = $derived(vm.state.program);
  let students = $derived(vm.state.students);
  let studentsById = $derived(vm.state.studentsById);
  let tags = $derived(vm.state.tags);
  let tagsById = $derived(vm.state.tagsById);
  let view = $derived(vm.state.view);
  let pool = $derived(vm.state.pool);
  let peerRequestSummaryByStudentId = $derived(vm.state.peerRequestSummaryByStudentId);
  let selectedStudentRequestedPeerIds = $derived(vm.state.selectedStudentRequestedPeerIds);
  let unplacedStudentCount = $derived(vm.state.unplacedStudentCount);
  let unassignedStudentIds = $derived(vm.state.unassignedStudentIds);

  // Quick Start upgrade path (WP11 / Decision 5)
  let hasPlaceholderStudents = $derived(vm.state.hasPlaceholderStudents);

  let activityName = $derived(program?.name ?? 'Activity');
  let saveStatus = $derived(view?.saveStatus ?? 'idle');
  let lastSavedAt = $derived(view?.lastSavedAt ?? null);
  let draggingId = $derived(vm.state.draggingId);
  let pickedUpStudentId = $derived(vm.state.pickedUpStudentId);
  let hasGroups = $derived((view?.groups.length ?? 0) > 0);
  let newGroupId = $derived(vm.state.newGroupId);
  let isPublished = $derived(vm.state.isPublished);

  // Preference-adaptive UI (WP8 / Decision 4)
  let studentPreferenceRanks = $derived(vm.state.studentPreferenceRanks);
  let studentHasPreferences = $derived(vm.state.studentHasPreferences);
  let hasPreferenceData = $derived(vm.state.hasPreferenceData);
  let studentsWithPreferencesCount = $derived(vm.state.studentsWithPreferencesCount);
  /** Analytics panel appears when >=3 students have preferences (Banked Note #1) */
  // TODO: Re-enable preference analytics when ready to bring it back
  // let showAnalytics = $derived(studentsWithPreferencesCount >= 3 && hasGroups);
  let showAnalytics = false;
  let analyticsOpen = $state(false);
  let baseline = $derived(view?.baseline ?? null);
  let currentAnalytics = $derived(view?.currentAnalytics ?? null);
  let analyticsDelta = $derived(view?.analyticsDelta ?? null);
  let groupCount = $derived(view?.groups.length ?? 0);

  // Settings & rotation avoidance (WP10 / Decision 6)
  let avoidRecentGroupmates = $derived(vm.state.avoidRecentGroupmates);
  let lookbackSessions = $derived(vm.state.lookbackSessions);
  let publishedSessionCount = $derived(
    vm.state.sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED').length
  );
  /**
   * One-time hint after second session (Decision 6):
   * "Groups now avoid recent groupmates. Change this in Settings."
   * Shows once after 2+ published sessions, then never returns.
   */
  let showRotationHint = $derived(
    publishedSessionCount >= 2 && hasGroups && !hintState.isDismissed('rotationAvoidance')
  );

  // History & comparison (WP9)
  let generationHistory = $derived(vm.state.generationHistory);
  let selectedHistoryIndex = $derived(vm.state.selectedHistoryIndex);
  let sessions = $derived(vm.state.sessions);
  let historyPanelOpen = $derived(vm.state.historyPanelOpen);
  let comparison = $derived(vm.state.comparison);
  let viewingSessionId = $derived(vm.state.viewingSessionId);
  let viewingSessionGroups = $derived(vm.state.viewingSessionGroups);
  /** Show history button when there are past published sessions */
  let hasHistory = $derived(
    sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED').length > 0
  );
  /** Groups to display: past session placements, generation history entry, or current view */
  let rawDisplayGroups = $derived(
    viewingSessionId
      ? viewingSessionGroups
      : selectedHistoryIndex >= 0 && selectedHistoryIndex < generationHistory.length
        ? generationHistory[selectedHistoryIndex].groups
        : (view?.groups ?? [])
  );
  /** Filter inactive students out of group memberIds so they don't appear on the canvas */
  let displayGroups = $derived(
    vm.state.inactiveStudentIds.size > 0
      ? rawDisplayGroups.map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((id) => !vm.state.inactiveStudentIds.has(id))
        }))
      : rawDisplayGroups
  );
  let isViewingHistory = $derived(viewingSessionId !== null || selectedHistoryIndex >= 0);
  let viewingSession = $derived(
    viewingSessionId ? (sessions.find((s) => s.id === viewingSessionId) ?? null) : null
  );

  // Desktop editing mode shows the FloatingMiniToolbar; mobile/history-viewing
  // modes use the full-width ClassViewToolbar in flex flow.
  const canAutoHideToolbar = $derived(isDesktop && !isViewingHistory);

  // Map group IDs to display names for preference display
  let groupNameMap = $derived(Object.fromEntries((view?.groups ?? []).map((g) => [g.id, g.name])));

  // Student detail sidebar
  let selectedStudentId = $state<string | null>(null);
  let studentSidebarMode = $state<'view' | 'edit' | 'create'>('view');
  /** Explicit visibility keeps roster selection inline while canvas profile actions open the right panel. */
  let studentDetailPanelOpen = $state(false);
  /** Populated by the sidebar on mount — routes backdrop/Escape through the dirty-check guard. */
  let studentSidebarRequestClose = $state<(() => void) | undefined>(undefined);
  let showRemoveConfirm = $state(false);
  let deletingSessionId = $state<string | null>(null);
  let deletingSession = $derived(
    deletingSessionId ? (sessions.find((s) => s.id === deletingSessionId) ?? null) : null
  );
  let selectedStudent = $derived(
    selectedStudentId ? (studentsById[selectedStudentId] ?? null) : null
  );
  let selectedStudentPreferences = $derived(
    selectedStudentId ? (vm.state.preferenceMap[selectedStudentId] ?? null) : null
  );
  let selectedStudentPeerRequestSummary = $derived(
    selectedStudentId ? (peerRequestSummaryByStudentId.get(selectedStudentId) ?? null) : null
  );
  let selectedStudentRecentGroupmates = $derived.by(() => {
    if (!selectedStudentId) return [];
    const stats = vm.state.pairingStats;
    return stats
      .filter((s) => s.studentAId === selectedStudentId || s.studentBId === selectedStudentId)
      .map((s) => ({
        studentName: s.studentAId === selectedStudentId ? s.studentBName : s.studentAName,
        count: s.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });
  // Preference highlighting state (separate from sidebar selection)
  let groupClickStudentId = $state<string | null>(null); // sticky: set by clicking student in groups
  let dragRestoreGroupClickStudentId = $state<string | null>(null);
  let dragRestorePeerRequestSourceStudentId = $state<string | null>(null);

  let activeStudentLikeGroupIds = $derived.by(() => {
    const activeId = draggingId ?? groupClickStudentId;
    if (!activeId) return null;
    const prefs = vm.state.preferenceMap[activeId];
    const result = prefs?.likeGroupIds?.length ? prefs.likeGroupIds : null;
    return result;
  });

  let studentSidebarOpen = $derived(
    studentDetailPanelOpen ||
      (selectedStudent !== null && studentSidebarMode === 'edit') ||
      studentSidebarMode === 'create'
  );
  let removeStudentIsInGroup = $derived.by(() => {
    if (!selectedStudentId || !view) return false;
    return view.groups.some((g) => g.memberIds.includes(selectedStudentId!));
  });

  onMount(() => {
    vm.actions.init(activityId);
  });

  onDestroy(() => {
    vm.actions.dispose();
  });

  function handleBack() {
    goto('/');
  }

  function handleRetrySave() {
    vm.state.editingStore?.retrySave();
  }

  function handleDrop(payload: {
    studentId: string;
    source: string;
    target: string;
    targetIndex?: number;
  }) {
    vm.actions.moveStudent(payload);
  }

  function handleReorder(payload: { groupId: string; studentId: string; newIndex: number }) {
    vm.actions.reorderStudent(payload);
  }

  function handleDragStart(id: string) {
    dragRestoreGroupClickStudentId = groupClickStudentId;
    dragRestorePeerRequestSourceStudentId = vm.state.selectedPeerRequestSourceStudentId;
    groupClickStudentId = null; // clear sticky preference highlight during drag
    vm.actions.selectStudentPeerRequests(id);
    vm.state.draggingId = id;
  }

  function handleDragEnd() {
    vm.state.draggingId = null;
    groupClickStudentId = dragRestoreGroupClickStudentId;
    vm.actions.selectStudentPeerRequests(dragRestorePeerRequestSourceStudentId);
    dragRestoreGroupClickStudentId = null;
    dragRestorePeerRequestSourceStudentId = null;
  }

  function handleCreateGroup() {
    vm.actions.createGroup();
  }

  function handleUpdateGroup(
    groupId: string,
    changes: Partial<Pick<import('$lib/domain').Group, 'name' | 'capacity' | 'colorIndex'>>
  ) {
    vm.actions.updateGroup(groupId, changes);
  }

  function handleDeleteGroup(groupId: string) {
    vm.actions.deleteGroup(groupId);
  }

  async function handleShowToClass() {
    await vm.actions.publishSession();
  }

  async function handleDisplay() {
    // Auto-save as a session when displaying unpublished groups
    if (hasGroups && !isPublished) {
      await vm.actions.publishSession();
    }
    window.open(`/activity/${activityId}/display`, '_blank');
  }

  function handlePrint() {
    pendingExportAction = 'print';
    showSortDialog = true;
  }

  async function handleCopyForSpreadsheet() {
    pendingExportAction = 'copy';
    showSortDialog = true;
  }

  function handleMoveToComputer() {
    pendingExportAction = 'move';
    showSortDialog = true;
  }

  function handleSortCancel() {
    showSortDialog = false;
    pendingExportAction = null;
  }

  async function handleSortSelected(sortBy: SortBy) {
    showSortDialog = false;
    const action = pendingExportAction;
    pendingExportAction = null;

    // Sort the groups on the UI as well
    if (sortBy !== 'none' && vm.state.editingStore && vm.state.view && !isViewingHistory) {
      for (const group of vm.state.view.groups) {
        const sorted = [...group.memberIds].sort((a, b) => {
          const sa = vm.state.studentsById[a];
          const sb = vm.state.studentsById[b];
          if (!sa || !sb) return 0;
          const primaryA = sortBy === 'firstName' ? getStudentGivenName(sa) : (sa.lastName ?? '');
          const primaryB = sortBy === 'firstName' ? getStudentGivenName(sb) : (sb.lastName ?? '');
          const secondaryA = sortBy === 'firstName' ? (sa.lastName ?? '') : getStudentGivenName(sa);
          const secondaryB = sortBy === 'firstName' ? (sb.lastName ?? '') : getStudentGivenName(sb);
          const primaryCmp = primaryA.localeCompare(primaryB, undefined, { sensitivity: 'base' });
          if (primaryCmp !== 0) return primaryCmp;
          return secondaryA.localeCompare(secondaryB, undefined, { sensitivity: 'base' });
        });
        vm.state.editingStore.reorderGroup(group.id, sorted);
      }
    }

    if (action === 'print') {
      window.open(`/activity/${activityId}/print?sort=${sortBy}`, '_blank');
      toastStore.success('Print view opened in a new tab');
    } else if (action === 'copy') {
      const groups = displayGroups;
      if (!groups.length) return;
      const studentsMap = new Map(Object.entries(studentsById));
      const tsv = exportGroupsToColumnsTSV(groups, studentsMap, sortBy);
      try {
        await env?.clipboard?.writeText(tsv);
        toastStore.success('Copied to clipboard — paste into a spreadsheet');
      } catch {
        toastStore.error('Failed to copy to clipboard');
      }
    } else if (action === 'move') {
      if (!program || !view) return;
      const peerRequests = await env.peerRequestRepo.listByProgramId(program.id);
      const exportResult = prepareWorkspaceExport(env, {
        program,
        students,
        tags,
        preferences: vm.state.preferences,
        peerRequests,
        groups: view.groups,
        algorithmConfig: vm.state.scenario?.algorithmConfig,
        rowLayout: null
      });
      if (exportResult.status === 'err') return;
      const filename = generateExportFilename(program.name);
      downloadActivityFile(exportResult.value.activityExportData, filename);
      toastStore.success('Activity file saved');
    }
  }

  // New session confirmation
  let showNewSessionConfirm = $state(false);

  // Edit group modal
  let editingGroupId = $state<string | null>(null);
  let editingGroup = $derived(
    editingGroupId ? (displayGroups.find((g) => g.id === editingGroupId) ?? null) : null
  );
  let editingSiblingNames = $derived(
    editingGroupId ? displayGroups.filter((g) => g.id !== editingGroupId).map((g) => g.name) : []
  );

  function handleEditGroup(groupId: string) {
    editingGroupId = groupId;
  }

  function handleEditGroupSave(
    changes: Partial<Pick<import('$lib/domain').Group, 'name' | 'capacity' | 'colorIndex'>>
  ) {
    if (editingGroupId) {
      vm.actions.updateGroup(editingGroupId, changes);
    }
  }

  function handleEditGroupDelete(groupId: string) {
    vm.actions.deleteGroup(groupId);
  }

  let manageTagsOpen = $state(false);
  function handleOpenManageTags() {
    manageTagsOpen = true;
  }

  // Sort order dialog for export/print/copy actions
  let showSortDialog = $state(false);
  let pendingExportAction = $state<'print' | 'copy' | 'move' | null>(null);

  function handleRequestNewSession() {
    showNewSessionConfirm = true;
  }

  function handleConfirmNewSession() {
    showNewSessionConfirm = false;
    vm.actions.startNewSession();
  }

  function handleCancelNewSession() {
    showNewSessionConfirm = false;
  }

  function handleRequestDeleteSession(sessionId: string) {
    deletingSessionId = sessionId;
  }

  async function handleConfirmDeleteSession() {
    if (!deletingSessionId) return;
    // If deleting the session we're currently viewing, go back to current
    if (viewingSessionId === deletingSessionId) {
      await vm.actions.selectSession(null);
    }
    await vm.actions.deleteSession(deletingSessionId);
    deletingSessionId = null;
  }

  function handleCancelDeleteSession() {
    deletingSessionId = null;
  }

  function handleRenameSession(sessionId: string, name: string) {
    vm.actions.renameSession(sessionId, name);
  }

  function handleToggleHistory() {
    selectedStudentId = null;
    studentDetailPanelOpen = false;
    // When closing the history panel, return to current session
    if (historyPanelOpen && viewingSessionId) {
      vm.actions.selectSession(null);
    }
    vm.actions.toggleHistoryPanel();
  }

  /** Roster click: open the selected student's edit sidebar. */
  function handleStudentClick(studentId: string) {
    selectedStudentId = studentId;
    studentSidebarMode = 'edit';
    studentDetailPanelOpen = true;
  }

  /** Group card click: toggle preference highlighting only (no sidebar) */
  function handleGroupStudentClick(studentId: string) {
    if (groupClickStudentId === studentId) {
      groupClickStudentId = null;
      vm.actions.selectStudentPeerRequests(null);
      return;
    }
    groupClickStudentId = studentId;
    vm.actions.selectStudentPeerRequests(studentId);
  }

  function handleOpenStudentDetailFromCard(studentId: string) {
    selectedStudentId = studentId;
    studentSidebarMode = 'edit';
    studentDetailPanelOpen = true;
    groupClickStudentId = studentId;
    vm.actions.selectStudentPeerRequests(studentId);

    // On mobile or when space is constrained, show one side panel at a time.
    if (rosterDrawerOpen && (!isDesktop || !canCoexist())) {
      rosterDrawerOpen = false;
      try {
        localStorage.setItem(rosterStorageKey, 'false');
      } catch {
        /* ignore */
      }
    }
  }

  async function handleQuickEditPeerRequest(payload: { requestId: string; studentId: string }) {
    await vm.actions.setPeerRequestMatch(payload);
  }

  async function handleCreatePeerRequest(payload: {
    requesterStudentId: string;
    requestedStudentId: string;
  }) {
    await vm.actions.createPeerRequest(payload);
  }

  async function handleClearPeerRequest(requestId: string) {
    await vm.actions.clearPeerRequestMatch(requestId);
  }

  async function handleDeletePeerRequest(requestId: string) {
    await vm.actions.deletePeerRequest(requestId);
  }

  function handleCloseStudentDetail() {
    // When closing the edit/create sidebar, keep student selected in roster
    // but return to view mode (which shows inline detail, not sidebar)
    studentDetailPanelOpen = false;
    studentSidebarMode = 'view';
    if (!selectedStudentId) {
      // Only clear if we were in create mode (no student to go back to)
      selectedStudentId = null;
    }
  }

  function handleStartAddStudent() {
    if (historyPanelOpen) vm.actions.toggleHistoryPanel();
    selectedStudentId = null;
    studentSidebarMode = 'create';
    studentDetailPanelOpen = true;
    // On mobile or when gap too small, auto-close roster
    if (rosterDrawerOpen && (!isDesktop || !canCoexist())) {
      rosterDrawerOpen = false;
      try {
        localStorage.setItem(rosterStorageKey, 'false');
      } catch {
        /* ignore */
      }
    }
  }

  async function handleSaveStudent(data: {
    firstName: string;
    preferredName?: string;
    lastName?: string;
    gradeLevel?: string;
    gender?: string;
    tagIds?: string[];
    sourceStudentId?: string;
    preferences?: import('$lib/domain/preference').StudentPreference;
  }): Promise<boolean> {
    const { preferences, ...studentData } = data;
    if (studentSidebarMode === 'create') {
      const result = await vm.actions.addStudent(studentData);
      if (result.success && result.studentId) {
        selectedStudentId = result.studentId;
        studentSidebarMode = 'view';
        studentDetailPanelOpen = false;
        return true;
      }
      return result.success;
    } else {
      // Edit mode
      if (!selectedStudentId) return false;
      const success = await vm.actions.updateStudent({
        studentId: selectedStudentId,
        ...studentData
      });
      if (success && preferences) {
        const preferenceSaved = await vm.actions.updateStudentPreference(preferences);
        if (!preferenceSaved) return false;
      }
      if (success) {
        studentSidebarMode = 'view';
        studentDetailPanelOpen = false;
      }
      return success;
    }
  }

  function handleEditStudent() {
    studentSidebarMode = 'edit';
    studentDetailPanelOpen = true;
  }

  function handleCancelEditStudent() {
    if (studentSidebarMode === 'create') {
      selectedStudentId = null;
      studentSidebarMode = 'view';
    } else {
      studentSidebarMode = 'view';
    }
    studentDetailPanelOpen = false;
  }

  function handleRequestRemoveStudent() {
    showRemoveConfirm = true;
  }

  async function handleConfirmRemoveStudent() {
    if (!selectedStudentId) return;
    await vm.actions.removeStudent(selectedStudentId);
    selectedStudentId = null;
    studentSidebarMode = 'view';
    studentDetailPanelOpen = false;
    showRemoveConfirm = false;
  }

  function handleCancelRemoveStudent() {
    showRemoveConfirm = false;
  }

  function handleDismissRotationHint() {
    hintState.dismiss('rotationAvoidance');
  }

  function openImportModal() {
    importModalOpen = true;
  }

  function closeImportModal() {
    importModalOpen = false;
  }

  /**
   * Parse a name string into first/last name.
   * Handles "First Last", "Last, First", and single names.
   */
  function parseName(name: string): { firstName: string; lastName: string } {
    const trimmed = name.trim();

    // "Last, First" format
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map((p) => p.trim());
      return { firstName: parts[1] ?? '', lastName: parts[0] ?? '' };
    }

    // "First Last" format (or single name)
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  }

  async function handleImport(
    pastedText: string,
    rawData?: import('$lib/domain/import').RawSheetData,
    columnMappings?: import('$lib/domain/import').ColumnMapping[]
  ) {
    if (!pool) {
      throw new Error('No roster found for this activity');
    }

    let parsedStudents: Array<{
      firstName: string;
      preferredName?: string;
      lastName: string;
      rawTags?: string[];
      sourceStudentId?: string;
    }> = [];

    try {
      const rosterData =
        rawData && columnMappings
          ? parseRosterFromMappedData(rawData, columnMappings)
          : parseRosterFromPaste(pastedText);
      parsedStudents = rosterData.studentOrder.map((id) => {
        const student = rosterData.studentsById[id];
        const rawTags = rosterData.rawTagsByStudentId[id];
        return {
          firstName: student?.firstName ?? '',
          preferredName: student?.preferredName,
          lastName: student?.lastName ?? '',
          rawTags,
          sourceStudentId: student ? getSourceStudentId(student) : undefined
        };
      });
    } catch {
      const detection = detectSimpleNameList(pastedText);
      if (!detection.isSimpleNameList) {
        throw new Error(
          'Could not parse the pasted text. Paste one student per line, or tab-separated First, Last, ID rows.'
        );
      }

      parsedStudents = detection.names.map((name) => parseName(name));
    }

    // WP11: If current roster is all placeholders, upgrade instead of append
    if (hasPlaceholderStudents) {
      await vm.actions.upgradeRoster(parsedStudents);
      return;
    }

    const errors: string[] = [];
    const addedStudents: typeof students = [];

    for (const { firstName, preferredName, lastName, rawTags, sourceStudentId } of parsedStudents) {
      const resolvedTags = program
        ? await resolveOrCreateTags(env, {
            programId: program.id,
            rawTagNames: rawTags
          })
        : { status: 'ok', value: [] as string[] };
      const result = await addStudentToPool(env, {
        poolId: pool.id,
        firstName,
        preferredName,
        lastName,
        tagIds: resolvedTags.status === 'ok' ? resolvedTags.value : [],
        sourceStudentId
      });

      if (isErr(result)) {
        errors.push(`Failed to add "${firstName} ${lastName}": ${result.error.type}`);
      } else {
        addedStudents.push(result.value.student);
      }
    }

    // Refresh students in VM state
    if (addedStudents.length > 0) {
      vm.state.students = [...vm.state.students, ...addedStudents];
      // Rebuild the lookup map
      const newMap: Record<string, import('$lib/domain').Student> = { ...vm.state.studentsById };
      for (const s of addedStudents) {
        newMap[s.id] = s;
      }
      vm.state.studentsById = newMap;
    }

    if (errors.length > 0 && addedStudents.length === 0) {
      throw new Error(errors.join('\n'));
    }
  }
</script>

<svelte:head>
  <title>{activityName} | Groupwheel</title>
</svelte:head>

<div class="relative flex h-screen flex-col">
  {#if loading}
    <div class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <div
          class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600"
        ></div>
        <p class="mt-3 text-sm text-gray-500">Loading activity...</p>
      </div>
      <button
        type="button"
        class="mt-4 text-sm text-gray-500 hover:text-gray-700"
        onclick={handleBack}
      >
        &larr; Back to Home
      </button>
    </div>
  {:else}
    {#if !canAutoHideToolbar}
      <!-- Full-width toolbar in flex flow for mobile and history-viewing mode -->
      <div class="shrink-0">
        <ClassViewToolbar
          {activityName}
          {saveStatus}
          {lastSavedAt}
          {hasGroups}
          {isViewingHistory}
          onBack={handleBack}
          onRetrySave={handleRetrySave}
          onToggleRoster={handleToggleRoster}
          rosterOpen={rosterDrawerOpen}
          onToggleHistory={handleToggleHistory}
          {historyPanelOpen}
          {hasHistory}
          groups={displayGroups}
          {avoidRecentGroupmates}
          {lookbackSessions}
          {publishedSessionCount}
          onToggleAvoidance={(enabled) => vm.actions.setAvoidRecentGroupmates(enabled)}
          onLookbackChange={(s) => vm.actions.setLookbackSessions(s)}
          onEditGroup={handleEditGroup}
          onAddGroup={handleCreateGroup}
          onManageTags={handleOpenManageTags}
          onCopyForSpreadsheet={handleCopyForSpreadsheet}
          onSave={handleMoveToComputer}
          onPrint={handlePrint}
          onDisplay={handleDisplay}
          onPublish={handleShowToClass}
        />
      </div>
    {:else}
      <!-- Floating mini-toolbar for desktop editing mode -->
      <FloatingMiniToolbar
        {activityName}
        {saveStatus}
        {lastSavedAt}
        {hasGroups}
        onBack={handleBack}
        onRetrySave={handleRetrySave}
        onToggleRoster={handleToggleRoster}
        rosterOpen={rosterDrawerOpen}
        onToggleHistory={handleToggleHistory}
        {historyPanelOpen}
        {hasHistory}
        groups={displayGroups}
        {avoidRecentGroupmates}
        {lookbackSessions}
        {publishedSessionCount}
        onToggleAvoidance={(enabled) => vm.actions.setAvoidRecentGroupmates(enabled)}
        onLookbackChange={(s) => vm.actions.setLookbackSessions(s)}
        onEditGroup={handleEditGroup}
        onAddGroup={handleCreateGroup}
        onManageTags={handleOpenManageTags}
        onCopyForSpreadsheet={handleCopyForSpreadsheet}
        onSave={handleMoveToComputer}
        onPrint={handlePrint}
        onDisplay={handleDisplay}
        onPublish={handleShowToClass}
      />
    {/if}

    <div class="flex flex-1 overflow-hidden">
      <!-- Center: Groups canvas (always full remaining width) -->
      <div
        class="flex flex-1 cursor-default flex-col overflow-hidden bg-gray-50"
        style={isViewingHistory ? 'filter: sepia(0.08); opacity: 0.9;' : ''}
        onclick={() => {
          if (groupClickStudentId) {
            groupClickStudentId = null;
            vm.actions.selectStudentPeerRequests(null);
          }
        }}
      >
        {#if isViewingHistory}
          <div class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <div class="flex items-center justify-between">
              <span>
                {#if viewingSession}
                  Viewing "{viewingSession.name}" (read-only)
                {:else}
                  Viewing a previous arrangement (read-only)
                {/if}
              </span>
              <button
                type="button"
                onclick={() => {
                  vm.actions.selectSession(null);
                  vm.actions.selectHistoryEntry(-1);
                }}
                class="flex min-h-[44px] items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                  />
                </svg>
                Back to current
              </button>
            </div>
          </div>
        {:else if isPublished}
          <div class="border-b border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">
            <div class="flex items-center gap-2">
              <svg
                class="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Groups shared with your class. Saved to history.</span>
            </div>
          </div>
        {/if}
        <!-- Rotation avoidance one-time hint (Decision 6, WP10) -->
        {#if showRotationHint}
          <div class="border-b border-gray-200 px-4 py-3">
            <ContextualHint
              title="Groups avoid recent groupmates"
              icon="sparkles"
              dismissible={true}
              onDismiss={handleDismissRotationHint}
            >
              <p>
                Students are automatically grouped with different people than recent sessions.
                <button
                  type="button"
                  class="font-medium text-teal-800 underline hover:text-teal-900"
                  onclick={() => {
                    handleDismissRotationHint();
                  }}
                >
                  Change this in Settings
                </button>
              </p>
            </ContextualHint>
          </div>
        {/if}

        <GroupsPanel
          groups={displayGroups}
          {studentsById}
          {tagsById}
          studentCount={students.length}
          readOnly={isPublished || isViewingHistory}
          onGenerate={(groupCount) => vm.actions.generateGroups(groupCount)}
          onImport={openImportModal}
          disabled={loading || !!loadError || isViewingHistory}
          {isGenerating}
          {generationError}
          unplacedStudentCount={isViewingHistory ? 0 : unplacedStudentCount}
          unassignedStudentIds={isViewingHistory ? [] : unassignedStudentIds}
          draggingId={hasGroups && !isViewingHistory ? draggingId : null}
          onDrop={hasGroups && !isViewingHistory ? handleDrop : undefined}
          onReorder={hasGroups && !isViewingHistory ? handleReorder : undefined}
          onDragStart={hasGroups && !isViewingHistory ? handleDragStart : undefined}
          onDragEnd={hasGroups && !isViewingHistory ? handleDragEnd : undefined}
          onUpdateGroup={hasGroups && !isViewingHistory ? handleUpdateGroup : undefined}
          onDeleteGroup={hasGroups && !isViewingHistory ? handleDeleteGroup : undefined}
          onAddGroup={hasGroups && !isViewingHistory ? handleCreateGroup : undefined}
          newGroupId={!isViewingHistory ? newGroupId : null}
          pickedUpStudentId={hasGroups && !isViewingHistory ? pickedUpStudentId : null}
          onKeyboardPickUp={hasGroups && !isViewingHistory ? vm.actions.keyboardPickUp : undefined}
          onKeyboardDrop={hasGroups && !isViewingHistory ? vm.actions.keyboardDrop : undefined}
          onKeyboardCancel={hasGroups && !isViewingHistory ? vm.actions.keyboardCancel : undefined}
          onKeyboardMove={hasGroups && !isViewingHistory ? vm.actions.keyboardMove : undefined}
          {studentPreferenceRanks}
          {studentHasPreferences}
          onStudentClick={hasGroups && !isViewingHistory ? handleGroupStudentClick : undefined}
          selectedStudentPreferences={activeStudentLikeGroupIds}
          studentPeerRequestSummaryById={peerRequestSummaryByStudentId}
          {selectedStudentRequestedPeerIds}
          onOpenStudentDetail={handleOpenStudentDetailFromCard}
          clickedStudentId={groupClickStudentId}
        />

        <!-- Analytics Panel — expandable, only when preference data warrants it (Decision 4, WP8) -->
        {#if showAnalytics}
          <div class="border-t border-gray-200">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center gap-2 bg-white px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              onclick={() => (analyticsOpen = !analyticsOpen)}
              aria-expanded={analyticsOpen}
              aria-controls="analytics-panel"
            >
              <svg
                class="h-4 w-4 transition-transform {analyticsOpen ? 'rotate-90' : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
              Preference Analytics
              {#if currentAnalytics}
                <span
                  class="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700"
                >
                  {Math.round(currentAnalytics.percentAssignedTopChoice)}% top choice
                </span>
              {/if}
            </button>
            <div id="analytics-panel" class="px-4 pb-3">
              <AnalyticsPanel
                open={analyticsOpen}
                {baseline}
                current={currentAnalytics}
                delta={analyticsDelta}
                studentCount={students.length}
                {groupCount}
              />
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- History popover — rendered as a dropdown from the toolbar area -->
    {#if historyPanelOpen && uiSettings.useExperimentalFeatures}
      <div class="fixed top-14 right-4 z-30">
        <HistoryPopover
          {sessions}
          {viewingSessionId}
          currentSessionId={isPublished ? (vm.state.latestPublishedSession?.id ?? null) : null}
          onSelectSession={(sessionId) => vm.actions.selectSession(sessionId)}
          onClose={handleToggleHistory}
          onDeleteSession={handleRequestDeleteSession}
          onRenameSession={handleRenameSession}
        />
      </div>
    {/if}

    <!-- Display-only toolbar when viewing history -->
    {#if hasGroups && isViewingHistory}
      <div
        class="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full bg-white px-2 py-1.5 shadow-lg"
        role="toolbar"
        aria-label="Display actions"
      >
        <button
          type="button"
          onclick={handleDisplay}
          class="flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          aria-label="Display groups fullscreen"
          title="Display this session"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
          Display
        </button>
      </div>
    {/if}

    <!-- Overlay panels (OverlaySheet, do not reflow the group canvas) -->

    <!-- Roster drawer (left) -->
    <OverlaySheet
      open={rosterDrawerOpen}
      side="left"
      widthPx={rosterWidth}
      onClose={handleToggleRoster}
    >
      <RosterPanel
        {students}
        {loading}
        onImport={openImportModal}
        {studentHasPreferences}
        {hasPreferenceData}
        {hasPlaceholderStudents}
        onAddStudent={handleStartAddStudent}
        onStudentClick={handleStudentClick}
        {selectedStudentId}
        inactiveStudentIds={vm.state.inactiveStudentIds}
      />
    </OverlaySheet>

    <!-- Student Detail Sidebar (right) -->
    <OverlaySheet
      open={studentSidebarOpen}
      side="right"
      widthPx={studentDetailWidth}
      onClose={studentSidebarRequestClose ?? handleCloseStudentDetail}
    >
      <StudentDetailSidebar
        bind:requestCloseHandler={studentSidebarRequestClose}
        student={selectedStudent}
        mode={studentSidebarMode}
        preferences={selectedStudentPreferences}
        {students}
        groups={view?.groups ?? []}
        {tags}
        {tagsById}
        peerRequestSummary={selectedStudentPeerRequestSummary}
        {groupNameMap}
        recentGroupmates={selectedStudentRecentGroupmates}
        onClose={handleCloseStudentDetail}
        onSave={handleSaveStudent}
        onResolveOrCreateTagIds={vm.actions.resolveOrCreateTagIds}
        onAddPeerRequest={handleCreatePeerRequest}
        onQuickEditPeerRequest={handleQuickEditPeerRequest}
        onClearPeerRequest={handleClearPeerRequest}
        onDeletePeerRequest={handleDeletePeerRequest}
        onDelete={handleRequestRemoveStudent}
        onEditMode={handleEditStudent}
        onCancelEdit={handleCancelEditStudent}
        isInactive={selectedStudentId ? vm.state.inactiveStudentIds.has(selectedStudentId) : false}
        onToggleActive={selectedStudentId
          ? () => vm.actions.toggleStudentActive(selectedStudentId!)
          : undefined}
        readOnly={isPublished || isViewingHistory}
      />
    </OverlaySheet>
  {/if}
</div>

<RosterImportModal open={importModalOpen} onClose={closeImportModal} onImport={handleImport} />

{#if comparison && !comparison.isGenerating && view && currentAnalytics}
  <ScenarioComparison
    currentGroups={view.groups}
    {currentAnalytics}
    alternativeGroups={comparison.alternativeGroups}
    alternativeAnalytics={comparison.alternativeAnalytics}
    studentCount={students.length}
    {groupCount}
    {studentsById}
    onKeepCurrent={() => vm.actions.keepCurrentArrangement()}
    onUseAlternative={() => vm.actions.useAlternativeArrangement()}
    onClose={() => vm.actions.closeComparison()}
  />
{/if}

{#if showRemoveConfirm && selectedStudent}
  <RemoveStudentConfirmDialog
    studentName={getStudentLongName(selectedStudent) || selectedStudent.id}
    isInGroup={removeStudentIsInGroup}
    onConfirm={handleConfirmRemoveStudent}
    onCancel={handleCancelRemoveStudent}
  />
{/if}

{#if deletingSession}
  <DeleteSessionConfirmDialog
    sessionName={deletingSession.name}
    onConfirm={handleConfirmDeleteSession}
    onCancel={handleCancelDeleteSession}
  />
{/if}

{#if showNewSessionConfirm}
  <NewSessionConfirmDialog onConfirm={handleConfirmNewSession} onCancel={handleCancelNewSession} />
{/if}

{#if showSortDialog}
  <SortOrderDialog onSelect={handleSortSelected} onCancel={handleSortCancel} />
{/if}

{#if editingGroup}
  <EditGroupModal
    group={editingGroup}
    siblingGroupNames={editingSiblingNames}
    onSave={handleEditGroupSave}
    onDelete={handleEditGroupDelete}
    onClose={() => (editingGroupId = null)}
  />
{/if}

{#if manageTagsOpen && program}
  <ManageTagsPanel
    {program}
    {tags}
    onClose={() => (manageTagsOpen = false)}
    onCreateTag={(input) => vm.actions.createTag(input)}
    onUpdateTag={(tagId, changes) => vm.actions.updateTag(tagId, changes)}
    onDeleteTag={(tagId) => vm.actions.deleteTag(tagId)}
  />
{/if}
