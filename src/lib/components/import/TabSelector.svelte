<script lang="ts">
	/**
	 * TabSelector.svelte
	 *
	 * Dropdown component for selecting a tab from a connected Google Sheet.
	 * - Shows available tabs from the sheet connection
	 * - Fetches and displays preview data when a tab is selected
	 */

	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { importFromSheetTab } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData } from '$lib/domain/import';

	interface Props {
		/** The connected sheet to select tabs from */
		connection: SheetConnection;
		/** Callback when a tab is selected and data is loaded */
		onTabSelect: (tab: SheetTab, data: RawSheetData) => void;
		/** Label for the dropdown */
		label?: string;
		/** Currently selected tab (optional) */
		selectedTab?: SheetTab | null;
		/** Whether the selector is disabled */
		disabled?: boolean;
	}

	let {
		connection,
		onTabSelect,
		label = 'Select a tab',
		selectedTab = null,
		disabled = false
	}: Props = $props();

	const env = getAppEnvContext();

	// State
	let selectedTabGid = $state(selectedTab?.gid ?? '');
	let isLoading = $state(false);
	let error = $state('');
	let previewData = $state<RawSheetData | null>(null);

	// Derived
	let tabs = $derived(connection.tabs);

	async function handleTabChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const gid = select.value;

		if (!gid) {
			previewData = null;
			return;
		}

		const tab = tabs.find((t) => t.gid === gid);
		if (!tab) return;

		selectedTabGid = gid;
		error = '';
		isLoading = true;

		const result = await importFromSheetTab(env, {
			spreadsheetId: connection.spreadsheetId,
			tabTitle: tab.title
		});

		isLoading = false;

		if (isErr(result)) {
			error = result.error.message;
			previewData = null;
			return;
		}

		previewData = result.value;
		onTabSelect(tab, result.value);
	}

	// Get preview rows (first 3)
	function getPreviewRows(data: RawSheetData): string[][] {
		return data.rows.slice(0, 3).map((row) => row.cells.slice(0, 5));
	}
</script>

<div class="space-y-3">
	<div>
		<label for="tab-select" class="block text-sm font-medium text-gray-700">
			{label}
		</label>
		<select
			id="tab-select"
			bind:value={selectedTabGid}
			onchange={handleTabChange}
			disabled={disabled || isLoading}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:cursor-not-allowed disabled:bg-gray-100"
		>
			<option value="">Choose a tab...</option>
			{#each tabs as tab}
				<option value={tab.gid}>{tab.title}</option>
			{/each}
		</select>
	</div>

	{#if isLoading}
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
			Loading tab data...
		</div>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}

	{#if previewData && !isLoading}
		<div class="rounded-md border border-gray-200 bg-gray-50 p-3">
			<p class="mb-2 text-xs font-medium text-gray-500">
				Preview ({previewData.rows.length} rows, {previewData.headers.length} columns)
			</p>
			<div class="overflow-x-auto">
				<table class="min-w-full text-xs">
					<thead>
						<tr>
							{#each previewData.headers.slice(0, 5) as header}
								<th class="border-b border-gray-200 bg-gray-100 px-2 py-1 text-left font-medium">
									{header || '(empty)'}
								</th>
							{/each}
							{#if previewData.headers.length > 5}
								<th class="border-b border-gray-200 bg-gray-100 px-2 py-1 text-left font-medium text-gray-400">
									+{previewData.headers.length - 5} more
								</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each getPreviewRows(previewData) as row}
							<tr>
								{#each row as cell}
									<td class="border-b border-gray-100 px-2 py-1 text-gray-600">
										{cell || '-'}
									</td>
								{/each}
								{#if previewData.headers.length > 5}
									<td class="border-b border-gray-100 px-2 py-1 text-gray-400">...</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if previewData.rows.length > 3}
				<p class="mt-1 text-xs text-gray-400">
					Showing 3 of {previewData.rows.length} rows
				</p>
			{/if}
		</div>
	{/if}
</div>
