<script lang="ts">
	/**
	 * DataSourcePicker.svelte
	 *
	 * Reusable component for choosing between importing from a sheet tab
	 * or using existing data. Used at each wizard step.
	 */

	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData, ColumnMapping, MappedField } from '$lib/domain/import';
	import TabSelector from './TabSelector.svelte';
	import SheetPreview from './SheetPreview.svelte';

	type DataSourceType = 'sheet' | 'existing' | null;

	interface ExistingDataOption {
		id: string;
		label: string;
		description?: string;
	}

	interface Props {
		/** Connected sheet for tab selection (optional) */
		connection?: SheetConnection | null;
		/** Available existing data options */
		existingOptions?: ExistingDataOption[];
		/** Label for the existing data section */
		existingLabel?: string;
		/** Callback when sheet data is selected */
		onSheetData?: (data: RawSheetData, mappings: ColumnMapping[], tab: SheetTab) => void;
		/** Callback when existing option is selected */
		onExistingSelect?: (optionId: string) => void;
		/** Whether to show column mapping UI */
		showColumnMapping?: boolean;
		/** Disabled state */
		disabled?: boolean;
	}

	let {
		connection = null,
		existingOptions = [],
		existingLabel = 'Use existing data',
		onSheetData,
		onExistingSelect,
		showColumnMapping = true,
		disabled = false
	}: Props = $props();

	// State
	let selectedSource = $state<DataSourceType>(null);
	let selectedTab = $state<SheetTab | null>(null);
	let tabData = $state<RawSheetData | null>(null);
	let columnMappings = $state<ColumnMapping[]>([]);
	let selectedExistingId = $state<string | null>(null);

	// Derived
	let hasConnection = $derived(connection !== null);
	let hasExistingOptions = $derived(existingOptions.length > 0);
	let canShowSheet = $derived(hasConnection && selectedSource === 'sheet');
	let canShowExisting = $derived(hasExistingOptions && selectedSource === 'existing');

	function handleSourceSelect(source: DataSourceType) {
		if (disabled) return;
		selectedSource = source;
		// Reset when switching
		if (source === 'sheet') {
			selectedExistingId = null;
		} else {
			selectedTab = null;
			tabData = null;
			columnMappings = [];
		}
	}

	function handleTabSelect(tab: SheetTab, data: RawSheetData) {
		selectedTab = tab;
		tabData = data;
		// Initialize column mappings
		columnMappings = data.headers.map((header, index) => ({
			columnIndex: index,
			headerName: header,
			mappedTo: null
		}));
	}

	function handleMappingChange(columnIndex: number, field: MappedField | null) {
		// Update the specific mapping
		columnMappings = columnMappings.map((m) =>
			m.columnIndex === columnIndex ? { ...m, mappedTo: field } : m
		);
		if (tabData && selectedTab && onSheetData) {
			onSheetData(tabData, columnMappings, selectedTab);
		}
	}

	function handleExistingSelect(optionId: string) {
		selectedExistingId = optionId;
		if (onExistingSelect) {
			onExistingSelect(optionId);
		}
	}
</script>

<div class="space-y-4">
	<!-- Source selection -->
	<div class="flex gap-3">
		{#if hasConnection}
			<button
				type="button"
				onclick={() => handleSourceSelect('sheet')}
				disabled={disabled}
				class="flex-1 rounded-lg border-2 p-4 text-left transition-colors {selectedSource ===
				'sheet'
					? 'border-teal bg-teal/5'
					: 'border-gray-200 hover:border-gray-300'} disabled:cursor-not-allowed disabled:opacity-50"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg {selectedSource ===
						'sheet'
							? 'bg-teal/10 text-teal'
							: 'bg-gray-100 text-gray-500'}"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium text-gray-900">Import from sheet</p>
						<p class="text-sm text-gray-500">{connection?.title ?? 'Connected sheet'}</p>
					</div>
				</div>
			</button>
		{/if}

		{#if hasExistingOptions}
			<button
				type="button"
				onclick={() => handleSourceSelect('existing')}
				disabled={disabled}
				class="flex-1 rounded-lg border-2 p-4 text-left transition-colors {selectedSource ===
				'existing'
					? 'border-teal bg-teal/5'
					: 'border-gray-200 hover:border-gray-300'} disabled:cursor-not-allowed disabled:opacity-50"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg {selectedSource ===
						'existing'
							? 'bg-teal/10 text-teal'
							: 'bg-gray-100 text-gray-500'}"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium text-gray-900">{existingLabel}</p>
						<p class="text-sm text-gray-500">{existingOptions.length} option{existingOptions.length === 1 ? '' : 's'} available</p>
					</div>
				</div>
			</button>
		{/if}
	</div>

	<!-- Sheet tab selection and preview -->
	{#if canShowSheet && connection}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<TabSelector
				{connection}
				onTabSelect={handleTabSelect}
				label="Select tab to import from"
				{disabled}
			/>

			{#if tabData && showColumnMapping}
				<div class="mt-4">
					<SheetPreview
						data={tabData}
						mappings={columnMappings}
						onMappingChange={handleMappingChange}
					/>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Existing data selection -->
	{#if canShowExisting}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div class="space-y-2">
				{#each existingOptions as option}
					<button
						type="button"
						onclick={() => handleExistingSelect(option.id)}
						disabled={disabled}
						class="w-full rounded-md border p-3 text-left transition-colors {selectedExistingId ===
						option.id
							? 'border-teal bg-white'
							: 'border-transparent bg-white hover:border-gray-200'} disabled:cursor-not-allowed disabled:opacity-50"
					>
						<p class="font-medium text-gray-900">{option.label}</p>
						{#if option.description}
							<p class="text-sm text-gray-500">{option.description}</p>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
