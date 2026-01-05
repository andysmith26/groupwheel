<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { SyncStatus } from '$lib/application/ports';
	import { syncSettings } from '$lib/stores/syncSettings.svelte';

	const env = getAppEnvContext();
	const syncService = env.syncService;
	const authService = env.authService;

	let status = $state<SyncStatus>(
		syncService?.getStatus() ?? {
			enabled: false,
			syncing: false,
			pendingChanges: 0,
			online: true,
			lastSyncedAt: null,
			lastError: null
		}
	);
	let isAuthenticated = $state(false);
	let syncUnsubscribe: (() => void) | null = null;
	let authUnsubscribe: (() => void) | null = null;

	onMount(() => {
		if (syncService) {
			syncUnsubscribe = syncService.onStatusChange((newStatus: SyncStatus) => {
				status = newStatus;
			});
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

	function handleRetry() {
		syncService?.sync();
	}

	const statusIcon = $derived.by(() => {
		if (!status.enabled) return 'local';
		if (status.syncing) return 'syncing';
		if (status.lastError) return 'error';
		if (!status.online) return 'offline';
		if (status.pendingChanges > 0) return 'pending';
		return 'synced';
	});

	const statusLabel = $derived.by(() => {
		if (!status.enabled) return 'Local only';
		if (status.syncing) return 'Syncing';
		if (status.lastError) return 'Sync error';
		if (!status.online) return 'Offline';
		if (status.pendingChanges > 0) return `${status.pendingChanges} pending`;
		return 'Synced';
	});

	const canToggle = $derived.by(() => Boolean(syncService) && isAuthenticated);
	const toggleChecked = $derived.by(() => (isAuthenticated ? syncSettings.syncEnabled : false));

	function handleToggle() {
		if (!canToggle) return;
		syncSettings.toggle();
	}

	const tooltipText = $derived.by(() => {
		if (!status.enabled) {
			if (!isAuthenticated) return 'Local only - sign in to enable cloud sync.';
			if (!syncSettings.syncEnabled) return 'Local only - sync is off.';
			return 'Local only - sync disabled.';
		}
		if (status.syncing) return 'Syncing...';
		if (status.lastError) return `Sync error: ${status.lastError}`;
		if (!status.online) return 'Offline - changes will sync when online';
		if (status.pendingChanges > 0) return `${status.pendingChanges} changes pending`;
		if (status.lastSyncedAt) {
			const timeAgo = getTimeAgo(status.lastSyncedAt);
			return `Synced ${timeAgo} - data stored locally and in the cloud.`;
		}
		return 'Sync on - data stored locally and in the cloud.';
	});

	function getTimeAgo(date: Date): string {
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ago`;
	}
</script>

{#if syncService}
	<div class="sync-status flex items-center gap-2 text-xs text-gray-600" title={tooltipText}>
		<div class="flex items-center gap-1.5">
			{#if statusIcon === 'local'}
				<span class="text-gray-400">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 17h6m-7 4h8a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm9-14V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2"
						/>
					</svg>
				</span>
			{:else if statusIcon === 'syncing'}
				<span class="text-blue-500">
					<svg class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				</span>
			{:else if statusIcon === 'error'}
				<button
					type="button"
					onclick={handleRetry}
					class="flex items-center gap-1 text-amber-500 hover:text-amber-600"
					title="Click to retry sync"
					aria-label="Sync error - click to retry"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</button>
			{:else if statusIcon === 'offline'}
				<span class="text-gray-400">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
						/>
					</svg>
				</span>
			{:else if statusIcon === 'pending'}
				<span class="text-blue-500">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						/>
					</svg>
				</span>
			{:else}
				<span class="text-green-500">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</span>
			{/if}

			<span class="hidden sm:inline">{statusLabel}</span>
		</div>

		<button
			type="button"
			role="switch"
			aria-checked={toggleChecked}
			aria-label={toggleChecked ? 'Disable cloud sync' : 'Enable cloud sync'}
			onclick={handleToggle}
			disabled={!canToggle}
			class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {toggleChecked
				? 'bg-teal-500'
				: 'bg-gray-300'} {canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}"
		>
			<span
				class="inline-block h-4 w-4 transform rounded-full bg-white transition {toggleChecked
					? 'translate-x-4'
					: 'translate-x-1'}"
			></span>
		</button>
	</div>
{/if}
