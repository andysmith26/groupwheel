<script lang="ts">
	/**
	 * StepGroupsFork.svelte
	 *
	 * Fork question step for the wizard that lets users choose between:
	 * - "I have specific groups to fill" (leads to shell builder)
	 * - "Just split students into groups" (auto mode, skips shell builder)
	 */

	interface Props {
		selectedMode: 'specific' | 'auto' | null;
		onModeSelect: (mode: 'specific' | 'auto') => void;
	}

	const { selectedMode, onModeSelect }: Props = $props();
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-lg font-medium text-gray-900">How do you want to create groups?</h2>
		<p class="mt-1 text-sm text-gray-600">
			Choose how you'd like to set up your groups. You can always edit them later.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<!-- Specific groups option -->
		<button
			type="button"
			class="flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-colors {selectedMode ===
			'specific'
				? 'border-blue-500 bg-blue-50'
				: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}"
			onclick={() => onModeSelect('specific')}
		>
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg {selectedMode === 'specific'
					? 'bg-blue-100'
					: 'bg-gray-100'}"
			>
				<svg
					class="h-5 w-5 {selectedMode === 'specific' ? 'text-blue-600' : 'text-gray-600'}"
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
					<span
						class="font-medium {selectedMode === 'specific' ? 'text-blue-900' : 'text-gray-900'}"
					>
						I have specific groups to fill
					</span>
					{#if selectedMode === 'specific'}
						<svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</div>
				<p class="mt-1 text-sm {selectedMode === 'specific' ? 'text-blue-700' : 'text-gray-500'}">
					Clubs, tables, teams with names I already know
				</p>
			</div>
		</button>

		<!-- Auto split option -->
		<button
			type="button"
			class="flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-colors {selectedMode ===
			'auto'
				? 'border-blue-500 bg-blue-50'
				: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}"
			onclick={() => onModeSelect('auto')}
		>
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg {selectedMode === 'auto'
					? 'bg-blue-100'
					: 'bg-gray-100'}"
			>
				<svg
					class="h-5 w-5 {selectedMode === 'auto' ? 'text-blue-600' : 'text-gray-600'}"
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
					<span class="font-medium {selectedMode === 'auto' ? 'text-blue-900' : 'text-gray-900'}">
						Just split students into groups
					</span>
					{#if selectedMode === 'auto'}
						<svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</div>
				<p class="mt-1 text-sm {selectedMode === 'auto' ? 'text-blue-700' : 'text-gray-500'}">
					Algorithm decides based on roster size
				</p>
			</div>
		</button>
	</div>
</div>
