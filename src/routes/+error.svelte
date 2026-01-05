<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui';
</script>

<svelte:head>
	<title>Error | Groupwheel</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
	<div class="mx-auto max-w-md">
		<!-- Error icon -->
		<div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
			<svg class="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
		</div>

		<!-- Error message -->
		<h1 class="text-2xl font-semibold text-gray-900">
			{#if $page.status === 404}
				Page not found
			{:else}
				Something went wrong
			{/if}
		</h1>

		<p class="mt-2 text-gray-600">
			{#if $page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else if $page.error?.message}
				{$page.error.message}
			{:else}
				An unexpected error occurred. Please try refreshing the page.
			{/if}
		</p>

		<!-- Actions -->
		<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
			<Button href="/activities" variant="primary">
				Go to Dashboard
			</Button>
			<Button onclick={() => window.location.reload()} variant="ghost">
				Refresh page
			</Button>
		</div>

		<!-- Error code -->
		{#if $page.status}
			<p class="mt-8 text-sm text-gray-400">
				Error {$page.status}
			</p>
		{/if}
	</div>
</div>
