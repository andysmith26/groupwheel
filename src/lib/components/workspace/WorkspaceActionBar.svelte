<script lang="ts">
	interface Props {
		isTryingAnother: boolean;
		isRegenerating: boolean;
		onTryAnother: () => void;
		onStartOver: () => void;
		onShowToClass: () => void;
	}

	let { isTryingAnother, isRegenerating, onTryAnother, onStartOver, onShowToClass }: Props =
		$props();
</script>

<div
	class="sticky bottom-0 z-10 border-t border-gray-200/70 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between">
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
				onclick={onTryAnother}
				disabled={isTryingAnother || isRegenerating}
			>
				{#if isTryingAnother}
					<span class="inline-flex items-center gap-2">
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
					</span>
				{:else}
					Try Another
				{/if}
			</button>
			<button
				type="button"
				class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
				onclick={onStartOver}
				disabled={isTryingAnother || isRegenerating}
			>
				Start Over
			</button>
		</div>
		<button
			type="button"
			class="flex items-center gap-2 rounded-md bg-teal px-6 py-2 text-sm font-medium text-white hover:bg-teal-dark"
			onclick={onShowToClass}
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
				/>
			</svg>
			Show to Class
		</button>
	</div>
</div>
