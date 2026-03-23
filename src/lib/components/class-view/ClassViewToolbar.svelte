<script lang="ts">
  /**
   * ClassViewToolbar — Top bar with back, roster toggle, activity name,
   * and save status.
   *
   * See: project definition.md — Part 3 (Class View), WP4
   */

  import SaveStatusIndicator from '$lib/components/editing/SaveStatusIndicator.svelte';
  import type { SaveStatus } from '$lib/stores/scenarioEditingStore';

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
  }

  let {
    activityName,
    saveStatus,
    lastSavedAt,
    isViewingHistory = false,
    onBack,
    onRetrySave,
    onToggleRoster,
    rosterOpen = true,
  }: Props = $props();
</script>

<div class="flex items-center justify-between border-b px-4 py-2 {isViewingHistory ? 'border-amber-200 bg-amber-50' : 'bg-white'}">
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
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      </button>
    {/if}

    <h1 class="min-w-0 truncate text-lg font-semibold text-gray-900">
      {activityName}
    </h1>
  </div>

  <div class="flex items-center gap-2">
    <SaveStatusIndicator status={saveStatus} {lastSavedAt} onRetry={onRetrySave} />

  </div>
</div>
