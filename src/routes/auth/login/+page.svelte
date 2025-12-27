<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getBrowserAuthAdapter } from '$lib/infrastructure/auth/browserAuth';
	import { env } from '$env/dynamic/public';

	let error = $state<string | null>(null);

	onMount(() => {
		const authAdapter = getBrowserAuthAdapter();

		// If already authenticated, redirect to home
		if (authAdapter?.isAuthenticated()) {
			goto('/');
			return;
		}

		// Build Google OAuth URL
		const clientId = env.PUBLIC_GOOGLE_CLIENT_ID;
		if (!clientId) {
			error = 'Google OAuth is not configured. Please set PUBLIC_GOOGLE_CLIENT_ID.';
			return;
		}

		const redirectUri = `${window.location.origin}/auth/callback`;
		const scope = 'openid email profile';
		const responseType = 'code';
		const state = crypto.randomUUID(); // CSRF protection

		// Store state for validation in callback
		sessionStorage.setItem('oauth_state', state);

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: responseType,
			scope: scope,
			state: state,
			access_type: 'offline',
			prompt: 'consent'
		});

		const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

		// Redirect to Google
		window.location.href = googleAuthUrl;
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
