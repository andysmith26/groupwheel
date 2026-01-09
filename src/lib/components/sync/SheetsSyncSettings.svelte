<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { SyncStatus } from '$lib/application/ports';
	import type { GoogleSheetsSyncManager, GoogleSheetsSyncConfig } from '$lib/infrastructure/sync';
	import {
		configureSheetsSyncStorage,
		disconnectSheetsSyncStorage,
		getSheetsSyncConfig
	} from '$lib/application/useCases';
	import { isOk } from '$lib/types/result';

	const env = getAppEnvContext();
	const sheetsSyncService = env.sheetsSyncService;
	const sheetsService = env.sheetsService;
	const authService = env.authService;

	let status = $state<SyncStatus>(
		sheetsSyncService?.getStatus() ?? {
			enabled: false,
			syncing: false,
			pendingChanges: 0,
			online: true,
			lastSyncedAt: null,
			lastError: null
		}
	);

	let config = $state<GoogleSheetsSyncConfig | null>(null);
	let isAuthenticated = $state(false);
	let syncUnsubscribe: (() => void) | null = null;
	let authUnsubscribe: (() => void) | null = null;

	// Form state
	let sheetUrl = $state('');
	let isConnecting = $state(false);
	let connectError = $state<string | null>(null);

	onMount(() => {
		if (sheetsSyncService) {
			syncUnsubscribe = sheetsSyncService.onStatusChange((newStatus: SyncStatus) => {
				status = newStatus;
			});
			// Load existing config
			config = getSheetsSyncConfig(sheetsSyncService);
		}

		if (authService) {
			authUnsubscribe = authService.onAuthStateChange((user) => {
				isAuthenticated = user !== null;
			});
		}
	});

	onDestroy(() => {
		syncUnsubscribe?.();
		authUnsubscribe?.();
	});

	async function handleConnect() {
		if (!sheetsSyncService || !sheetsService || !sheetUrl.trim()) return;

		isConnecting = true;
		connectError = null;

		const result = await configureSheetsSyncStorage(
			{
				sheetsService,
				sheetsSyncService
			},
			{ url: sheetUrl }
		);

		isConnecting = false;

		if (isOk(result)) {
			config = getSheetsSyncConfig(sheetsSyncService);
			sheetUrl = '';
		} else {
			connectError = result.error.message;
		}
	}

	async function handleDisconnect() {
		if (!sheetsSyncService) return;

		await disconnectSheetsSyncStorage(sheetsSyncService);
		config = null;
	}

	function handleToggleSync() {
		if (!sheetsSyncService || !config) return;
		sheetsSyncService.setEnabled(!status.enabled);
	}

	const isAvailable = $derived(Boolean(sheetsSyncService && sheetsService && isAuthenticated));
</script>

<div class="sheets-sync-settings rounded-lg border border-gray-200 bg-white p-4">
	<h3 class="mb-3 text-sm font-medium text-gray-900">Google Sheets Storage</h3>

	{#if !isAuthenticated}
		<p class="text-sm text-gray-500">
			Sign in with Google to use a spreadsheet as your data storage.
		</p>
	{:else if !sheetsSyncService || !sheetsService}
		<p class="text-sm text-gray-500">Sheets sync is not available.</p>
	{:else if config}
		<!-- Connected state -->
		<div class="space-y-3">
			<div class="flex items-start justify-between">
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium text-gray-900">
						{config.spreadsheetName || 'Connected Sheet'}
					</p>
					<p class="truncate text-xs text-gray-500">
						ID: {config.spreadsheetId}
					</p>
				</div>
				<button
					type="button"
					onclick={handleDisconnect}
					class="ml-3 text-xs text-red-600 hover:text-red-800"
				>
					Disconnect
				</button>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-700">Sync enabled</span>
				<button
					type="button"
					role="switch"
					aria-checked={status.enabled}
					aria-label={status.enabled ? 'Disable sheets sync' : 'Enable sheets sync'}
					onclick={handleToggleSync}
					class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {status.enabled
						? 'bg-teal-500'
						: 'bg-gray-300'} cursor-pointer"
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition {status.enabled
							? 'translate-x-4'
							: 'translate-x-1'}"
					></span>
				</button>
			</div>

			{#if status.enabled}
				<div class="text-xs text-gray-500">
					{#if status.syncing}
						<span class="text-blue-600">Syncing...</span>
					{:else if status.lastError}
						<span class="text-red-600">Error: {status.lastError}</span>
					{:else if status.lastSyncedAt}
						Last synced: {status.lastSyncedAt.toLocaleTimeString()}
					{:else}
						Ready to sync
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Not connected state -->
		<form onsubmit={(e) => { e.preventDefault(); handleConnect(); }} class="space-y-3">
			<div>
				<label for="sheet-url" class="block text-sm text-gray-700">
					Enter a Google Sheets URL to use as storage:
				</label>
				<input
					id="sheet-url"
					type="url"
					bind:value={sheetUrl}
					placeholder="https://docs.google.com/spreadsheets/d/..."
					disabled={isConnecting}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50"
				/>
			</div>

			{#if connectError}
				<p class="text-sm text-red-600">{connectError}</p>
			{/if}

			<button
				type="submit"
				disabled={isConnecting || !sheetUrl.trim()}
				class="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isConnecting ? 'Connecting...' : 'Connect Sheet'}
			</button>

			<p class="text-xs text-gray-500">
				Your data will be stored in tabs within this spreadsheet. Make sure you have edit access.
			</p>
		</form>
	{/if}
</div>
