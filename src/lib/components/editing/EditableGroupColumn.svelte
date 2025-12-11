<script lang="ts">
	import type { Group, Student } from '$lib/domain';
	import { droppable } from '$lib/utils/pragmatic-dnd';
	import DraggableStudentCard from './DraggableStudentCard.svelte';
	import { getCapacityStatus } from '$lib/utils/groups';

	const {
		group,
		studentsById,
		selectedStudentId = null,
		draggingId = null,
		onDrop,
		friendIds = new Set(),
		onSelect,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>(),
		onUpdateGroup,
		onDeleteGroup,
		focusNameOnMount = false
	} = $props<{
		group: Group;
		studentsById: Record<string, Student>;
		selectedStudentId?: string | null;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string }) => void;
		friendIds?: Set<string>;
		onSelect?: (id: string) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
		onUpdateGroup?: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
		onDeleteGroup?: (groupId: string) => void;
		focusNameOnMount?: boolean;
	}>();

	import { onMount, tick } from 'svelte';

	const capacityStatus = $derived(getCapacityStatus(group));

	// Menu state
	let menuOpen = $state(false);

	// Input references
	let nameInput: HTMLInputElement;

	// Local editing state to handle validation
	let editingName = $state(group.name);
	let capacityError = $state('');

	// Computed styles for capacity input
	const capacityInputClass = $derived(
		`w-8 border-0 border-b ${capacityError ? 'border-red-500' : 'border-transparent'} bg-transparent text-center text-xs hover:border-gray-300 focus:border-blue-500 focus:ring-0`
	);

	// Sync local state when group changes externally
	$effect(() => {
		editingName = group.name;
	});

	onMount(async () => {
		if (focusNameOnMount) {
			await tick();
			nameInput?.focus();
			nameInput?.select();
		}
	});

	function handleDrop(event: {
		draggedItem: { id: string };
		sourceContainer: string | null;
		targetContainer: string | null;
	}) {
		if (!event.targetContainer) return;
		onDrop?.({
			studentId: event.draggedItem.id,
			source: event.sourceContainer ?? 'unassigned',
			target: event.targetContainer
		});
	}

	function handleNameInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		editingName = value;
		onUpdateGroup?.(group.id, { name: value });
	}

	function handleNameBlur() {
		const trimmed = editingName.trim();
		if (trimmed.length === 0) {
			// Revert to original name if empty
			editingName = group.name;
		} else if (trimmed !== editingName) {
			editingName = trimmed;
			onUpdateGroup?.(group.id, { name: trimmed });
		}
	}

	function handleCapacityInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		
		// Empty value means unlimited capacity (null)
		if (value === '') {
			capacityError = '';
			onUpdateGroup?.(group.id, { capacity: null });
			return;
		}
		
		const parsed = parseInt(value, 10);
		
		// Check for invalid input
		if (Number.isNaN(parsed)) {
			capacityError = 'Please enter a valid number';
			return;
		}
		
		if (parsed <= 0) {
			capacityError = 'Capacity must be greater than 0';
			return;
		}
		
		// Valid input - clear error and update
		capacityError = '';
		onUpdateGroup?.(group.id, { capacity: parsed });
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function handleDeleteClick() {
		menuOpen = false;
		onDeleteGroup?.(group.id);
	}

	function handleClickOutside(event: MouseEvent) {
		if (menuOpen) {
			menuOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
	<div class="flex items-center justify-between gap-2">
		<div class="min-w-0 flex-1">
			<input
				bind:this={nameInput}
				type="text"
				class="w-full border-0 border-b border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-gray-900 hover:border-gray-300 focus:border-blue-500 focus:ring-0"
				value={editingName}
				oninput={handleNameInput}
				onblur={handleNameBlur}
				aria-label="Group name"
			/>
			<div class="mt-0.5 flex items-center gap-1 px-1 text-xs text-gray-600">
				<span>{group.memberIds.length}</span>
				<span>/</span>
				<input
					type="number"
					min="1"
					class={capacityInputClass}
					value={group.capacity ?? ''}
					placeholder="--"
					oninput={handleCapacityInput}
					aria-label="Group capacity"
					aria-invalid={capacityError !== ''}
				/>
			</div>
			{#if capacityError}
				<div class="mt-1 px-1 text-xs text-red-600">
					{capacityError}
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<div
				class={`rounded-full px-3 py-1 text-xs font-semibold ${
					capacityStatus.isFull
						? 'bg-red-100 text-red-700'
						: capacityStatus.isWarning
							? 'bg-amber-100 text-amber-700'
							: 'bg-gray-200 text-gray-700'
				}`}
			>
				{group.capacity === null ? 'No limit' : `${group.memberIds.length}/${group.capacity}`}
			</div>
			{#if onDeleteGroup}
				<div class="relative">
					<button
						type="button"
						class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
						onclick={(e) => {
							e.stopPropagation();
							toggleMenu();
						}}
						aria-label="Group options"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
							/>
						</svg>
					</button>
					{#if menuOpen}
						<div
							class="absolute right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
							onclick={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								class="w-full whitespace-nowrap px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
								onclick={handleDeleteClick}
							>
								Delete group
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div
		use:droppable={{ container: group.id, callbacks: { onDrop: handleDrop } }}
		class={`flex min-h-[140px] flex-col gap-2 rounded-lg border border-dashed px-2 py-2 ${
			draggingId ? 'border-blue-200 bg-white' : 'border-gray-200'
		}`}
	>
		{#if group.memberIds.length === 0}
			<p class="py-6 text-center text-xs text-gray-500">Drop students here</p>
		{:else}
			{#each group.memberIds as memberId (memberId)}
				{#if studentsById[memberId]}
					<DraggableStudentCard
						student={studentsById[memberId]}
						container={group.id}
						selected={selectedStudentId === memberId}
						isDragging={draggingId === memberId}
						isFriend={friendIds.has(memberId)}
						onSelect={onSelect}
						onDragStart={() => onDragStart?.(memberId)}
						onDragEnd={onDragEnd}
						flash={flashingIds.has(memberId)}
					/>
				{/if}
			{/each}
		{/if}
	</div>
</div>
