<script lang="ts">
	import type { SaveStatus } from '$lib/application/stores/ScenarioEditingStore.svelte';

	const { status, onRetry } = $props<{
		status: SaveStatus;
		onRetry?: () => void;
	}>();
</script>

<div class="flex items-center gap-2 text-sm">
	{#if status === 'saving'}
		<span class="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
		<span class="text-gray-700">Saving…</span>
	{:else if status === 'saved'}
		<span class="inline-block h-2 w-2 rounded-full bg-green-500" />
		<span class="text-gray-700">Saved</span>
	{:else if status === 'error'}
		<span class="inline-block h-2 w-2 rounded-full bg-amber-500" />
		<span class="text-gray-700">Retrying…</span>
	{:else if status === 'failed'}
		<span class="inline-block h-2 w-2 rounded-full bg-red-500" />
		<span class="text-gray-700">Save failed</span>
		{#if onRetry}
			<button
				type="button"
				class="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
				onclick={onRetry}
			>
				Retry
			</button>
		{/if}
	{:else}
		<span class="inline-block h-2 w-2 rounded-full bg-gray-300" />
		<span class="text-gray-600">Idle</span>
	{/if}
</div>
