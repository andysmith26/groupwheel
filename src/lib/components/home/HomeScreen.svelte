<script lang="ts">
  /**
   * HomeScreen — Activity hub and entry point.
   *
   * Shows activity cards with one-tap "Make Groups" shortcut,
   * settings gear, and empty state (placeholder for Quick Start in WP3).
   *
   * See: project definition.md — Decision 2, Part 3 (Home screen), WP1
   */

  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import {
    listActivities,
    renameActivity,
    deleteActivity,
    exportActivityData,
    importActivity,
    type ActivityDisplay
  } from '$lib/services/appEnvUseCases';
  import { isErr, isOk } from '$lib/types/result';
  import { Button, Alert, InlineError } from '$lib/components/ui';
  import ActivityCardSkeleton from '$lib/components/ui/ActivityCardSkeleton.svelte';
  import ActivityCard from './ActivityCard.svelte';
  import InlineActivityCreator from './InlineActivityCreator.svelte';
  import QuickStartCard from './QuickStartCard.svelte';
  import ImportRosterCard from './ImportRosterCard.svelte';
  import PasteRosterCard from './PasteRosterCard.svelte';
  import {
    downloadActivityFile,
    generateExportFilename,
    parseActivityFile,
    readFileAsText
  } from '$lib/utils/activityFile';

  let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

  let activities = $state<ActivityDisplay[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Menu state
  let openMenuId = $state<string | null>(null);

  // Rename modal state
  let renameModalOpen = $state(false);
  let renameTarget = $state<ActivityDisplay | null>(null);
  let renameValue = $state('');
  let renameError = $state<string | null>(null);

  // Delete modal state
  let deleteModalOpen = $state(false);
  let deleteTarget = $state<ActivityDisplay | null>(null);
  let isDeleting = $state(false);

  // Import state
  let importFileInput = $state<HTMLInputElement>();
  let isImporting = $state(false);
  let importError = $state<string | null>(null);
  let importSuccess = $state<string | null>(null);

  // Export state
  let isExporting = $state(false);

  let now = $state(new Date());

  onMount(() => {
    env = getAppEnvContext();
    loadActivities();

    const handleClick = (e: MouseEvent) => {
      if (openMenuId && !(e.target as Element).closest('.overflow-menu')) {
        openMenuId = null;
      }
    };
    const intervalId = window.setInterval(() => {
      now = new Date();
    }, 60_000);

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      window.clearInterval(intervalId);
    };
  });

  async function loadActivities() {
    if (!env) return;

    loading = true;
    error = null;

    const result = await listActivities(env);

    if (isErr(result)) {
      error = result.error.message;
    } else {
      activities = result.value;
    }

    loading = false;
  }

  function handleMakeGroups(programId: string) {
    goto(`/activity/${programId}?generate=true`);
  }

  function toggleMenu(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    openMenuId = openMenuId === id ? null : id;
  }

  function handleRenameRequest(activity: ActivityDisplay) {
    openMenuId = null;
    renameTarget = activity;
    renameValue = activity.program.name;
    renameError = null;
    renameModalOpen = true;
  }

  function handleDeleteRequest(activity: ActivityDisplay) {
    openMenuId = null;
    deleteTarget = activity;
    deleteModalOpen = true;
  }

  async function handleRenameSubmit() {
    if (!env || !renameTarget) return;

    const trimmed = renameValue.trim();
    if (!trimmed) {
      renameError = 'Activity name cannot be empty';
      return;
    }

    const result = await renameActivity(env, {
      programId: renameTarget.program.id,
      newName: trimmed
    });

    if (isErr(result)) {
      renameError = result.error.message;
      return;
    }

    activities = activities.map((a) =>
      a.program.id === renameTarget!.program.id
        ? { ...a, program: { ...a.program, name: trimmed } }
        : a
    );

    renameModalOpen = false;
    renameTarget = null;
  }

  async function handleDeleteConfirm() {
    if (!env || !deleteTarget) return;

    isDeleting = true;
    const result = await deleteActivity(env, { programId: deleteTarget.program.id });

    if (isErr(result)) {
      isDeleting = false;
      return;
    }

    activities = activities.filter((a) => a.program.id !== deleteTarget!.program.id);
    isDeleting = false;
    deleteModalOpen = false;
    deleteTarget = null;
  }

  async function handleExportActivity(activity: ActivityDisplay) {
    if (!env) return;
    openMenuId = null;
    isExporting = true;
    importError = null;
    importSuccess = null;

    try {
      const result = await exportActivityData(env, { programId: activity.program.id });
      if (isErr(result)) {
        importError = result.error.message;
        return;
      }

      const filename = generateExportFilename(activity.program.name);
      downloadActivityFile(result.value, filename);
    } catch (e) {
      importError = e instanceof Error ? e.message : 'Export failed.';
    } finally {
      isExporting = false;
    }
  }

  async function handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !env) return;

    importError = null;
    importSuccess = null;
    isImporting = true;

    try {
      const text = await readFileAsText(file);
      const validation = parseActivityFile(text);

      if (!validation.valid) {
        importError = validation.error;
        return;
      }

      const result = await importActivity(env, {
        exportData: validation.data,
        ownerStaffId: 'owner-1'
      });

      if (isErr(result)) {
        importError = result.error.message;
        return;
      }

      const r = result.value;
      importSuccess = `Imported "${r.program.name}" with ${r.studentsImported} students`;
      await loadActivities();
    } catch (e) {
      importError = e instanceof Error ? e.message : 'Import failed.';
    } finally {
      isImporting = false;
      input.value = '';
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (renameModalOpen) {
        renameModalOpen = false;
        renameTarget = null;
      }
      if (deleteModalOpen) {
        deleteModalOpen = false;
        deleteTarget = null;
      }
      if (openMenuId) {
        openMenuId = null;
      }
    }
  }
