<script lang="ts">
  import type { ScenarioSatisfaction } from '$lib/domain';
  import type { AnalyticsDelta } from '$lib/stores/scenarioEditingStore';
  import { interpretAnalytics, type MetricQuality } from '$lib/utils/analyticsInterpretation';

  const {
    open = false,
    baseline = null,
    current = null,
    delta = null,
    studentCount = 0,
    groupCount = 0
  } = $props<{
    open?: boolean;
    baseline?: ScenarioSatisfaction | null;
    current?: ScenarioSatisfaction | null;
    delta?: AnalyticsDelta | null;
    studentCount?: number;
    groupCount?: number;
  }>();

  const interpretation = $derived(
    current && groupCount > 0
      ? interpretAnalytics({ current, baseline, studentCount, groupCount })
      : null
  );

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
    if (value === undefined) return '–';
    return `${Math.round(value)}%`;
  }

  function formatRank(value: number | undefined): string {
    if (value === undefined || Number.isNaN(value)) return '–';
    return value.toFixed(1);
  }
</script>

{#if open}
  <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <h4 class="text-sm font-semibold text-gray-900">Analytics</h4>

    {#if interpretation}
      <!-- Interpretation section -->
      <div class="mt-3 space-y-2">
        <div class="flex items-center gap-2">
          <span
            class={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${qualityPillClass(interpretation.topChoiceQuality)}`}
          >
            {interpretation.topChoiceLabel}
          </span>
        </div>
        <p class="text-sm text-gray-700">{interpretation.topChoiceExplainer}</p>

        {#if interpretation.comparisonNote}
          <p
            class={`text-sm font-medium ${
              interpretation.comparisonNote.startsWith('↑')
                ? 'text-green-600'
                : interpretation.comparisonNote.startsWith('↓')
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {interpretation.comparisonNote}
          </p>
        {/if}
      </div>

      <hr class="my-3 border-gray-200" />
    {/if}

    <!-- Existing raw metrics -->
    <div class="space-y-2 text-sm text-gray-800">
      <div class="flex items-center justify-between">
        <span>Top choice satisfied</span>
        <span class="font-semibold">
          {formatPercent(current?.percentAssignedTopChoice)}
          {#if delta}
            <span class={delta.topChoice >= 0 ? 'text-green-600' : 'text-red-600'}>
              {delta.topChoice >= 0 ? '↑' : '↓'}{Math.abs(Math.round(delta.topChoice))}%
            </span>
          {/if}
        </span>
      </div>
      <div class="flex items-center justify-between">
        <span>Top 2 choices</span>
        <span class="font-semibold">
          {formatPercent(current?.percentAssignedTop2)}
          {#if delta?.top2 !== undefined}
            <span class={delta.top2 >= 0 ? 'text-green-600' : 'text-red-600'}>
              {delta.top2 >= 0 ? '↑' : '↓'}{Math.abs(Math.round(delta.top2))}%
            </span>
          {/if}
        </span>
      </div>
      <div class="flex items-center justify-between">
        <span>Average preference rank</span>
        <span class="font-semibold">
          {formatRank(current?.averagePreferenceRankAssigned)}
          {#if delta}
            <span class={delta.averageRank <= 0 ? 'text-green-600' : 'text-red-600'}>
              {delta.averageRank <= 0 ? '↓' : '↑'}{Math.abs(delta.averageRank).toFixed(1)}
            </span>
          {/if}
        </span>
      </div>
    </div>

    {#if interpretation && interpretation.suggestions.length > 0}
      <hr class="my-3 border-gray-200" />
      <div class="space-y-1.5">
        {#each interpretation.suggestions as suggestion}
          <p class="text-sm text-amber-700">
            <span class="mr-1">💡</span>{suggestion}
          </p>
        {/each}
      </div>
    {/if}

    {#if baseline}
      <p class="pt-2 text-xs text-gray-500">Baseline captured from latest generation.</p>
    {/if}
  </div>
{/if}
