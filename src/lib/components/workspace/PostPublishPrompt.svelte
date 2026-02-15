<script lang="ts">
	/**
	 * PostPublishPrompt: Modal shown after publishing groups.
	 *
	 * Replaces the ObservationToast in the post-publish flow with
	 * explicit navigation options for present/observe/both.
	 */

	const {
		open = false,
		activityId,
		onShowToClass,
		onRecordObservations,
		onOpenBoth,
		onCancel
	}: {
		open?: boolean;
		activityId: string;
		onShowToClass: () => void;
		onRecordObservations: () => void;
		onOpenBoth: () => void;
		onCancel: () => void;
	} = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
			<!-- Success header -->
			<div class="flex items-center gap-3 mb-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
					<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Groups Published</h3>
					<p class="text-sm text-gray-500">What would you like to do next?</p>
				</div>
			</div>

			<!-- Options -->
			<div class="space-y-3">
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-teal hover:bg-teal/5"
					onclick={onShowToClass}
				>
					<svg class="h-5 w-5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
					<div>
						<p class="font-medium text-gray-900">Show to Class</p>
						<p class="text-sm text-gray-500">Open projector view in a new window</p>
					</div>
				</button>

				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-teal hover:bg-teal/5"
					onclick={onRecordObservations}
				>
					<svg class="h-5 w-5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					<div>
						<p class="font-medium text-gray-900">Record Observations</p>
						<p class="text-sm text-gray-500">Go to the teacher observation view</p>
					</div>
				</button>

				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-lg border-2 border-teal bg-teal/5 px-4 py-3 text-left transition-colors hover:bg-teal/10"
					onclick={onOpenBoth}
				>
					<svg class="h-5 w-5 flex-shrink-0 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
					<div>
						<p class="font-medium text-teal-dark">Open Both</p>
						<p class="text-sm text-gray-500">Projector view + observation view</p>
					</div>
				</button>
			</div>

			<!-- Cancel link -->
			<div class="mt-4 text-center">
				<button
					type="button"
					class="text-sm text-gray-500 hover:text-gray-700"
					onclick={onCancel}
				>
					Stay in workspace
				</button>
			</div>
		</div>
	</div>
{/if}
