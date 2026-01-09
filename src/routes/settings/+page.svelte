<script lang="ts">
	import { browser } from '$app/environment';
	import SheetsSyncSettings from '$lib/components/sync/SheetsSyncSettings.svelte';
</script>

<svelte:head>
	<title>Settings | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

	{#if browser}
		<section class="mb-8">
			<h2 class="mb-4 text-lg font-semibold text-gray-800">Data Storage</h2>
			<p class="mb-4 text-sm text-gray-600">
				By default, your data is stored locally in your browser. You can optionally connect a
				Google Sheet to use as cloud storage, allowing you to access your data from any device
				or share it with others.
			</p>
			<SheetsSyncSettings />
		</section>
	{:else}
		<p class="text-gray-500">Loading settings...</p>
	{/if}
</div>
