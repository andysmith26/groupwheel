<script lang="ts">
	const {
		canUndo = false,
		canRedo = false,
		onUndo,
		onRedo,
		topChoicePercent = null,
		topTwoPercent = null,
		onExportCSV,
		onExportTSV,
		onExportGroupsSummary,
		onExportGroupsColumns
	} = $props<{
		canUndo?: boolean;
		canRedo?: boolean;
		onUndo?: () => void;
		onRedo?: () => void;
		topChoicePercent?: number | null;
		topTwoPercent?: number | null;
		onExportCSV?: (() => void) | null;
		onExportTSV?: (() => void) | null;
		onExportGroupsSummary?: (() => void) | null;
		onExportGroupsColumns?: (() => void) | null;
	}>();

	let showExportMenu = $state(false);

	function formatPercent(value: number | null): string {
		if (value === null || Number.isNaN(value)) return '--%';
		return `${Math.round(value)}%`;
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
	<div class="flex flex-wrap items-center gap-3 text-xs text-gray-600">
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
				onclick={onUndo}
				disabled={!canUndo}
			>
				← Undo
			</button>
			<button
				type="button"
				class="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
				onclick={onRedo}
				disabled={!canRedo}
			>
				Redo →
			</button>
		</div>
		<span class="hidden sm:inline text-gray-300">/</span>
		<span class="whitespace-nowrap text-gray-700">
			Top 1: {formatPercent(topChoicePercent)}
		</span>
		<span class="whitespace-nowrap text-gray-700">
			Top 2: {formatPercent(topTwoPercent)}
		</span>
	</div>
	{#if onExportCSV || onExportTSV || onExportGroupsSummary || onExportGroupsColumns}
		<div class="relative">
			<button
				type="button"
				class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
				onclick={() => (showExportMenu = !showExportMenu)}
			>
				Export ▾
			</button>
			{#if showExportMenu}
				<div
					class="absolute right-0 z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
					role="menu"
				>
					<button
						type="button"
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
						onclick={() => {
							onExportGroupsColumns?.();
							showExportMenu = false;
						}}
						role="menuitem"
					>
						Copy groups for Sheets
						<span class="block text-xs text-gray-500">Groups as columns, students below</span>
					</button>
					<button
						type="button"
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
						onclick={() => {
							onExportTSV?.();
							showExportMenu = false;
						}}
						role="menuitem"
					>
						Copy for Google Sheets
						<span class="block text-xs text-gray-500">Tab-separated, paste directly</span>
					</button>
					<button
						type="button"
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
						onclick={() => {
							onExportCSV?.();
							showExportMenu = false;
						}}
						role="menuitem"
					>
						Copy as CSV
						<span class="block text-xs text-gray-500">Student ID, Name, Grade, Group</span>
					</button>
					<button
						type="button"
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
						onclick={() => {
							onExportGroupsSummary?.();
							showExportMenu = false;
						}}
						role="menuitem"
					>
						Copy Groups Summary
						<span class="block text-xs text-gray-500">One row per group with members</span>
					</button>
				</div>
				<button
					type="button"
					class="fixed inset-0 z-10"
					onclick={() => (showExportMenu = false)}
					aria-label="Close menu"
				></button>
			{/if}
		</div>
	{/if}
</div>
