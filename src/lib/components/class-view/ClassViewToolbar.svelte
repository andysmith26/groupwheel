<script lang="ts">
  /**
   * ClassViewToolbar — Top bar with back, roster toggle, activity name,
   * save status, history toggle, settings gear, and share button.
   */

  import SaveStatusIndicator from '$lib/components/editing/SaveStatusIndicator.svelte';
  import SettingsPopover from '$lib/components/workspace/SettingsPopover.svelte';
  import ShareDropdown from './ShareDropdown.svelte';
  import type { SaveStatus } from '$lib/stores/scenarioEditingStore';
  import type { Group } from '$lib/domain';

  interface Props {
    activityName: string;
    saveStatus: SaveStatus;
    lastSavedAt: Date | null;
    hasGroups: boolean;
    isViewingHistory?: boolean;
    onBack: () => void;
    onRetrySave?: () => void;
    onToggleRoster?: () => void;
    rosterOpen?: boolean;
    // History
    onToggleHistory?: () => void;
    historyPanelOpen?: boolean;
    hasHistory?: boolean;
    // Settings / group management
    groups?: Group[];
    avoidRecentGroupmates?: boolean;
    lookbackSessions?: number;
    publishedSessionCount?: number;
    onToggleAvoidance?: (enabled: boolean) => void;
    onLookbackChange?: (sessions: number) => void;
    onEditGroup?: (groupId: string) => void;
    onAddGroup?: () => void;
    // Share / export actions
    onCopyForSpreadsheet?: () => void;
    onSave?: () => void;
    onPrint?: () => void;
    onDisplay?: () => void;
    onPublish?: () => void;
  }

  let {
    activityName,
    saveStatus,
    lastSavedAt,
    hasGroups,
    isViewingHistory = false,
    onBack,
    onRetrySave,
    onToggleRoster,
    rosterOpen = true,
    onToggleHistory,
    historyPanelOpen = false,
    hasHistory = false,
    groups = [],
    avoidRecentGroupmates = false,
    lookbackSessions = 3,
    publishedSessionCount = 0,
    onToggleAvoidance,
    onLookbackChange,
    onEditGroup,
    onAddGroup,
    onCopyForSpreadsheet,
    onSave,
    onPrint,
    onDisplay,
    onPublish
  }: Props = $props();

  let settingsOpen = $state(false);
  let shareOpen = $state(false);
</script>

<div
  class="flex items-center justify-between border-b px-4 py-2 {isViewingHistory
    ? 'border-amber-200 bg-amber-50'
    : 'bg-white'}"
>
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

    {#if onToggleRoster}
      <button
        type="button"
        onclick={onToggleRoster}
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors {rosterOpen
          ? 'bg-teal-50 text-teal-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
        aria-label="{rosterOpen ? 'Close' : 'Open'} roster"
        aria-expanded={rosterOpen}
        title="Toggle roster"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      </button>
    {/if}

    <h1 class="min-w-0 truncate text-lg font-semibold text-gray-900">
      {activityName}
    </h1>
  </div>

  <div class="flex items-center gap-2">
    <SaveStatusIndicator status={saveStatus} {lastSavedAt} onRetry={onRetrySave} />

    {#if hasGroups && !isViewingHistory}
      <!-- History toggle -->
      {#if onToggleHistory}
        <button
          type="button"
          onclick={onToggleHistory}
          class="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors {historyPanelOpen
            ? 'bg-teal-50 text-teal-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
          aria-label="{historyPanelOpen ? 'Close' : 'Open'} session history"
          aria-expanded={historyPanelOpen}
          title="Session history"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          {#if hasHistory}
            <span class="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-teal-500"></span>
          {/if}
        </button>
      {/if}

      <!-- Settings gear -->
      <div class="relative">
        <button
          type="button"
          onclick={() => {
            settingsOpen = !settingsOpen;
            shareOpen = false;
          }}
          class="flex h-9 w-9 items-center justify-center rounded-md transition-colors {settingsOpen
            ? 'bg-teal-50 text-teal-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
          aria-label="{settingsOpen ? 'Close' : 'Open'} settings"
          aria-expanded={settingsOpen}
          title="Settings"
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
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </button>

        {#if settingsOpen}
          <SettingsPopover
            {groups}
            {avoidRecentGroupmates}
            {lookbackSessions}
            {publishedSessionCount}
            onToggleAvoidance={onToggleAvoidance ?? (() => {})}
            onLookbackChange={onLookbackChange ?? (() => {})}
            onEditGroup={onEditGroup ?? (() => {})}
            onAddGroup={onAddGroup ?? (() => {})}
            onClose={() => (settingsOpen = false)}
          />
        {/if}
      </div>

      <!-- Share button -->
      <div class="relative">
        <button
          type="button"
          onclick={() => {
            shareOpen = !shareOpen;
            settingsOpen = false;
          }}
          class="flex h-9 items-center gap-1.5 rounded-md px-3 transition-colors {shareOpen
            ? 'bg-teal-50 text-teal-700'
            : 'text-gray-700 hover:bg-gray-100'}"
          aria-label="{shareOpen ? 'Close' : 'Open'} share menu"
          aria-expanded={shareOpen}
          aria-haspopup="true"
        >
          <span class="text-sm font-medium">Share</span>
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {#if shareOpen}
          <ShareDropdown
            {onCopyForSpreadsheet}
            {onSave}
            {onPrint}
            {onDisplay}
            {onPublish}
            onClose={() => (shareOpen = false)}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>
