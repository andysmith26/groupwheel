<script lang="ts">
  /**
   * HistoryPanel — Expandable sidebar showing generation history and session history.
   *
   * Generation history: snapshots of previous group arrangements from the current editing session.
   * Session history: published sessions loaded from the database.
   *
   * See: project definition.md — WP9, Part 3 (Class View enriched state)
   */

  import type { Session } from '$lib/domain';
  import type { GenerationHistoryEntry } from '$lib/stores/class-view-vm.svelte';

  interface Props {
    open: boolean;
    generationHistory: GenerationHistoryEntry[];
    sessions: Session[];
    selectedHistoryIndex: number;
    onSelect: (index: number) => void;
    onToggle: () => void;
  }

  let {
    open,
    generationHistory,
    sessions,
    selectedHistoryIndex,
    onSelect,
    onToggle
  }: Props = $props();

  let publishedSessions = $derived(
    sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED')
  );

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatDate(date: Date): string {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    if (isToday) return 'Today';

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatAnalytics(entry: GenerationHistoryEntry): string {
    if (!entry.analytics) return '';
    return `${Math.round(entry.analytics.percentAssignedTopChoice)}% top choice`;
  }
</script>

{#if open}
  <div
    class="flex w-64 shrink-0 flex-col border-l border-gray-200 bg-white"
    role="complementary"
    aria-label="History panel"
  >
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-900">History</h3>
      <button
        type="button"
        onclick={onToggle}
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close history panel"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Generation History (this session) -->
      {#if generationHistory.length > 0}
        <div class="px-4 py-3">
          <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            This Session
          </h4>

          <!-- Current arrangement -->
          <button
            type="button"
            onclick={() => onSelect(-1)}
            class="mb-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors {selectedHistoryIndex === -1
              ? 'bg-teal-50 text-teal-800'
              : 'text-gray-700 hover:bg-gray-50'}"
            aria-current={selectedHistoryIndex === -1 ? 'true' : undefined}
          >
            <div class="mt-0.5 h-2 w-2 shrink-0 rounded-full {selectedHistoryIndex === -1 ? 'bg-teal-500' : 'bg-gray-300'}"></div>
            <div class="min-w-0">
              <div class="font-medium">Current</div>
            </div>
          </button>

          <!-- Previous generations -->
          {#each generationHistory as entry, i}
            <button
              type="button"
              onclick={() => onSelect(i)}
              class="mb-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors {selectedHistoryIndex === i
                ? 'bg-teal-50 text-teal-800'
                : 'text-gray-700 hover:bg-gray-50'}"
              aria-current={selectedHistoryIndex === i ? 'true' : undefined}
            >
              <div class="mt-0.5 h-2 w-2 shrink-0 rounded-full {selectedHistoryIndex === i ? 'bg-teal-500' : 'bg-gray-300'}"></div>
              <div class="min-w-0">
                <div class="font-medium">
                  {i === 0 ? 'Previous' : `Option ${i + 1}`}
                </div>
                <div class="text-xs text-gray-500">
                  {formatTime(entry.generatedAt)}
                  {#if entry.analytics}
                    &middot; {formatAnalytics(entry)}
                  {/if}
                </div>
                <div class="mt-0.5 text-xs text-gray-400">
                  {entry.groups.length} groups
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Session History (past published sessions) -->
      {#if publishedSessions.length > 0}
        <div class="border-t border-gray-100 px-4 py-3">
          <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            Past Sessions
          </h4>
          {#each publishedSessions as session}
            <div class="mb-1 rounded-md px-2 py-2 text-sm text-gray-600">
              <div class="font-medium text-gray-700">{session.name}</div>
              <div class="text-xs text-gray-500">
                {formatDate(session.startDate)}
                {#if session.publishedAt}
                  &middot; Published
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Empty state -->
      {#if generationHistory.length === 0 && publishedSessions.length === 0}
        <div class="flex flex-col items-center justify-center px-4 py-8 text-center">
          <svg class="mb-2 h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p class="text-sm text-gray-500">No history yet</p>
          <p class="mt-1 text-xs text-gray-400">Generate groups to start building history.</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
