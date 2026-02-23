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
  import { Alert } from '$lib/components/ui';
  import { detectSimpleNameList } from '$lib/utils/pasteDetection';
  import ClassViewToolbar from './ClassViewToolbar.svelte';
  import RosterPanel from './RosterPanel.svelte';
  import RosterImportModal from './RosterImportModal.svelte';
  import GroupsPanel from './GroupsPanel.svelte';
  import HistoryPanel from './HistoryPanel.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import ProjectionMode from './ProjectionMode.svelte';
  import AnalyticsPanel from '$lib/components/editing/AnalyticsPanel.svelte';
  import ScenarioComparison from '$lib/components/editing/ScenarioComparison.svelte';
  import ContextualHint from '$lib/components/common/ContextualHint.svelte';
  import { hintState } from '$lib/stores/hintState.svelte';

  interface Props {
    activityId: string;
  }

  let { activityId }: Props = $props();

  let env = getAppEnvContext();
  let vm = createClassViewVm(env);

  let importModalOpen = $state(false);

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
  let groupSize = $derived(vm.state.groupSize);
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
  let isProjecting = $derived(vm.state.liveSessionStatus === 'PROJECTING');

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
  /** Show history button when there's any history to view */
  let hasHistory = $derived(
    generationHistory.length > 0 ||
    sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED').length > 0
  );
  /** Groups to display: either current view or a history entry */
  let displayGroups = $derived(
    selectedHistoryIndex >= 0 && selectedHistoryIndex < generationHistory.length
      ? generationHistory[selectedHistoryIndex].groups
      : (view?.groups ?? [])
  );
  let isViewingHistory = $derived(selectedHistoryIndex >= 0);

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

  function handleAlphabetize(groupId: string) {
    vm.actions.alphabetizeGroup(groupId);
  }

  function handleProject() {
    vm.actions.enterProjection();
  }

  function handleExitProjection() {
    vm.actions.exitProjection();
  }

  function handleProjectionRegenerate(size: number) {
    vm.actions.generateGroups(size);
  }

  function handleCompare() {
    vm.actions.startComparison();
  }

  function handleToggleHistory() {
    vm.actions.toggleHistoryPanel();
  }

  function handleToggleSettings() {
    vm.actions.toggleSettingsPanel();
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

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && isProjecting) {
      handleExitProjection();
    }
  }}
/>

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
      <Alert variant="error">{loadError}</Alert>
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
      onUndo={handleUndo}
      onRedo={handleRedo}
      onBack={handleBack}
      onProject={handleProject}
      onRetrySave={handleRetrySave}
      onCompare={handleCompare}
      onToggleHistory={handleToggleHistory}
      onToggleSettings={handleToggleSettings}
      {settingsPanelOpen}
    />

    <div class="flex flex-1 overflow-hidden">
      <!-- Left: Roster Panel -->
      <div class="w-64 shrink-0">
        <RosterPanel
          {students}
          {loading}
          onImport={openImportModal}
          {studentHasPreferences}
          {hasPreferenceData}
          {hasPlaceholderStudents}
        />
      </div>

      <!-- Right: Groups Panel + History Panel -->
      <div class="flex flex-1 overflow-hidden">
        <div class="flex flex-1 flex-col overflow-hidden bg-gray-50">
          {#if isViewingHistory}
            <div class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <div class="flex items-center justify-between">
                <span>Viewing a previous arrangement (read-only)</span>
                <button
                  type="button"
                  onclick={() => vm.actions.selectHistoryEntry(-1)}
                  class="font-medium text-amber-700 hover:text-amber-900"
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
            {groupSize}
            onGroupSizeChange={(size) => vm.actions.setGroupSize(size)}
            onGenerate={(size) => vm.actions.generateGroups(size)}
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
            onAlphabetize={hasGroups && !isViewingHistory ? handleAlphabetize : undefined}
            pickedUpStudentId={hasGroups && !isViewingHistory ? pickedUpStudentId : null}
            onKeyboardPickUp={hasGroups && !isViewingHistory ? vm.actions.keyboardPickUp : undefined}
            onKeyboardDrop={hasGroups && !isViewingHistory ? vm.actions.keyboardDrop : undefined}
            onKeyboardCancel={hasGroups && !isViewingHistory ? vm.actions.keyboardCancel : undefined}
            onKeyboardMove={hasGroups && !isViewingHistory ? vm.actions.keyboardMove : undefined}
            {studentPreferenceRanks}
            {studentHasPreferences}
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

        <!-- Settings Panel (WP10) — expandable sidebar -->
        <SettingsPanel
          open={settingsPanelOpen}
          {avoidRecentGroupmates}
          {lookbackSessions}
          {publishedSessionCount}
          onToggleAvoidance={(enabled) => vm.actions.setAvoidRecentGroupmates(enabled)}
          onLookbackChange={(sessions) => vm.actions.setLookbackSessions(sessions)}
          onToggle={handleToggleSettings}
        />

        <!-- History Panel (WP9) — expandable sidebar -->
        <HistoryPanel
          open={historyPanelOpen}
          {generationHistory}
          {sessions}
          {selectedHistoryIndex}
          onSelect={(index) => vm.actions.selectHistoryEntry(index)}
          onToggle={handleToggleHistory}
        />
      </div>
    </div>
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

{#if isProjecting && view}
  <ProjectionMode
    groups={view.groups}
    {studentsById}
    {groupSize}
    {isGenerating}
    onRegenerate={handleProjectionRegenerate}
    onExit={handleExitProjection}
  />
{/if}
