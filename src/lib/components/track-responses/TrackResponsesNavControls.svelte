<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { trackResponsesSession, type SortAlgorithm } from '$lib/stores/trackResponsesSession.svelte';
	import type { StudentStateFilter } from '$lib/utils/trackResponsesUi';

	let showSortDropdown = $state(false);

	function handleSortSelect(algorithm: SortAlgorithm) {
		showSortDropdown = false;
		trackResponsesSession.onSort?.(algorithm);
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.sort-dropdown-container')) {
			showSortDropdown = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="flex flex-1 items-center gap-3">
	<div class="flex items-center gap-2">
		<label for="track-filter" class="sr-only">Status filter</label>
		<select
			id="track-filter"
			class="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
			value={trackResponsesSession.stateFilter}
			onchange={(event) =>
				(trackResponsesSession.stateFilter = (event.target as HTMLSelectElement).value as StudentStateFilter)
			}
		>
			<option value="all">All ({trackResponsesSession.counts.total})</option>
			<option value="not_submitted">Not submitted ({trackResponsesSession.counts.unresolved})</option>
			<option value="submitted">Submitted ({trackResponsesSession.counts.submitted})</option>
			<option value="ignored">Ignored ({trackResponsesSession.counts.ignored})</option>
		</select>
		<input
			type="search"
			bind:value={trackResponsesSession.searchQuery}
			placeholder="Search students..."
			class="h-9 w-full min-w-[180px] max-w-xs rounded-md border border-gray-300 px-3 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
			aria-label="Search students"
		/>
	</div>
	{#if trackResponsesSession.onRefresh}
		<Button
			variant="secondary"
			size="sm"
			onclick={() => trackResponsesSession.onRefresh?.()}
			disabled={!trackResponsesSession.canRefresh}
		>
			Refresh
		</Button>
	{/if}

	{#if trackResponsesSession.onSort}
		<div class="sort-dropdown-container relative">
			<Button
				variant="primary"
				size="sm"
				onclick={(e) => {
					e.stopPropagation();
					showSortDropdown = !showSortDropdown;
				}}
				disabled={!trackResponsesSession.canSort || trackResponsesSession.isSorting}
				loading={trackResponsesSession.isSorting}
			>
				{trackResponsesSession.isSorting ? 'Creating...' : 'Sort'}
				{#if !trackResponsesSession.isSorting}
					<svg class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				{/if}
			</Button>

			{#if showSortDropdown}
				<div class="absolute right-0 z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
					<button
						type="button"
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
						onclick={() => handleSortSelect('random')}
					>
						Random
					</button>
					<button
						type="button"
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
						onclick={() => handleSortSelect('first-choice-only')}
					>
						First Choice
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
