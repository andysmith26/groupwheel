<script lang="ts">
	/**
	 * StepGroups.svelte
	 *
	 * Wizard step for defining group shells and size constraints.
	 * Supports simple numeric controls (count + min/max size) and an
	 * optional pastebox for explicit group names/capacities.
	 */

	import { dev } from '$app/environment';
	import type { ParsedStudent } from '$lib/application/useCases/createGroupingActivity';

	export interface GroupShellConfig {
		groups: Array<{ name: string; capacity: number | null }>;
		targetGroupCount: number | null;
		minSize: number | null;
		maxSize: number | null;
	}

	interface Props {
		students: ParsedStudent[];
		groupConfig: GroupShellConfig;
		onConfigChange: (config: GroupShellConfig) => void;
		onValidityChange?: (isValid: boolean) => void;
	}

	let { students, groupConfig, onConfigChange, onValidityChange }: Props = $props();

	let pastedText = $state('');
	let parseError = $state('');
	let showFormatHelp = $state(false);

	const SAMPLE_GROUPS = `group name\tcapacity
Comets\t5
Rockets\t5
Saturns\t4`;

	function loadSampleGroups() {
		pastedText = SAMPLE_GROUPS;
		parseGroupList();
	}

	function updateNumeric<K extends 'targetGroupCount' | 'minSize' | 'maxSize'>(
		key: K,
		value: number | null
	) {
		const next: GroupShellConfig = { ...groupConfig, [key]: value } as GroupShellConfig;
		onConfigChange(next);
		onValidityChange?.(true);
	}

	function parseGroupList() {
		parseError = '';

		if (!pastedText.trim()) {
			onConfigChange({ ...groupConfig, groups: [] });
			onValidityChange?.(true);
			return;
		}

		const lines = pastedText
			.trim()
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (lines.length === 0) {
			onConfigChange({ ...groupConfig, groups: [] });
			onValidityChange?.(true);
			return;
		}

		// Detect delimiter
		const delimiter = lines.some((l) => l.includes('\t'))
			? '\t'
			: lines.some((l) => l.includes(','))
				? ','
				: /\s{2,}/;

		// Skip header row if it looks like labels
		let startIdx = 0;
		const headerCells = lines[0].split(delimiter).map((c) => c.trim().toLowerCase());
		if (
			headerCells.some((c) => c.includes('group') || c.includes('name') || c.includes('capacity'))
		) {
			startIdx = 1;
		}

		const parsed: Array<{ name: string; capacity: number | null }> = [];
		const seenNames = new Set<string>();

		for (let i = startIdx; i < lines.length; i++) {
			const cells = lines[i].split(delimiter).map((c) => c.trim());
			if (cells.every((c) => c === '')) continue;

			const rawName = cells[0];
			if (!rawName) {
				parseError = `Row ${i + 1}: missing group name`;
				break;
			}

			const normalizedName = rawName.trim();
			if (seenNames.has(normalizedName.toLowerCase())) {
				parseError = `Row ${i + 1}: duplicate group name "${normalizedName}"`;
				break;
			}

			const capacityCell = cells[1] ?? '';
			const parsedCapacity = capacityCell ? Number(capacityCell) : NaN;
			let capacity: number | null;
			if (Number.isFinite(parsedCapacity)) {
				if (parsedCapacity <= 0) {
					parseError = `Row ${i + 1}: capacity must be positive (got ${parsedCapacity})`;
					break;
				}
				capacity = parsedCapacity;
			} else {
				capacity = null;
			}

			parsed.push({ name: normalizedName, capacity });
			seenNames.add(normalizedName.toLowerCase());
		}

		if (parseError) {
			onValidityChange?.(false);
			return;
		}

		if (parsed.length === 0) {
			parseError = 'No valid group rows found. Add at least one group or clear the box.';
			onValidityChange?.(false);
			return;
		}

		onConfigChange({ ...groupConfig, groups: parsed });
		onValidityChange?.(true);
	}

	function handlePaste() {
		setTimeout(parseGroupList, 10);
	}

	let studentCount = $derived(students.length);
	let usesCustomGroups = $derived(groupConfig.groups.length > 0);
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium text-gray-900">How many groups?</h2>
		<p class="mt-1 text-sm text-gray-600">
			Set your group shells now so we can size them when we auto-assign students. You can tweak
			counts, min/max sizes, or paste a list of named groups with capacities.
		</p>
	</div>

	<div class="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-3">
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700" for="target-count">
				Number of groups
			</label>
			<input
				id="target-count"
				type="number"
				min="1"
				step="1"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
				value={groupConfig.targetGroupCount ?? ''}
				oninput={(e) =>
					updateNumeric(
						'targetGroupCount',
						e.currentTarget.value ? Number(e.currentTarget.value) : null
					)}
				placeholder="Leave blank to auto-pick"
			/>
			<p class="text-xs text-gray-500">
				We’ll distribute {studentCount} students across this many groups.
			</p>
		</div>

		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700" for="min-size"> Min size </label>
			<input
				id="min-size"
				type="number"
				min="1"
				step="1"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
				value={groupConfig.minSize ?? ''}
				oninput={(e) =>
					updateNumeric('minSize', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="Default 4"
			/>
			<p class="text-xs text-gray-500">
				Average size will stay above this when we auto-size groups.
			</p>
		</div>

		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700" for="max-size"> Max size </label>
			<input
				id="max-size"
				type="number"
				min="1"
				step="1"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
				value={groupConfig.maxSize ?? ''}
				oninput={(e) =>
					updateNumeric('maxSize', e.currentTarget.value ? Number(e.currentTarget.value) : null)}
				placeholder="Default 6"
			/>
			<p class="text-xs text-gray-500">If you leave this blank, we’ll cap near 6 by default.</p>
		</div>
	</div>

	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="block text-sm font-medium text-gray-700" for="group-paste">
				Paste named groups (optional)
			</label>
			{#if dev}
				<button
					type="button"
					class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
					onclick={loadSampleGroups}
				>
					Load sample groups
				</button>
			{/if}
		</div>

		<textarea
			id="group-paste"
			class="h-28 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal"
			bind:value={pastedText}
			onpaste={handlePaste}
			oninput={parseGroupList}
			placeholder="group name    capacity
Comets  5
Rockets 5
Saturns 4"
		></textarea>

		<p class="text-xs text-gray-500">
			If you paste groups, we’ll use them instead of auto-generated names and capacities.
		</p>
	</div>

	<div>
		<button
			type="button"
			class="flex items-center gap-1 text-sm text-teal hover:text-teal-dark"
			onclick={() => (showFormatHelp = !showFormatHelp)}
		>
			<span class="text-xs">{showFormatHelp ? '▼' : '▸'}</span>
			What format works?
		</button>

		{#if showFormatHelp}
			<div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
				<p class="mb-2">Copy rows from Google Sheets with columns for:</p>
				<ul class="ml-4 list-disc space-y-1">
					<li><strong>group name</strong></li>
					<li><strong>capacity</strong> (optional, defaults to auto sizing)</li>
				</ul>
				<p class="mt-2 text-xs text-gray-500">Tab-separated data works best. A header row is OK.</p>
			</div>
		{/if}
	</div>

	{#if parseError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-3">
			<p class="text-sm text-red-700">{parseError}</p>
		</div>
	{/if}

	{#if usesCustomGroups}
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
				<div class="flex items-center gap-2">
					<span class="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
						<svg
							class="h-3 w-3 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
					</span>
					<span class="font-medium text-gray-900">{groupConfig.groups.length} groups ready</span>
				</div>
				<span class="text-xs text-gray-500">Capacities override the min/max sliders above.</span>
			</div>

			<div class="max-h-48 overflow-y-auto">
				<table class="w-full text-sm">
					<thead class="sticky top-0 bg-gray-50">
						<tr class="border-b border-gray-200">
							<th class="px-4 py-2 text-left font-medium text-gray-700">Group</th>
							<th class="px-4 py-2 text-left font-medium text-gray-700">Capacity</th>
						</tr>
					</thead>
					<tbody>
						{#each groupConfig.groups.slice(0, 8) as group, i (group.name)}
							<tr class="border-b border-gray-100 {i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
								<td class="px-4 py-2 text-gray-900">{group.name}</td>
								<td class="px-4 py-2 text-gray-600">{group.capacity ?? 'Auto'}</td>
							</tr>
						{/each}
					</tbody>
				</table>

				{#if groupConfig.groups.length > 8}
					<div
						class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-center text-xs text-gray-500"
					>
						...and {groupConfig.groups.length - 8} more groups
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
