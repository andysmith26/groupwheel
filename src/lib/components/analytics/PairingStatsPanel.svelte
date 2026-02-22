<script lang="ts">
  /**
   * PairingStatsPanel.svelte
   *
   * Displays pairing frequency statistics showing how often student pairs
   * have been grouped together. Shows top pairs by default with option
   * to expand to see all pairs.
   */

  import type { PairingStat } from '$lib/application/useCases/getProgramPairingStats';

  interface Props {
    /** Pairing statistics sorted by count */
    pairs: PairingStat[];
    /** Total number of sessions analyzed */
    totalSessions: number;
    /** Whether data is loading */
    isLoading?: boolean;
    /** Number of pairs to show initially */
    initialLimit?: number;
  }

  let { pairs, totalSessions, isLoading = false, initialLimit = 10 }: Props = $props();

  let showAll = $state(false);

  let displayedPairs = $derived(() => {
    if (showAll || pairs.length <= initialLimit) {
      return pairs;
    }
    return pairs.slice(0, initialLimit);
  });

  let hasMore = $derived(pairs.length > initialLimit);
</script>

<div class="space-y-4">
  {#if isLoading}
    <div class="flex items-center justify-center py-8">
      <p class="text-gray-500">Loading pairing data...</p>
    </div>
  {:else if pairs.length === 0}
    <div class="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
      <p class="text-gray-500">No pairing history yet.</p>
      <p class="mt-1 text-sm text-gray-400">
        Pairing data is recorded when sessions are published.
      </p>
    </div>
  {:else}
    <!-- Summary -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-600">
        Based on <span class="font-medium">{totalSessions}</span> published session{totalSessions ===
        1
          ? ''
          : 's'}
      </p>
      <p class="text-sm text-gray-500">
        {pairs.length} unique pair{pairs.length === 1 ? '' : 's'}
      </p>
    </div>

    <!-- Pairs list -->
    <div class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {#each displayedPairs() as pair (pair.studentAId + ':' + pair.studentBId)}
        <div class="flex items-center justify-between p-3 hover:bg-gray-50">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="truncate text-sm text-gray-900">{pair.studentAName}</span>
            <svg
              class="h-4 w-4 flex-shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span class="truncate text-sm text-gray-900">{pair.studentBName}</span>
          </div>
          <span
            class="ml-4 flex-shrink-0 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800"
          >
            {pair.count}x
          </span>
        </div>
      {/each}
    </div>

    <!-- Show more/less button -->
    {#if hasMore}
      <div class="text-center">
        <button
          type="button"
          class="text-sm font-medium text-teal hover:text-teal-dark"
          onclick={() => (showAll = !showAll)}
        >
          {showAll ? 'Show less' : `Show all ${pairs.length} pairs`}
        </button>
      </div>
    {/if}
  {/if}
</div>
