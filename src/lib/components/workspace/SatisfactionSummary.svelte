<script lang="ts">
	/**
	 * SatisfactionSummary: Shows preference satisfaction stats.
	 *
	 * Displays when preferences exist for an activity.
	 * Shows a compact summary that can expand for details.
	 * Updates live as students are moved between groups.
	 */
	import type { ScenarioSatisfaction } from '$lib/domain';

	const {
		analytics,
		studentsWithPreferences,
		totalStudents
	}: {
		analytics: ScenarioSatisfaction | null;
		studentsWithPreferences: number;
		totalStudents: number;
	} = $props();

	let expanded = $state(false);

	// Format percentage to whole number
	function formatPercent(value: number | undefined): string {
		if (value === undefined || isNaN(value)) return '0';
		return Math.round(value).toString();
	}

	// Format average rank to 1 decimal
	function formatRank(value: number | undefined): string {
		if (value === undefined || isNaN(value)) return '-';
		return value.toFixed(1);
	}

	let topChoice = $derived(formatPercent(analytics?.percentAssignedTopChoice));
	let top3 = $derived(formatPercent(analytics?.percentAssignedTop3));
	let avgRank = $derived(formatRank(analytics?.averagePreferenceRankAssigned));
	let unassigned = $derived(analytics?.studentsUnassignedToRequest ?? 0);
</script>

{#if analytics && studentsWithPreferences > 0}
	<div class="rounded-lg border border-amber-200 bg-amber-50/50">
		<!-- Compact summary bar -->
		<button
			type="button"
			class="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-amber-100/50 transition-colors rounded-lg"
			onclick={() => expanded = !expanded}
			aria-expanded={expanded}
		>
			<div class="flex items-center gap-3">
				<svg class="h-5 w-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
				<span class="text-sm text-amber-800">
					<span class="font-semibold">{top3}%</span> got a top-3 choice
					<span class="text-amber-600 mx-1">·</span>
					<span class="font-semibold">{topChoice}%</span> got #1
				</span>
			</div>
			<svg
				class="h-4 w-4 text-amber-600 transition-transform {expanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		<!-- Expanded details -->
		{#if expanded}
			<div class="px-4 pb-3 pt-1 border-t border-amber-200/50">
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<div class="text-amber-600 text-xs uppercase tracking-wide mb-1">Satisfaction</div>
						<div class="space-y-1">
							<div class="flex justify-between">
								<span class="text-amber-700">Got #1 choice</span>
								<span class="font-medium text-amber-900">{topChoice}%</span>
							</div>
							<div class="flex justify-between">
								<span class="text-amber-700">Got top 2</span>
								<span class="font-medium text-amber-900">{formatPercent(analytics?.percentAssignedTop2)}%</span>
							</div>
							<div class="flex justify-between">
								<span class="text-amber-700">Got top 3</span>
								<span class="font-medium text-amber-900">{top3}%</span>
							</div>
						</div>
					</div>
					<div>
						<div class="text-amber-600 text-xs uppercase tracking-wide mb-1">Details</div>
						<div class="space-y-1">
							<div class="flex justify-between">
								<span class="text-amber-700">Avg rank</span>
								<span class="font-medium text-amber-900">{avgRank}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-amber-700">With preferences</span>
								<span class="font-medium text-amber-900">{studentsWithPreferences}/{totalStudents}</span>
							</div>
							{#if unassigned > 0}
								<div class="flex justify-between">
									<span class="text-amber-700">Didn't get any choice</span>
									<span class="font-medium text-red-600">{unassigned}</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
