<script lang="ts">
	/**
	 * WizardProgress.svelte
	 *
	 * Horizontal step indicator for the Create Groups wizard.
	 * Shows current progress through the 3-step flow.
	 */

	interface Props {
		currentStep: number;
		totalSteps?: number;
		labels?: string[];
	}

	let {
		currentStep,
		totalSteps = 3,
		labels = ['Students', 'Preferences', 'Name']
	}: Props = $props();
</script>

<div class="flex items-center gap-2">
	{#each Array.from({ length: totalSteps }, (_, index) => index) as index (index)}
		{@const stepNum = index + 1}
		{@const isComplete = stepNum < currentStep}
		{@const isCurrent = stepNum === currentStep}
		{@const isPending = stepNum > currentStep}

		<!-- Step indicator -->
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
					{isComplete ? 'bg-teal text-white' : ''}
					{isCurrent ? 'border-2 border-teal bg-teal-light text-teal' : ''}
					{isPending ? 'border-2 border-gray-300 bg-white text-gray-400' : ''}"
			>
				{#if isComplete}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
						></path>
					</svg>
				{:else}
					{stepNum}
				{/if}
			</div>

			<!-- Label -->
			<span
				class="text-sm font-medium
					{isCurrent ? 'text-teal' : ''}
					{isComplete ? 'text-gray-700' : ''}
					{isPending ? 'text-gray-400' : ''}"
			>
				{labels[index] ?? `Step ${stepNum}`}
			</span>
		</div>

		<!-- Connector line (not after last step) -->
		{#if index < totalSteps - 1}
			<div
				class="h-0.5 w-12 flex-shrink-0
					{stepNum < currentStep ? 'bg-teal' : 'bg-gray-300'}"
			></div>
		{/if}
	{/each}
</div>
