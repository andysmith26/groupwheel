<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { Button, Spinner } from '$lib/components/ui';
	import { syncSettings } from '$lib/stores/syncSettings.svelte';
	import { trackResponsesSession } from '$lib/stores/trackResponsesSession.svelte';
	import type { AuthUser } from '$lib/application/ports';

	const env = getAppEnvContext();
	const authService = env.authService;
	const syncService = env.syncService;

	let user = $state<AuthUser | null>(null);
	let loading = $state(true);
	let isLoggingOut = $state(false);
	let unsubscribe: (() => void) | null = null;
	let syncUnsubscribe: (() => void) | null = null;
	let syncStatus = $state(
		syncService?.getStatus() ?? {
			enabled: false,
			syncing: false,
			pendingChanges: 0,
			online: true,
			lastSyncedAt: null,
			lastError: null
		}
	);
	let isMenuOpen = $state(false);
	let menuRef: HTMLDivElement | null = $state(null);

	onMount(() => {
		if (authService) {
			unsubscribe = authService.onAuthStateChange((newUser) => {
				user = newUser;
				loading = false;
			});
		} else {
			loading = false;
		}

		if (syncService) {
			syncUnsubscribe = syncService.onStatusChange((newStatus) => {
				syncStatus = newStatus;
			});
		}
	});

	onDestroy(() => {
		unsubscribe?.();
		syncUnsubscribe?.();
	});

	async function handleLogin() {
		if (typeof window !== 'undefined') {
			window.sessionStorage.setItem('post_login_redirect', window.location.pathname);
		}
		await authService?.login();
	}

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await authService?.logout();
		} finally {
			isLoggingOut = false;
		}
	}

	function handleToggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function handleLocalOnlyToggle() {
		if (!syncService || !user) return;
		syncSettings.toggle();
	}

	function handleDisconnect() {
		trackResponsesSession.onDisconnect?.();
		closeMenu();
	}

	function handleRefresh() {
		trackResponsesSession.onRefresh?.();
		closeMenu();
	}

	const localOnlyEnabled = $derived(() => !syncSettings.syncEnabled || !user);
	const canToggleLocalOnly = $derived(() => Boolean(syncService) && Boolean(user));

	const localOnlySubtitle = $derived(() => {
		if (!user) return 'Sign in to enable cloud sync.';
		if (localOnlyEnabled()) return 'Data stays on this device.';
		if (syncStatus.syncing) return 'Syncing changes to the cloud.';
		if (syncStatus.lastError) return 'Sync error - using local data.';
		return 'Data stored locally and in the cloud.';
	});

	$effect(() => {
		if (typeof window === 'undefined' || !isMenuOpen) return;
		const handleClick = (event: MouseEvent) => {
			if (!menuRef || menuRef.contains(event.target as Node)) return;
			closeMenu();
		};
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closeMenu();
		};
		window.addEventListener('click', handleClick);
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('click', handleClick);
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if loading}
	<!-- Loading state -->
	<div class="flex items-center gap-2 text-sm text-gray-400">
		<Spinner size="sm" />
	</div>
{:else}
	<div class="relative" bind:this={menuRef}>
		<button
			type="button"
			onclick={handleToggleMenu}
			aria-haspopup="menu"
			aria-expanded={isMenuOpen}
			class="flex items-center gap-2 rounded-full border border-transparent px-1.5 py-1 text-sm font-medium text-gray-700 hover:border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
		>
			{#if user?.avatarUrl}
				<img
					src={user.avatarUrl}
					alt=""
					class="h-7 w-7 rounded-full"
					referrerpolicy="no-referrer"
				/>
			{:else if user}
				<div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
					{user.name.charAt(0).toUpperCase()}
				</div>
			{/if}
			<span class="hidden text-sm text-gray-700 sm:inline">
				{user ? user.name : 'Account'}
			</span>
			<svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if isMenuOpen}
			<div
				class="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg"
				role="menu"
				aria-label="User menu"
			>
				{#if user}
					<div class="px-4 py-3">
						<p class="text-sm font-semibold text-gray-900">{user.name}</p>
						<p class="text-xs text-gray-500">{user.email}</p>
						<div class="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
							<p class="text-xs uppercase tracking-wide text-gray-400">Active sheet</p>
							{#if trackResponsesSession.isConnected && trackResponsesSession.sheetTitle}
								<p class="mt-1 text-sm font-medium text-gray-900">
									Currently tracking: {trackResponsesSession.sheetTitle}
								</p>
								<div class="mt-2 flex items-center gap-3 text-xs text-teal-700">
									<button type="button" class="hover:underline" onclick={handleDisconnect}>
										Change/Disconnect
									</button>
									{#if trackResponsesSession.onRefresh}
										<button type="button" class="hover:underline" onclick={handleRefresh}>
											Refresh
										</button>
									{/if}
								</div>
							{:else}
								<p class="mt-1 text-sm text-gray-500">No sheet connected.</p>
							{/if}
						</div>
					</div>

					<div class="border-t border-gray-100 px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="text-sm font-medium text-gray-900">Local only</p>
								<p class="text-xs text-gray-500">{localOnlySubtitle()}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={localOnlyEnabled()}
								aria-label={localOnlyEnabled() ? 'Disable local only' : 'Enable local only'}
								onclick={handleLocalOnlyToggle}
								disabled={!canToggleLocalOnly()}
								class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {localOnlyEnabled()
									? 'bg-gray-300'
									: 'bg-teal-500'} {canToggleLocalOnly()
									? 'cursor-pointer'
									: 'cursor-not-allowed opacity-60'}"
							>
								<span
									class="inline-block h-4 w-4 transform rounded-full bg-white transition {localOnlyEnabled()
										? 'translate-x-1'
										: 'translate-x-4'}"
								></span>
							</button>
						</div>
						<a
							href="/settings"
							class="mt-3 block text-sm font-medium text-gray-700 hover:text-gray-900"
							role="menuitem"
						>
							General settings
						</a>
					</div>

					<div class="border-t border-gray-100 px-4 py-3">
						<a href="/help" class="block text-sm text-gray-600 hover:text-gray-900" role="menuitem">
							Help / Documentation
						</a>
						<Button
							variant="ghost"
							size="sm"
							onclick={handleLogout}
							loading={isLoggingOut}
							class="mt-2 w-full justify-center"
						>
							{isLoggingOut ? 'Signing out...' : 'Sign out'}
						</Button>
					</div>
				{:else}
					<div class="px-4 py-3">
						<Button variant="secondary" size="sm" onclick={handleLogin} class="w-full justify-center">
							Sign in with Google
						</Button>
						<a href="/help" class="mt-2 block text-sm text-gray-600 hover:text-gray-900" role="menuitem">
							Help / Documentation
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
