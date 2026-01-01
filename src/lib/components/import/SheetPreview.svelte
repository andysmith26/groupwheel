<script lang="ts">
	/**
	 * SheetPreview.svelte
	 *
	 * Displays a preview of sheet data with column mapping dropdowns.
	 * Each column header has a dropdown to map it to a domain field.
	 */

	import type { RawSheetData, ColumnMapping, MappedField } from '$lib/domain/import';
	import { REQUIRED_FIELDS, OPTIONAL_FIELDS, hasDuplicateMappings } from '$lib/domain/import';

	interface Props {
		/** Raw sheet data to preview */
		data: RawSheetData;
		/** Current column mappings */
		mappings: ColumnMapping[];
		/** Maximum rows to display in preview */
		maxPreviewRows?: number;
		/** Callback when a mapping changes */
		onMappingChange: (columnIndex: number, field: MappedField | null) => void;
	}

	let { data, mappings, maxPreviewRows = 10, onMappingChange }: Props = $props();

	// Field options for the dropdown
	const fieldOptions: { value: MappedField | 'none'; label: string; required: boolean }[] = [
		{ value: 'none', label: 'Select field...', required: false },
		{ value: 'firstName', label: 'First Name', required: true },
		{ value: 'lastName', label: 'Last Name', required: false },
		{ value: 'choice1', label: 'Choice 1', required: false },
		{ value: 'choice2', label: 'Choice 2', required: false },
		{ value: 'choice3', label: 'Choice 3', required: false },
		{ value: 'choice4', label: 'Choice 4', required: false },
		{ value: 'choice5', label: 'Choice 5', required: false },
		{ value: 'ignore', label: 'Ignore', required: false }
	];

	// Get the current mapping for a column
	function getMappingForColumn(columnIndex: number): MappedField | null {
		const mapping = mappings.find((m) => m.columnIndex === columnIndex);
		return mapping?.mappedTo ?? null;
	}

	// Check if a field is already mapped to another column
	function isFieldMapped(field: MappedField, excludeColumnIndex: number): boolean {
		return mappings.some((m) => m.mappedTo === field && m.columnIndex !== excludeColumnIndex);
	}

	// Handle dropdown change
	function handleMappingSelect(columnIndex: number, value: string) {
		if (value === 'none') {
			onMappingChange(columnIndex, null);
		} else {
			onMappingChange(columnIndex, value as MappedField);
		}
	}

	// Get styling for the column based on its mapping state
	function getColumnHeaderClass(columnIndex: number): string {
		const mapping = getMappingForColumn(columnIndex);
		if (!mapping) return 'bg-gray-50';
		if (mapping === 'ignore') return 'bg-gray-100 text-gray-400';
		if (REQUIRED_FIELDS.includes(mapping)) return 'bg-green-50';
		return 'bg-teal-50';
	}

	// Preview rows (limited)
	let previewRows = $derived(data.rows.slice(0, maxPreviewRows));

	// Check for duplicate mappings
	let duplicates = $derived(hasDuplicateMappings(mappings));
</script>

<div class="space-y-4">
	<!-- Duplicate mapping warning -->
	{#if duplicates.length > 0}
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
			<p class="text-sm text-amber-700">
				<strong>Warning:</strong> The following fields are mapped to multiple columns:
				{duplicates.join(', ')}
			</p>
		</div>
	{/if}

	<!-- Preview table -->
	<div class="overflow-x-auto rounded-lg border border-gray-200">
		<table class="w-full text-sm">
			<thead>
				<!-- Mapping dropdowns row -->
				<tr class="border-b border-gray-200 bg-white">
					{#each data.headers as _, colIndex}
						<th class="min-w-[140px] px-2 py-2">
							<select
								class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal focus:ring-1 focus:ring-teal {getMappingForColumn(colIndex) === null
									? 'text-gray-500'
									: 'text-gray-900'}"
								value={getMappingForColumn(colIndex) ?? 'none'}
								onchange={(e) =>
									handleMappingSelect(colIndex, (e.target as HTMLSelectElement).value)}
							>
								{#each fieldOptions as option}
									{@const isDisabled =
										option.value !== 'none' &&
										option.value !== 'ignore' &&
										isFieldMapped(option.value, colIndex)}
									<option value={option.value} disabled={isDisabled} class:text-gray-400={isDisabled}>
										{option.label}
										{#if option.required}*{/if}
										{#if isDisabled}(used){/if}
									</option>
								{/each}
							</select>
						</th>
					{/each}
				</tr>

				<!-- Original header row -->
				<tr class="border-b border-gray-300">
					{#each data.headers as header, colIndex}
						<th class="px-3 py-2 text-left text-xs font-medium {getColumnHeaderClass(colIndex)}">
							<div class="flex items-center gap-1.5">
								{#if getMappingForColumn(colIndex) && getMappingForColumn(colIndex) !== 'ignore'}
									<span class="text-green-600">
										<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											></path>
										</svg>
									</span>
								{/if}
								<span class="truncate" title={header}>{header}</span>
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each previewRows as row, rowIdx}
					<tr class="border-b border-gray-100 {rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
						{#each row.cells as cell, colIndex}
							{@const mapping = getMappingForColumn(colIndex)}
							<td
								class="max-w-[200px] truncate px-3 py-2 {mapping === 'ignore'
									? 'text-gray-300'
									: 'text-gray-700'}"
								title={cell}
							>
								{cell || '—'}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>

		{#if data.rows.length > maxPreviewRows}
			<div class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-center text-xs text-gray-500">
				Showing {maxPreviewRows} of {data.rows.length} rows
			</div>
		{/if}
	</div>

	<!-- Legend -->
	<div class="flex flex-wrap items-center gap-4 text-xs text-gray-600">
		<div class="flex items-center gap-1.5">
			<span class="h-3 w-3 rounded bg-green-50 ring-1 ring-green-200"></span>
			<span>Required field</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="h-3 w-3 rounded bg-teal-50 ring-1 ring-teal-200"></span>
			<span>Optional field</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="h-3 w-3 rounded bg-gray-100 ring-1 ring-gray-200"></span>
			<span>Ignored</span>
		</div>
	</div>
</div>
