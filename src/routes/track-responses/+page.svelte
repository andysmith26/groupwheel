<script lang="ts">
	/**
	 * Track Responses Page
	 *
	 * A standalone utility for teachers to track which students have
	 * submitted responses to a Google Form by comparing their roster
	 * to form responses spreadsheet.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import {
		isAuthenticated,
		connectGoogleSheet,
		importFromSheetTab
	} from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import { Button } from '$lib/components/ui';
	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData } from '$lib/domain/import';
	import {
		processTracking,
		type MatchResult
	} from '$lib/utils/responseTracker';

	// Environment - initialized in onMount (SSR-safe)
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// LocalStorage key
	const STORAGE_KEY = 'groupwheel_response_tracker';

	// State
	let sheetUrl = $state('');
	let connection = $state<SheetConnection | null>(null);
	let isConnecting = $state(false);
	let connectionError = $state('');

	let rosterTabGid = $state<string | null>(null);
	let responsesTabGid = $state<string | null>(null);
	let rosterData = $state<RawSheetData | null>(null);
	let responsesData = $state<RawSheetData | null>(null);
	let isLoadingRoster = $state(false);
	let isLoadingResponses = $state(false);
	let rosterError = $state('');
	let responsesError = $state('');

	let matchResult = $state<MatchResult | null>(null);
	let lastRefresh = $state<Date | null>(null);
	let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
	let isRefreshing = $state(false);

	// Derived
	let isLoggedIn = $derived(env ? isAuthenticated(env) : false);
	let tabs = $derived(connection?.tabs ?? []);
	let canProcess = $derived(rosterData !== null && responsesData !== null);

	// Load persisted state on mount
	onMount(() => {
		env = getAppEnvContext();
		loadPersistedState();
		startAutoRefresh();
	});

	onDestroy(() => {
		stopAutoRefresh();
	});

	function loadPersistedState() {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const state = JSON.parse(stored);
				if (state.sheetUrl) {
					sheetUrl = state.sheetUrl;
					// Auto-connect if we have a stored URL
					handleConnect();
				}
				if (state.rosterTabGid) rosterTabGid = state.rosterTabGid;
				if (state.responsesTabGid) responsesTabGid = state.responsesTabGid;
			}
		} catch {
			// Ignore localStorage errors
		}
	}

	function persistState() {
		try {
			const state = {
				sheetUrl: connection?.url ?? sheetUrl,
				rosterTabGid,
				responsesTabGid
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Ignore localStorage errors
		}
	}

	function startAutoRefresh() {
		stopAutoRefresh();
		// Refresh every 30 seconds
		autoRefreshInterval = setInterval(() => {
			if (canProcess && !isRefreshing) {
				refreshData();
			}
		}, 30000);
	}

	function stopAutoRefresh() {
		if (autoRefreshInterval) {
			clearInterval(autoRefreshInterval);
			autoRefreshInterval = null;
		}
	}

	async function handleConnect() {
		if (!env) return;

		if (!sheetUrl.trim()) {
			connectionError = 'Please enter a Google Sheets URL';
			return;
		}

		connectionError = '';
		isConnecting = true;

		const result = await connectGoogleSheet(env, { url: sheetUrl.trim() });

		isConnecting = false;

		if (isErr(result)) {
			switch (result.error.type) {
				case 'NOT_AUTHENTICATED':
					connectionError = 'Please sign in to access Google Sheets';
					break;
				case 'PERMISSION_DENIED':
					connectionError = 'You do not have permission to access this spreadsheet';
					break;
				case 'NOT_FOUND':
					connectionError = 'Spreadsheet not found. Please check the URL.';
					break;
				case 'INVALID_URL':
					connectionError = 'Please enter a valid Google Sheets URL';
					break;
				default:
					connectionError = result.error.message || 'Failed to connect to sheet';
			}
			return;
		}

		connection = result.value;
		persistState();

		// Auto-load tabs if previously selected
		if (rosterTabGid) {
			const tab = connection.tabs.find((t) => t.gid === rosterTabGid);
			if (tab) loadRosterTab(tab);
		}
		if (responsesTabGid) {
			const tab = connection.tabs.find((t) => t.gid === responsesTabGid);
			if (tab) loadResponsesTab(tab);
		}
	}

	function handleDisconnect() {
		connection = null;
		rosterData = null;
		responsesData = null;
		matchResult = null;
		rosterTabGid = null;
		responsesTabGid = null;
		localStorage.removeItem(STORAGE_KEY);
	}

	async function loadRosterTab(tab: SheetTab) {
		if (!env || !connection) return;

		rosterError = '';
		isLoadingRoster = true;

		const result = await importFromSheetTab(env, {
			spreadsheetId: connection.spreadsheetId,
			tabTitle: tab.title
		});

		isLoadingRoster = false;

		if (isErr(result)) {
			rosterError = result.error.message;
			rosterData = null;
			return;
		}

		rosterData = result.value;
		rosterTabGid = tab.gid;
		persistState();
		processIfReady();
	}

	async function loadResponsesTab(tab: SheetTab) {
		if (!env || !connection) return;

		responsesError = '';
		isLoadingResponses = true;

		const result = await importFromSheetTab(env, {
			spreadsheetId: connection.spreadsheetId,
			tabTitle: tab.title
		});

		isLoadingResponses = false;

		if (isErr(result)) {
			responsesError = result.error.message;
			responsesData = null;
			return;
		}

		responsesData = result.value;
		responsesTabGid = tab.gid;
		persistState();
		processIfReady();
	}

	function processIfReady() {
		if (!rosterData || !responsesData) {
			matchResult = null;
			return;
		}

		matchResult = processTracking(rosterData, responsesData);
		lastRefresh = new Date();
	}

	async function refreshData() {
		if (!env || !connection || !rosterTabGid || !responsesTabGid) return;

		isRefreshing = true;

		const rosterTab = tabs.find((t) => t.gid === rosterTabGid);
		const responsesTab = tabs.find((t) => t.gid === responsesTabGid);

		if (rosterTab && responsesTab) {
			// Fetch both tabs in parallel
			const [rosterResult, responsesResult] = await Promise.all([
				importFromSheetTab(env, {
					spreadsheetId: connection.spreadsheetId,
					tabTitle: rosterTab.title
				}),
				importFromSheetTab(env, {
					spreadsheetId: connection.spreadsheetId,
					tabTitle: responsesTab.title
				})
			]);

			if (!isErr(rosterResult)) {
				rosterData = rosterResult.value;
			}
			if (!isErr(responsesResult)) {
				responsesData = responsesResult.value;
			}

			processIfReady();
		}

		isRefreshing = false;
	}

	function handleRosterTabChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const gid = select.value;
		if (!gid) {
			rosterData = null;
			rosterTabGid = null;
			matchResult = null;
			return;
		}
		const tab = tabs.find((t) => t.gid === gid);
		if (tab) loadRosterTab(tab);
	}

	function handleResponsesTabChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const gid = select.value;
		if (!gid) {
			responsesData = null;
			responsesTabGid = null;
			matchResult = null;
			return;
		}
		const tab = tabs.find((t) => t.gid === gid);
		if (tab) loadResponsesTab(tab);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !isConnecting) {
			handleConnect();
		}
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}
</script>

<svelte:head>
	<title>Track Responses | Groupwheel</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Track Form Responses</h1>
			<p class="mt-1 text-sm text-gray-600">
				See which students have submitted to your Google Form
			</p>
		</div>
		{#if lastRefresh}
			<div class="flex items-center gap-2 text-sm text-gray-500">
				<span>Last updated: {formatTime(lastRefresh)}</span>
				<Button
					variant="secondary"
					size="sm"
					onclick={refreshData}
					disabled={!canProcess || isRefreshing}
					loading={isRefreshing}
				>
					Refresh
				</Button>
			</div>
		{/if}
	</div>

	{#if !isLoggedIn}
		<!-- Auth required message -->
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
			<svg
				class="mx-auto h-12 w-12 text-amber-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
				/>
			</svg>
			<h2 class="mt-4 text-lg font-medium text-gray-900">Sign in Required</h2>
			<p class="mt-2 text-sm text-gray-600">
				Please sign in with your Google account to access your Google Sheets.
			</p>
		</div>
	{:else}
		<!-- Sheet Connection -->
		<div class="rounded-lg border border-gray-200 bg-white p-4">
			{#if connection}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<svg
								class="h-5 w-5 text-green-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span class="font-medium text-gray-900">Connected</span>
						</div>
						<button
							type="button"
							onclick={handleDisconnect}
							class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
						>
							Disconnect
						</button>
					</div>
					<div class="rounded-md bg-gray-50 p-3">
						<p class="font-medium text-gray-900">{connection.title}</p>
						<p class="text-sm text-gray-500">
							{connection.tabs.length} tab{connection.tabs.length === 1 ? '' : 's'}
						</p>
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					<label for="sheet-url" class="block text-sm font-medium text-gray-700">
						Google Sheets URL
					</label>
					<div class="flex gap-2">
						<input
							id="sheet-url"
							type="url"
							bind:value={sheetUrl}
							onkeydown={handleKeydown}
							placeholder="https://docs.google.com/spreadsheets/d/..."
							class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
							disabled={isConnecting}
						/>
						<Button
							variant="secondary"
							onclick={handleConnect}
							disabled={isConnecting || !sheetUrl.trim()}
							loading={isConnecting}
						>
							{isConnecting ? 'Connecting...' : 'Connect'}
						</Button>
					</div>

					{#if connectionError}
						<p class="text-sm text-red-600">{connectionError}</p>
					{/if}

					<p class="text-xs text-gray-500">
						Paste the URL of your Google Sheet containing both your class roster and form responses
						(as separate tabs).
					</p>
				</div>
			{/if}
		</div>

		{#if connection}
			<!-- Tab Selectors -->
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Roster Tab Selector -->
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<label for="roster-tab" class="block text-sm font-medium text-gray-700">
						Roster Tab (class list with emails)
					</label>
					<select
						id="roster-tab"
						bind:value={rosterTabGid}
						onchange={handleRosterTabChange}
						disabled={isLoadingRoster}
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
					>
						<option value="">Choose a tab...</option>
						{#each tabs as tab}
							<option value={tab.gid}>{tab.title}</option>
						{/each}
					</select>

					{#if isLoadingRoster}
						<div class="mt-2 flex items-center gap-2 text-sm text-gray-500">
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							Loading roster...
						</div>
					{/if}

					{#if rosterError}
						<p class="mt-2 text-sm text-red-600">{rosterError}</p>
					{/if}

					{#if rosterData && !isLoadingRoster}
						<div class="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-600">
							{rosterData.rows.length} students found
						</div>
					{/if}
				</div>

				<!-- Responses Tab Selector -->
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<label for="responses-tab" class="block text-sm font-medium text-gray-700">
						Responses Tab (form submissions)
					</label>
					<select
						id="responses-tab"
						bind:value={responsesTabGid}
						onchange={handleResponsesTabChange}
						disabled={isLoadingResponses}
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
					>
						<option value="">Choose a tab...</option>
						{#each tabs as tab}
							<option value={tab.gid}>{tab.title}</option>
						{/each}
					</select>

					{#if isLoadingResponses}
						<div class="mt-2 flex items-center gap-2 text-sm text-gray-500">
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							Loading responses...
						</div>
					{/if}

					{#if responsesError}
						<p class="mt-2 text-sm text-red-600">{responsesError}</p>
					{/if}

					{#if responsesData && !isLoadingResponses}
						<div class="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-600">
							{responsesData.rows.length} response{responsesData.rows.length === 1 ? '' : 's'} found
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if matchResult}
			<!-- Results -->
			<div class="grid gap-4 lg:grid-cols-3">
				<!-- Not Submitted -->
				<div class="rounded-lg border-2 border-red-200 bg-red-50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-red-800">Not Submitted</h2>
						<span class="rounded-full bg-red-100 px-2 py-0.5 text-sm font-medium text-red-800">
							{matchResult.notSubmitted.length}
						</span>
					</div>
					{#if matchResult.notSubmitted.length === 0}
						<p class="text-sm text-red-700">Everyone has submitted!</p>
					{:else}
						<ul class="space-y-1">
							{#each matchResult.notSubmitted as student}
								<li class="rounded bg-white px-2 py-1 text-sm text-gray-900">
									{student.name}
									<span class="text-xs text-gray-500">({student.email})</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<!-- Submitted -->
				<div class="rounded-lg border-2 border-green-200 bg-green-50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-green-800">Submitted</h2>
						<span class="rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-800">
							{matchResult.submitted.length}
						</span>
					</div>
					{#if matchResult.submitted.length === 0}
						<p class="text-sm text-green-700">No submissions yet.</p>
					{:else}
						<ul class="space-y-2">
							{#each matchResult.submitted as { student, response }}
								<li class="rounded bg-white px-2 py-1.5">
									<div class="text-sm font-medium text-gray-900">{student.name}</div>
									{#if response.choices.length > 0}
										<div class="mt-1 flex flex-wrap gap-1">
											{#each response.choices as choice, idx}
												<span class="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
													{idx + 1}. {choice}
												</span>
											{/each}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<!-- Can't Track -->
				<div class="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-gray-700">Can't Track</h2>
						<span class="rounded-full bg-gray-200 px-2 py-0.5 text-sm font-medium text-gray-700">
							{matchResult.cantTrack.length}
						</span>
					</div>
					{#if matchResult.cantTrack.length === 0}
						<p class="text-sm text-gray-600">All students have valid emails.</p>
					{:else}
						<p class="mb-2 text-xs text-gray-500">
							These students are missing email addresses in the roster:
						</p>
						<ul class="space-y-1">
							{#each matchResult.cantTrack as student}
								<li class="rounded bg-white px-2 py-1 text-sm text-gray-900">
									{student.name}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>

			<!-- Summary Stats -->
			<div class="rounded-lg border border-gray-200 bg-white p-4">
				<h3 class="mb-2 text-sm font-medium text-gray-700">Summary</h3>
				<div class="flex gap-6 text-sm">
					<div>
						<span class="text-gray-500">Total in roster:</span>
						<span class="ml-1 font-medium">{rosterData?.rows.length ?? 0}</span>
					</div>
					<div>
						<span class="text-gray-500">Submitted:</span>
						<span class="ml-1 font-medium text-green-600">{matchResult.submitted.length}</span>
					</div>
					<div>
						<span class="text-gray-500">Pending:</span>
						<span class="ml-1 font-medium text-red-600">{matchResult.notSubmitted.length}</span>
					</div>
					<div>
						<span class="text-gray-500">Completion:</span>
						<span class="ml-1 font-medium">
							{#if matchResult.submitted.length + matchResult.notSubmitted.length > 0}
								{Math.round(
									(matchResult.submitted.length /
										(matchResult.submitted.length + matchResult.notSubmitted.length)) *
										100
								)}%
							{:else}
								N/A
							{/if}
						</span>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
