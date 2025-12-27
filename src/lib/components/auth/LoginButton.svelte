<script lang="ts">
	import { authStore } from '$lib/stores/authStore.svelte';
	import { googleOAuth } from '$lib/infrastructure/auth/googleOAuth';

	let isLoggingOut = $state(false);

	async function handleLogin() {
		await googleOAuth.login();
	}

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await googleOAuth.logout();
		} finally {
			isLoggingOut = false;
		}
	}
</script>

{#if authStore.loading}
	<!-- Loading state -->
	<div class="flex items-center gap-2 text-sm text-gray-400">
		<div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
	</div>
{:else if authStore.user}
	<!-- Authenticated state -->
	<div class="flex items-center gap-2">
		{#if authStore.user.avatarUrl}
			<img
				src={authStore.user.avatarUrl}
				alt=""
				class="h-7 w-7 rounded-full"
				referrerpolicy="no-referrer"
			/>
		{:else}
			<div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
				{authStore.user.name.charAt(0).toUpperCase()}
			</div>
		{/if}

		<span class="hidden text-sm text-gray-700 sm:inline">
			{authStore.user.name}
		</span>

		<button
			type="button"
			onclick={handleLogout}
			disabled={isLoggingOut}
			class="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
		>
			{isLoggingOut ? 'Signing out...' : 'Sign out'}
		</button>
	</div>
{:else}
	<!-- Anonymous state -->
	<button
		type="button"
		onclick={handleLogin}
		class="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
	>
		<!-- Google icon -->
		<svg class="h-4 w-4" viewBox="0 0 24 24">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
		<span>Sign in</span>
	</button>
{/if}
