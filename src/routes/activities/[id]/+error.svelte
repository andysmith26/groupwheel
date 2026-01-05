<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui';
</script>

<svelte:head>
	<title>Activity Not Found | Groupwheel</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
	<div class="mx-auto max-w-md">
		<!-- 404 icon -->
		<div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
			<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		</div>

		<h1 class="text-2xl font-semibold text-gray-900">Activity not found</h1>

		<p class="mt-2 text-gray-600">
			{#if $page.status === 404}
				This activity doesn't exist or may have been deleted.
			{:else if $page.error?.message}
				{$page.error.message}
			{:else}
				We couldn't find the activity you're looking for.
			{/if}
		</p>

		<div class="mt-6">
			<Button href="/activities" variant="primary">
				Back to Activities
			</Button>
		</div>

		{#if $page.status}
			<p class="mt-8 text-sm text-gray-400">
				Error {$page.status}
			</p>
		{/if}
	</div>
</div>
