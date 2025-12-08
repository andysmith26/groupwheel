<script lang="ts">
	import type { ScenarioSatisfaction } from '$lib/domain';
	import type { AnalyticsDelta } from '$lib/application/stores/ScenarioEditingStore.svelte';

	const {
		open = false,
		baseline = null,
		current = null,
		delta = null
	} = $props<{
		open?: boolean;
		baseline?: ScenarioSatisfaction | null;
		current?: ScenarioSatisfaction | null;
		delta?: AnalyticsDelta | null;
	}>();

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
		<div class="mt-3 space-y-2 text-sm text-gray-800">
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
			{#if baseline}
				<p class="pt-2 text-xs text-gray-500">
					Baseline captured from latest generation.
				</p>
			{/if}
		</div>
	</div>
{/if}
