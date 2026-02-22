<script lang="ts">
  import type { Group, Student } from '$lib/domain';
  import type { ScenarioSatisfaction } from '$lib/domain/analytics';
  import { interpretAnalytics, type MetricQuality } from '$lib/utils/analyticsInterpretation';

  const {
    currentGroups,
    currentAnalytics,
    alternativeGroups,
    alternativeAnalytics,
    studentCount,
    groupCount,
    studentsById,
    onKeepCurrent,
    onUseAlternative,
    onClose
  } = $props<{
    currentGroups: Group[];
    currentAnalytics: ScenarioSatisfaction;
    alternativeGroups: Group[];
    alternativeAnalytics: ScenarioSatisfaction;
    studentCount: number;
    groupCount: number;
    studentsById: Record<string, Student>;
    onKeepCurrent: () => void;
    onUseAlternative: () => void;
    onClose: () => void;
  }>();

  const currentInterpretation = $derived(
    groupCount > 0
      ? interpretAnalytics({
          current: currentAnalytics,
          baseline: null,
          studentCount,
          groupCount
        })
      : null
  );

  const alternativeInterpretation = $derived(
    groupCount > 0
      ? interpretAnalytics({
          current: alternativeAnalytics,
          baseline: null,
          studentCount,
          groupCount
        })
      : null
  );

  // Compute student diffs between the two arrangements
  const studentDiffs = $derived.by(() => {
    const leftMap = new Map<string, string>();
    for (const group of currentGroups) {
      for (const id of group.memberIds) leftMap.set(id, group.id);
    }

    const rightMap = new Map<string, string>();
    for (const group of alternativeGroups) {
      for (const id of group.memberIds) rightMap.set(id, group.id);
    }

    const diffs = new Set<string>();
    for (const [id, leftGroup] of leftMap) {
      if (rightMap.get(id) !== leftGroup) diffs.add(id);
    }
    return diffs;
  });

  function qualityPillClass(quality: MetricQuality): string {
    switch (quality) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'strong':
        return 'bg-teal-100 text-teal-800';
      case 'typical':
        return 'bg-yellow-100 text-yellow-800';
      case 'could_improve':
        return 'bg-orange-100 text-orange-800';
    }
  }

  function formatPercent(value: number | undefined): string {
    if (value === undefined || isNaN(value)) return '–';
    return `${Math.round(value)}%`;
  }

  function formatRank(value: number | undefined): string {
    if (value === undefined || isNaN(value)) return '–';
    return value.toFixed(1);
  }

  function getStudentName(studentId: string): string {
    const s = studentsById[studentId];
    if (!s) return studentId.slice(0, 6);
    return `${s.firstName} ${(s.lastName ?? '').charAt(0)}.`.trim();
  }
</script>

<!-- Modal overlay -->
<div
  class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8"
  role="dialog"
  aria-modal="true"
  aria-label="Compare Arrangements"
>
  <div class="w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <h2 class="text-lg font-semibold text-gray-900">Compare Arrangements</h2>
      <button
        type="button"
        onclick={onClose}
        class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Diff summary -->
    <div class="border-b border-gray-100 bg-gray-50 px-6 py-2 text-sm text-gray-600">
      {studentDiffs.size} student{studentDiffs.size !== 1 ? 's' : ''} in different groups
    </div>

    <!-- Side-by-side comparison -->
    <div class="grid grid-cols-2 divide-x divide-gray-200">
      <!-- Current -->
      <div class="p-4">
        <h3 class="mb-3 text-sm font-semibold text-gray-700">Current</h3>

        {#if currentInterpretation}
          <div class="mb-3">
            <span
              class={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${qualityPillClass(currentInterpretation.topChoiceQuality)}`}
            >
              {currentInterpretation.topChoiceLabel}
            </span>
          </div>
        {/if}

        <!-- Metrics -->
        <div class="mb-4 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Top choice</span>
            <span class="font-medium"
              >{formatPercent(currentAnalytics.percentAssignedTopChoice)}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Top 2</span>
            <span class="font-medium">{formatPercent(currentAnalytics.percentAssignedTop2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Avg rank</span>
            <span class="font-medium"
              >{formatRank(currentAnalytics.averagePreferenceRankAssigned)}</span
            >
          </div>
          {#if (currentAnalytics.studentsUnassignedToRequest ?? 0) > 0}
            <div class="flex justify-between">
              <span class="text-gray-600">No choice met</span>
              <span class="font-medium text-red-600"
                >{currentAnalytics.studentsUnassignedToRequest}</span
              >
            </div>
          {/if}
        </div>

        <!-- Group lists -->
        <div class="space-y-3">
          {#each currentGroups as group}
            <div>
              <div class="flex items-center justify-between text-xs font-medium text-gray-700">
                <span>{group.name}</span>
                <span class="text-gray-500">({group.memberIds.length})</span>
              </div>
              <div class="mt-0.5 space-y-0.5">
                {#each group.memberIds as memberId}
                  <div
                    class={`text-xs ${studentDiffs.has(memberId) ? 'font-medium text-blue-700' : 'text-gray-600'}`}
                  >
                    {getStudentName(memberId)}{#if studentDiffs.has(memberId)}{' '}←{/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <!-- Action -->
        <div class="mt-4">
          <button
            type="button"
            onclick={onKeepCurrent}
            class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Keep Current
          </button>
        </div>
      </div>

      <!-- Alternative -->
      <div class="p-4">
        <h3 class="mb-3 text-sm font-semibold text-gray-700">Alternative</h3>

        {#if alternativeInterpretation}
          <div class="mb-3">
            <span
              class={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${qualityPillClass(alternativeInterpretation.topChoiceQuality)}`}
            >
              {alternativeInterpretation.topChoiceLabel}
            </span>
          </div>
        {/if}

        <!-- Metrics -->
        <div class="mb-4 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Top choice</span>
            <span class="font-medium"
              >{formatPercent(alternativeAnalytics.percentAssignedTopChoice)}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Top 2</span>
            <span class="font-medium"
              >{formatPercent(alternativeAnalytics.percentAssignedTop2)}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Avg rank</span>
            <span class="font-medium"
              >{formatRank(alternativeAnalytics.averagePreferenceRankAssigned)}</span
            >
          </div>
          {#if (alternativeAnalytics.studentsUnassignedToRequest ?? 0) > 0}
            <div class="flex justify-between">
              <span class="text-gray-600">No choice met</span>
              <span class="font-medium text-red-600"
                >{alternativeAnalytics.studentsUnassignedToRequest}</span
              >
            </div>
          {/if}
        </div>

        <!-- Group lists -->
        <div class="space-y-3">
          {#each alternativeGroups as group}
            <div>
              <div class="flex items-center justify-between text-xs font-medium text-gray-700">
                <span>{group.name}</span>
                <span class="text-gray-500">({group.memberIds.length})</span>
              </div>
              <div class="mt-0.5 space-y-0.5">
                {#each group.memberIds as memberId}
                  <div
                    class={`text-xs ${studentDiffs.has(memberId) ? 'font-medium text-blue-700' : 'text-gray-600'}`}
                  >
                    {getStudentName(memberId)}{#if studentDiffs.has(memberId)}{' '}←{/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <!-- Action -->
        <div class="mt-4">
          <button
            type="button"
            onclick={onUseAlternative}
            class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Use This One
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
