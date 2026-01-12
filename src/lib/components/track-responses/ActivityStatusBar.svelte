<script lang="ts">
	type StudentStateFilter = 'all' | 'submitted' | 'not_submitted' | 'ignored';

	let {
		activityName = '',
		isConnected = false,
		accountedFor = 0,
		rosterCount = 0,
		submittedCount = 0,
		unresolvedCount = 0,
		accountedForPercent = 0,
		lastUpdatedLabel = '',
		stateFilter = 'all' as StudentStateFilter,
		onFilterSelect,
		onDisconnect
	} = $props<{
		activityName?: string;
		isConnected?: boolean;
		accountedFor?: number;
		rosterCount?: number;
		submittedCount?: number;
		unresolvedCount?: number;
		accountedForPercent?: number;
		lastUpdatedLabel?: string;
		stateFilter?: StudentStateFilter;
		onFilterSelect?: (filter: StudentStateFilter) => void;
		onDisconnect?: () => void;
	}>();

	let unresolvedPercent = $derived(() => {
		if (rosterCount === 0) return 0;
		return Math.round((unresolvedCount / rosterCount) * 100);
	});

	let accountedForLabel = $derived(() => `${accountedFor} / ${rosterCount} accounted for`);
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div class="min-w-0 flex items-center gap-2 text-sm">
		<span class="whitespace-nowrap text-gray-500">Track Responses</span>
		<span class="text-gray-300">/</span>
		<span class="truncate font-semibold text-gray-900">{activityName}</span>
		{#if isConnected && onDisconnect}
			<button
				type="button"
				class="text-xs text-gray-400 hover:text-gray-600"
				onclick={() => onDisconnect?.()}
				aria-label="Disconnect sheet"
			>
				Disconnect
			</button>
		{/if}
	</div>
	<div class="flex flex-wrap items-center gap-3 text-xs text-gray-600">
		<span class="whitespace-nowrap">{accountedForLabel()}</span>
		<div
			class="relative h-2 w-36 rounded-full bg-gray-200"
			role="progressbar"
			aria-valuemin="0"
			aria-valuemax={rosterCount}
			aria-valuenow={accountedFor}
			aria-label={accountedForLabel()}
		>
			<div class="h-full rounded-full bg-teal-600" style={`width: ${accountedForPercent}%`}></div>
			<button
				type="button"
				class="absolute inset-y-0 right-0 h-full rounded-full bg-amber-400/80 transition hover:bg-amber-400 disabled:cursor-default disabled:bg-amber-200/70"
				style={`width: ${unresolvedPercent()}%`}
				onclick={() => onFilterSelect?.('not_submitted')}
				disabled={unresolvedCount === 0}
				aria-label="Show not submitted students"
				aria-pressed={stateFilter === 'not_submitted'}
			></button>
		</div>
		<span class="hidden sm:inline whitespace-nowrap text-gray-500">{lastUpdatedLabel}</span>
		<button
			type="button"
			class={`text-gray-600 hover:text-gray-900 ${
				stateFilter === 'not_submitted' ? 'font-semibold text-gray-900' : ''
			}`}
			onclick={() => onFilterSelect?.('not_submitted')}
			aria-pressed={stateFilter === 'not_submitted'}
			aria-label="Show not submitted students"
		>
			Missing {unresolvedCount}
		</button>
		<button
			type="button"
			class={`text-gray-600 hover:text-gray-900 ${
				stateFilter === 'submitted' ? 'font-semibold text-gray-900' : ''
			}`}
			onclick={() => onFilterSelect?.('submitted')}
			aria-pressed={stateFilter === 'submitted'}
			aria-label="Show submitted students"
		>
			Done {submittedCount}
		</button>
	</div>
</div>
