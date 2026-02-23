<script lang="ts">
  /**
   * SettingsPanel — Expandable sidebar for rotation avoidance settings.
   *
   * Contains:
   * - Toggle for "Avoid Recent Groupmates" (on by default per Decision 6)
   * - Lookback window slider (1-10 sessions)
   *
   * See: project definition.md — Decision 6 (Rotation Avoidance), WP10
   */

  interface Props {
    open: boolean;
    avoidRecentGroupmates: boolean;
    lookbackSessions: number;
    /** Number of published/archived sessions for this activity */
    publishedSessionCount: number;
    onToggleAvoidance: (enabled: boolean) => void;
    onLookbackChange: (sessions: number) => void;
    onToggle: () => void;
  }

  let {
    open,
    avoidRecentGroupmates,
    lookbackSessions,
    publishedSessionCount,
    onToggleAvoidance,
    onLookbackChange,
    onToggle
  }: Props = $props();

  function handleToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    onToggleAvoidance(target.checked);
  }

  function handleLookbackChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onLookbackChange(parseInt(target.value, 10));
  }
</script>

{#if open}
  <div
    class="flex w-64 shrink-0 flex-col border-l border-gray-200 bg-white"
    role="complementary"
    aria-label="Settings panel"
  >
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-900">Settings</h3>
      <button
        type="button"
        onclick={onToggle}
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close settings panel"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Rotation Avoidance Section -->
      <div class="px-4 py-4">
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
  </div>
{/if}
