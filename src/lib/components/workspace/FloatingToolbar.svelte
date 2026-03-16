<script lang="ts">
  /**
   * FloatingToolbar — Fixed pill at bottom-center of the canvas.
   *
   * Contains primary actions: New Session, Settings gear (with popover), Display.
   * Visible when groups exist and not viewing history.
   */

  import type { Group } from '$lib/domain';
  import SettingsPopover from './SettingsPopover.svelte';

  interface Props {
    visible: boolean;
    onNewSession: () => void;
    onDisplay: () => void;
    onToggleSettings: () => void;
    settingsPanelOpen: boolean;
    avoidRecentGroupmates: boolean;
    lookbackSessions: number;
    publishedSessionCount: number;
    onToggleAvoidance: (enabled: boolean) => void;
    onLookbackChange: (sessions: number) => void;
    groups: Group[];
    onUpdateGroup: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
    onDeleteGroup: (groupId: string) => void;
    onAddGroup: () => void;
  }

  let {
    visible,
    onNewSession,
    onDisplay,
    onToggleSettings,
    settingsPanelOpen,
    avoidRecentGroupmates,
    lookbackSessions,
    publishedSessionCount,
    onToggleAvoidance,
    onLookbackChange,
    groups,
    onUpdateGroup,
    onDeleteGroup,
    onAddGroup,
  }: Props = $props();
</script>

{#if visible}
  <div
    class="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-lg"
    role="toolbar"
    aria-label="Group actions"
  >
    <!-- Settings gear (with popover) -->
    <div class="relative">
      <button
        type="button"
        onclick={onToggleSettings}
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors {settingsPanelOpen
          ? 'bg-teal-50 text-teal-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
        aria-label="{settingsPanelOpen ? 'Close' : 'Open'} settings"
        aria-expanded={settingsPanelOpen}
        title="Generation settings"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>

      {#if settingsPanelOpen}
        <SettingsPopover
          {groups}
          {avoidRecentGroupmates}
          {lookbackSessions}
          {publishedSessionCount}
          {onToggleAvoidance}
          {onLookbackChange}
          {onUpdateGroup}
          {onDeleteGroup}
          {onAddGroup}
          onClose={onToggleSettings}
        />
      {/if}
    </div>

    <!-- Primary action: New Session -->
    <button
      type="button"
      onclick={onNewSession}
      class="flex min-h-[56px] items-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
      aria-label="Start new session"
      title="Generate new groups"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      New Session
    </button>

    <!-- Display -->
    <button
      type="button"
      onclick={onDisplay}
      class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      aria-label="Display groups fullscreen"
      title="Display groups (fullscreen)"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    </button>
  </div>
{/if}
