<script lang="ts">
	/**
	 * DemoGuidedOverlay.svelte
	 *
	 * A lightweight 4-step guided overlay that highlights key features
	 * on the live view when a demo activity is first visited.
	 *
	 * Steps:
	 * 1. "These are your groups" — highlights the group cards
	 * 2. "Drag to rearrange" — highlights a student card
	 * 3. "Teacher View" — highlights the teacher view tab
	 * 4. "Ready to try?" — CTA to create own activity or delete demo
	 *
	 * Dismissal persists in localStorage per program ID.
	 */

	import { goto } from '$app/navigation';

	interface Props {
		programId: string;
		onDismiss: () => void;
		onDeleteDemo: () => void;
	}

	let { programId, onDismiss, onDeleteDemo }: Props = $props();

	let currentStep = $state(0);

	const steps = [
		{
			title: 'These are your groups',
			description:
				'GroupWheel splits students into balanced groups. Each card shows the assigned students.',
			position: 'center' as const
		},
		{
			title: 'Drag to rearrange',
			description:
				"Don't like the arrangement? You can drag students between groups from the workspace.",
			position: 'center' as const
		},
		{
			title: 'Switch to Teacher View',
			description:
				'Use Teacher View to record observations while students work. Track engagement and take notes.',
			position: 'center' as const
		},
		{
			title: 'Ready to try with your own students?',
			description:
				'Create an activity with your class roster, or keep exploring the demo.',
			position: 'center' as const,
			isCTA: true
		}
	];

	function handleNext() {
		if (currentStep < steps.length - 1) {
			currentStep++;
		}
	}

	function handleDismiss() {
		localStorage.setItem(`demo-overlay-completed-${programId}`, 'true');
		onDismiss();
	}

	function handleCreateOwn() {
		localStorage.setItem(`demo-overlay-completed-${programId}`, 'true');
		goto('/activities/new');
	}

	function handleDeleteDemo() {
		localStorage.setItem(`demo-overlay-completed-${programId}`, 'true');
		onDeleteDemo();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleDismiss();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
	onclick={handleDismiss}
>
	<!-- Tooltip card -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Step indicator -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex gap-1.5">
				{#each steps as _, i}
					<div
						class="h-1.5 w-6 rounded-full transition-colors {i <= currentStep
							? 'bg-teal'
							: 'bg-gray-200'}"
					></div>
				{/each}
			</div>
			<button
				type="button"
				class="text-xs text-gray-400 hover:text-gray-600"
				onclick={handleDismiss}
			>
				Skip
			</button>
		</div>

		<!-- Content -->
		<h3 class="text-lg font-semibold text-gray-900">
			{steps[currentStep].title}
		</h3>
		<p class="mt-2 text-sm text-gray-600">
			{steps[currentStep].description}
		</p>

		<!-- Actions -->
		<div class="mt-6">
			{#if steps[currentStep].isCTA}
				<!-- Final step: CTA buttons -->
				<div class="flex flex-col gap-2">
					<button
						type="button"
						class="w-full rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
						onclick={handleCreateOwn}
					>
						Create Your Activity
					</button>
					<div class="flex gap-2">
						<button
							type="button"
							class="flex-1 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
							onclick={handleDismiss}
						>
							Keep Exploring
						</button>
						<button
							type="button"
							class="flex-1 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
							onclick={handleDeleteDemo}
						>
							Delete Demo
						</button>
					</div>
				</div>
			{:else}
				<!-- Regular step: Next button -->
				<div class="flex justify-end">
					<button
						type="button"
						class="rounded-md bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark"
						onclick={handleNext}
					>
						Next
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
