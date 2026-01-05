<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let isOnline = $state(true);
	let wasOffline = $state(false);
	let showReconnected = $state(false);

	onMount(() => {
		isOnline = navigator.onLine;

		function handleOnline() {
			isOnline = true;
			if (wasOffline) {
				showReconnected = true;
				setTimeout(() => {
					showReconnected = false;
				}, 3000);
			}
		}

		function handleOffline() {
			isOnline = false;
			wasOffline = true;
		}

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

{#if !isOnline}
	<div
		class="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white"
		role="alert"
		aria-live="polite"
		transition:fade={{ duration: 200 }}
	>
		<div class="flex items-center justify-center gap-2">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
			</svg>
			<span>You're offline. Changes will sync when reconnected.</span>
		</div>
	</div>
{:else if showReconnected}
	<div
		class="bg-green-500 px-4 py-2 text-center text-sm font-medium text-white"
		role="alert"
		aria-live="polite"
		transition:fade={{ duration: 200 }}
	>
		<div class="flex items-center justify-center gap-2">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>You're back online!</span>
		</div>
	</div>
{/if}
