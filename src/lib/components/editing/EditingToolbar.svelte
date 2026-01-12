<script lang="ts">
	const {
		canUndo = false,
		canRedo = false,
		onUndo,
		onRedo,
		topChoicePercent = null,
		topTwoPercent = null,
		onExportGroupsColumns,
		onExportActivitySchema,
		onExportActivityScreenshot
	} = $props<{
		canUndo?: boolean;
		canRedo?: boolean;
		onUndo?: () => void;
		onRedo?: () => void;
		topChoicePercent?: number | null;
		topTwoPercent?: number | null;
		onExportGroupsColumns?: (() => void) | null;
		onExportActivitySchema?: (() => void | Promise<void>) | null;
		onExportActivityScreenshot?: (() => void | Promise<void>) | null;
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
	{#if onExportGroupsColumns || onExportActivitySchema || onExportActivityScreenshot}
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
						Copy groupings
						<span class="block text-xs text-gray-500">
							for pasting into a spreadsheet
						</span>
					</button>
					{#if onExportActivitySchema || onExportActivityScreenshot}
						<hr class="my-1 border-gray-100" />
						{#if onExportActivitySchema}
							<button
								type="button"
								class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
								onclick={() => {
									onExportActivitySchema?.();
									showExportMenu = false;
								}}
								role="menuitem"
							>
								Download schema
								<span class="block text-xs text-gray-500">for emailing</span>
							</button>
						{/if}
						{#if onExportActivityScreenshot}
							<button
								type="button"
								class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
								onclick={() => {
									onExportActivityScreenshot?.();
									showExportMenu = false;
								}}
								role="menuitem"
							>
								Download screenshot
								<span class="block text-xs text-gray-500">for reference</span>
							</button>
						{/if}
					{/if}
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
