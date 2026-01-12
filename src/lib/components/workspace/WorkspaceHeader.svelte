<script lang="ts">
	import { goto } from '$app/navigation';

	const {
		programId,
		programName,
		onNameChange,
		onExportCSV,
		onExportTSV,
		onExportGroupsSummary,
		onShowToClass,
		hasGroups = false
	} = $props<{
		programId: string;
		programName: string;
		onNameChange: (newName: string) => Promise<void>;
		onExportCSV: () => void;
		onExportTSV: () => void;
		onExportGroupsSummary: () => void;
		onShowToClass: () => void;
		hasGroups?: boolean;
	}>();

	let isEditing = $state(false);
	let editValue = $state(programName);
	let isSaving = $state(false);
	let showExportMenu = $state(false);
	let inputRef: HTMLInputElement | null = $state(null);

	// Sync editValue when programName changes externally
	$effect(() => {
		if (!isEditing) {
			editValue = programName;
		}
	});

	function startEditing() {
		isEditing = true;
		editValue = programName;
		// Focus input after render
		requestAnimationFrame(() => {
			inputRef?.focus();
			inputRef?.select();
		});
	}

	async function saveEdit() {
		const trimmed = editValue.trim();
		if (!trimmed || trimmed === programName) {
			cancelEdit();
			return;
		}

		isSaving = true;
		try {
			await onNameChange(trimmed);
			isEditing = false;
		} catch {
			// Revert on error
			editValue = programName;
		} finally {
			isSaving = false;
		}
	}

	function cancelEdit() {
		isEditing = false;
		editValue = programName;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}

	function handlePrint() {
		showExportMenu = false;
		goto(`/activities/${programId}/print`);
	}

	function handleGoToSetup() {
		showExportMenu = false;
		goto(`/activities/${programId}/setup`);
	}
</script>

<header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
	<div class="flex items-center gap-3">
		<a
			href="/activities/{programId}"
			class="text-sm text-gray-500 hover:text-gray-700"
			aria-label="Back to activity hub"
		>
			←
		</a>

		{#if isEditing}
			<input
				bind:this={inputRef}
				bind:value={editValue}
				onblur={saveEdit}
				onkeydown={handleKeydown}
				disabled={isSaving}
				class="border-b-2 border-teal bg-transparent text-xl font-semibold text-gray-900 outline-none disabled:opacity-50"
				aria-label="Activity name"
			/>
		{:else}
			<button
				type="button"
				onclick={startEditing}
				class="group flex items-center gap-2 text-xl font-semibold text-gray-900 hover:text-teal"
				title="Click to rename"
			>
				{programName}
				<svg
					class="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<div class="flex items-center gap-3">
		{#if hasGroups}
			<!-- Export dropdown -->
			<div class="relative">
				<button
					type="button"
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					onclick={() => (showExportMenu = !showExportMenu)}
				>
					Export ▾
				</button>
				{#if showExportMenu}
					<div
						class="absolute right-0 z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
						role="menu"
					>
						<button
							type="button"
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
							onclick={() => {
								onExportTSV();
								showExportMenu = false;
							}}
							role="menuitem"
						>
							Copy for Google Sheets
							<span class="block text-xs text-gray-500">Tab-separated, paste directly</span>
						</button>
						<button
							type="button"
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
							onclick={() => {
								onExportCSV();
								showExportMenu = false;
							}}
							role="menuitem"
						>
							Copy as CSV
							<span class="block text-xs text-gray-500">Student ID, Name, Grade, Group</span>
						</button>
						<button
							type="button"
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
							onclick={() => {
								onExportGroupsSummary();
								showExportMenu = false;
							}}
							role="menuitem"
						>
							Copy Groups Summary
							<span class="block text-xs text-gray-500">One row per group with members</span>
						</button>
						<hr class="my-1 border-gray-200" />
						<button
							type="button"
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
							onclick={handlePrint}
							role="menuitem"
						>
							Print View
							<span class="block text-xs text-gray-500">Print-friendly layout</span>
						</button>
						<hr class="my-1 border-gray-200" />
						<button
							type="button"
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
							onclick={handleGoToSetup}
							role="menuitem"
						>
							Go to Setup
							<span class="block text-xs text-gray-500">Edit students and groups</span>
						</button>
					</div>
					<button
						type="button"
						class="fixed inset-0 z-10"
						onclick={() => (showExportMenu = false)}
						aria-label="Close menu"
					></button>
				{/if}
			</div>
		{/if}

		<button
			type="button"
			class="rounded-md bg-coral px-4 py-1.5 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
			onclick={onShowToClass}
			disabled={!hasGroups}
			title={hasGroups ? 'Present groups to class' : 'Generate groups first'}
		>
			Show to Class
		</button>
	</div>
</header>
