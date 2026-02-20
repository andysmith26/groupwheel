<script lang="ts">
	/**
	 * ObservationTrendsSection: Shows observation sentiment trends on the activity detail page.
	 *
	 * Displays a headline stat, per-session stacked bar chart, and drill-through
	 * to individual session observations.
	 */
	import type { Observation } from '$lib/domain';
	import type { ObservationTrendsResult } from '$lib/application/useCases/getObservationTrends';
	import ObservationList from '$lib/components/session/ObservationList.svelte';

	const {
		trends,
		onLoadSessionObservations,
		isLoading = false
	}: {
		trends: ObservationTrendsResult;
		onLoadSessionObservations: (sessionId: string) => Promise<Observation[]>;
		isLoading?: boolean;
	} = $props();

	let expandedSessionId = $state<string | null>(null);
	let sessionObservations = $state<Observation[]>([]);
	let loadingSession = $state(false);

	let headlineStat = $derived.by(() => {
		const { totals, sessionSummaries, coverageRatio } = trends;
		if (totals.total === 0) return 'No observations recorded yet';
		const positivePercent = Math.round((totals.positive / totals.total) * 100);
		const sessionCount = coverageRatio.sessionsWithObservations;
		return `${positivePercent}% positive sentiment across ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
	});

	let showTrendChart = $derived(trends.sessionSummaries.length >= 3);

	let showPrompt = $derived(
		trends.sessionSummaries.length > 0 && trends.sessionSummaries.length < 3
	);

	function formatSessionDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getBarWidths(summary: { positive: number; neutral: number; negative: number; total: number }) {
		if (summary.total === 0) return { pos: 0, neu: 0, neg: 0 };
		return {
			pos: (summary.positive / summary.total) * 100,
			neu: (summary.neutral / summary.total) * 100,
			neg: (summary.negative / summary.total) * 100
		};
	}

	async function toggleSession(sessionId: string) {
		if (expandedSessionId === sessionId) {
			expandedSessionId = null;
			sessionObservations = [];
			return;
		}

		expandedSessionId = sessionId;
		loadingSession = true;
		sessionObservations = await onLoadSessionObservations(sessionId);
		loadingSession = false;
	}
</script>

<div class="rounded-xl border border-gray-200 bg-white">
	<button
		type="button"
		class="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
		onclick={() => {/* section is always expanded once visible — no collapse toggle */}}
	>
		<div>
			<h3 class="text-lg font-semibold text-gray-900">Observations</h3>
			{#if !isLoading}
				<p class="mt-0.5 text-sm text-gray-600">{headlineStat}</p>
			{/if}
		</div>
	</button>

	{#if isLoading}
		<div class="px-6 pb-4">
			<p class="text-sm text-gray-400">Loading trends...</p>
		</div>
	{:else}
		<div class="px-6 pb-6">
			{#if showPrompt}
				<p class="text-sm text-gray-500">
					Keep recording observations to see trends over time.
				</p>
			{/if}

			{#if showTrendChart}
				<!-- Legend -->
				<div class="mb-3 flex items-center gap-4 text-xs text-gray-500">
					<span class="flex items-center gap-1">
						<span class="inline-block h-2.5 w-2.5 rounded-sm bg-green-500"></span> Positive
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400"></span> Neutral
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-2.5 w-2.5 rounded-sm bg-red-400"></span> Negative
					</span>
				</div>

				<!-- Session trend bars -->
				<div class="space-y-1">
					{#each trends.sessionSummaries as summary (summary.sessionId)}
						{@const widths = getBarWidths(summary)}
						<div>
							<button
								type="button"
								class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 {expandedSessionId === summary.sessionId ? 'bg-gray-50' : ''}"
								onclick={() => toggleSession(summary.sessionId)}
							>
								<!-- Date label -->
								<span class="w-16 shrink-0 text-xs text-gray-500">
									{formatSessionDate(summary.sessionDate)}
								</span>

								<!-- Stacked bar -->
								<div class="flex h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
									{#if widths.pos > 0}
										<div class="bg-green-500 transition-all" style="width: {widths.pos}%"></div>
									{/if}
									{#if widths.neu > 0}
										<div class="bg-amber-400 transition-all" style="width: {widths.neu}%"></div>
									{/if}
									{#if widths.neg > 0}
										<div class="bg-red-400 transition-all" style="width: {widths.neg}%"></div>
									{/if}
								</div>

								<!-- Count -->
								<span class="w-12 shrink-0 text-right text-xs text-gray-400">
									{summary.total} obs
								</span>

								<!-- Expand indicator -->
								<span class="text-gray-400 transition-transform {expandedSessionId === summary.sessionId ? 'rotate-180' : ''}">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</span>
							</button>

							<!-- Drill-through: session observations -->
							{#if expandedSessionId === summary.sessionId}
								<div class="ml-20 mr-4 mt-1 mb-2">
									{#if loadingSession}
										<p class="text-xs text-gray-400 py-2">Loading observations...</p>
									{:else}
										<ObservationList
											observations={sessionObservations}
											showGroupName={true}
											compact={true}
										/>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
