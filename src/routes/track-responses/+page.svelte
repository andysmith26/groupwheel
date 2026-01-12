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
	import ActivityStatusBar from '$lib/components/track-responses/ActivityStatusBar.svelte';
	import StudentFiltersBar from '$lib/components/track-responses/StudentFiltersBar.svelte';
	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData } from '$lib/domain/import';
	import {
		processTracking,
		type MatchResult,
		type FormResponse,
		type RosterStudent
	} from '$lib/utils/responseTracker';
	import {
		formatRelativeUpdatedLabel,
		getNextHeaderCollapseState,
		type StudentStateFilter
	} from '$lib/utils/trackResponsesUi';

	// Environment - initialized in onMount (SSR-safe)
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// LocalStorage keys
	const STORAGE_KEY = 'groupwheel_response_tracker';
	const RECENT_SHEETS_KEY = 'groupwheel_recent_sheets';
	const MAX_RECENT_SHEETS = 5;

	// Recent sheet type
	interface RecentSheet {
		url: string;
		title: string;
		lastUsed: number;
	}

	type StudentState = 'submitted' | 'not_submitted' | 'ignored';

	interface StudentRow {
		student: RosterStudent;
		response?: FormResponse;
		state: StudentState;
	}

	const STATE_LABELS: Record<StudentState, string> = {
		submitted: 'Submitted',
		not_submitted: 'Not submitted',
		ignored: 'Ignored'
	};

	const STATE_BADGE_CLASSES: Record<StudentState, string> = {
		submitted: 'bg-green-100 text-green-700',
		not_submitted: 'bg-amber-100 text-amber-700',
		ignored: 'bg-gray-100 text-gray-600'
	};

	// State
	let sheetUrl = $state('');
	let connection = $state<SheetConnection | null>(null);
	let isConnecting = $state(false);
	let connectionError = $state('');
	let recentSheets = $state<RecentSheet[]>([]);
	let isAutoDetecting = $state(false);

	let rosterTabGid = $state<string | null>(null);
	let responsesTabGid = $state<string | null>(null);
	let rosterData = $state<RawSheetData | null>(null);
	let responsesData = $state<RawSheetData | null>(null);

	// Store all tab data for manual selection fallback
	let allTabData = $state<Map<string, RawSheetData>>(new Map());
	let autoDetectFailed = $state(false);

	let matchResult = $state<MatchResult | null>(null);
	let lastRefresh = $state<Date | null>(null);
	let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
	let isRefreshing = $state(false);

	// Search and ignore state
	let searchQuery = $state('');
	let ignoredEmails = $state<Set<string>>(new Set());
	let stateFilter = $state<StudentStateFilter>('all');
	let showClubRequests = $state(false);

	// Derived
	let isLoggedIn = $derived(env ? isAuthenticated(env) : false);
	let tabs = $derived(connection?.tabs ?? []);
	let canProcess = $derived(rosterData !== null && responsesData !== null);

	/**
	 * Check if a name matches the search query.
	 * Matches if any word in the name starts with the query.
	 */
	function nameMatchesQuery(name: string, query: string): boolean {
		if (!query) return true;
		const words = name.toLowerCase().split(/\s+/);
		return words.some((word) => word.startsWith(query));
	}

	const STATE_SORT_ORDER: Record<StudentState, number> = {
		not_submitted: 0,
		submitted: 1,
		ignored: 2
	};

	let studentRows = $derived(() => {
		if (!matchResult) return [];
		const rows: StudentRow[] = [];

		for (const entry of matchResult.submitted) {
			const state = ignoredEmails.has(entry.student.email) ? 'ignored' : 'submitted';
			rows.push({ student: entry.student, response: entry.response, state });
		}

		for (const student of matchResult.notSubmitted) {
			const state = ignoredEmails.has(student.email) ? 'ignored' : 'not_submitted';
			rows.push({ student, state });
		}

		return rows.sort((a, b) => {
			const orderDiff = STATE_SORT_ORDER[a.state] - STATE_SORT_ORDER[b.state];
			if (orderDiff !== 0) return orderDiff;
			return a.student.name.localeCompare(b.student.name);
		});
	});

	let studentCounts = $derived(() => {
		const counts = { submitted: 0, ignored: 0, unresolved: 0, total: 0 };
		for (const row of studentRows()) {
			if (row.state === 'submitted') counts.submitted++;
			if (row.state === 'ignored') counts.ignored++;
			if (row.state === 'not_submitted') counts.unresolved++;
		}
		counts.total = counts.submitted + counts.ignored + counts.unresolved;
		return counts;
	});

	let accountedFor = $derived(() => studentCounts().submitted + studentCounts().ignored);

	let accountedForPercent = $derived(() => {
		const total = studentCounts().total;
		if (total === 0) return 0;
		return Math.round((accountedFor() / total) * 100);
	});

	let filteredStudents = $derived(() => {
		if (!matchResult) return [];
		const query = searchQuery.toLowerCase().trim();
		return studentRows().filter((row) => {
			if (stateFilter !== 'all' && row.state !== stateFilter) return false;
			return nameMatchesQuery(row.student.name, query);
		});
	});

	let cantTrackCount = $derived(() => matchResult?.cantTrack.length ?? 0);
	let activityName = $derived(() => connection?.title ?? 'Not connected');
	let lastUpdatedLabel = $derived(() =>
		lastRefresh ? formatRelativeUpdatedLabel(lastRefresh) : 'Updated —'
	);
	let isHeaderExpanded = $derived(
		() => !isHeaderCollapsed || isHeaderHovered || isHeaderPinnedOpen
	);
	let filterIndicatorLabel = $derived(() => {
		const counts = studentCounts();
		switch (stateFilter) {
			case 'submitted':
				return `Submitted ${counts.submitted}`;
			case 'ignored':
				return `Ignored ${counts.ignored}`;
			case 'not_submitted':
				return `Not submitted ${counts.unresolved}`;
			default:
				return `All ${counts.total}`;
		}
	});

	let isHeaderCollapsed = $state(false);
	let isHeaderPinnedOpen = $state(false);
	let isHeaderHovered = $state(false);
	let lastScrollY = 0;
	const HEADER_COLLAPSE_THRESHOLD = 80;

	// Club requests - aggregate choices by club name
	interface ClubRequest {
		clubName: string;
		byRank: { rank: number; students: string[] }[];
	}

	let clubRequests = $derived(() => {
		if (!matchResult) return [];

		// Build a map: clubName -> rank -> list of student names
		const clubMap = new Map<string, Map<number, string[]>>();

		for (const { student, response } of matchResult.submitted) {
			if (ignoredEmails.has(student.email)) continue;

			for (let i = 0; i < response.choices.length; i++) {
				const clubName = response.choices[i];
				const rank = i + 1; // 1-based rank

				if (!clubMap.has(clubName)) {
					clubMap.set(clubName, new Map());
				}
				const rankMap = clubMap.get(clubName)!;
				if (!rankMap.has(rank)) {
					rankMap.set(rank, []);
				}
				rankMap.get(rank)!.push(student.name);
			}
		}

		// Convert to array and sort by club name
		const result: ClubRequest[] = [];
		for (const [clubName, rankMap] of clubMap) {
			const byRank: { rank: number; students: string[] }[] = [];
			for (let rank = 1; rank <= 4; rank++) {
				byRank.push({
					rank,
					students: rankMap.get(rank) ?? []
				});
			}
			result.push({ clubName, byRank });
		}

		result.sort((a, b) => a.clubName.localeCompare(b.clubName));
		return result;
	});

	// Load persisted state on mount
	onMount(() => {
		env = getAppEnvContext();
		loadRecentSheets();
		loadPersistedState();
		startAutoRefresh();

		if (typeof window === 'undefined') return;

		lastScrollY = window.scrollY;
		const handleScroll = () => {
			isHeaderCollapsed = getNextHeaderCollapseState({
				currentScrollY: window.scrollY,
				previousScrollY: lastScrollY,
				threshold: HEADER_COLLAPSE_THRESHOLD,
				isCollapsed: isHeaderCollapsed
			});
			lastScrollY = window.scrollY;
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();
		return () => window.removeEventListener('scroll', handleScroll);
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
				if (state.ignoredEmails && Array.isArray(state.ignoredEmails)) {
					ignoredEmails = new Set(state.ignoredEmails);
				}
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
				responsesTabGid,
				ignoredEmails: Array.from(ignoredEmails)
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Ignore localStorage errors
		}
	}

	function ignoreStudent(email: string) {
		ignoredEmails = new Set([...ignoredEmails, email]);
		persistState();
	}

	function unignoreStudent(email: string) {
		const newSet = new Set(ignoredEmails);
		newSet.delete(email);
		ignoredEmails = newSet;
		persistState();
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
		saveRecentSheet(connection.url, connection.title);
		persistState();

		// Auto-detect tabs based on headers
		await autoDetectTabs();
	}

	function handleDisconnect() {
		connection = null;
		rosterData = null;
		responsesData = null;
		matchResult = null;
		rosterTabGid = null;
		responsesTabGid = null;
		allTabData = new Map();
		autoDetectFailed = false;
		localStorage.removeItem(STORAGE_KEY);
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

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !isConnecting) {
			handleConnect();
		}
	}


	// ─────────────────────────────────────────────────────────────────────────
	// Tab Auto-Detection
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Detect if headers look like a roster (name + email columns, no timestamp).
	 */
	function looksLikeRoster(headers: string[]): boolean {
		const lowerHeaders = headers.map(h => h.toLowerCase().trim());

		// Check for name-like columns (substring matching)
		const hasName = lowerHeaders.some(h =>
			h.includes('name') || h.includes('student') || h === 'first' || h === 'last'
		);

		// Check for email column
		const hasEmail = lowerHeaders.some(h =>
			h.includes('email') || h.includes('e-mail')
		);

		// Roster typically doesn't have Timestamp column (Google Forms adds this)
		const hasTimestamp = lowerHeaders.some(h => h.includes('timestamp'));

		return hasName && hasEmail && !hasTimestamp;
	}

	/**
	 * Detect if headers look like form responses (timestamp column present).
	 */
	function looksLikeResponses(headers: string[]): boolean {
		const lowerHeaders = headers.map(h => h.toLowerCase().trim());

		// Google Forms always adds a Timestamp column
		const hasTimestamp = lowerHeaders.some(h => h.includes('timestamp'));

		// Also check for email (Google Forms can collect email)
		const hasEmail = lowerHeaders.some(h =>
			h.includes('email') || h.includes('e-mail')
		);

		// Responses typically have choice columns or other form questions
		const hasChoiceColumns = lowerHeaders.some(h =>
			h.includes('choice') || h.includes('[') // matrix questions have [option] format
		);

		return hasTimestamp && (hasEmail || hasChoiceColumns);
	}

	/**
	 * Auto-detect which tabs are roster and responses based on headers.
	 */
	async function autoDetectTabs() {
		if (!env || !connection) return;

		isAutoDetecting = true;
		autoDetectFailed = false;

		let detectedRoster: SheetTab | null = null;
		let detectedResponses: SheetTab | null = null;
		const tabDataMap = new Map<string, RawSheetData>();

		// Load all tabs first
		for (const tab of connection.tabs) {
			try {
				const result = await importFromSheetTab(env, {
					spreadsheetId: connection.spreadsheetId,
					tabTitle: tab.title
				});

				if (isErr(result)) continue;

				tabDataMap.set(tab.gid, result.value);
				const headers = result.value.headers;

				if (!detectedRoster && looksLikeRoster(headers)) {
					detectedRoster = tab;
					rosterData = result.value;
					rosterTabGid = tab.gid;
				} else if (!detectedResponses && looksLikeResponses(headers)) {
					detectedResponses = tab;
					responsesData = result.value;
					responsesTabGid = tab.gid;
				}
			} catch {
				// Continue checking other tabs
			}
		}

		allTabData = tabDataMap;

		// If we didn't find both, mark as failed for manual selection
		if (!detectedRoster || !detectedResponses) {
			autoDetectFailed = true;
		}

		isAutoDetecting = false;
		persistState();
		processIfReady();
	}

	/**
	 * Manually select a tab as roster.
	 */
	function selectRosterTab(gid: string) {
		rosterTabGid = gid;
		rosterData = allTabData.get(gid) ?? null;
		persistState();
		processIfReady();
	}

	/**
	 * Manually select a tab as responses.
	 */
	function selectResponsesTab(gid: string) {
		responsesTabGid = gid;
		responsesData = allTabData.get(gid) ?? null;
		persistState();
		processIfReady();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Recent Sheets Management
	// ─────────────────────────────────────────────────────────────────────────

	function loadRecentSheets() {
		try {
			const stored = localStorage.getItem(RECENT_SHEETS_KEY);
			if (stored) {
				recentSheets = JSON.parse(stored);
			}
		} catch {
			recentSheets = [];
		}
	}

	function saveRecentSheet(url: string, title: string) {
		// Remove existing entry with same URL
		const filtered = recentSheets.filter(s => s.url !== url);
		// Add new entry at start
		const updated: RecentSheet[] = [
			{ url, title, lastUsed: Date.now() },
			...filtered
		].slice(0, MAX_RECENT_SHEETS);

		recentSheets = updated;

		try {
			localStorage.setItem(RECENT_SHEETS_KEY, JSON.stringify(updated));
		} catch {
			// Ignore storage errors
		}
	}

	function removeRecentSheet(url: string) {
		recentSheets = recentSheets.filter(s => s.url !== url);
		try {
			localStorage.setItem(RECENT_SHEETS_KEY, JSON.stringify(recentSheets));
		} catch {
			// Ignore
		}
	}

	async function selectRecentSheet(sheet: RecentSheet) {
		sheetUrl = sheet.url;
		await handleConnect();
	}
</script>

<svelte:head>
	<title>Track Responses | Groupwheel</title>
</svelte:head>

<div class="space-y-4">
	<div
		class={`sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur ${
			isHeaderCollapsed ? 'shadow-sm' : ''
		}`}
		onmouseenter={() => (isHeaderHovered = true)}
		onmouseleave={() => (isHeaderHovered = false)}
	>
		<div class="px-4 py-2 space-y-2">
			<ActivityStatusBar
				activityName={activityName()}
				isConnected={Boolean(connection)}
				lastUpdatedLabel={lastUpdatedLabel()}
				canRefresh={canProcess}
				isRefreshing={isRefreshing}
				accountedFor={accountedFor()}
				rosterCount={studentCounts().total}
				submittedCount={studentCounts().submitted}
				ignoredCount={studentCounts().ignored}
				unresolvedCount={studentCounts().unresolved}
				accountedForPercent={accountedForPercent()}
				collapsed={isHeaderCollapsed}
				expanded={isHeaderExpanded()}
				filterIndicatorLabel={filterIndicatorLabel()}
				stateFilter={stateFilter}
				onRefresh={refreshData}
				onFilterSelect={(filter) => (stateFilter = filter)}
				onToggleDetails={() => (isHeaderPinnedOpen = !isHeaderPinnedOpen)}
			/>
			{#if matchResult && isHeaderExpanded()}
				<StudentFiltersBar
					stateFilter={stateFilter}
					totalCount={studentCounts().total}
					submittedCount={studentCounts().submitted}
					ignoredCount={studentCounts().ignored}
					unresolvedCount={studentCounts().unresolved}
					onFilterSelect={(filter) => (stateFilter = filter)}
					bind:searchQuery={searchQuery}
				/>
			{/if}
		</div>
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
					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="text-sm text-gray-600">
							Connected to <span class="font-medium text-gray-900">{connection.title}</span>
						</p>
						<button
							type="button"
							onclick={handleDisconnect}
							class="text-sm text-gray-500 hover:text-gray-700 focus:underline focus:outline-none"
						>
							Disconnect
						</button>
					</div>
					{#if isAutoDetecting}
						<p class="text-sm text-teal">Detecting tabs...</p>
					{:else if !rosterData || !responsesData || autoDetectFailed}
						<p class="text-sm text-amber-600 mb-3">
							Could not auto-detect all tabs. Please select manually:
						</p>
						<!-- Manual Tab Selection -->
						<div class="grid gap-3 md:grid-cols-2">
							<div>
								<label for="roster-tab" class="block text-xs font-medium text-gray-600 mb-1">
									Roster Tab
								</label>
								<select
									id="roster-tab"
									value={rosterTabGid ?? ''}
									onchange={(e) => selectRosterTab((e.target as HTMLSelectElement).value)}
									class="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
								>
									<option value="">Choose roster tab...</option>
									{#each tabs as tab}
										<option value={tab.gid}>{tab.title}</option>
									{/each}
								</select>
								{#if rosterData}
									<p class="mt-1 text-xs text-green-600">{rosterData.rows.length} students</p>
								{/if}
							</div>
							<div>
								<label for="responses-tab" class="block text-xs font-medium text-gray-600 mb-1">
									Responses Tab
								</label>
								<select
									id="responses-tab"
									value={responsesTabGid ?? ''}
									onchange={(e) => selectResponsesTab((e.target as HTMLSelectElement).value)}
									class="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
								>
									<option value="">Choose responses tab...</option>
									{#each tabs as tab}
										<option value={tab.gid}>{tab.title}</option>
									{/each}
								</select>
								{#if responsesData}
									<p class="mt-1 text-xs text-green-600">{responsesData.rows.length} responses</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="space-y-4">
					<!-- Recent Sheets -->
					{#if recentSheets.length > 0}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Recent Spreadsheets
							</label>
							<div class="space-y-2">
								{#each recentSheets as sheet}
									<div class="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 hover:border-teal hover:bg-teal/5 transition-colors">
										<button
											type="button"
											onclick={() => selectRecentSheet(sheet)}
											class="flex-1 text-left text-sm font-medium text-gray-900 hover:text-teal"
											disabled={isConnecting}
										>
											{sheet.title}
										</button>
										<button
											type="button"
											onclick={() => removeRecentSheet(sheet.url)}
											class="ml-2 p-1 text-gray-400 hover:text-red-500"
											title="Remove from list"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						</div>
						<div class="relative">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-gray-200"></div>
							</div>
							<div class="relative flex justify-center text-xs">
								<span class="bg-white px-2 text-gray-500">or enter URL</span>
							</div>
						</div>
					{/if}

					<!-- URL Input -->
					<div>
						<label for="sheet-url" class="block text-sm font-medium text-gray-700">
							Google Sheets URL
						</label>
						<div class="mt-1 flex gap-2">
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
					</div>

					{#if connectionError}
						<p class="text-sm text-red-600">{connectionError}</p>
					{/if}

					<p class="text-xs text-gray-500">
						Paste the URL of your Google Sheet containing both your class roster and form responses
						(as separate tabs). Tabs will be auto-detected based on their headers.
					</p>
				</div>
			{/if}
		</div>

		{#if matchResult}
			{#if cantTrackCount() > 0}
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-sm font-medium text-amber-800">
								Can't track {cantTrackCount()} students
							</p>
							<p class="text-xs text-amber-700">
								Missing email addresses in the roster. Fix the roster to unblock readiness.
							</p>
						</div>
						<a
							href={connection?.url ?? sheetUrl}
							target="_blank"
							rel="noreferrer"
							class="inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
						>
							Fix roster
						</a>
					</div>
				</div>
			{/if}

			{#if filteredStudents().length === 0}
				<div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
					{searchQuery ? 'No students match that search.' : 'No students to display yet.'}
				</div>
			{:else}
				<ul class="space-y-2">
					{#each filteredStudents() as row}
						<li class="group rounded-lg border border-gray-200 bg-white px-3 py-2">
							<div class="flex items-start justify-between gap-3">
								<div>
									<div class="flex flex-wrap items-center gap-2">
										<span class="text-sm font-medium text-gray-900">{row.student.name}</span>
										<span class={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE_CLASSES[row.state]}`}>
											{STATE_LABELS[row.state]}
										</span>
									</div>
									{#if row.state === 'submitted' && row.response?.choices.length}
										<div class="mt-1 flex flex-wrap gap-1">
											{#each row.response.choices as choice, idx}
												<span class="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
													{idx + 1}. {choice}
												</span>
											{/each}
										</div>
									{:else if row.state === 'not_submitted'}
										<p class="mt-1 text-xs text-gray-500">Awaiting response.</p>
									{/if}
								</div>
								<button
									type="button"
									onclick={() => (row.state === 'ignored' ? unignoreStudent(row.student.email) : ignoreStudent(row.student.email))}
									class={`ml-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 ${
										row.state === 'ignored'
											? 'text-amber-600 hover:text-amber-800'
											: 'text-gray-400 hover:text-gray-600'
									}`}
									title={row.state === 'ignored' ? 'Unignore' : 'Ignore'}
								>
									{row.state === 'ignored' ? 'unignore' : 'ignore'}
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Club Requests Section -->
			{#if clubRequests().length > 0}
				<div class="rounded-lg border border-gray-200 bg-white">
					<button
						type="button"
						onclick={() => (showClubRequests = !showClubRequests)}
						class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
					>
						<div>
							<h2 class="text-sm font-semibold text-gray-900">Requests by Club</h2>
							<p class="text-xs text-gray-500">Peek at demand without leaving this page.</p>
						</div>
						<div class="flex items-center gap-2 text-xs text-gray-500">
							<span>{clubRequests().length} clubs</span>
							<svg
								class={`h-4 w-4 text-gray-400 transition-transform ${showClubRequests ? 'rotate-180' : ''}`}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</div>
					</button>
					{#if showClubRequests}
						<div class="border-t border-gray-100 p-4 space-y-3">
							{#each clubRequests() as club}
								<div class="rounded-lg border border-gray-200 bg-white">
									<div class="border-b border-gray-100 px-4 py-2">
										<h3 class="font-medium text-gray-900">{club.clubName}</h3>
									</div>
									<div class="grid grid-cols-4 divide-x divide-gray-100">
										{#each club.byRank as { rank, students }}
											<div class="p-3">
												<div class="mb-2 flex items-center gap-1">
													<span class="text-xs font-medium text-gray-500">
														{rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : '4th'}
													</span>
													<span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
														{students.length}
													</span>
												</div>
												{#if students.length === 0}
													<p class="text-xs text-gray-400 italic">none</p>
												{:else}
													<ul class="space-y-0.5">
														{#each students as name}
															<li class="truncate text-sm text-gray-700">{name}</li>
														{/each}
													</ul>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>
