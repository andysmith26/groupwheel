<script lang="ts">
	import type { SaveStatus } from '$lib/application/stores/ScenarioEditingStore.svelte';

	const { status, lastSavedAt = null, onRetry } = $props<{
		status: SaveStatus;
		lastSavedAt?: Date | null;
		onRetry?: () => void;
	}>();

	// Reactive state to trigger recalculation of time-ago display
	let now = $state(Date.now());

	// Update 'now' every minute to keep time-ago display current
	// Only run timer when we're showing the saved status with a timestamp
	$effect(() => {
		if (status !== 'saved' || !lastSavedAt) return;

		const intervalId = setInterval(() => {
			now = Date.now();
		}, 60000); // Update every minute

		return () => clearInterval(intervalId);
	});

	const timeAgo = $derived.by(() => {
		if (!lastSavedAt) return null;
		const seconds = Math.floor((now - lastSavedAt.getTime()) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		return `${Math.floor(minutes / 60)}h ago`;
	});

	const tooltipText = $derived(
		status === 'saved' && timeAgo ? `Last saved ${timeAgo}` : ''
	);
</script>

<div
	class="save-indicator flex w-28 items-center justify-start gap-1.5 text-xs"
	title={tooltipText}
>
	{#if status === 'saving'}
		<span class="icon text-blue-500">
			<svg class="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
			</svg>
		</span>
		<span class="text-gray-600">Saving...</span>
	{:else if status === 'saved'}
		<span class="icon text-green-500">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" />
			</svg>
		</span>
		<span class="text-gray-600">Saved</span>
	{:else if status === 'error'}
		<span class="icon text-amber-500">
			<svg class="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
			</svg>
		</span>
		<span class="text-gray-600">Retrying...</span>
	{:else if status === 'failed'}
		<button
			type="button"
			class="icon flex items-center gap-1.5 text-red-500 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
			onclick={onRetry}
			title="Click to retry"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 9l-6 6m0-6l6 6" />
			</svg>
			<span>Failed</span>
		</button>
	{:else}
		<!-- idle state: subtle cloud -->
		<span class="icon text-gray-400">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
			</svg>
		</span>
	{/if}
</div>
