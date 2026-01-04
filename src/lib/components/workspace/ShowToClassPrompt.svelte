<script lang="ts">
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
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h3 id="show-to-class-title" class="text-lg font-semibold text-gray-900">
				Show groups to class?
			</h3>
			<p class="mt-2 text-sm text-gray-700">
				Choose how you want to present your groups:
			</p>

			{#if error}
				<div class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			{/if}

			<div class="mt-6 space-y-3">
				<!-- Publish & Present button -->
				<button
					type="button"
					class="flex w-full items-center justify-between rounded-lg border-2 border-coral bg-coral/5 px-4 py-3 text-left hover:bg-coral/10 disabled:opacity-50"
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
						<svg class="h-5 w-5 animate-spin text-coral" viewBox="0 0 24 24" fill="none">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					{:else}
						<span class="text-coral">→</span>
					{/if}
				</button>

				<!-- Just Preview button -->
				<button
					type="button"
					class="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
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
					class="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
					onclick={onCancel}
					disabled={isPublishing}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
