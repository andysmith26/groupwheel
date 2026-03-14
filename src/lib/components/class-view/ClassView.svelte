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
  import { addStudentToPool } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';
  import { Alert, OverlaySheet } from '$lib/components/ui';
  import { detectSimpleNameList } from '$lib/utils/pasteDetection';
  import ClassViewToolbar from './ClassViewToolbar.svelte';
  import RosterPanel from './RosterPanel.svelte';
  import RosterImportModal from './RosterImportModal.svelte';
  import GroupsPanel from './GroupsPanel.svelte';
  // HistoryPanel replaced by HistoryPopover inside ClassViewToolbar (Step 4)
  // SettingsPanel replaced by SettingsPopover inside FloatingToolbar (Step 2)
  // ProjectionMode replaced by /activity/[id]/display route (Step 5)
  import AnalyticsPanel from '$lib/components/editing/AnalyticsPanel.svelte';
  import ScenarioComparison from '$lib/components/editing/ScenarioComparison.svelte';
  import ContextualHint from '$lib/components/common/ContextualHint.svelte';
  import StudentDetailSidebar from '$lib/components/workspace/StudentDetailSidebar.svelte';
  import FloatingToolbar from '$lib/components/workspace/FloatingToolbar.svelte';
  import RemoveStudentConfirmDialog from './RemoveStudentConfirmDialog.svelte';
  import DeleteSessionConfirmDialog from './DeleteSessionConfirmDialog.svelte';
  import { hintState } from '$lib/stores/hintState.svelte';

  interface Props {
    activityId: string;
  }

  let { activityId }: Props = $props();

  let env = getAppEnvContext();
  let vm = createClassViewVm(env);

  let importModalOpen = $state(false);
  let rosterDrawerOpen = $state(true);

  function handleToggleRoster() {
    rosterDrawerOpen = !rosterDrawerOpen;
  }

  // Derived state from VM
  let loading = $derived(vm.state.loading);
  let loadError = $derived(vm.state.loadError);
  let generationError = $derived(vm.state.generationError);
  let isGenerating = $derived(vm.state.isGenerating);
  let program = $derived(vm.state.program);
  let students = $derived(vm.state.students);
  let studentsById = $derived(vm.state.studentsById);
  let view = $derived(vm.state.view);
  let pool = $derived(vm.state.pool);
  let unplacedStudentCount = $derived(vm.state.unplacedStudentCount);

  // Quick Start upgrade path (WP11 / Decision 5)
  let hasPlaceholderStudents = $derived(vm.state.hasPlaceholderStudents);

  let activityName = $derived(program?.name ?? 'Activity');
  let canUndo = $derived(view?.canUndo ?? false);
  let canRedo = $derived(view?.canRedo ?? false);
  let saveStatus = $derived(view?.saveStatus ?? 'idle');
  let lastSavedAt = $derived(view?.lastSavedAt ?? null);
  let draggingId = $derived(vm.state.draggingId);
  let pickedUpStudentId = $derived(vm.state.pickedUpStudentId);
  let hasGroups = $derived((view?.groups.length ?? 0) > 0);
  let newGroupId = $derived(vm.state.newGroupId);
  let isPublished = $derived(vm.state.isPublished);
  let isPublishing = $derived(vm.state.isPublishing);

  // Preference-adaptive UI (WP8 / Decision 4)
  let studentPreferenceRanks = $derived(vm.state.studentPreferenceRanks);
  let studentHasPreferences = $derived(vm.state.studentHasPreferences);
  let hasPreferenceData = $derived(vm.state.hasPreferenceData);
  let studentsWithPreferencesCount = $derived(vm.state.studentsWithPreferencesCount);
  /** Analytics panel appears when >=3 students have preferences (Banked Note #1) */
  let showAnalytics = $derived(studentsWithPreferencesCount >= 3 && hasGroups);
  let analyticsOpen = $state(false);
  let baseline = $derived(view?.baseline ?? null);
  let currentAnalytics = $derived(view?.currentAnalytics ?? null);
  let analyticsDelta = $derived(view?.analyticsDelta ?? null);
  let groupCount = $derived(view?.groups.length ?? 0);

  // Settings & rotation avoidance (WP10 / Decision 6)
  let avoidRecentGroupmates = $derived(vm.state.avoidRecentGroupmates);
  let lookbackSessions = $derived(vm.state.lookbackSessions);
  let settingsPanelOpen = $derived(vm.state.settingsPanelOpen);
  let publishedSessionCount = $derived(
    vm.state.sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED').length
  );
  /**
   * One-time hint after second session (Decision 6):
   * "Groups now avoid recent groupmates. Change this in Settings."
   * Shows once after 2+ published sessions, then never returns.
   */
  let showRotationHint = $derived(
    publishedSessionCount >= 2 &&
    hasGroups &&
    !hintState.isDismissed('rotationAvoidance')
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
  let displayGroups = $derived(
    viewingSessionId
      ? viewingSessionGroups
      : selectedHistoryIndex >= 0 && selectedHistoryIndex < generationHistory.length
        ? generationHistory[selectedHistoryIndex].groups
        : (view?.groups ?? [])
  );
  let isViewingHistory = $derived(viewingSessionId !== null || selectedHistoryIndex >= 0);
  let viewingSession = $derived(
    viewingSessionId ? sessions.find((s) => s.id === viewingSessionId) ?? null : null
  );

  // Student detail sidebar
  let selectedStudentId = $state<string | null>(null);
  let studentSidebarMode = $state<'view' | 'edit' | 'create'>('view');
  let showRemoveConfirm = $state(false);
  let deletingSessionId = $state<string | null>(null);
  let deletingSession = $derived(
    deletingSessionId ? sessions.find((s) => s.id === deletingSessionId) ?? null : null
  );
  let selectedStudent = $derived(selectedStudentId ? (studentsById[selectedStudentId] ?? null) : null);
  let selectedStudentPreferences = $derived(
    selectedStudentId ? (vm.state.preferenceMap[selectedStudentId] ?? null) : null
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
  let studentSidebarOpen = $derived(selectedStudent !== null || studentSidebarMode === 'create');
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

  function handleUndo() {
    vm.state.editingStore?.undo();
  }

  function handleRedo() {
    vm.state.editingStore?.redo();
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
    vm.state.draggingId = id;
  }

  function handleDragEnd() {
    vm.state.draggingId = null;
  }

  function handleSortGroup(groupId: string, sortBy: 'firstName' | 'lastName', direction: 'asc' | 'desc') {
    vm.actions.sortGroup(groupId, sortBy, direction);
  }

  function handleCreateGroup() {
    vm.actions.createGroup();
  }

  function handleUpdateGroup(groupId: string, changes: Partial<Pick<import('$lib/domain').Group, 'name' | 'capacity'>>) {
    vm.actions.updateGroup(groupId, changes);
  }

  function handleDeleteGroup(groupId: string) {
    vm.actions.deleteGroup(groupId);
  }

  function handlePublish() {
    vm.actions.publishSession();
  }

  function handleDisplay() {
    window.open(`/activity/${activityId}/display`, '_blank');
  }

  function handleNewSession() {
    vm.actions.startNewSession();
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

  function handleCompare() {
    vm.actions.startComparison();
  }

  function handleToggleHistory() {
    selectedStudentId = null;
    // When closing the history panel, return to current session
    if (historyPanelOpen && viewingSessionId) {
      vm.actions.selectSession(null);
    }
    vm.actions.toggleHistoryPanel();
  }

  function handleToggleSettings() {
    selectedStudentId = null;
    vm.actions.toggleSettingsPanel();
  }

  function handleStudentClick(studentId: string) {
    // Toggle: clicking the same student closes the sidebar
    if (selectedStudentId === studentId && studentSidebarMode === 'view') {
      selectedStudentId = null;
      return;
    }
    // Close other sidebars
    if (historyPanelOpen) vm.actions.toggleHistoryPanel();
    if (settingsPanelOpen) vm.actions.toggleSettingsPanel();
    selectedStudentId = studentId;
    studentSidebarMode = 'view';
  }

  function handleCloseStudentDetail() {
    selectedStudentId = null;
    studentSidebarMode = 'view';
  }

  function handleStartAddStudent() {
    if (historyPanelOpen) vm.actions.toggleHistoryPanel();
    if (settingsPanelOpen) vm.actions.toggleSettingsPanel();
    selectedStudentId = null;
    studentSidebarMode = 'create';
  }

  async function handleSaveStudent(data: {
    firstName: string;
    lastName?: string;
    gradeLevel?: string;
    gender?: string;
  }): Promise<boolean> {
    if (studentSidebarMode === 'create') {
      const result = await vm.actions.addStudent(data);
      if (result.success && result.studentId) {
        selectedStudentId = result.studentId;
        studentSidebarMode = 'view';
        return true;
      }
      return result.success;
    } else {
      // Edit mode
      if (!selectedStudentId) return false;
      const success = await vm.actions.updateStudent({ studentId: selectedStudentId, ...data });
      if (success) {
        studentSidebarMode = 'view';
      }
      return success;
    }
  }

  function handleEditStudent() {
    studentSidebarMode = 'edit';
  }

  function handleCancelEditStudent() {
    if (studentSidebarMode === 'create') {
      selectedStudentId = null;
      studentSidebarMode = 'view';
    } else {
      studentSidebarMode = 'view';
    }
  }

  function handleRequestRemoveStudent() {
    showRemoveConfirm = true;
  }

  async function handleConfirmRemoveStudent() {
    if (!selectedStudentId) return;
    await vm.actions.removeStudent(selectedStudentId);
    selectedStudentId = null;
    studentSidebarMode = 'view';
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

  async function handleImport(pastedText: string) {
    if (!pool) {
      throw new Error('No roster found for this activity');
    }

    const detection = detectSimpleNameList(pastedText);
    if (!detection.isSimpleNameList) {
      throw new Error('Could not parse the pasted text. Please paste one student name per line.');
    }

    const parsedStudents = detection.names.map((name) => parseName(name));

    // WP11: If current roster is all placeholders, upgrade instead of append
    if (hasPlaceholderStudents) {
      await vm.actions.upgradeRoster(parsedStudents);
      return;
    }

    const errors: string[] = [];
    const addedStudents: typeof students = [];

    for (const { firstName, lastName } of parsedStudents) {
      const result = await addStudentToPool(env, {
        poolId: pool.id,
        firstName,
        lastName
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

<div class="flex h-[calc(100vh-49px)] flex-col">
  {#if loading}
    <div class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <div
          class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600"
        ></div>
        <p class="mt-3 text-sm text-gray-500">Loading activity...</p>
      </div>
    </div>
  {:else if loadError}
    <div class="mx-auto max-w-md p-8">
      <Alert variant="error" dismissible>{loadError}</Alert>
      <button
        type="button"
        class="mt-4 text-sm text-gray-500 hover:text-gray-700"
        onclick={handleBack}
      >
        &larr; Back to Home
      </button>
    </div>
  {:else}
    <ClassViewToolbar
      {activityName}
      {canUndo}
      {canRedo}
      {saveStatus}
      {lastSavedAt}
      {hasGroups}
      {hasHistory}
      {historyPanelOpen}
      {isViewingHistory}
      {isPublished}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onBack={handleBack}
      onRetrySave={handleRetrySave}
      onCompare={handleCompare}
      onToggleHistory={handleToggleHistory}
      onToggleRoster={handleToggleRoster}
      rosterOpen={rosterDrawerOpen}
      {sessions}
      {viewingSessionId}
      currentSessionId={isPublished ? vm.state.latestPublishedSession?.id ?? null : null}
      onSelectSession={(sessionId) => vm.actions.selectSession(sessionId)}
      onDeleteSession={handleRequestDeleteSession}
      onRenameSession={handleRenameSession}
    />

    <div class="flex flex-1 overflow-hidden">
      <!-- Center: Groups canvas (always full remaining width) -->
      <div class="flex flex-1 flex-col overflow-hidden bg-gray-50">
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
                class="rounded-md bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700"
              >
                Back to current
              </button>
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
                  onclick={() => { handleDismissRotationHint(); handleToggleSettings(); }}
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
          studentCount={students.length}
          readOnly={isPublished || isViewingHistory}
          onGenerate={(groupCount) => vm.actions.generateGroups(groupCount)}
          onAssignAll={() => vm.actions.assignAll()}
          onShuffle={() => vm.actions.shuffleGroups()}
          onImport={openImportModal}
          disabled={loading || !!loadError || isViewingHistory}
          {isGenerating}
          {generationError}
          unplacedStudentCount={isViewingHistory ? 0 : unplacedStudentCount}
          draggingId={hasGroups && !isViewingHistory ? draggingId : null}
          onDrop={hasGroups && !isViewingHistory ? handleDrop : undefined}
          onReorder={hasGroups && !isViewingHistory ? handleReorder : undefined}
          onDragStart={hasGroups && !isViewingHistory ? handleDragStart : undefined}
          onDragEnd={hasGroups && !isViewingHistory ? handleDragEnd : undefined}
          onSortGroup={hasGroups && !isViewingHistory ? handleSortGroup : undefined}
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
          onStudentClick={hasGroups && !isViewingHistory ? handleStudentClick : undefined}
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
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              Preference Analytics
              {#if currentAnalytics}
                <span class="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
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

        <!-- Saved to this browser indicator (P4) -->
        <div class="flex items-center gap-1.5 border-t bg-white px-4 py-1.5 text-xs text-gray-400">
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z"
            />
          </svg>
          Saved to this browser
        </div>
      </div>
    </div>

    <!-- Floating Toolbar — primary actions at bottom-center -->
    <FloatingToolbar
      visible={hasGroups && !isViewingHistory}
      {isPublished}
      {isPublishing}
      onNewSession={handleNewSession}
      onPublish={handlePublish}
      onDisplay={handleDisplay}
      onToggleSettings={handleToggleSettings}
      {settingsPanelOpen}
      {avoidRecentGroupmates}
      {lookbackSessions}
      {publishedSessionCount}
      onToggleAvoidance={(enabled) => vm.actions.setAvoidRecentGroupmates(enabled)}
      onLookbackChange={(sessions) => vm.actions.setLookbackSessions(sessions)}
    />

    <!-- Overlay panels (OverlaySheet, do not reflow the group canvas) -->

    <!-- Roster drawer (left) -->
    <OverlaySheet open={rosterDrawerOpen} side="left" width="w-64" onClose={handleToggleRoster}>
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
      />
    </OverlaySheet>

    <!-- Student Detail Sidebar (right) -->
    <OverlaySheet open={studentSidebarOpen} side="right" width="w-80" onClose={handleCloseStudentDetail}>
      <StudentDetailSidebar
        student={selectedStudent}
        mode={studentSidebarMode}
        preferences={selectedStudentPreferences}
        recentGroupmates={selectedStudentRecentGroupmates}
        onClose={handleCloseStudentDetail}
        onSave={handleSaveStudent}
        onDelete={handleRequestRemoveStudent}
        onEditMode={handleEditStudent}
        onCancelEdit={handleCancelEditStudent}
      />
    </OverlaySheet>

    <!-- History is now a popover inside ClassViewToolbar (Step 4) -->
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

<!-- Projection moved to /activity/[id]/display route (Step 5) -->

{#if showRemoveConfirm && selectedStudent}
  <RemoveStudentConfirmDialog
    studentName={`${selectedStudent.firstName} ${selectedStudent.lastName ?? ''}`.trim()}
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
