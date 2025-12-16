<script lang="ts">
	/**
	 * GenerationErrorBanner.svelte
	 *
	 * Displays a contextual error banner when group generation fails,
	 * with user-friendly messages and a "Try Again" action.
	 */

	import { getGenerationErrorMessage } from '$lib/utils/generationErrorMessages';

	const {
		errorType,
		isRetrying = false,
		onRetry,
		programId
	} = $props<{
		errorType: string;
		isRetrying?: boolean;
		onRetry: () => void;
		programId: string;
	}>();

	let errorMessage = $derived(getGenerationErrorMessage(errorType));
</script>

<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
	<div class="flex items-start gap-3">
		<!-- Warning icon -->
		<div class="flex-shrink-0">
			<svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
		</div>

		<div class="flex-1">
			<h3 class="text-sm font-medium text-amber-800">Couldn't generate groups</h3>
			<p class="mt-1 text-sm text-amber-700">{errorMessage}</p>

			<div class="mt-3 flex items-center gap-3">
				<button
					type="button"
					class="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
					onclick={onRetry}
					disabled={isRetrying}
				>
					{#if isRetrying}
						<svg class="mr-1.5 -ml-0.5 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
						Generating...
					{:else}
						Try Again
					{/if}
				</button>

				<a href="/groups/new" class="text-sm text-amber-700 underline hover:text-amber-800">
					Back to setup
				</a>
			</div>
		</div>
	</div>
</div>
