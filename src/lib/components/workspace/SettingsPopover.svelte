<script lang="ts">
  /**
   * SettingsPopover — Popover for rotation avoidance settings.
   *
   * Opens upward from the FloatingToolbar gear button.
   * Replaces the former SettingsPanel sidebar.
   *
   * See: project definition.md — Decision 6 (Rotation Avoidance), WP10
   */

  interface Props {
    avoidRecentGroupmates: boolean;
    lookbackSessions: number;
    publishedSessionCount: number;
    onToggleAvoidance: (enabled: boolean) => void;
    onLookbackChange: (sessions: number) => void;
    onClose: () => void;
  }

  let {
    avoidRecentGroupmates,
    lookbackSessions,
    publishedSessionCount,
    onToggleAvoidance,
    onLookbackChange,
    onClose,
  }: Props = $props();

  let popoverEl = $state<HTMLDivElement | null>(null);

  function handleToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    onToggleAvoidance(target.checked);
  }

  function handleLookbackChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onLookbackChange(parseInt(target.value, 10));
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (popoverEl && !popoverEl.contains(e.target as Node)) {
      onClose();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={popoverEl}
  class="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-lg border border-gray-200 bg-white shadow-xl"
  role="dialog"
  aria-label="Generation settings"
  onclick={(e) => e.stopPropagation()}
>
  <div class="border-b border-gray-200 px-4 py-3">
    <h3 class="text-sm font-semibold text-gray-900">Settings</h3>
  </div>

  <div class="max-h-[calc(100vh-120px)] overflow-y-auto px-4 py-4">
    <h4 class="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
      Group Rotation
    </h4>

    <!-- Avoid Recent Groupmates Toggle -->
    <label class="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={avoidRecentGroupmates}
        onchange={handleToggle}
        class="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <div>
        <span class="text-sm font-medium text-gray-900">Avoid recent groupmates</span>
        <p class="mt-0.5 text-xs text-gray-500">
          Students won't be grouped with people they recently worked with.
        </p>
      </div>
    </label>

    <!-- Lookback Window -->
    {#if avoidRecentGroupmates}
      <div class="mt-4 pl-7">
        <label for="lookback-sessions" class="block text-sm font-medium text-gray-700">
          Look back
          <span class="font-semibold text-gray-900">{lookbackSessions}</span>
          {lookbackSessions === 1 ? 'session' : 'sessions'}
        </label>
        <input
          id="lookback-sessions"
          type="range"
          min="1"
          max="10"
          value={lookbackSessions}
          oninput={handleLookbackChange}
          class="mt-2 w-full accent-teal-600"
        />
        <div class="mt-1 flex justify-between text-xs text-gray-400">
          <span>1</span>
          <span>10</span>
        </div>
        {#if publishedSessionCount < 2}
          <p class="mt-2 text-xs text-gray-400">
            Rotation avoidance will take effect after your second session.
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>
