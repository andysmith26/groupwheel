<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { AuthUser } from '$lib/application/ports';

	const env = getAppEnvContext();
	const authService = env.authService;

	let error = $state<string | null>(null);
	let showMigrationPrompt = $state(false);
	let hasLocalData = $state(false);

	interface AuthCallbackData {
		user: AuthUser;
		accessToken: string;
		refreshToken?: string;
		expiresAt: number;
	}

	onMount(async () => {
		// Read auth data from cookie
		const cookies = document.cookie.split(';').reduce(
			(acc, cookie) => {
				const [key, value] = cookie.trim().split('=');
				acc[key] = value;
				return acc;
			},
			{} as Record<string, string>
		);

		const authDataStr = cookies['auth_callback_data'];
		if (!authDataStr) {
			error = 'Authentication data not found. Please try logging in again.';
			return;
		}

		try {
			const authData: AuthCallbackData = JSON.parse(decodeURIComponent(authDataStr));

			// Clear the callback cookie
			document.cookie = 'auth_callback_data=; path=/; max-age=0';

			// Check if there's existing local data
			hasLocalData = await checkForLocalData();

			if (hasLocalData) {
				// Show migration prompt
				showMigrationPrompt = true;
			} else {
				// No local data, just complete login
				await completeLogin(authData);
			}
		} catch (err) {
			console.error('Failed to parse auth data:', err);
			error = 'Failed to process authentication. Please try again.';
		}
	});

	async function checkForLocalData(): Promise<boolean> {
		// Check if IndexedDB has any data
		return new Promise((resolve) => {
			if (!window.indexedDB) {
				resolve(false);
				return;
			}

			const request = indexedDB.open('groupwheel');
			request.onsuccess = () => {
				const db = request.result;
				const storeNames = Array.from(db.objectStoreNames);

				if (storeNames.length === 0) {
					db.close();
					resolve(false);
					return;
				}

				// Check if any store has data
				const tx = db.transaction(storeNames, 'readonly');
				let hasData = false;

				storeNames.forEach((storeName) => {
					const store = tx.objectStore(storeName);
					const countReq = store.count();
					countReq.onsuccess = () => {
						if (countReq.result > 0) {
							hasData = true;
						}
					};
				});

				tx.oncomplete = () => {
					db.close();
					resolve(hasData);
				};

				tx.onerror = () => {
					db.close();
					resolve(false);
				};
			};

			request.onerror = () => resolve(false);
		});
	}

	async function completeLogin(authData: AuthCallbackData) {
		await authService?.setUser(authData.user, authData.accessToken);
		await goto('/');
	}

	async function handleMigrationChoice(choice: 'upload' | 'separate' | 'discard') {
		const cookies = document.cookie.split(';').reduce(
			(acc, cookie) => {
				const [key, value] = cookie.trim().split('=');
				acc[key] = value;
				return acc;
			},
			{} as Record<string, string>
		);

		// Re-parse auth data (we need to keep it around for this)
		const authDataStr = cookies['auth_callback_data'];
		if (!authDataStr) {
			// Fall back to trying to read from sessionStorage if cookie was cleared
			error = 'Session expired. Please try logging in again.';
			return;
		}

		const authData: AuthCallbackData = JSON.parse(decodeURIComponent(authDataStr));

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
				// Clear local data
				if (window.indexedDB) {
					await new Promise<void>((resolve) => {
						const req = indexedDB.deleteDatabase('groupwheel');
						req.onsuccess = () => resolve();
						req.onerror = () => resolve();
					});
				}
				break;
		}

		await completeLogin(authData);
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
