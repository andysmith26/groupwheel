<script lang="ts">
	/**
	 * ObservationSummaryCard.svelte
	 *
	 * Displays aggregated observation data:
	 * - Sentiment breakdown (positive/neutral/negative counts)
	 * - Top tags as pills
	 * - Recent observations list
	 */

	import type { Observation } from '$lib/domain';
	import type { TagCount } from '$lib/application/useCases/getObservationSummary';

	interface Props {
		/** Total observation count */
		totalObservations: number;
		/** Sentiment counts */
		sentimentCounts: {
			positive: number;
			neutral: number;
			negative: number;
			unspecified: number;
		};
		/** Top tags sorted by frequency */
		topTags: TagCount[];
		/** Most recent observations */
		recentObservations: Observation[];
		/** Whether data is loading */
		isLoading?: boolean;
	}

	let {
		totalObservations,
		sentimentCounts,
		topTags,
		recentObservations,
		isLoading = false
	}: Props = $props();

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getSentimentEmoji(sentiment: string | undefined): string {
		switch (sentiment) {
			case 'POSITIVE':
				return '+';
			case 'NEGATIVE':
				return '-';
			case 'NEUTRAL':
				return '~';
			default:
				return '?';
		}
	}

	function getSentimentClass(sentiment: string | undefined): string {
		switch (sentiment) {
			case 'POSITIVE':
				return 'bg-green-100 text-green-700';
			case 'NEGATIVE':
				return 'bg-red-100 text-red-700';
			case 'NEUTRAL':
				return 'bg-gray-100 text-gray-700';
			default:
				return 'bg-gray-100 text-gray-500';
		}
	}
</script>

<div class="space-y-6">
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<p class="text-gray-500">Loading observations...</p>
		</div>
	{:else if totalObservations === 0}
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
			<p class="text-gray-500">No observations yet.</p>
			<p class="mt-1 text-sm text-gray-400">
				Record observations about group effectiveness after sessions.
			</p>
		</div>
	{:else}
		<!-- Sentiment breakdown -->
		<div>
			<h4 class="text-sm font-medium text-gray-700 mb-3">Sentiment Breakdown</h4>
			<div class="grid grid-cols-3 gap-3">
				<div class="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
					<p class="text-2xl font-semibold text-green-700">{sentimentCounts.positive}</p>
					<p class="text-xs text-green-600">Positive</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
					<p class="text-2xl font-semibold text-gray-700">{sentimentCounts.neutral}</p>
					<p class="text-xs text-gray-600">Neutral</p>
				</div>
				<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
					<p class="text-2xl font-semibold text-red-700">{sentimentCounts.negative}</p>
					<p class="text-xs text-red-600">Negative</p>
				</div>
			</div>
			{#if sentimentCounts.unspecified > 0}
				<p class="mt-2 text-xs text-gray-500 text-center">
					+ {sentimentCounts.unspecified} without sentiment
				</p>
			{/if}
		</div>

		<!-- Top tags -->
		{#if topTags.length > 0}
			<div>
				<h4 class="text-sm font-medium text-gray-700 mb-3">Common Tags</h4>
				<div class="flex flex-wrap gap-2">
					{#each topTags as { tag, count } (tag)}
						<span class="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700">
							{tag}
							<span class="text-xs text-teal-500">({count})</span>
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Recent observations -->
		{#if recentObservations.length > 0}
			<div>
				<h4 class="text-sm font-medium text-gray-700 mb-3">Recent Observations</h4>
				<div class="space-y-3">
					{#each recentObservations as obs (obs.id)}
						<div class="rounded-lg border border-gray-200 bg-white p-3">
							<div class="flex items-start justify-between gap-2">
								<div class="flex items-center gap-2 min-w-0">
									<span class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium {getSentimentClass(obs.sentiment)}">
										{getSentimentEmoji(obs.sentiment)}
									</span>
									<span class="text-sm font-medium text-gray-700 truncate">
										{obs.groupName}
									</span>
								</div>
								<span class="flex-shrink-0 text-xs text-gray-400">
									{formatDate(obs.createdAt)}
								</span>
							</div>
							<p class="mt-2 text-sm text-gray-600 line-clamp-2">
								{obs.content}
							</p>
							{#if obs.tags && obs.tags.length > 0}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each obs.tags as tag (tag)}
										<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
											{tag}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
