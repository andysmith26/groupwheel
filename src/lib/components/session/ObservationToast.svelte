<script lang="ts">
	/**
	 * ObservationToast: Post-publish toast for quick observations.
	 *
	 * Appears after publishing groups, allows teachers to quickly
	 * record sentiment or add a note about how the grouping went.
	 *
	 * Auto-dismisses after 10s if no interaction.
	 */
	import type { ObservationSentiment } from '$lib/domain/observation';

	const {
		visible = false,
		onSave,
		onSkip
	}: {
		visible?: boolean;
		onSave: (sentiment: ObservationSentiment, note?: string) => void;
		onSkip: () => void;
	} = $props();

	let expanded = $state(false);
	let note = $state('');
	let selectedSentiment = $state<ObservationSentiment | null>(null);
	let saving = $state(false);

	// Auto-dismiss after 10s if not interacted with
	let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (visible && !expanded && !selectedSentiment) {
			dismissTimeout = setTimeout(() => {
				onSkip();
			}, 10000);
		}

		return () => {
			if (dismissTimeout) {
				clearTimeout(dismissTimeout);
				dismissTimeout = null;
			}
		};
	});

	function handleSentimentClick(sentiment: ObservationSentiment) {
		if (dismissTimeout) {
			clearTimeout(dismissTimeout);
			dismissTimeout = null;
		}

		selectedSentiment = sentiment;

		// If just clicking sentiment without expanding, save immediately
		if (!expanded) {
			handleSave();
		}
	}

	function handleExpandClick() {
		if (dismissTimeout) {
			clearTimeout(dismissTimeout);
			dismissTimeout = null;
		}
		expanded = true;
	}

	async function handleSave() {
		if (!selectedSentiment) return;
		saving = true;
		onSave(selectedSentiment, note.trim() || undefined);
	}

	function handleSkip() {
		if (dismissTimeout) {
			clearTimeout(dismissTimeout);
			dismissTimeout = null;
		}
		onSkip();
	}
</script>

{#if visible}
	<div
		class="fixed right-4 bottom-4 z-50 w-80 rounded-lg bg-white shadow-xl border border-gray-200"
		role="alert"
		aria-live="polite"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="font-medium text-gray-900">Groups published</span>
			</div>
			<button
				type="button"
				class="text-gray-400 hover:text-gray-500 p-1 rounded"
				onclick={handleSkip}
				aria-label="Close"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="p-4">
			<p class="text-sm text-gray-600 mb-3">How did it go?</p>

			<!-- Sentiment buttons -->
			<div class="flex items-center gap-2 mb-3">
				<button
					type="button"
					class="flex-1 py-2 px-3 rounded-lg border text-lg transition-colors {
						selectedSentiment === 'POSITIVE'
							? 'border-green-500 bg-green-50'
							: 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
					}"
					onclick={() => handleSentimentClick('POSITIVE')}
					aria-label="Positive"
					aria-pressed={selectedSentiment === 'POSITIVE'}
				>
					😊
				</button>
				<button
					type="button"
					class="flex-1 py-2 px-3 rounded-lg border text-lg transition-colors {
						selectedSentiment === 'NEUTRAL'
							? 'border-amber-500 bg-amber-50'
							: 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
					}"
					onclick={() => handleSentimentClick('NEUTRAL')}
					aria-label="Neutral"
					aria-pressed={selectedSentiment === 'NEUTRAL'}
				>
					😐
				</button>
				<button
					type="button"
					class="flex-1 py-2 px-3 rounded-lg border text-lg transition-colors {
						selectedSentiment === 'NEGATIVE'
							? 'border-red-500 bg-red-50'
							: 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
					}"
					onclick={() => handleSentimentClick('NEGATIVE')}
					aria-label="Negative"
					aria-pressed={selectedSentiment === 'NEGATIVE'}
				>
					😟
				</button>
			</div>

			{#if !expanded}
				<!-- Compact actions -->
				<div class="flex items-center justify-between">
					<button
						type="button"
						class="text-sm text-teal hover:text-teal-dark"
						onclick={handleExpandClick}
					>
						Add note
					</button>
					<button
						type="button"
						class="text-sm text-gray-500 hover:text-gray-700"
						onclick={handleSkip}
					>
						Skip
					</button>
				</div>
			{:else}
				<!-- Expanded note input -->
				<textarea
					bind:value={note}
					placeholder="Optional notes about this session..."
					class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
					rows="3"
				></textarea>

				<div class="flex items-center justify-end gap-2 mt-3">
					<button
						type="button"
						class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
						onclick={handleSkip}
					>
						Skip
					</button>
					<button
						type="button"
						class="px-4 py-1.5 text-sm font-medium text-white bg-teal rounded-lg hover:bg-teal-dark disabled:opacity-50"
						onclick={handleSave}
						disabled={!selectedSentiment || saving}
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
