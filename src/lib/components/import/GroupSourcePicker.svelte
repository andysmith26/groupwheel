<script lang="ts">
	/**
	 * GroupSourcePicker.svelte
	 *
	 * Specialized component for the Groups step in the wizard.
	 * Offers three options:
	 * 1. Extract groups from preference choices
	 * 2. Import from sheet tab
	 * 3. Use existing template
	 */

	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { extractGroupsFromPreferences } from '$lib/services/appEnvUseCases';
	import { isErr, isOk } from '$lib/types/result';
	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData, ColumnMapping, MappedField } from '$lib/domain/import';
	import type { GroupTemplate } from '$lib/domain/groupTemplate';
	import type { ExtractedGroup } from '$lib/application/useCases/extractGroupsFromPreferences';
	import TabSelector from './TabSelector.svelte';
	import SheetPreview from './SheetPreview.svelte';

	type SourceType = 'preferences' | 'sheet' | 'template' | null;

	interface GroupOption {
		name: string;
		capacity?: number;
	}

	interface Props {
		/** Connected sheet for tab selection (optional) */
		connection?: SheetConnection | null;
		/** Preference data for extracting groups (optional) */
		preferenceData?: { rawData: RawSheetData; mappings: ColumnMapping[] } | null;
		/** Available templates */
		templates?: GroupTemplate[];
		/** Callback when groups are selected */
		onGroupsSelect: (groups: GroupOption[]) => void;
		/** Callback when template is selected */
		onTemplateSelect?: (template: GroupTemplate) => void;
		/** Disabled state */
		disabled?: boolean;
	}

	let {
		connection = null,
		preferenceData = null,
		templates = [],
		onGroupsSelect,
		onTemplateSelect,
		disabled = false
	}: Props = $props();

	const env = getAppEnvContext();

	// State
	let selectedSource = $state<SourceType>(null);
	let isExtracting = $state(false);
	let extractedGroups = $state<ExtractedGroup[]>([]);
	let extractError = $state('');
	let selectedTemplateId = $state<string | null>(null);

	// Sheet import state
	let selectedTab = $state<SheetTab | null>(null);
	let tabData = $state<RawSheetData | null>(null);
	let columnMappings = $state<ColumnMapping[]>([]);

	// Derived
	let hasConnection = $derived(connection !== null);
	let hasPreferenceData = $derived(preferenceData !== null);
	let hasTemplates = $derived(templates.length > 0);

	async function handleSourceSelect(source: SourceType) {
		if (disabled) return;
		selectedSource = source;

		// Reset state
		extractedGroups = [];
		extractError = '';
		selectedTemplateId = null;
		selectedTab = null;
		tabData = null;
		columnMappings = [];

		// If selecting preferences, extract groups immediately
		if (source === 'preferences' && preferenceData) {
			await extractGroups();
		}
	}

	async function extractGroups() {
		if (!preferenceData) return;

		isExtracting = true;
		extractError = '';

		const result = await extractGroupsFromPreferences(env, {
			type: 'sheet',
			rawData: preferenceData.rawData,
			columnMappings: preferenceData.mappings
		});

		isExtracting = false;

		if (isErr(result)) {
			extractError = result.error.message;
			return;
		}

		extractedGroups = result.value.groups;
	}

	function handleUseExtractedGroups() {
		const groups: GroupOption[] = extractedGroups.map((g) => ({
			name: g.name
		}));
		onGroupsSelect(groups);
	}

	function handleTabSelect(tab: SheetTab, data: RawSheetData) {
		selectedTab = tab;
		tabData = data;
		// Initialize mappings with guessed values for group name/capacity
		columnMappings = data.headers.map((header, index) => ({
			columnIndex: index,
			headerName: header,
			mappedTo: guessGroupMapping(header)
		}));
	}

	function guessGroupMapping(header: string): MappedField | null {
		const h = header.toLowerCase().trim();
		if (h.includes('group') || h.includes('name') || h.includes('club') || h.includes('option')) {
			return 'firstName'; // We'll interpret firstName as group name
		}
		return null;
	}

	function handleMappingChange(columnIndex: number, field: MappedField | null) {
		columnMappings = columnMappings.map((m) =>
			m.columnIndex === columnIndex ? { ...m, mappedTo: field } : m
		);
	}

	function handleUseSheetGroups() {
		if (!tabData) return;

		// Find the column mapped to "firstName" (we use it as group name)
		const nameMapping = columnMappings.find((m) => m.mappedTo === 'firstName');
		if (!nameMapping) return;

		const groups: GroupOption[] = [];
		const seen = new Set<string>();

		for (const row of tabData.rows) {
			const name = row.cells[nameMapping.columnIndex]?.trim();
			if (name && !seen.has(name.toLowerCase())) {
				seen.add(name.toLowerCase());
				groups.push({ name });
			}
		}

		onGroupsSelect(groups);
	}

	function handleTemplateSelect(templateId: string) {
		selectedTemplateId = templateId;
		const template = templates.find((t) => t.id === templateId);
		if (template && onTemplateSelect) {
			onTemplateSelect(template);
		}
	}
