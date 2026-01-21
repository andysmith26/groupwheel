<script lang="ts">
	/**
	 * RankedChoiceEditor.svelte
	 *
	 * A two-zone drag-and-drop component for ranking choices.
	 * Users drag items from the available pool into a ranked list,
	 * and can reorder or remove items as needed.
	 */

	interface Props {
		/** Currently selected choices in rank order */
		choices: string[];
		/** All available options (choices will be filtered out) */
		allOptions: string[];
		/** Maximum number of choices allowed (unlimited if not set) */
		maxChoices?: number;
		/** Callback when choices change */
		onChoicesChange: (newChoices: string[]) => void;
		/** Label for the choices column */
		choicesLabel?: string;
		/** Label for the available column */
		availableLabel?: string;
	}

	let {
		choices,
		allOptions,
		maxChoices,
		onChoicesChange,
		choicesLabel = 'Your Choices',
		availableLabel = 'Available'
	}: Props = $props();

	// Effective max is either the prop or unlimited (all options)
	let effectiveMax = $derived(maxChoices ?? allOptions.length);

	// Derived: available options = allOptions minus choices
	let availableOptions = $derived(allOptions.filter((o) => !choices.includes(o)));

	// DnD state
	let draggedItem = $state<string | null>(null);
	let dragSource = $state<'choices' | 'available' | null>(null);
	let dropTargetIndex = $state<number | null>(null);
	let isDraggingOverAvailable = $state(false);

	// --- Drag handlers ---

	function handleDragStart(e: DragEvent, item: string, source: 'choices' | 'available') {
		if (!e.dataTransfer) return;
		draggedItem = item;
		dragSource = source;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', item);
	}

	function handleDragEnd() {
		draggedItem = null;
		dragSource = null;
		dropTargetIndex = null;
		isDraggingOverAvailable = false;
	}

	function handleChoicesDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (!e.dataTransfer) return;
		e.dataTransfer.dropEffect = 'move';
		dropTargetIndex = index;
	}

	function handleChoicesContainerDragOver(e: DragEvent) {
		e.preventDefault();
		if (!e.dataTransfer) return;
		e.dataTransfer.dropEffect = 'move';
		// If dragging over the container but not a specific item, target the end
		if (dropTargetIndex === null) {
			dropTargetIndex = choices.length;
		}
	}

	function handleChoicesDragLeave(e: DragEvent) {
		// Only clear if leaving the container entirely
		const relatedTarget = e.relatedTarget as HTMLElement | null;
		const container = e.currentTarget as HTMLElement;
		if (!relatedTarget || !container.contains(relatedTarget)) {
			dropTargetIndex = null;
		}
	}

	function handleChoicesDrop(e: DragEvent) {
		e.preventDefault();
		if (!draggedItem || dropTargetIndex === null) return;

		let newChoices = [...choices];

		if (dragSource === 'choices') {
			// Reordering within choices
			const currentIndex = newChoices.indexOf(draggedItem);
			if (currentIndex !== -1 && currentIndex !== dropTargetIndex) {
				newChoices.splice(currentIndex, 1);
				// Adjust target index if we removed an item before it
				const adjustedIndex = currentIndex < dropTargetIndex ? dropTargetIndex - 1 : dropTargetIndex;
				newChoices.splice(adjustedIndex, 0, draggedItem);
			}
		} else {
			// Adding from available
			newChoices.splice(dropTargetIndex, 0, draggedItem);
			// If over max, pop the last one
			if (newChoices.length > effectiveMax) {
				newChoices = newChoices.slice(0, effectiveMax);
			}
		}

		onChoicesChange(newChoices);
		handleDragEnd();
	}

	function handleAvailableDragOver(e: DragEvent) {
		e.preventDefault();
		if (!e.dataTransfer) return;
		e.dataTransfer.dropEffect = 'move';
		isDraggingOverAvailable = true;
		dropTargetIndex = null;
	}

	function handleAvailableDragLeave(e: DragEvent) {
		const relatedTarget = e.relatedTarget as HTMLElement | null;
		const container = e.currentTarget as HTMLElement;
		if (!relatedTarget || !container.contains(relatedTarget)) {
			isDraggingOverAvailable = false;
		}
	}

	function handleAvailableDrop(e: DragEvent) {
		e.preventDefault();
		if (!draggedItem || dragSource !== 'choices') {
			handleDragEnd();
			return;
		}

		// Remove from choices
		const newChoices = choices.filter((c) => c !== draggedItem);
		onChoicesChange(newChoices);
		handleDragEnd();
	}

	// --- Click handlers ---

	function removeChoice(index: number) {
		const newChoices = [...choices];
		newChoices.splice(index, 1);
		onChoicesChange(newChoices);
	}

	function addChoice(item: string) {
		if (choices.includes(item)) return;
		let newChoices = [...choices, item];
		if (newChoices.length > effectiveMax) {
			newChoices = newChoices.slice(0, effectiveMax);
		}
		onChoicesChange(newChoices);
	}

	// --- Keyboard handlers ---

	function handleChoiceKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'ArrowUp' && index > 0) {
			e.preventDefault();
			const newChoices = [...choices];
			[newChoices[index - 1], newChoices[index]] = [newChoices[index], newChoices[index - 1]];
			onChoicesChange(newChoices);
		} else if (e.key === 'ArrowDown' && index < choices.length - 1) {
			e.preventDefault();
			const newChoices = [...choices];
			[newChoices[index], newChoices[index + 1]] = [newChoices[index + 1], newChoices[index]];
			onChoicesChange(newChoices);
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			removeChoice(index);
		}
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	<!-- Choices column -->
	<div>
		<h3 class="mb-2 text-sm font-medium text-gray-700">
			{choicesLabel}
			{#if maxChoices}
				<span class="font-normal text-gray-400">({choices.length}/{maxChoices})</span>
			{/if}
		</h3>
		<div
			class="min-h-[120px] rounded-lg border-2 border-dashed p-2 transition-colors {dropTargetIndex !==
				null && draggedItem
				? 'border-teal bg-teal/5'
				: 'border-gray-200'}"
			role="listbox"
			tabindex="0"
			aria-label="{choicesLabel} - drag to reorder"
			ondragover={handleChoicesContainerDragOver}
			ondragleave={handleChoicesDragLeave}
			ondrop={handleChoicesDrop}
		>
			{#if choices.length === 0}
				<div class="flex h-full min-h-[100px] items-center justify-center text-sm text-gray-400">
					{#if draggedItem}
						Drop here to add
					{:else}
						Drag groups here or click to add
					{/if}
				</div>
			{:else}
				<div class="space-y-1">
					{#each choices as choice, index (choice)}
						<!-- Drop zone before this item -->
						{#if dropTargetIndex === index && draggedItem && draggedItem !== choice}
							<div class="ml-7 h-1 rounded bg-teal" aria-hidden="true"></div>
						{/if}
						<div class="flex items-center gap-2">
							<!-- Rank number outside the draggable card -->
							<span class="w-5 flex-shrink-0 text-right text-sm font-medium text-gray-400">
								{index + 1}.
							</span>
							<div
								draggable="true"
								role="option"
								aria-selected="true"
								tabindex="0"
								aria-label="{choice}, rank {index + 1}. Use arrow keys to reorder."
								class="flex flex-1 cursor-grab items-center gap-2 rounded-md border bg-white p-2 shadow-sm transition-all {draggedItem ===
								choice
									? 'opacity-50'
									: 'hover:shadow-md'}"
								ondragstart={(e) => handleDragStart(e, choice, 'choices')}
								ondragend={handleDragEnd}
								ondragover={(e) => handleChoicesDragOver(e, index)}
								onkeydown={(e) => handleChoiceKeyDown(e, index)}
							>
								<svg
									class="h-4 w-4 flex-shrink-0 text-gray-300"
									fill="currentColor"
									viewBox="0 0 20 20"
									aria-hidden="true"
								>
									<path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
								</svg>
								<span class="flex-1 text-sm text-gray-900">{choice}</span>
								<button
									type="button"
									class="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
									onclick={() => removeChoice(index)}
									aria-label="Remove {choice}"
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
					{/each}
					<!-- Drop zone at the end -->
					{#if dropTargetIndex === choices.length && draggedItem && !choices.includes(draggedItem)}
						<div class="ml-7 h-1 rounded bg-teal" aria-hidden="true"></div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Available column -->
	<div>
		<h3 class="mb-2 text-sm font-medium text-gray-700">{availableLabel}</h3>
		<div
			class="min-h-[120px] rounded-lg border p-2 transition-colors {isDraggingOverAvailable &&
			dragSource === 'choices'
				? 'border-gray-400 bg-gray-50'
				: 'border-gray-200'}"
			role="group"
			aria-label="{availableLabel} groups"
			ondragover={handleAvailableDragOver}
			ondragleave={handleAvailableDragLeave}
			ondrop={handleAvailableDrop}
		>
			{#if availableOptions.length === 0}
				<div class="flex h-full min-h-[100px] items-center justify-center text-sm text-gray-400">
					{#if dragSource === 'choices'}
						Drop here to remove
					{:else}
						All groups selected
					{/if}
				</div>
			{:else}
				<div class="space-y-1">
					{#each availableOptions as option (option)}
						<button
							type="button"
							draggable="true"
							class="flex w-full cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-left text-sm text-gray-700 transition-all hover:border-gray-300 hover:bg-white hover:shadow-sm {draggedItem ===
							option
								? 'opacity-50'
								: ''}"
							ondragstart={(e) => handleDragStart(e, option, 'available')}
							ondragend={handleDragEnd}
							onclick={() => addChoice(option)}
							aria-label="Add {option} to choices"
						>
							<span class="flex-1">{option}</span>
							<svg
								class="h-4 w-4 flex-shrink-0 text-gray-300"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<p class="mt-2 text-xs text-gray-500">
	Drag to reorder or move between columns. Use arrow keys when focused to reorder.
</p>
