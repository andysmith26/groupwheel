<script lang="ts">
	/**
	 * ObservationForm.svelte
	 *
	 * Simple form for teachers to record observations about groups.
	 * Features:
	 * - Text area for free-form notes
	 * - Sentiment selector (positive/neutral/negative) with text+emoji
	 * - Optional tags input
	 */

	import type { ObservationSentiment } from '$lib/domain';

	interface Props {
		/** Group name for context */
		groupName: string;
		/** Whether the form is in a loading/submitting state */
		isSubmitting?: boolean;
		/** Callback when observation is submitted */
		onSubmit: (data: {
			content: string;
			sentiment?: ObservationSentiment;
			tags?: string[];
		}) => void;
		/** Callback when form is cancelled */
		onCancel?: () => void;
	}

	let { groupName, isSubmitting = false, onSubmit, onCancel }: Props = $props();

	// Form state
	let content = $state('');
	let sentiment = $state<ObservationSentiment | undefined>(undefined);
	let tagsInput = $state('');

	// Derived
	let isValid = $derived(content.trim().length > 0);
	let parsedTags = $derived(() => {
		if (!tagsInput.trim()) return [];
		return tagsInput
			.split(',')
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);
	});

	function handleSubmit() {
		if (!isValid || isSubmitting) return;

		onSubmit({
			content: content.trim(),
			sentiment,
			tags: parsedTags().length > 0 ? parsedTags() : undefined
		});

		// Reset form
		content = '';
		sentiment = undefined;
		tagsInput = '';
	}

	function selectSentiment(s: ObservationSentiment) {
		sentiment = sentiment === s ? undefined : s;
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<div class="mb-3">
		<p class="text-sm font-medium text-gray-700">
			Add observation for <span class="font-semibold">{groupName}</span>
		</p>
	</div>

	<!-- Content textarea -->
	<textarea
		class="block w-full rounded-md border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-teal"
		rows="3"
		placeholder="How did this group work together? Any notable dynamics?"
		bind:value={content}
		disabled={isSubmitting}
	></textarea>

	<!-- Sentiment selector -->
	<div class="mt-3">
		<p class="mb-2 text-xs font-medium text-gray-600">How did this group do?</p>
		<div class="flex gap-2">
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors {sentiment === 'POSITIVE'
					? 'border-green-500 bg-green-50 text-green-700'
					: 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}"
				onclick={() => selectSentiment('POSITIVE')}
				disabled={isSubmitting}
			>
				<span>Positive</span>
			</button>
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors {sentiment === 'NEUTRAL'
					? 'border-gray-500 bg-gray-100 text-gray-700'
					: 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}"
				onclick={() => selectSentiment('NEUTRAL')}
				disabled={isSubmitting}
			>
				<span>Neutral</span>
			</button>
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors {sentiment === 'NEGATIVE'
					? 'border-red-500 bg-red-50 text-red-700'
					: 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}"
				onclick={() => selectSentiment('NEGATIVE')}
				disabled={isSubmitting}
			>
				<span>Needs work</span>
			</button>
		</div>
	</div>

	<!-- Tags input (optional) -->
	<div class="mt-3">
		<label for="tags" class="block text-xs font-medium text-gray-600">
			Tags (optional, comma-separated)
		</label>
		<input
			id="tags"
			type="text"
			class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-teal"
			placeholder="collaboration, conflict, leadership..."
			bind:value={tagsInput}
			disabled={isSubmitting}
		/>
	</div>

	<!-- Actions -->
	<div class="mt-4 flex items-center justify-end gap-2">
		{#if onCancel}
			<button
				type="button"
				class="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
				onclick={onCancel}
				disabled={isSubmitting}
			>
				Cancel
			</button>
		{/if}
		<button
			type="button"
			class="rounded-md bg-teal px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
			onclick={handleSubmit}
			disabled={!isValid || isSubmitting}
		>
			{isSubmitting ? 'Saving...' : 'Save Observation'}
		</button>
	</div>
</div>
