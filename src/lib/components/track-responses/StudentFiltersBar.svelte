<script lang="ts">
	type StudentStateFilter = 'all' | 'submitted' | 'not_submitted' | 'ignored';

	let {
		stateFilter = 'all' as StudentStateFilter,
		searchQuery = $bindable(''),
		totalCount = 0,
		submittedCount = 0,
		ignoredCount = 0,
		unresolvedCount = 0,
		onFilterSelect
	} = $props<{
		stateFilter?: StudentStateFilter;
		searchQuery?: string;
		totalCount?: number;
		submittedCount?: number;
		ignoredCount?: number;
		unresolvedCount?: number;
		onFilterSelect?: (filter: StudentStateFilter) => void;
	}>();
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div
		class="flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white p-1 text-xs font-medium"
		role="group"
		aria-label="Student filters"
	>
		<button
			type="button"
			class={`rounded-full px-3 py-1 transition-colors ${
				stateFilter === 'all'
					? 'bg-gray-900 text-white'
					: 'text-gray-600 hover:bg-gray-50'
			}`}
			onclick={() => onFilterSelect?.('all')}
			aria-pressed={stateFilter === 'all'}
		>
			All <span class={stateFilter === 'all' ? 'text-white/70' : 'text-gray-400'}>{totalCount}</span>
		</button>
		<button
			type="button"
			class={`rounded-full px-3 py-1 transition-colors ${
				stateFilter === 'not_submitted'
					? 'bg-amber-600 text-white'
					: 'text-gray-600 hover:bg-gray-50'
			}`}
			onclick={() => onFilterSelect?.('not_submitted')}
			aria-pressed={stateFilter === 'not_submitted'}
		>
			Not submitted{' '}
			<span class={stateFilter === 'not_submitted' ? 'text-white/70' : 'text-gray-400'}>
				{unresolvedCount}
			</span>
		</button>
		<button
			type="button"
			class={`rounded-full px-3 py-1 transition-colors ${
				stateFilter === 'submitted'
					? 'bg-green-600 text-white'
					: 'text-gray-600 hover:bg-gray-50'
			}`}
			onclick={() => onFilterSelect?.('submitted')}
			aria-pressed={stateFilter === 'submitted'}
		>
			Submitted{' '}
			<span class={stateFilter === 'submitted' ? 'text-white/70' : 'text-gray-400'}>
				{submittedCount}
			</span>
		</button>
		<button
			type="button"
			class={`rounded-full px-3 py-1 transition-colors ${
				stateFilter === 'ignored'
					? 'bg-gray-700 text-white'
					: 'text-gray-600 hover:bg-gray-50'
			}`}
			onclick={() => onFilterSelect?.('ignored')}
			aria-pressed={stateFilter === 'ignored'}
		>
			Ignored <span class={stateFilter === 'ignored' ? 'text-white/70' : 'text-gray-400'}>{ignoredCount}</span>
		</button>
	</div>
	<input
		type="search"
		bind:value={searchQuery}
		placeholder="Search students..."
		class="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
		aria-label="Search students"
	/>
</div>
