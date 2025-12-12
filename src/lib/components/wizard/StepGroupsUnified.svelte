<script lang="ts">
	/**
	 * StepGroupsUnified.svelte
	 *
	 * Unified Groups step that combines:
	 * - Fork question ("specific groups" vs "auto split")
	 * - Conditional content based on selection:
	 *   - ShellBuilder for specific mode
	 *   - Size controls for auto mode
	 *
	 * This keeps the step count fixed regardless of which mode is selected.
	 * Data is preserved when switching between modes.
	 */

	import ShellBuilder from './ShellBuilder.svelte';

	interface GroupShell {
		name: string;
		capacity: number | null;
	}

	interface SizeConfig {
		min: number | null;
		max: number | null;
	}

	interface Props {
		mode: 'specific' | 'auto' | null;
		shellGroups: GroupShell[];
		sizeConfig: SizeConfig;
		onModeChange: (mode: 'specific' | 'auto') => void;
		onShellGroupsChange: (groups: GroupShell[]) => void;
		onSizeConfigChange: (config: SizeConfig) => void;
		onValidityChange: (isValid: boolean) => void;
	}

	const {
		mode,
		shellGroups,
		sizeConfig,
		onModeChange,
		onShellGroupsChange,
		onSizeConfigChange,
		onValidityChange
	}: Props = $props();

	// Track ShellBuilder validity separately
	let shellBuilderValid = $state(false);

	// Compute overall validity and report to parent
	$effect(() => {
		if (mode === null) {
			onValidityChange(false);
		} else if (mode === 'auto') {
			// Auto mode is always valid (size controls have reasonable defaults)
			onValidityChange(true);
		} else {
			// Specific mode requires at least one valid group
			onValidityChange(shellBuilderValid);
		}
	});

	function handleShellBuilderValidityChange(isValid: boolean) {
		shellBuilderValid = isValid;
	}

	function handleMinChange(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		const parsed = value === '' ? null : parseInt(value, 10);
		onSizeConfigChange({
			...sizeConfig,
			min: Number.isNaN(parsed) ? null : parsed
		});
	}

	function handleMaxChange(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		const parsed = value === '' ? null : parseInt(value, 10);
		onSizeConfigChange({
			...sizeConfig,
			max: Number.isNaN(parsed) ? null : parsed
		});
	}
</script>

<div class="space-y-6">
	<!-- Fork question (always visible) -->
	<div class="space-y-4">
		<div>
			<h2 id="mode-selection-label" class="text-lg font-medium text-gray-900">
				How do you want to create groups?
			</h2>
			<p class="mt-1 text-sm text-gray-600">
				Choose how you'd like to set up your groups. You can always edit them later.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-2" role="radiogroup" aria-labelledby="mode-selection-label">
			<!-- Specific groups option -->
			<button
				type="button"
				role="radio"
				aria-checked={mode === 'specific' ? 'true' : 'false'}
				class="flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-colors {mode ===
				'specific'
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}"
				onclick={() => onModeChange('specific')}
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg {mode === 'specific'
						? 'bg-blue-100'
						: 'bg-gray-100'}"
				>
					<svg
						class="h-5 w-5 {mode === 'specific' ? 'text-blue-600' : 'text-gray-600'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
						/>
					</svg>
				</div>
				<div>
					<div class="flex items-center gap-2">
						<span class="font-medium {mode === 'specific' ? 'text-blue-900' : 'text-gray-900'}">
							I have specific groups to fill
						</span>
						{#if mode === 'specific'}
							<svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</div>
					<p class="mt-1 text-sm {mode === 'specific' ? 'text-blue-700' : 'text-gray-500'}">
						Clubs, tables, teams with names I already know
					</p>
				</div>
			</button>

			<!-- Auto split option -->
			<button
				type="button"
				role="radio"
				aria-checked={mode === 'auto' ? 'true' : 'false'}
				class="flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-colors {mode ===
				'auto'
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}"
				onclick={() => onModeChange('auto')}
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg {mode === 'auto'
						? 'bg-blue-100'
						: 'bg-gray-100'}"
				>
					<svg
						class="h-5 w-5 {mode === 'auto' ? 'text-blue-600' : 'text-gray-600'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
						/>
					</svg>
				</div>
				<div>
					<div class="flex items-center gap-2">
						<span class="font-medium {mode === 'auto' ? 'text-blue-900' : 'text-gray-900'}">
							Just split students into groups
						</span>
						{#if mode === 'auto'}
							<svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</div>
					<p class="mt-1 text-sm {mode === 'auto' ? 'text-blue-700' : 'text-gray-500'}">
						Algorithm decides based on roster size
					</p>
				</div>
			</button>
		</div>
	</div>

	<!-- Conditional content based on mode -->
	{#if mode === 'specific'}
		<div class="border-t border-gray-200 pt-6">
			<ShellBuilder
				groups={shellGroups}
				onGroupsChange={onShellGroupsChange}
				onValidityChange={handleShellBuilderValidityChange}
			/>
		</div>
	{:else if mode === 'auto'}
		<div class="border-t border-gray-200 pt-6">
			<div class="space-y-4">
				<div>
					<h3 class="text-base font-medium text-gray-900">Group size preferences</h3>
					<p class="mt-1 text-sm text-gray-600">
						Optionally set constraints for how the algorithm splits students.
					</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="min-size" class="block text-sm font-medium text-gray-700">
							Minimum group size
						</label>
						<input
							id="min-size"
							type="number"
							min="1"
							class="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
							value={sizeConfig.min ?? ''}
							placeholder="No minimum"
							oninput={handleMinChange}
						/>
					</div>
					<div>
						<label for="max-size" class="block text-sm font-medium text-gray-700">
							Maximum group size
						</label>
						<input
							id="max-size"
							type="number"
							min="1"
							class="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
							value={sizeConfig.max ?? ''}
							placeholder="No maximum"
							oninput={handleMaxChange}
						/>
					</div>
				</div>

				<p class="text-sm text-gray-500">
					Leave empty for no constraint. The algorithm will create appropriately-sized groups based
					on your roster.
				</p>
			</div>
		</div>
	{:else}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<p class="text-center text-sm text-gray-500">
				Select an option above to continue.
			</p>
		</div>
	{/if}
</div>
