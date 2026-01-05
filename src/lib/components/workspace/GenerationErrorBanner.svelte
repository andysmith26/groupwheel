<script lang="ts">
	/**
	 * GenerationErrorBanner.svelte
	 *
	 * Displays a contextual error banner when group generation fails,
	 * with user-friendly messages and a "Try Again" action.
	 */

	import { getGenerationErrorMessage } from '$lib/utils/generationErrorMessages';
	import { Alert, Button } from '$lib/components/ui';

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

<Alert variant="warning" title="Couldn't generate groups">
	<p>{errorMessage}</p>
	<div class="mt-3 flex items-center gap-3">
		<button
			type="button"
			class="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={onRetry}
			disabled={isRetrying}
		>
			{#if isRetrying}
				<span class="mr-1.5 -ml-0.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
				Generating...
			{:else}
				Try Again
			{/if}
		</button>

		<a href="/groups/new" class="text-sm text-amber-700 underline hover:text-amber-800">
			Back to setup
		</a>
	</div>
</Alert>
