<script lang="ts">
  /**
   * FloatingToolbar — Fixed pill at bottom-center of the canvas.
   *
   * State-driven primary action:
   *  - Draft (groups exist, not shared): "Done" button with popover options
   *  - Shared (groups published): "Make New Groups" button
   *
   * Also contains Settings gear (with popover) and Display button.
   * Visible when groups exist and not viewing history.
   */

  import type { Group, Session } from '$lib/domain';
  import SettingsPopover from './SettingsPopover.svelte';

  interface Props {
    visible: boolean;
    isPublished: boolean;
    onShowToClass: () => void;
    onMakeNewGroups: () => void;
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
    onDisplay?: () => void;
    onToggleHistory?: () => void;
    hasHistory?: boolean;
    historyPanelOpen?: boolean;
    sessions?: Session[];
    viewingSessionId?: string | null;
    currentSessionId?: string | null;
    onSelectSession?: (sessionId: string | null) => void;
    onDeleteSession?: (sessionId: string) => void;
    onRenameSession?: (sessionId: string, name: string) => void;
    onPrint?: () => void;
    onCopyForSpreadsheet?: () => void;
    onMoveToComputer?: () => void;
  }

  let {
    visible,
    isPublished,
    onShowToClass,
    onMakeNewGroups,
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
    onDisplay,
    onToggleHistory,
    hasHistory = false,
    historyPanelOpen = false,
    sessions = [],
    viewingSessionId = null,
    currentSessionId = null,
    onSelectSession,
    onDeleteSession,
    onRenameSession,
    onPrint,
    onCopyForSpreadsheet,
    onMoveToComputer
  }: Props = $props();

  let doneMenuOpen = $state(false);

  function handleDoneClick() {
    doneMenuOpen = !doneMenuOpen;
  }

  function handleDoneOption(action: (() => void) | undefined) {
    doneMenuOpen = false;
    action?.();
  }
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
          {onDisplay}
          {onToggleHistory}
          {hasHistory}
          {historyPanelOpen}
          {sessions}
          {viewingSessionId}
          {currentSessionId}
          {onSelectSession}
          {onDeleteSession}
          {onRenameSession}
        />
      {/if}
    </div>

    <!-- Done button with options popover -->
    <div class="relative">
      <button
        type="button"
        onclick={handleDoneClick}
        class="flex min-h-[56px] items-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        aria-label="Done"
        aria-expanded={doneMenuOpen}
        aria-haspopup="true"
        title="Save groups and see options"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        Done
      </button>

      {#if doneMenuOpen}
        <!-- Backdrop to close menu -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="fixed inset-0 z-30"
          onclick={() => (doneMenuOpen = false)}
          onkeydown={(e) => {
            if (e.key === 'Escape') doneMenuOpen = false;
          }}
        ></div>

        <!-- Options popover -->
        <div
          class="absolute bottom-full left-1/2 z-40 mb-2 w-56 -translate-x-1/2 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
          role="menu"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
            onclick={() => handleDoneOption(onPrint)}
          >
            <svg
              class="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 7.234V3.375"
              />
            </svg>
            Print
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
            onclick={() => handleDoneOption(onCopyForSpreadsheet)}
          >
            <svg
              class="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M12 16.875c0-.621.504-1.125 1.125-1.125"
              />
            </svg>
            Copy for Spreadsheet
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
            onclick={() => handleDoneOption(onMoveToComputer)}
          >
            <svg
              class="h-5 w-5 text-gray-400"
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
            Move to Another Computer
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
