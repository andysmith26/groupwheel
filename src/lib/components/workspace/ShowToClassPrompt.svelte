<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { Alert, Spinner } from '$lib/components/ui';

	const {
		open = false,
		isPublishing = false,
		error = null,
		onPublishAndPresent,
		onJustPreview,
		onCancel
	} = $props<{
		open?: boolean;
		isPublishing?: boolean;
		error?: string | null;
		onPublishAndPresent: () => void | Promise<void>;
		onJustPreview: () => void;
		onCancel: () => void;
	}>();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isPublishing) {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="show-to-class-title"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<h3 id="show-to-class-title" class="text-lg font-semibold text-gray-900">
				Show groups to class?
			</h3>
			<p class="mt-2 text-sm text-gray-700">
				Choose how you want to present your groups:
			</p>

			{#if error}
				<div class="mt-3">
					<Alert variant="error">{error}</Alert>
				</div>
			{/if}

			<div class="mt-6 space-y-3">
				<!-- Publish & Present button -->
				<button
					type="button"
					class="flex w-full items-center justify-between rounded-lg border-2 border-coral bg-coral/5 px-4 py-3 text-left transition-colors hover:bg-coral/10 focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={onPublishAndPresent}
					disabled={isPublishing}
				>
					<div>
						<div class="font-medium text-coral-dark">Publish & Present</div>
						<div class="text-xs text-gray-600">
							Save this arrangement to history, then show to class
						</div>
					</div>
					{#if isPublishing}
						<Spinner size="sm" class="text-coral" />
					{:else}
						<span class="text-coral">→</span>
					{/if}
				</button>

				<!-- Just Preview button -->
				<button
					type="button"
					class="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={onJustPreview}
					disabled={isPublishing}
				>
					<div>
						<div class="font-medium text-gray-900">Just Preview</div>
						<div class="text-xs text-gray-600">
							Show to class without publishing to history
						</div>
					</div>
					<span class="text-gray-400">→</span>
				</button>
			</div>

			<!-- Cancel link -->
			<div class="mt-4 text-center">
				<button
					type="button"
					class="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline disabled:opacity-50"
					onclick={onCancel}
					disabled={isPublishing}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