</script>

<svelte:head>
  <title>Home | Groupwheel</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="mx-auto max-w-5xl space-y-6 p-4">
  <!-- Hidden file input for import -->
  <input
    bind:this={importFileInput}
    type="file"
    accept=".json"
    class="hidden"
    onchange={handleImportFile}
  />

  {#if importError}
    <Alert variant="error" dismissible onDismiss={() => (importError = null)}>
      {importError}
    </Alert>
  {/if}

  {#if importSuccess}
    <Alert variant="success" dismissible autoDismiss={5000} onDismiss={() => (importSuccess = null)}>
      {importSuccess}
    </Alert>
  {/if}

  <header class="flex items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">{activities.length === 0 && !loading ? 'Getting Started' : 'Your Activities'}</h1>
    </div>
    <div class="flex items-center gap-1">
      <a
        href="/settings"
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Settings"
      >
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </svg>
    </a>
    </div>
  </header>

  {#if loading}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <ActivityCardSkeleton />
      {/each}
    </div>
  {:else if error}
    <Alert variant="error">{error}</Alert>
  {:else if activities.length === 0}
    <!-- Primary: Import roster -->
    <ImportRosterCard onCreated={() => loadActivities()} />

    <!-- Secondary options -->
    <div class="relative mt-4">
      <div class="absolute inset-0 flex items-center" aria-hidden="true">
        <div class="w-full border-t border-gray-200"></div>
      </div>
      <div class="relative flex justify-center">
        <span class="bg-white px-3 text-xs text-gray-400">or start another way</span>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <!-- Quick Start -->
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="mb-3 flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-gray-900">Quick demo</h3>
        </div>
        <QuickStartCard compact onCreated={() => loadActivities()} />
      </div>

      <!-- Start from scratch -->
      <div class="rounded-xl border border-gray-200 bg-white p-5">
        <div class="mb-3 flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-gray-900">Start from scratch</h3>
        </div>
        <PasteRosterCard onCreated={() => loadActivities()} />
      </div>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each activities as activity (activity.program.id)}
        <ActivityCard
          {activity}
          {now}
          {openMenuId}
          onRename={handleRenameRequest}
          onDelete={handleDeleteRequest}
          onExport={handleExportActivity}
          onToggleMenu={toggleMenu}
        />
      {/each}
    </div>
    <InlineActivityCreator onCreated={() => loadActivities()} />
  {/if}
</div>

<!-- Rename Modal -->
{#if renameModalOpen && renameTarget}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-label="Rename activity"
  >
    <div
      class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      <h3 class="text-lg font-medium text-gray-900">Rename Activity</h3>
      <div class="mt-4">
        <input
          type="text"
          class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
          bind:value={renameValue}
          onkeydown={(e) => e.key === 'Enter' && handleRenameSubmit()}
        />
        {#if renameError}
          <div class="mt-2">
            <InlineError message={renameError} dismissible onDismiss={() => (renameError = null)} />
          </div>
        {/if}
      </div>
      <div class="mt-4 flex justify-end gap-3">
        <Button
          variant="ghost"
          onclick={() => {
            renameModalOpen = false;
            renameTarget = null;
          }}
        >
          Cancel
        </Button>
        <Button variant="secondary" onclick={handleRenameSubmit}>Save</Button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteModalOpen && deleteTarget}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-label="Delete activity"
  >
    <div
      class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      <h3 class="text-lg font-medium text-gray-900">Delete Activity</h3>
      <p class="mt-2 text-sm text-gray-600">
        Delete "{deleteTarget.program.name}"? This cannot be undone.
      </p>
      <div class="mt-4 flex justify-end gap-3">
        <Button
          variant="ghost"
          onclick={() => {
            deleteModalOpen = false;
            deleteTarget = null;
          }}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onclick={handleDeleteConfirm}
          disabled={isDeleting}
          loading={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </div>
  </div>
{/if}
