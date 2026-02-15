<script lang="ts">
	/**
	 * GroupCard.svelte
	 *
	 * Progressive disclosure card for group configuration.
	 * Compact state: group-size stepper + Generate button (daily teacher flow).
	 * Expanded state: named group editor with capacities + templates (power user flow).
	 */

	import type { GroupShell } from '$lib/utils/groupShellValidation';
	import { validateGroupShells } from '$lib/utils/groupShellValidation';
	import type { GenerationSettings } from '$lib/utils/generationSettings';

	interface Props {
		studentCount: number;
		groupShells: GroupShell[];
		generationSettings: GenerationSettings;
		hasPublishedSessions: boolean;
		hasExistingGroups: boolean;
		existingGroupCount?: number;
		isGenerating: boolean;
		generateError: string | null;
		onGroupShellsChange: (shells: GroupShell[]) => void;
		onSettingsChange: (settings: GenerationSettings) => void;
		onGenerate: () => void;
		onEditCurrentGroups?: () => void;
		onUseTemplate: () => void;
		onSaveAsTemplate: () => void;
	}

	let {
		studentCount,
		groupShells,
		generationSettings,
		hasPublishedSessions,
		hasExistingGroups,
		existingGroupCount,
		isGenerating,
		generateError,
		onGroupShellsChange,
		onSettingsChange,
		onGenerate,
		onEditCurrentGroups,
		onUseTemplate,
		onSaveAsTemplate
	}: Props = $props();

	// --- Internal state ---

	/** Whether the card shows the expanded shell editor */
	let expanded = $state(false);

	// Auto-expand when shells have non-default names (e.g. loaded from scenario or template)
	let hasNonDefaultNames = $derived(
		groupShells.some((shell, i) => {
			const defaultName = `Group ${i + 1}`;
			return shell.name.trim() !== '' && shell.name !== defaultName;
		}) ||
		groupShells.some((shell) => shell.capacity !== null)
	);

	// Initialize expanded state based on shell content
	$effect(() => {
		if (hasNonDefaultNames) {
			expanded = true;
		}
	});

	// --- Compact state deriveds ---
	let computedGroupCount = $derived(
		studentCount > 0 && generationSettings.groupSize > 0
			? Math.ceil(studentCount / generationSettings.groupSize)
			: 0
	);

	let maxGroupSize = $derived(Math.max(2, Math.min(8, Math.floor(studentCount / 2))));

	// --- Expanded state validation ---
	let rowErrors = $state<Map<number, string>>(new Map());
	let isValid = $derived(validateGroupShells(groupShells));

	// --- Compact state handlers ---
	function decrementGroupSize() {
		if (generationSettings.groupSize > 2) {
			onSettingsChange({
				...generationSettings,
				groupSize: generationSettings.groupSize - 1
			});
		}
	}

	function incrementGroupSize() {
		if (generationSettings.groupSize < maxGroupSize) {
			onSettingsChange({
				...generationSettings,
				groupSize: generationSettings.groupSize + 1
			});
		}
	}

	function toggleAvoidRecent() {
		onSettingsChange({
			...generationSettings,
			avoidRecentGroupmates: !generationSettings.avoidRecentGroupmates
		});
	}

	// --- Expand/collapse ---
	function expandToCustomize() {
		// Convert stepper count into N shells with default names
		const count = computedGroupCount || 4;
		const shells: GroupShell[] = Array.from({ length: count }, (_, i) => ({
			name: `Group ${i + 1}`,
			capacity: null
		}));
		onGroupShellsChange(shells);
		onSettingsChange({ ...generationSettings, customShells: shells });
		expanded = true;
	}

	function collapseToSimple() {
		// Recompute group size from shell count
		const shellCount = groupShells.length;
		const newGroupSize = shellCount > 0
			? Math.max(2, Math.min(maxGroupSize, Math.round(studentCount / shellCount)))
			: generationSettings.groupSize;
		onSettingsChange({
			...generationSettings,
			groupSize: newGroupSize,
			customShells: undefined
		});
		expanded = false;
	}

	// --- Shell editor handlers ---
	function validateGroups(groupsList: GroupShell[]) {
		const newErrors = new Map<number, string>();
		const seenNames = new Set<string>();

		for (let i = 0; i < groupsList.length; i++) {
			const group = groupsList[i];
			const trimmedName = group.name.trim();

			if (trimmedName.length === 0) {
				newErrors.set(i, 'Name is required');
			} else if (seenNames.has(trimmedName.toLowerCase())) {
				newErrors.set(i, 'Duplicate name');
			} else if (group.capacity !== null && group.capacity <= 0) {
				newErrors.set(i, 'Capacity must be positive');
			}

			seenNames.add(trimmedName.toLowerCase());
		}

		rowErrors = newErrors;
	}

	function updateGroup(index: number, field: 'name' | 'capacity', value: string) {
		const updated = [...groupShells];
		if (field === 'name') {
			updated[index] = { ...updated[index], name: value };
		} else {
			const parsed = value === '' ? null : parseInt(value, 10);
			updated[index] = { ...updated[index], capacity: Number.isNaN(parsed) ? null : parsed };
		}
		validateGroups(updated);
		onGroupShellsChange(updated);
		onSettingsChange({ ...generationSettings, customShells: updated });
	}

	function addGroup() {
		const updated = [...groupShells, { name: '', capacity: null }];
		validateGroups(updated);
		onGroupShellsChange(updated);
		onSettingsChange({ ...generationSettings, customShells: updated });
	}

	function removeGroup(index: number) {
		if (groupShells.length <= 1) return;
		const updated = groupShells.filter((_, i) => i !== index);
		validateGroups(updated);
		onGroupShellsChange(updated);
		onSettingsChange({ ...generationSettings, customShells: updated });
	}

	function handleKeyDown(event: KeyboardEvent, index: number, field: 'name' | 'capacity') {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (field === 'name') {
				const capacityInput = document.querySelector<HTMLInputElement>(
					`[data-gc-capacity="${index}"]`
				);
				capacityInput?.focus();
			} else if (index === groupShells.length - 1) {
				addGroup();
			}
		}
	}

	function handleGenerate() {
		onGenerate();
	}

	let generateButtonLabel = $derived(hasExistingGroups ? 'New Groups' : 'Generate Groups');
