<script lang="ts">
	import '../app.css';
	import logo from '$lib/assets/logo.svg';

	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env as publicEnv } from '$env/dynamic/public';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
	import { getBrowserAuthAdapter } from '$lib/infrastructure/auth/browserAuth';
	import { getBrowserSyncManager } from '$lib/infrastructure/sync/browserSyncManager';
	import { getBrowserGoogleSheetsSyncManager } from '$lib/infrastructure/sync';
	import { BrowserClipboardAdapter } from '$lib/infrastructure/clipboard';
	import { GoogleSheetsAdapter } from '$lib/infrastructure/sheets';
	import { syncSettings } from '$lib/stores/syncSettings.svelte';
	import LoginButton from '$lib/components/auth/LoginButton.svelte';
	import TrackResponsesNavControls from '$lib/components/track-responses/TrackResponsesNavControls.svelte';
	import { trackResponsesSession } from '$lib/stores/trackResponsesSession.svelte';
	import { activityHeader } from '$lib/stores/activityHeader.svelte';
	import { workspaceHeader } from '$lib/stores/workspaceHeader.svelte';
	import { Button, OfflineBanner } from '$lib/components/ui';

	const { children } = $props();

	let authAdapter: ReturnType<typeof getBrowserAuthAdapter> | null = null;
	let syncManager: ReturnType<typeof getBrowserSyncManager> | null = null;
	let authUnsubscribe: (() => void) | null = null;
	let isAuthenticated = $state(false);

	if (browser) {
		// Catch unhandled promise rejections to prevent silent failures
		window.addEventListener('unhandledrejection', (event) => {
			console.error('Unhandled promise rejection:', event.reason);
			event.preventDefault();
		});

		authAdapter = getBrowserAuthAdapter({
			navigate: goto,
			clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID
		});
		syncManager = getBrowserSyncManager();

		// Create GoogleSheetsAdapter if auth is available
		const sheetsAdapter = authAdapter
			? new GoogleSheetsAdapter({ authService: authAdapter })
			: undefined;

		// Create GoogleSheetsSyncManager if auth and sheets are available
		const sheetsSyncManager =
			authAdapter && sheetsAdapter
				? getBrowserGoogleSheetsSyncManager({
						sheetsService: sheetsAdapter,
						authService: authAdapter
					})
				: null;

		const appEnv = createInMemoryEnvironment(undefined, {
			useIndexedDb: true,
			authService: authAdapter ?? undefined,
			syncService: syncManager ?? undefined,
			sheetsSyncService: sheetsSyncManager ?? undefined,
			clipboard: new BrowserClipboardAdapter(),
			sheetsService: sheetsAdapter
		});
		setAppEnvContext(appEnv);

		// Subscribe to auth state changes; sync enablement is gated by user preference.
		if (authAdapter) {
			authUnsubscribe = authAdapter.onAuthStateChange((user) => {
				isAuthenticated = user !== null;
			});
		}
	}

	$effect(() => {
		if (!syncManager) return;
		syncManager.setEnabled(isAuthenticated && syncSettings.syncEnabled);
	});

	onDestroy(() => {
		authUnsubscribe?.();
	});

	// Check if we're on the landing page or auth pages
	let isLandingPage = $derived($page.url.pathname === '/');
	let isAuthPage = $derived($page.url.pathname.startsWith('/auth'));
	let isActivitiesPage = $derived($page.url.pathname === '/activities');
	let isImportPage = $derived($page.url.pathname === '/activities/import');
	let isTrackResponses = $derived($page.url.pathname.startsWith('/track-responses'));
	let isWorkspace = $derived($page.route.id?.startsWith('/activities/[id]/workspace') ?? false);
	let isActivityDetailPage = $derived(/^\/activities\/[^/]+$/.test($page.url.pathname));
	let shouldShowHeaderSubtitle = $derived(isTrackResponses || isWorkspace);
	let isSpaceHeld = $state(false);
	let shouldShowAccountDropdown = $derived(
		(!isTrackResponses || isAuthenticated) &&
			(!isWorkspace || isAuthenticated) &&
			(!isActivitiesPage || isSpaceHeld) &&
			!isImportPage &&
			!isActivityDetailPage
	);
	let workspaceHeaderState = $derived(workspaceHeader.state);
	let showWorkspaceExportMenu = $state(false);

	function isActiveLink(pathname: string, href: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}

	function formatPercent(value: number | null): string {
		if (value === null || Number.isNaN(value)) return '--%';
		return `${Math.round(value)}%`;
	}

	$effect(() => {
		if (!isWorkspace || !workspaceHeaderState) {
			showWorkspaceExportMenu = false;
		}
	});

	$effect(() => {
		if (!isActivitiesPage) {
			isSpaceHeld = false;
		}
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!isActivitiesPage) return;
		if (event.code === 'Space') {
			isSpaceHeld = true;
		}
	}

	function handleKeyup(event: KeyboardEvent) {
		if (!isActivitiesPage) return;
		if (event.code === 'Space') {
			isSpaceHeld = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<div class="flex min-h-screen flex-col bg-gray-50">
	{#if browser}
		<OfflineBanner />
	{/if}
	<header
		class={`border-b bg-white shadow-sm ${isTrackResponses ? 'sticky top-0 z-40' : ''}`}
	>
		<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
			<a href="/" class="group flex items-center gap-2">
				<img src={logo} alt="Groupwheel logo" class="h-8 w-8" />
				<div>
					<p
						class="text-sm font-semibold tracking-wide text-gray-700 group-hover:text-coral"
					>
						Groupwheel
					</p>
					{#if !isLandingPage && !isAuthPage}
						{#if shouldShowHeaderSubtitle}
							{#if isTrackResponses}
								<p class="text-xs text-gray-500">
									{trackResponsesSession.sheetTitle ?? 'No sheet connected'}
								</p>
							{:else if isWorkspace && activityHeader.name}
								<p class="text-xs text-gray-500">{activityHeader.name}</p>
							{/if}
						{/if}
					{/if}
				</div>
			</a>

			{#if !isLandingPage && !isAuthPage}
				<nav aria-label="Main navigation" class="flex flex-1 items-center gap-4">
					{#if isTrackResponses && trackResponsesSession.isConnected}
						<TrackResponsesNavControls />
					{/if}

					<div class="ml-auto flex items-center gap-3">
						{#if isWorkspace && workspaceHeaderState}
							<div class="flex flex-wrap items-center gap-3">
								<div class="flex items-center gap-2 text-xs text-gray-600">
									<button
										type="button"
										class="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
										onclick={workspaceHeaderState.onUndo}
										disabled={!workspaceHeaderState.canUndo}
									>
										← Undo
									</button>
									<button
										type="button"
										class="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
										onclick={workspaceHeaderState.onRedo}
										disabled={!workspaceHeaderState.canRedo}
									>
										Redo →
									</button>
									<span class="hidden md:inline text-gray-300">/</span>
									<span class="hidden md:inline whitespace-nowrap text-gray-700">
										Top 1: {formatPercent(workspaceHeaderState.topChoicePercent)}
									</span>
									<span class="hidden md:inline whitespace-nowrap text-gray-700">
										Top 2: {formatPercent(workspaceHeaderState.topTwoPercent)}
									</span>
								</div>
								<div class="flex items-center gap-2">
									<Button href="/activities/import" variant="secondary" size="sm">
										Import
									</Button>
									<div class="relative">
										<button
											type="button"
											class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
											onclick={() => (showWorkspaceExportMenu = !showWorkspaceExportMenu)}
										>
											Export ▾
										</button>
										{#if showWorkspaceExportMenu}
											<div
												class="absolute right-0 z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
												role="menu"
											>
												<button
													type="button"
													class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
													onclick={() => {
														workspaceHeaderState.onExportGroupsColumns();
														showWorkspaceExportMenu = false;
													}}
													role="menuitem"
												>
													Copy groupings
													<span class="block text-xs text-gray-500">
														for pasting into a spreadsheet
													</span>
												</button>
												<hr class="my-1 border-gray-100" />
												<button
													type="button"
													class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
													onclick={() => {
														workspaceHeaderState.onExportActivitySchema();
														showWorkspaceExportMenu = false;
													}}
													role="menuitem"
												>
													Download schema
													<span class="block text-xs text-gray-500">for emailing</span>
												</button>
												<button
													type="button"
													class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
													onclick={() => {
														workspaceHeaderState.onExportActivityScreenshot();
														showWorkspaceExportMenu = false;
													}}
													role="menuitem"
												>
													Download screenshot
													<span class="block text-xs text-gray-500">for reference</span>
												</button>
											</div>
											<button
												type="button"
												class="fixed inset-0 z-10"
												onclick={() => (showWorkspaceExportMenu = false)}
												aria-label="Close menu"
											></button>
										{/if}
									</div>
								</div>
							</div>
						{/if}
						{#if browser && shouldShowAccountDropdown}
							<LoginButton />
						{/if}
					</div>
				</nav>
			{:else if !isAuthPage}
				<div class="flex items-center gap-3">
					{#if browser}
						<LoginButton />
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<main
		class={
			isWorkspace
				? 'flex-1 overflow-hidden'
				: $page.route.id?.startsWith('/groups/[id]') || $page.route.id?.startsWith('/activities/[id]')
					? 'flex-1'
					: 'flex-1 mx-auto max-w-6xl p-4'
		}
	>
		{@render children()}
	</main>
</div>