</script>

<div class="space-y-4">
	<!-- Source selection cards -->
	<div class="grid gap-3 {hasTemplates ? 'grid-cols-3' : 'grid-cols-2'}">
		{#if hasPreferenceData}
			<button
				type="button"
				onclick={() => handleSourceSelect('preferences')}
				disabled={disabled}
				class="rounded-lg border-2 p-4 text-left transition-colors {selectedSource ===
				'preferences'
					? 'border-teal bg-teal/5'
					: 'border-gray-200 hover:border-gray-300'} disabled:cursor-not-allowed disabled:opacity-50"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg {selectedSource ===
						'preferences'
							? 'bg-teal/10 text-teal'
							: 'bg-gray-100 text-gray-500'}"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium text-gray-900">From preferences</p>
						<p class="text-sm text-gray-500">Extract from student choices</p>
					</div>
				</div>
			</button>
		{/if}

		{#if hasConnection}
			<button
				type="button"
				onclick={() => handleSourceSelect('sheet')}
				disabled={disabled}
				class="rounded-lg border-2 p-4 text-left transition-colors {selectedSource === 'sheet'
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
						<p class="font-medium text-gray-900">From sheet</p>
						<p class="text-sm text-gray-500">Import from a tab</p>
					</div>
				</div>
			</button>
		{/if}

		{#if hasTemplates}
			<button
				type="button"
				onclick={() => handleSourceSelect('template')}
				disabled={disabled}
				class="rounded-lg border-2 p-4 text-left transition-colors {selectedSource === 'template'
					? 'border-teal bg-teal/5'
					: 'border-gray-200 hover:border-gray-300'} disabled:cursor-not-allowed disabled:opacity-50"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg {selectedSource ===
						'template'
							? 'bg-teal/10 text-teal'
							: 'bg-gray-100 text-gray-500'}"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium text-gray-900">Use template</p>
						<p class="text-sm text-gray-500">{templates.length} saved</p>
					</div>
				</div>
			</button>
		{/if}
	</div>

	<!-- Preference extraction results -->
	{#if selectedSource === 'preferences'}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			{#if isExtracting}
				<div class="flex items-center gap-2 text-sm text-gray-500">
					<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						></path>
					</svg>
					Extracting groups from preferences...
				</div>
			{:else if extractError}
				<p class="text-sm text-red-600">{extractError}</p>
			{:else if extractedGroups.length > 0}
				<div class="space-y-3">
					<p class="text-sm font-medium text-gray-700">
						Found {extractedGroups.length} group{extractedGroups.length === 1 ? '' : 's'} from student choices
					</p>
					<div class="flex flex-wrap gap-2">
						{#each extractedGroups as group}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm border border-gray-200"
							>
								{group.name}
								<span class="text-xs text-gray-400">({group.selectionCount})</span>
							</span>
						{/each}
					</div>
					<button
						type="button"
						onclick={handleUseExtractedGroups}
						class="mt-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
					>
						Use these groups
					</button>
				</div>
			{:else}
				<p class="text-sm text-gray-500">No groups found in preference choices</p>
			{/if}
		</div>
	{/if}

	<!-- Sheet import -->
	{#if selectedSource === 'sheet' && connection}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
			<TabSelector
				{connection}
				onTabSelect={handleTabSelect}
				label="Select tab with group names"
				{disabled}
			/>

			{#if tabData}
				<div class="space-y-3">
					<p class="text-sm text-gray-600">
						Map the column containing group names:
					</p>
					<SheetPreview data={tabData} mappings={columnMappings} onMappingChange={handleMappingChange} />

					{#if columnMappings.some((m) => m.mappedTo === 'firstName')}
						<button
							type="button"
							onclick={handleUseSheetGroups}
							class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
						>
							Use groups from sheet
						</button>
					{:else}
						<p class="text-sm text-gray-500">
							Select a column to use as group names
						</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Template selection -->
	{#if selectedSource === 'template'}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div class="space-y-2">
				{#each templates as template}
					<button
						type="button"
						onclick={() => handleTemplateSelect(template.id)}
						disabled={disabled}
						class="w-full rounded-md border p-3 text-left transition-colors {selectedTemplateId ===
						template.id
							? 'border-teal bg-white'
							: 'border-transparent bg-white hover:border-gray-200'} disabled:cursor-not-allowed disabled:opacity-50"
					>
						<p class="font-medium text-gray-900">{template.name}</p>
						<p class="text-sm text-gray-500">
							{template.groups.length} group{template.groups.length === 1 ? '' : 's'}
						</p>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
