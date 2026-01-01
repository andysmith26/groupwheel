<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getAppEnvContext } from '$lib/contexts/appEnv';

	let error = $state<string | null>(null);

	// Check for error from auth service redirect
	const urlError = $derived($page.url.searchParams.get('error'));
	$effect(() => {
		if (urlError === 'not_configured') {
			error = 'Google OAuth is not configured. Please set PUBLIC_GOOGLE_CLIENT_ID.';
		}
	});

	onMount(async () => {
		// If there's already an error from URL, don't proceed
		if (urlError) return;

		const appEnv = getAppEnvContext();
		const authService = appEnv.authService;

		if (!authService) {
			error = 'Authentication is not available.';
			return;
		}

		// The auth service handles everything: checking if authenticated,
		// building OAuth URL, and redirecting
		await authService.login();
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
		{#if error}
			<div class="rounded-md bg-red-50 p-4">
				<h2 class="text-lg font-medium text-red-800">Configuration Error</h2>
				<p class="mt-2 text-sm text-red-700">{error}</p>
				<a
					href="/"
					class="mt-4 inline-block text-sm font-medium text-red-600 hover:text-red-500"
				>
					Return to app
				</a>
			</div>
		{:else}
			<div class="text-center">
				<div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
				<p class="mt-4 text-gray-600">Redirecting to Google...</p>
			</div>
		{/if}
	</div>
</div>
