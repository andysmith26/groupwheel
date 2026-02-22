<script lang="ts">
  /**
   * ActivityAnalyticsCard.svelte
   *
   * Compact card showing key metrics for a single activity.
   * Used in the global analytics overview.
   */

  interface Props {
    /** Activity/program ID */
    programId: string;
    /** Activity name */
    name: string;
    /** Number of published sessions */
    sessionCount: number;
    /** Number of students */
    studentCount: number;
    /** Observation sentiment counts */
    sentimentCounts?: {
      positive: number;
      neutral: number;
      negative: number;
    };
    /** Click handler */
    onclick?: () => void;
  }

  let { programId, name, sessionCount, studentCount, sentimentCounts, onclick }: Props = $props();

  let totalObservations = $derived(
    sentimentCounts
      ? sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative
      : 0
  );
</script>

<button
  type="button"
  class="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
  {onclick}
>
  <div class="flex items-start justify-between">
    <div class="min-w-0 flex-1">
      <h3 class="truncate text-base font-medium text-gray-900">{name}</h3>
      <p class="mt-1 text-sm text-gray-500">
        {sessionCount} session{sessionCount === 1 ? '' : 's'} &middot;
        {studentCount} student{studentCount === 1 ? '' : 's'}
      </p>
    </div>
    <svg
      class="h-5 w-5 flex-shrink-0 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </div>

  {#if totalObservations > 0 && sentimentCounts}
    <div class="mt-3 flex items-center gap-3">
      <div class="flex items-center gap-1">
        <span
          class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700"
        >
          +
        </span>
        <span class="text-sm text-gray-600">{sentimentCounts.positive}</span>
      </div>
      <div class="flex items-center gap-1">
        <span
          class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700"
        >
          ~
        </span>
        <span class="text-sm text-gray-600">{sentimentCounts.neutral}</span>
      </div>
      <div class="flex items-center gap-1">
        <span
          class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-700"
        >
          -
        </span>
        <span class="text-sm text-gray-600">{sentimentCounts.negative}</span>
      </div>
    </div>
  {:else if sessionCount === 0}
    <p class="mt-2 text-xs text-gray-400">No saved sessions</p>
  {/if}
</button>
