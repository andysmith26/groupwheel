<script lang="ts">
	/**
	 * History selector component for switching between generated results.
	 *
	 * Displays pills for navigating between the current result and
	 * up to 2 previous results stored in session history.
	 */

	const {
		historyLength = 0,
		currentIndex = 0,
		onSelect
	} = $props<{
		/** Number of entries in history (not including current) */
		historyLength?: number;
		/** Currently selected index (-1 = current, 0 = most recent history, etc.) */
		currentIndex?: number;
		/** Called when user selects a different result */
		onSelect?: (index: number) => void;
	}>();

	function getLabel(index: number): string {
		if (index === -1) return 'Current';
		if (index === 0) return 'Previous';
		return `Option ${historyLength - index}`;
	}
</script>

{#if historyLength > 0}
	<div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
		<span class="text-sm font-medium text-gray-600">Viewing:</span>
		<div class="flex gap-1">
			<button
				type="button"
				class="rounded-md px-3 py-1 text-sm font-medium transition-colors {currentIndex === -1
					? 'bg-blue-600 text-white'
					: 'border border-gray-300 bg-white text-gray-700 hover:bg-blue-50'}"
				onclick={() => onSelect?.(-1)}
			>
				Current
			</button>
			{#each Array(historyLength) as _, i}
				<button
					type="button"
					class="rounded-md px-3 py-1 text-sm font-medium transition-colors {currentIndex === i
						? 'bg-blue-600 text-white'
						: 'border border-gray-300 bg-white text-gray-700 hover:bg-blue-50'}"
					onclick={() => onSelect?.(i)}
				>
					{getLabel(i)}
				</button>
			{/each}
		</div>
	</div>
{/if}
