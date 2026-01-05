<script lang="ts">
	/**
	 * SetupGroupsSection.svelte
	 *
	 * Group configuration section for the Setup page.
	 * Allows editing group definitions (shells) before generating groups.
	 */

	import type { GroupShell } from '$lib/utils/groupShellValidation';
	import { validateGroupShells } from '$lib/utils/groupShellValidation';
	import CollapsibleSection from './CollapsibleSection.svelte';

	interface Props {
		/** Current group shells (definitions) */
		groups: GroupShell[];
		/** Whether the section is expanded */
		isExpanded?: boolean;
		/** Callback when expand/collapse state changes */
		onToggle?: (isExpanded: boolean) => void;
		/** Callback when groups change */
		onGroupsChange?: (groups: GroupShell[]) => void;
		/** Callback to open template picker */
		onUseTemplate?: () => void;
		/** Callback to save as template */
		onSaveAsTemplate?: () => void;
		/** Whether groups have been modified and need regeneration */
		hasChanges?: boolean;
	}

	let {
		groups,
		isExpanded = false,
		onToggle,
		onGroupsChange,
		onUseTemplate,
		onSaveAsTemplate,
		hasChanges = false
	}: Props = $props();

	// Local state for validation errors
	let rowErrors = $state<Map<number, string>>(new Map());

	// Derived state
	let groupCount = $derived(groups.length);
	let isValid = $derived(validateGroupShells(groups));

	let summary = $derived(() => {
		if (groupCount === 0) return 'No groups defined';
		if (groupCount === 1) return '1 group';
		return `${groupCount} groups`;
	});

	let groupNamesPreview = $derived(() => {
		const validNames = groups.filter((g) => g.name.trim()).map((g) => g.name);
		if (validNames.length === 0) return '';
		if (validNames.length <= 3) return validNames.join(', ');
		return `${validNames.slice(0, 3).join(', ')}...`;
	});

	function validateGroups(groupsList: GroupShell[]): boolean {
		const newErrors = new Map<number, string>();
		const seenNames = new Set<string>();
		let valid = true;

		for (let i = 0; i < groupsList.length; i++) {
			const group = groupsList[i];
			const trimmedName = group.name.trim();

			if (trimmedName.length === 0) {
				newErrors.set(i, 'Name is required');
				valid = false;
			} else if (seenNames.has(trimmedName.toLowerCase())) {
				newErrors.set(i, 'Duplicate name');
				valid = false;
			} else if (group.capacity !== null && group.capacity <= 0) {
				newErrors.set(i, 'Capacity must be positive');
				valid = false;
			}

			seenNames.add(trimmedName.toLowerCase());
		}

		rowErrors = newErrors;
		return valid;
	}

	function updateGroup(index: number, field: 'name' | 'capacity', value: string) {
		const updated = [...groups];
		if (field === 'name') {
			updated[index] = { ...updated[index], name: value };
		} else {
			const parsed = value === '' ? null : parseInt(value, 10);
			updated[index] = { ...updated[index], capacity: Number.isNaN(parsed) ? null : parsed };
		}
		validateGroups(updated);
		onGroupsChange?.(updated);
	}

	function addGroup() {
		const newGroup: GroupShell = { name: '', capacity: null };
		const updated = [...groups, newGroup];
		validateGroups(updated);
		onGroupsChange?.(updated);
	}

	function removeGroup(index: number) {
		if (groups.length <= 1) return; // Don't remove last group
		const updated = groups.filter((_, i) => i !== index);
		validateGroups(updated);
		onGroupsChange?.(updated);
	}

	function handleKeyDown(event: KeyboardEvent, index: number, field: 'name' | 'capacity') {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (field === 'name') {
				// Move to capacity field
				const capacityInput = document.querySelector<HTMLInputElement>(
					`[data-capacity-input="${index}"]`
				);
				capacityInput?.focus();
			} else {
				// Add new group if this is the last one
				if (index === groups.length - 1) {
					addGroup();
				}
			}
		}
	}
</script>

<CollapsibleSection
	title="Groups"
	summary={summary()}
	helpText="Define the groups students will be assigned to"
	{isExpanded}
	{onToggle}
	isPrimary={true}
>
	{#snippet children()}
		<div class="space-y-4">
			<!-- Change warning -->
			{#if hasChanges}
				<div class="rounded-md border border-amber-200 bg-amber-50 p-3">
					<p class="text-sm text-amber-700">
						<strong>Groups have changed.</strong> Click "Generate Groups" to apply these changes.
					</p>
				</div>
			{/if}

			<!-- Groups list -->
			<div class="space-y-2">
				{#each groups as group, index (index)}
					<div class="flex items-start gap-2">
						<div class="flex-1">
							<input
								type="text"
								placeholder="Group name"
								class="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal {rowErrors.get(index) ? 'border-red-300' : ''}"
								value={group.name}
								oninput={(e) => updateGroup(index, 'name', (e.target as HTMLInputElement).value)}
								onkeydown={(e) => handleKeyDown(e, index, 'name')}
								data-name-input={index}
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
								data-capacity-input={index}
							/>
						</div>
						<button
							type="button"
							class="mt-1 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
							onclick={() => removeGroup(index)}
							disabled={groups.length <= 1}
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

			<!-- Add group button -->
			<button
				type="button"
				class="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
				onclick={addGroup}
			>
				+ Add Group
			</button>

			<!-- Capacity hint -->
			<p class="text-xs text-gray-500">
				Leave capacity blank for unlimited. Groups without capacity will share remaining students.
			</p>

			<!-- Template buttons -->
			<div class="flex gap-2 border-t border-gray-100 pt-4">
				{#if onUseTemplate}
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={onUseTemplate}
					>
						Use Template
					</button>
				{/if}
				{#if onSaveAsTemplate && isValid && groups.length > 0}
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={onSaveAsTemplate}
					>
						Save as Template
					</button>
				{/if}
			</div>
		</div>
	{/snippet}
</CollapsibleSection>
