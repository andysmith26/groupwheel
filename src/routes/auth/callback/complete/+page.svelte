<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { AuthUser } from '$lib/application/ports';

	const appEnv = getAppEnvContext();
	const authService = appEnv.authService;

	let error = $state<string | null>(null);
	let showMigrationPrompt = $state(false);
	let hasLocalData = $state(false);
	let pendingAuthData = $state<AuthCallbackData | null>(null);

	interface AuthCallbackData {
		user: AuthUser;
		accessToken: string;
		refreshToken?: string;
		expiresAt: number;
	}

	/**
	 * Parse cookies from document.cookie string.
	 * Note: Cookie reading is inherently browser-specific and acceptable here
	 * since this is the OAuth callback flow between server and client.
	 */
	function parseCookies(): Record<string, string> {
		return document.cookie.split(';').reduce(
			(acc, cookie) => {
				const [key, value] = cookie.trim().split('=');
				if (key) acc[key] = value;
				return acc;
			},
			{} as Record<string, string>
		);
	}

	/**
	 * Clear a cookie by setting max-age to 0.
	 */
	function clearCookie(name: string): void {
		document.cookie = `${name}=; path=/; max-age=0`;
	}

	onMount(async () => {
		const cookies = parseCookies();
		const authDataStr = cookies['auth_callback_data'];

		if (!authDataStr) {
			error = 'Authentication data not found. Please try logging in again.';
			return;
		}

		try {
			const authData: AuthCallbackData = JSON.parse(decodeURIComponent(authDataStr));
			pendingAuthData = authData;

			// Check if there's existing local data using repositories
			hasLocalData = await checkForLocalDataViaRepos();

			if (hasLocalData) {
				showMigrationPrompt = true;
			} else {
				clearCookie('auth_callback_data');
				await completeLogin(authData);
			}
		} catch (err) {
			console.error('Failed to parse auth data:', err);
			error = 'Failed to process authentication. Please try again.';
		}
	});

	/**
	 * Check if there's existing local data by querying repositories.
	 * Uses the environment's repositories instead of direct IndexedDB access.
	 */
	async function checkForLocalDataViaRepos(): Promise<boolean> {
		try {
			// Check if any repository has data
			const [programs, pools, templates] = await Promise.all([
				appEnv.programRepo.listAll(),
				appEnv.poolRepo.listAll(),
				appEnv.groupTemplateRepo.listAll()
			]);

			return programs.length > 0 || pools.length > 0 || templates.length > 0;
		} catch {
			return false;
		}
	}

	/**
	 * Clear all local data by deleting the IndexedDB database.
	 *
	 * Note: This uses direct IndexedDB access because it's a complete database reset
	 * operation (not a domain operation). The repository interfaces don't have bulk
	 * delete semantics, and this only runs during the one-time migration flow.
	 */
	async function clearLocalData(): Promise<void> {
		if (typeof indexedDB === 'undefined') return;

		try {
			await new Promise<void>((resolve, reject) => {
				const request = indexedDB.deleteDatabase('groupwheel');
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
				request.onblocked = () => {
					// Database is in use by another tab
					console.warn('Database delete blocked - other tabs may have it open');
					resolve();
				};
			});
		} catch (err) {
			console.error('Failed to clear local data:', err);
		}
	}

	async function completeLogin(authData: AuthCallbackData) {
		await authService?.setUser(authData.user, authData.accessToken);
		await goto('/');
	}

	async function handleMigrationChoice(choice: 'upload' | 'separate' | 'discard') {
		if (!pendingAuthData) {
			error = 'Session expired. Please try logging in again.';
			return;
		}

		switch (choice) {
			case 'upload':
				// TODO: Sync local data to server
				// For now, just complete login - sync will happen via syncManager
				break;

			case 'separate':
				// Keep local data separate, don't sync
				// User can manually export/import later
				break;

			case 'discard':
				await clearLocalData();
				break;
		}

		clearCookie('auth_callback_data');
		await completeLogin(pendingAuthData);
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
		{#if error}
			<div class="rounded-md bg-red-50 p-4">
				<h2 class="text-lg font-medium text-red-800">Authentication Error</h2>
				<p class="mt-2 text-sm text-red-700">{error}</p>
				<a
					href="/auth/login"
					class="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
				>
					Try again
				</a>
			</div>
		{:else if showMigrationPrompt}
			<div>
				<h2 class="text-lg font-medium text-gray-900">Existing Data Found</h2>
				<p class="mt-2 text-sm text-gray-600">
					You have data stored locally in this browser. What would you like to do with it?
				</p>

				<div class="mt-6 space-y-3">
					<button
						onclick={() => handleMigrationChoice('upload')}
						class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Upload to my account
						<span class="block text-xs font-normal opacity-80">
							Sync local data to the cloud
						</span>
					</button>

					<button
						onclick={() => handleMigrationChoice('separate')}
						class="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Keep separate
						<span class="block text-xs font-normal text-gray-500">
							Local data stays in browser, account data is separate
						</span>
					</button>

					<button
						onclick={() => handleMigrationChoice('discard')}
						class="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						Discard local data
						<span class="block text-xs font-normal text-red-500">
							Start fresh with an empty account
						</span>
					</button>
				</div>
			</div>
		{:else}
			<div class="text-center">
				<div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
				<p class="mt-4 text-gray-600">Completing login...</p>
			</div>
		{/if}
	</div>
</div>