</script>

<div class="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
	{#if !expanded}
		<!-- ===== COMPACT STATE ===== -->
		{#if hasExistingGroups}
			<h2 class="text-lg font-semibold text-gray-900">Generate new groups</h2>
		{:else}
			<h2 class="text-lg font-semibold text-gray-900">Generate your first groups</h2>
		{/if}
		<p class="mt-1 text-sm text-gray-500">{studentCount} students</p>

		<!-- Group size selector -->
		<div class="mt-5">
			<label class="mb-2 block text-sm font-medium text-gray-700" for="gc-group-size">
				Students per group
			</label>
			<div class="flex items-center gap-4">
				<button
					onclick={decrementGroupSize}
					disabled={generationSettings.groupSize <= 2}
					class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-lg font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
				>
					-
				</button>
				<span id="gc-group-size" class="min-w-[2ch] text-center text-3xl font-semibold text-gray-900">
					{generationSettings.groupSize}
				</span>
				<button
					onclick={incrementGroupSize}
					disabled={generationSettings.groupSize >= maxGroupSize}
					class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-lg font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
				>
					+
				</button>
				<span class="text-sm text-gray-500">
					&rarr; {computedGroupCount} group{computedGroupCount !== 1 ? 's' : ''}
				</span>
			</div>
		</div>

		<!-- Avoid recent toggle -->
		{#if hasPublishedSessions}
			<label class="mt-4 flex cursor-pointer items-center gap-3">
				<input
					type="checkbox"
					checked={generationSettings.avoidRecentGroupmates}
					onchange={toggleAvoidRecent}
					class="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
				/>
				<span class="text-sm text-gray-700">Avoid recent groupmates</span>
			</label>
		{/if}

		<!-- Generate button -->
		<button
			type="button"
			class="mt-6 w-full rounded-lg bg-teal px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={handleGenerate}
			disabled={isGenerating}
		>
			{#if isGenerating}
				<span class="inline-flex items-center gap-2">
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					Generating...
				</span>
			{:else}
				{generateButtonLabel}
			{/if}
		</button>

		<!-- Customize link -->
		<button
			type="button"
			class="mt-3 w-full text-center text-sm text-gray-500 hover:text-teal transition-colors"
			onclick={expandToCustomize}
		>
			Customize group names &amp; caps...
		</button>

		<!-- Edit Current Groups link (when groups exist) -->
		{#if hasExistingGroups && onEditCurrentGroups}
			<button
				type="button"
				class="mt-2 w-full text-center text-sm text-gray-500 hover:text-teal transition-colors"
				onclick={onEditCurrentGroups}
			>
				Edit current groups ({existingGroupCount ?? 0} groups)
			</button>
		{/if}
	{:else}
		<!-- ===== EXPANDED STATE ===== -->
		<div class="flex items-baseline justify-between">
			<h2 class="text-lg font-semibold text-gray-900">
				{groupShells.length} group{groupShells.length !== 1 ? 's' : ''}
				<span class="font-normal text-gray-500">&middot; {studentCount} students</span>
			</h2>
		</div>

		<!-- Shell editor -->
		<div class="mt-4 space-y-2">
			{#each groupShells as group, index (index)}
				<div class="flex items-start gap-2">
					<div class="flex-1">
						<input
							type="text"
							placeholder="Group name"
							class="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal {rowErrors.get(index) ? 'border-red-300' : ''}"
							value={group.name}
							oninput={(e) => updateGroup(index, 'name', (e.target as HTMLInputElement).value)}
							onkeydown={(e) => handleKeyDown(e, index, 'name')}
							data-gc-name={index}
						/>
					</div>
					<div class="w-20">
						<input
							type="number"
							placeholder="Cap"
							min="1"
							class="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal"
							value={group.capacity ?? ''}
							oninput={(e) => updateGroup(index, 'capacity', (e.target as HTMLInputElement).value)}
							onkeydown={(e) => handleKeyDown(e, index, 'capacity')}
							data-gc-capacity={index}
						/>
					</div>
					<button
						type="button"
						class="mt-1 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
						onclick={() => removeGroup(index)}
						disabled={groupShells.length <= 1}
						aria-label={`Remove ${group.name || 'group'}`}
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				{#if rowErrors.get(index)}
					<p class="text-xs text-red-600 ml-1">{rowErrors.get(index)}</p>
				{/if}
			{/each}
		</div>

		<!-- Add group -->
		<button
			type="button"
			class="mt-3 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
			onclick={addGroup}
		>
			+ Add Group
		</button>

		<!-- Cap hint -->
		<p class="mt-2 text-xs text-gray-500">
			Cap blank = unlimited
		</p>

		<!-- Avoid recent toggle -->
		{#if hasPublishedSessions}
			<label class="mt-4 flex cursor-pointer items-center gap-3">
				<input
					type="checkbox"
					checked={generationSettings.avoidRecentGroupmates}
					onchange={toggleAvoidRecent}
					class="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
				/>
				<span class="text-sm text-gray-700">Avoid recent groupmates</span>
			</label>
		{/if}

		<!-- Generate button -->
		<button
			type="button"
			class="mt-6 w-full rounded-lg bg-teal px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={handleGenerate}
			disabled={isGenerating || !isValid}
		>
			{#if isGenerating}
				<span class="inline-flex items-center gap-2">
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					Generating...
				</span>
			{:else}
				{generateButtonLabel}
			{/if}
		</button>

		<!-- Template buttons + collapse link -->
		<div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
			<div class="flex gap-2">
				<button
					type="button"
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					onclick={onUseTemplate}
				>
					Use Template
				</button>
				{#if isValid && groupShells.length > 0}
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={onSaveAsTemplate}
					>
						Save as Template
					</button>
				{/if}
			</div>
			<button
				type="button"
				class="text-sm text-gray-500 hover:text-teal transition-colors"
				onclick={collapseToSimple}
			>
				Use simple sizing
			</button>
		</div>

		<!-- Edit Current Groups link (when groups exist) -->
		{#if hasExistingGroups && onEditCurrentGroups}
			<button
				type="button"
				class="mt-3 w-full text-center text-sm text-gray-500 hover:text-teal transition-colors"
				onclick={onEditCurrentGroups}
			>
				Edit current groups ({existingGroupCount ?? 0} groups)
			</button>
		{/if}
	{/if}
</div>
