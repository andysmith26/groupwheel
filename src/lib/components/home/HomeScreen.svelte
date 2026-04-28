<script lang="ts">
  /**
   * HomeScreen — Activity hub and entry point.
   *
   * Shows activity cards with one-tap "Make Groups" shortcut
   * and empty state (placeholder for Quick Start in WP3).
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
    createDemoActivity,
    importActivity,
    type ActivityDisplay
  } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';
  import { Button, Alert, InlineError } from '$lib/components/ui';
  import ActivityCardSkeleton from '$lib/components/ui/ActivityCardSkeleton.svelte';
  import ActivityCard from './ActivityCard.svelte';
  import QuickStartCard from './QuickStartCard.svelte';
  import HomeHeroSplash from './HomeHeroSplash.svelte';
  import HomePostOnboardingBanner, {
    type HomeOnboardingVariant
  } from './HomePostOnboardingBanner.svelte';
  import PasteRosterCard from './PasteRosterCard.svelte';
  import NewActivityModal from './NewActivityModal.svelte';
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

  // Onboarding state
  const ONBOARDING_VARIANT_KEY = 'groupwheel-home-onboarding-variant';
  const ONBOARDING_BANNER_DISMISSED_KEY = 'groupwheel-home-banner-dismissed';

  let onboardingVariant = $state<HomeOnboardingVariant | 'none'>('none');
  let bannerDismissed = $state(false);
  let isStartingDemo = $state(false);
  let quickStartModalOpen = $state(false);
  let pasteRosterModalOpen = $state(false);
  let showOnboardingBanner = $derived(
    activities.length > 0 && onboardingVariant !== 'none' && !bannerDismissed
  );

  // New activity modal state (used when activities already exist)
  let newActivityModalOpen = $state(false);

  let now = $state(new Date());

  onMount(() => {
    env = getAppEnvContext();
    loadActivities();

    try {
      const storedVariant = localStorage.getItem(ONBOARDING_VARIANT_KEY);
      if (
        storedVariant === 'demo-started' ||
        storedVariant === 'quickstart-started' ||
        storedVariant === 'roster-started'
      ) {
        onboardingVariant = storedVariant;
      }
      bannerDismissed = localStorage.getItem(ONBOARDING_BANNER_DISMISSED_KEY) === 'true';
    } catch {
      onboardingVariant = 'none';
      bannerDismissed = false;
    }

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

  function setOnboardingVariant(variant: HomeOnboardingVariant | 'none') {
    onboardingVariant = variant;
    try {
      if (variant === 'none') {
        localStorage.removeItem(ONBOARDING_VARIANT_KEY);
      } else {
        localStorage.setItem(ONBOARDING_VARIANT_KEY, variant);
      }
    } catch {
      // Ignore localStorage failures
    }
  }

  function setBannerDismissed(value: boolean) {
    bannerDismissed = value;
    try {
      localStorage.setItem(ONBOARDING_BANNER_DISMISSED_KEY, String(value));
    } catch {
      // Ignore localStorage failures
    }
  }

  function openImportFilePicker() {
    importFileInput?.click();
  }

  function openPasteRosterModal() {
    pasteRosterModalOpen = true;
  }

  function openQuickStartModal() {
    quickStartModalOpen = true;
  }

  function dismissOnboardingBanner() {
    setBannerDismissed(true);
  }

  async function handleStartDemo() {
    if (!env || isStartingDemo) return;

    isStartingDemo = true;
    importError = null;

    const result = await createDemoActivity(env);
    if (isErr(result)) {
      importError = result.error.message;
      isStartingDemo = false;
      return;
    }

    setOnboardingVariant('demo-started');
    setBannerDismissed(false);
    isStartingDemo = false;

    goto(`/activity/${result.value.programId}`);
  }

  function handleQuickStartCreated() {
    setOnboardingVariant('quickstart-started');
    setBannerDismissed(false);
    quickStartModalOpen = false;
  }

  function handlePasteRosterCreated() {
    setOnboardingVariant('roster-started');
    setBannerDismissed(false);
    pasteRosterModalOpen = false;
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
      setOnboardingVariant('roster-started');
      setBannerDismissed(false);
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
      if (newActivityModalOpen) {
        newActivityModalOpen = false;
      }
      if (quickStartModalOpen) {
        quickStartModalOpen = false;
      }
      if (pasteRosterModalOpen) {
        pasteRosterModalOpen = false;
      }
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

<div class="mx-auto max-w-6xl space-y-6 p-4">
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
    <Alert
      variant="success"
      dismissible
      autoDismiss={5000}
      onDismiss={() => (importSuccess = null)}
    >
      {importSuccess}
    </Alert>
  {/if}

  <header class="flex items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold tracking-wide text-gray-500">Groupwheel</p>
      {#if activities.length > 0 && !loading}
        <h1 class="text-2xl font-semibold text-gray-900">Your Activities</h1>
      {/if}
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
    <HomeHeroSplash
      onStartDemo={handleStartDemo}
      onPasteRoster={openPasteRosterModal}
      onImportFile={openImportFilePicker}
      demoBusy={isStartingDemo}
    >
      <QuickStartCard compact onCreated={handleQuickStartCreated} />
    </HomeHeroSplash>
  {:else}
    {#if showOnboardingBanner && onboardingVariant !== 'none'}
      <HomePostOnboardingBanner
        variant={onboardingVariant}
        onQuickStart={openQuickStartModal}
        onPasteRoster={openPasteRosterModal}
        onImportFile={openImportFilePicker}
        onDismiss={dismissOnboardingBanner}
      />
    {/if}

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

      <!-- New Activity card -->
      <button
        type="button"
        class="group flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-5 shadow-sm transition-all hover:border-teal/50 hover:shadow-md focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
        onclick={() => (newActivityModalOpen = true)}
      >
        <div class="rounded-full bg-gray-100 p-3 transition-colors group-hover:bg-teal/10">
          <svg
            class="h-6 w-6 text-gray-400 transition-colors group-hover:text-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <span class="mt-3 text-sm font-medium text-gray-600 transition-colors group-hover:text-teal"
          >New Activity</span
        >
      </button>
    </div>
  {/if}
</div>

<!-- Quick Start Modal -->
{#if quickStartModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    transition:fade={{ duration: 150 }}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Quick start"
    onclick={(e) => {
      if (e.target === e.currentTarget) quickStartModalOpen = false;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') quickStartModalOpen = false;
    }}
  >
    <div
      class="mx-4 w-full max-w-xl rounded-lg bg-white p-6 shadow-xl"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">Quick Start</h3>
        <button
          type="button"
          class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onclick={() => (quickStartModalOpen = false)}
          aria-label="Close"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
        <QuickStartCard
          onCreated={() => {
            handleQuickStartCreated();
            loadActivities();
          }}
        />
      </div>
    </div>
  </div>
{/if}

<!-- Paste Roster Modal -->
{#if pasteRosterModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    transition:fade={{ duration: 150 }}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Paste roster"
    onclick={(e) => {
      if (e.target === e.currentTarget) pasteRosterModalOpen = false;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') pasteRosterModalOpen = false;
    }}
  >
    <div
      class="mx-4 w-full max-w-xl rounded-lg bg-white p-6 shadow-xl"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">Create from roster</h3>
        <button
          type="button"
          class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onclick={() => (pasteRosterModalOpen = false)}
          aria-label="Close"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
        <PasteRosterCard
          onCreated={() => {
            handlePasteRosterCreated();
            loadActivities();
          }}
        />
      </div>
    </div>
  </div>
{/if}

<!-- New Activity Modal -->
<NewActivityModal bind:open={newActivityModalOpen} onCreated={() => loadActivities()} />

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
