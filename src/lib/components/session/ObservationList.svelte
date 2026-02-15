<script lang="ts">
	/**
	 * ObservationList.svelte
	 *
	 * Displays a list of observations for a group or session.
	 * Shows sentiment, content, tags, and timestamp.
	 */

	import type { Observation } from '$lib/domain';

	interface Props {
		/** Observations to display */
		observations: Observation[];
		/** Show group name in each observation */
		showGroupName?: boolean;
		/** Compact mode for inline display */
		compact?: boolean;
	}

	let { observations, showGroupName = false, compact = false }: Props = $props();

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getSentimentIcon(sentiment?: string): { icon: string; class: string } {
		switch (sentiment) {
			case 'POSITIVE':
				return { icon: '+', class: 'text-green-600 bg-green-100' };
			case 'NEGATIVE':
				return { icon: '!', class: 'text-red-600 bg-red-100' };
			case 'NEUTRAL':
			default:
				return { icon: '~', class: 'text-gray-600 bg-gray-100' };
		}
	}

	function getSentimentLabel(sentiment?: string): string {
		switch (sentiment) {
			case 'POSITIVE':
				return 'Positive';
			case 'NEGATIVE':
				return 'Needs work';
			case 'NEUTRAL':
				return 'Neutral';
			default:
				return '';
		}
	}
</script>

{#if observations.length === 0}
	<div class="text-center py-4">
		<p class="text-sm text-gray-500">No observations recorded yet.</p>
	</div>
{:else}
	<div class={compact ? 'space-y-2' : 'space-y-3'}>
		{#each observations as observation (observation.id)}
			{@const sentimentStyle = getSentimentIcon(observation.sentiment)}
			<div class="rounded-lg border border-gray-200 bg-white {compact ? 'p-2' : 'p-3'}">
				<div class="flex items-start gap-2">
					<!-- Sentiment indicator -->
					{#if observation.sentiment}
						<div
							class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold {sentimentStyle.class}"
							title={getSentimentLabel(observation.sentiment)}
						>
							{sentimentStyle.icon}
						</div>
					{/if}

					<div class="min-w-0 flex-1">
						<!-- Header: Group name (optional) + timestamp -->
						<div class="flex items-center gap-2 text-xs text-gray-500">
							{#if showGroupName && observation.groupName}
								<span class="font-medium text-gray-700">{observation.groupName}</span>
								<span>·</span>
							{/if}
							<span>{formatDate(observation.createdAt)}</span>
							<span>·</span>
							<span>{formatTime(observation.createdAt)}</span>
						</div>

						<!-- Content -->
						<p class="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{observation.content}</p>

						<!-- Tags -->
						{#if observation.tags && observation.tags.length > 0}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each observation.tags as tag (tag)}
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
										{tag}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
