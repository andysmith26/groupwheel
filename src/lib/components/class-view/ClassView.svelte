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
  let program = $derived(vm.state.program);
  let students = $derived(vm.state.students);
  let studentsById = $derived(
    students.reduce(
      (acc, student) => {
        acc[student.id] = student;
        return acc;
      },
      {} as Record<string, import('$lib/domain').Student>
    )
  );
  let view = $derived(vm.state.view);
  let pool = $derived(vm.state.pool);

  let activityName = $derived(program?.name ?? 'Activity');
  let canUndo = $derived(view?.canUndo ?? false);
  let canRedo = $derived(view?.canRedo ?? false);
  let saveStatus = $derived(view?.saveStatus ?? 'idle');
  let lastSavedAt = $derived(view?.lastSavedAt ?? null);

  onMount(() => {
    vm.actions.init(activityId);
  });

  onDestroy(() => {
    vm.actions.dispose();
  });

  function handleBack() {
    goto('/home');
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

    const errors: string[] = [];
    const addedStudents: typeof students = [];

    for (const name of detection.names) {
      const { firstName, lastName } = parseName(name);
      const result = await addStudentToPool(env, {
        poolId: pool.id,
        firstName,
        lastName
      });

      if (isErr(result)) {
        errors.push(`Failed to add "${name}": ${result.error.type}`);
      } else {
        addedStudents.push(result.value.student);
      }
    }

    // Refresh students in VM state
    if (addedStudents.length > 0) {
      vm.state.students = [...vm.state.students, ...addedStudents];
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
      onUndo={handleUndo}
      onRedo={handleRedo}
      onBack={handleBack}
      onRetrySave={handleRetrySave}
    />

    <div class="flex flex-1 overflow-hidden">
      <!-- Left: Roster Panel -->
      <div class="w-64 shrink-0">
        <RosterPanel {students} {loading} onImport={openImportModal} />
      </div>

      <!-- Right: Groups Panel -->
      <div class="flex flex-1 flex-col overflow-hidden bg-gray-50">
        <GroupsPanel
          groups={view?.groups ?? []}
          {studentsById}
          studentCount={students.length}
          onGenerate={(size) => vm.actions.generateGroups(size)}
          onImport={openImportModal}
          disabled={loading || !!loadError}
          {generationError}
        />

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
  {/if}
</div>

<RosterImportModal open={importModalOpen} onClose={closeImportModal} onImport={handleImport} />
