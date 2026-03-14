<script lang="ts">
  /**
   * ClassViewToolbar — Activity name, back button, undo/redo, save status,
   * publish/display lifecycle buttons.
   *
   * See: project definition.md — Part 3 (Class View), WP4
   */

  import SaveStatusIndicator from '$lib/components/editing/SaveStatusIndicator.svelte';
  import type { SaveStatus } from '$lib/stores/scenarioEditingStore';

  interface Props {
    activityName: string;
    canUndo: boolean;
    canRedo: boolean;
    saveStatus: SaveStatus;
    lastSavedAt: Date | null;
    hasGroups: boolean;
    hasHistory?: boolean;
    historyPanelOpen?: boolean;
    isViewingHistory?: boolean;
    isPublished?: boolean;
    isPublishing?: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onBack: () => void;
    onPublish?: () => void;
    onDisplay?: () => void;
    onNewSession?: () => void;
    onRetrySave?: () => void;
    onCompare?: () => void;
    onToggleHistory?: () => void;
    onToggleSettings?: () => void;
    settingsPanelOpen?: boolean;
  }

  let {
    activityName,
    canUndo,
    canRedo,
    saveStatus,
    lastSavedAt,
    hasGroups,
    hasHistory = false,
    historyPanelOpen = false,
    isViewingHistory = false,
    isPublished = false,
    isPublishing = false,
    onUndo,
    onRedo,
    onBack,
    onPublish,
    onDisplay,
    onNewSession,
    onRetrySave,
    onCompare,
    onToggleHistory,
    onToggleSettings,
    settingsPanelOpen = false
  }: Props = $props();
</script>

<div class="flex items-center justify-between border-b bg-white px-4 py-2">
  <div class="flex min-w-0 items-center gap-3">
    <button
      type="button"
      onclick={onBack}
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      aria-label="Back to Home"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 7.5 12l8.25-7.5" />
      </svg>
    </button>

    <h1 class="min-w-0 truncate text-lg font-semibold text-gray-900">
      {activityName}
    </h1>
  </div>

  <div class="flex items-center gap-2">
    <SaveStatusIndicator status={saveStatus} {lastSavedAt} onRetry={onRetrySave} />

    {#if hasGroups && onCompare && !isPublished}
      <button
        type="button"
        onclick={onCompare}
        disabled={isViewingHistory}
        class="flex min-h-[44px] items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
        aria-label="Compare with alternative arrangement"
        title="Generate an alternative and compare side-by-side"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
        Compare
      </button>
    {/if}

    {#if onToggleSettings && !isPublished}
      <button
        type="button"
        onclick={onToggleSettings}
        class="flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm {settingsPanelOpen
          ? 'border-teal-300 bg-teal-50 text-teal-700'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
        aria-label="{settingsPanelOpen ? 'Close' : 'Open'} settings panel"
        aria-expanded={settingsPanelOpen}
        title="Generation settings"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        Settings
      </button>
    {/if}

    {#if onToggleHistory}
      <button
        type="button"
        onclick={onToggleHistory}
        class="flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm {historyPanelOpen
          ? 'border-teal-300 bg-teal-50 text-teal-700'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
        aria-label="{historyPanelOpen ? 'Close' : 'Open'} history panel"
        aria-expanded={historyPanelOpen}
        title="View session history"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        History
        {#if hasHistory}
          <span class="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
        {/if}
      </button>
    {/if}

    {#if hasGroups}
      {#if isPublished}
        <!-- Published state: Display + New Session -->
        <button
          type="button"
          onclick={onDisplay}
          class="flex min-h-[44px] items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
          aria-label="Display groups fullscreen"
          title="Display groups (fullscreen)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          Display
        </button>
        <button
          type="button"
          onclick={onNewSession}
          class="flex min-h-[44px] items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          aria-label="Start new session"
          title="Clear groups and start a new session"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Session
        </button>
      {:else}
        <!-- Unpublished state: Publish -->
        <button
          type="button"
          onclick={onPublish}
          disabled={isPublishing}
          class="flex min-h-[44px] items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          aria-label="Publish groups"
          title="Publish groups and show to class"
        >
          {#if isPublishing}
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path d="M12 2v4m0 12v4m-7.07-3.93 2.83-2.83m8.48-8.48 2.83-2.83M2 12h4m12 0h4m-3.93 7.07-2.83-2.83M7.76 7.76 4.93 4.93" />
            </svg>
          {:else}
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
            </svg>
          {/if}
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
      {/if}
    {/if}

    {#if !isPublished}
      <div class="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1">
        <button
          type="button"
          onclick={onUndo}
          disabled={!canUndo}
          class="flex h-11 w-11 items-center justify-center rounded text-gray-600 hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
          aria-label="Undo"
          title="Undo (Cmd+Z)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
            />
          </svg>
        </button>
        <button
          type="button"
          onclick={onRedo}
          disabled={!canRedo}
          class="flex h-11 w-11 items-center justify-center rounded text-gray-600 hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
          aria-label="Redo"
          title="Redo (Cmd+Shift+Z)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
            />
          </svg>
        </button>
      </div>
    {/if}
  </div>
</div>
