<script lang="ts">
	/**
	 * ShellBuilder.svelte
	 *
	 * Interactive list interface for defining group shells with names and capacities.
	 * Supports inline editing, keyboard navigation, and validation.
	 */

	import { tick } from 'svelte';

	interface GroupShell {
		name: string;
		capacity: number | null;
	}

	interface Props {
		groups: GroupShell[];
		onGroupsChange: (groups: GroupShell[]) => void;
		onValidityChange?: (isValid: boolean) => void;
	}

	const { groups, onGroupsChange, onValidityChange }: Props = $props();

	// Track which row is being edited for focus management
	let editingRowIndex = $state<number | null>(null);
	let editingField = $state<'name' | 'capacity' | null>(null);

	// Track validation errors per row
	let rowErrors = $state<Map<number, string>>(new Map());

	// References to input elements for focus management, keyed by group index
	let inputRefs = $state<Map<number, { name?: HTMLInputElement; capacity?: HTMLInputElement }>>(new Map());

	// Derived total capacity
	let totalCapacity = $derived(
		groups.reduce((sum, g) => (g.capacity !== null ? sum + g.capacity : sum), 0)
	);
	let hasUnlimited = $derived(groups.some((g) => g.capacity === null));

	function validateGroups(groupsList: GroupShell[]): boolean {
		const newErrors = new Map<number, string>();
		const seenNames = new Set<string>();
		let isValid = true;

		for (let i = 0; i < groupsList.length; i++) {
			const group = groupsList[i];
			const trimmedName = group.name.trim();

			if (trimmedName.length === 0) {
				newErrors.set(i, 'Name is required');
				isValid = false;
			} else if (seenNames.has(trimmedName.toLowerCase())) {
				newErrors.set(i, 'Duplicate name');
				isValid = false;
			} else if (group.capacity !== null && group.capacity <= 0) {
				newErrors.set(i, 'Capacity must be positive');
				isValid = false;
			}

			seenNames.add(trimmedName.toLowerCase());
		}

		rowErrors = newErrors;
		return isValid;
	}

	function updateGroup(index: number, field: 'name' | 'capacity', value: string) {
		const updated = [...groups];
		if (field === 'name') {
			updated[index] = { ...updated[index], name: value };
		} else {
			const parsed = value === '' ? null : parseInt(value, 10);
			updated[index] = { ...updated[index], capacity: Number.isNaN(parsed) ? null : parsed };
		}
		onGroupsChange(updated);
		const isValid = validateGroups(updated);
		onValidityChange?.(isValid && updated.length > 0);
	}

	async function addGroup() {
		const newGroup: GroupShell = { name: '', capacity: null };
		const updated = [...groups, newGroup];
		onGroupsChange(updated);
		onValidityChange?.(false); // New empty group is invalid

		// Focus the new row's name input
		await tick();
		const newIndex = updated.length - 1;
		nameInputs[newIndex]?.focus();
		nameInputs[newIndex]?.select();
	}

	function deleteGroup(index: number) {
		const updated = groups.filter((_, i) => i !== index);
		onGroupsChange(updated);
		const isValid = validateGroups(updated);
		onValidityChange?.(isValid && updated.length > 0);
	}

	function handleNameKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter') {
			event.preventDefault();
			// Move to capacity field
			capacityInputs[index]?.focus();
			capacityInputs[index]?.select();
		} else if (event.key === 'Escape') {
			(event.target as HTMLInputElement)?.blur();
		}
	}

	async function handleCapacityKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter') {
			event.preventDefault();
			// If last row, add new row; otherwise, move to next row's name
			if (index === groups.length - 1) {
				await addGroup();
			} else {
				nameInputs[index + 1]?.focus();
				nameInputs[index + 1]?.select();
			}
		} else if (event.key === 'Escape') {
			(event.target as HTMLInputElement)?.blur();
		}
	}

	function handleNameBlur(index: number) {
		// Trim whitespace on blur
		const trimmed = groups[index].name.trim();
		if (trimmed !== groups[index].name) {
			updateGroup(index, 'name', trimmed);
		}
	}
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Define your groups</h2>
		<p class="mt-1 text-sm text-gray-600">
			Enter the names and optional capacities for each group. Leave capacity empty for unlimited.
		</p>
	</div>

	<div class="rounded-lg border border-gray-200 bg-white">
		<!-- Header -->
		<div class="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2">
			<div class="flex-1 text-xs font-medium uppercase tracking-wide text-gray-500">Group Name</div>
			<div class="w-24 text-xs font-medium uppercase tracking-wide text-gray-500">Capacity</div>
			<div class="w-8"></div>
		</div>

		<!-- Group rows -->
		<div class="divide-y divide-gray-100">
			{#each groups as group, index (index)}
				<div
					class="flex items-center gap-3 px-4 py-2 {rowErrors.has(index)
						? 'bg-red-50'
						: 'hover:bg-gray-50'}"
				>
					<div class="flex-1">
						<input
							bind:this={nameInputs[index]}
							type="text"
							class="w-full rounded border-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 ring-1 ring-inset {rowErrors.has(
								index
							)
								? 'ring-red-300 focus:ring-red-500'
								: 'ring-gray-200 focus:ring-blue-500'} placeholder:text-gray-400 focus:ring-2"
							value={group.name}
							placeholder="Enter group name"
							oninput={(e) => updateGroup(index, 'name', e.currentTarget.value)}
							onkeydown={(e) => handleNameKeydown(e, index)}
							onblur={() => handleNameBlur(index)}
							onfocus={() => {
								editingRowIndex = index;
								editingField = 'name';
							}}
							aria-label="Group name"
							aria-invalid={rowErrors.has(index)}
							aria-describedby={rowErrors.has(index) ? `error-${index}` : undefined}
						/>
					</div>
					<div class="w-24">
						<input
							bind:this={capacityInputs[index]}
							type="number"
							min="1"
							class="w-full rounded border-0 bg-transparent px-2 py-1.5 text-center text-sm text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
							value={group.capacity ?? ''}
							placeholder="--"
							oninput={(e) => updateGroup(index, 'capacity', e.currentTarget.value)}
							onkeydown={(e) => handleCapacityKeydown(e, index)}
							onfocus={() => {
								editingRowIndex = index;
								editingField = 'capacity';
							}}
							aria-label="Group capacity"
						/>
					</div>
					<div class="w-8">
						<button
							type="button"
							class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
							onclick={() => deleteGroup(index)}
							aria-label="Delete {group.name || `group ${index + 1}`}"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
				{#if rowErrors.has(index)}
					<div id="error-{index}" class="bg-red-50 px-4 pb-2 text-xs text-red-600">
						{rowErrors.get(index)}
					</div>
				{/if}
			{/each}
		</div>

		<!-- Add group button -->
		<button
			type="button"
			class="flex w-full items-center gap-2 border-t border-gray-200 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
			onclick={addGroup}
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add group
		</button>
	</div>

	<!-- Summary -->
	{#if groups.length > 0}
		<div class="flex items-center justify-between text-sm text-gray-600">
			<span>
				{groups.length} group{groups.length !== 1 ? 's' : ''}
			</span>
			<span>
				{#if hasUnlimited}
					{totalCapacity > 0 ? `${totalCapacity}+` : 'No'} capacity limit
				{:else}
					{totalCapacity} total capacity
				{/if}
			</span>
		</div>
	{/if}
</div>
