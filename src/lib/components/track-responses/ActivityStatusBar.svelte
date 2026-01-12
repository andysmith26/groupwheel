<script lang="ts">
	import { Button } from '$lib/components/ui';

	type StudentStateFilter = 'all' | 'submitted' | 'not_submitted' | 'ignored';

	let {
		activityName = '',
		isConnected = false,
		lastUpdatedLabel = '',
		canRefresh = false,
		isRefreshing = false,
		accountedFor = 0,
		rosterCount = 0,
		submittedCount = 0,
		ignoredCount = 0,
		unresolvedCount = 0,
		accountedForPercent = 0,
		collapsed = false,
		expanded = true,
		filterIndicatorLabel = '',
		stateFilter = 'all' as StudentStateFilter,
		onRefresh,
		onFilterSelect,
		onToggleDetails
	} = $props<{
		activityName?: string;
		isConnected?: boolean;
		lastUpdatedLabel?: string;
		canRefresh?: boolean;
		isRefreshing?: boolean;
		accountedFor?: number;
		rosterCount?: number;
		submittedCount?: number;
		ignoredCount?: number;
		unresolvedCount?: number;
		accountedForPercent?: number;
		collapsed?: boolean;
		expanded?: boolean;
		filterIndicatorLabel?: string;
		stateFilter?: StudentStateFilter;
		onRefresh?: () => void;
		onFilterSelect?: (filter: StudentStateFilter) => void;
		onToggleDetails?: () => void;
	}>();

	let unresolvedPercent = $derived(() => {
		if (rosterCount === 0) return 0;
		return Math.round((unresolvedCount / rosterCount) * 100);
	});

	let accountedForLabel = $derived(() => `${accountedFor} / ${rosterCount} accounted for`);
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="min-w-0 flex items-center gap-2">
			<span class="text-sm font-semibold text-gray-900 whitespace-nowrap">Track Responses ·</span>
			<span class="truncate text-sm font-semibold text-gray-900">{activityName}</span>
		</div>
		<div class="flex flex-wrap items-center gap-3 text-xs text-gray-600">
			<span class="flex items-center gap-2">
				<span
					class={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}
					role="img"
					aria-label={isConnected ? 'Connected' : 'Not connected'}
					title={isConnected ? 'Connected' : 'Not connected'}
				></span>
				<span class="connection-label">{isConnected ? 'Connected' : 'Not connected'}</span>
			</span>
			<span class="whitespace-nowrap text-gray-500">{lastUpdatedLabel}</span>
			<Button
				variant="secondary"
				size="sm"
				onclick={() => onRefresh?.()}
				disabled={!canRefresh || isRefreshing}
				loading={isRefreshing}
			>
				Refresh
			</Button>
			{#if collapsed}
				<span class="whitespace-nowrap text-gray-500">Filter: {filterIndicatorLabel}</span>
				<button
					type="button"
					class="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 hover:border-gray-300"
					onclick={() => onToggleDetails?.()}
					aria-label="Show status details"
				>
					Details
				</button>
			{/if}
		</div>
	</div>

	{#if expanded}
		<div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-xs text-gray-600">
			<div class="whitespace-nowrap">{accountedForLabel()}</div>
			<div
				class="relative h-2 w-full rounded-full bg-gray-200"
				role="progressbar"
				aria-valuemin="0"
				aria-valuemax={rosterCount}
				aria-valuenow={accountedFor}
				aria-label={accountedForLabel()}
			>
				<div
					class="h-full rounded-full bg-teal-600"
					style={`width: ${accountedForPercent}%`}
				></div>
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
			<div class="flex items-center gap-2 whitespace-nowrap">
				<button
					type="button"
					class={`text-gray-600 hover:text-gray-900 ${
						stateFilter === 'submitted' ? 'font-semibold text-gray-900' : ''
					}`}
					onclick={() => onFilterSelect?.('submitted')}
					aria-pressed={stateFilter === 'submitted'}
					aria-label="Show submitted students"
				>
					Submitted {submittedCount}
				</button>
				<span class="text-gray-300">·</span>
				<button
					type="button"
					class={`text-gray-600 hover:text-gray-900 ${
						stateFilter === 'ignored' ? 'font-semibold text-gray-900' : ''
					}`}
					onclick={() => onFilterSelect?.('ignored')}
					aria-pressed={stateFilter === 'ignored'}
					aria-label="Show ignored students"
				>
					Ignored {ignoredCount}
				</button>
				<span class="text-gray-300">·</span>
				<button
					type="button"
					class={`text-gray-600 hover:text-gray-900 ${
						stateFilter === 'not_submitted' ? 'font-semibold text-gray-900' : ''
					}`}
					onclick={() => onFilterSelect?.('not_submitted')}
					aria-pressed={stateFilter === 'not_submitted'}
					aria-label="Show not submitted students"
				>
					Unresolved {unresolvedCount}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.connection-label {
		display: none;
	}

	@media (hover: none) {
		.connection-label {
			display: inline;
		}
	}
</style>
