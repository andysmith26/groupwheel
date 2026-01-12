<script lang="ts">
	/**
	 * StepStudentsUnified.svelte
	 *
	 * Step 1 of the 3-step wizard: Add your students.
	 * Combines paste, roster reuse, and Google Sheets import into one view
	 * with collapsible sections.
	 *
	 * URL-first flow: When user is logged in, Google Sheets import is shown first
	 * with auto-detection of roster and responses tabs.
	 */

	import { devTools } from '$lib/stores/devTools.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ParsedStudent } from '$lib/application/useCases/createGroupingActivity';
	import { sampleRosters, sampleRosterById } from '$lib/content/sampleRosters';
	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData } from '$lib/domain/import';
	import type { Pool } from '$lib/domain';
	import TabSelector from '$lib/components/import/TabSelector.svelte';
	import SheetConnector from '$lib/components/import/SheetConnector.svelte';
	import {
		detectTabs,
		looksLikeRoster,
		looksLikeResponses,
		extractGroupNames,
		type ExtractedGroupInfo
	} from '$lib/utils/wizardSheetDetector';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { importFromSheetTab } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';

	type ImportSource = 'paste' | 'roster' | 'sheet';
	type StudentField = 'name' | 'id' | 'firstName' | 'lastName' | 'grade' | 'ignore' | null;

	interface RosterOption {
		pool: Pool;
		activityName: string;
		lastUsed: Date;
		studentCount: number;
	}

	/**
	 * Data detected from form responses tab.
	 * Passed to parent so Step 2 can pre-fill groups.
	 */
	export interface DetectedResponsesData {
		/** Raw sheet data from responses tab */
		responsesData: RawSheetData;
		/** Group names extracted from responses, in order of popularity */
		groupNames: string[];
		/** Tab that was detected as responses */
		responsesTab: SheetTab;
	}

	interface Props {
		students: ParsedStudent[];
		selectedRosterId: string | null;
		existingRosters: RosterOption[];
		sheetConnection: SheetConnection | null;
		userLoggedIn: boolean;
		onStudentsParsed: (students: ParsedStudent[]) => void;
		onRosterSelect: (poolId: string | null) => void;
		onSheetConnect?: (connection: SheetConnection) => void;
		onSheetDisconnect?: () => void;
		/** Called when responses tab is detected with group choices */
		onResponsesDetected?: (data: DetectedResponsesData | null) => void;
	}

	let {
		students,
		selectedRosterId,
		existingRosters,
		sheetConnection = null,
		userLoggedIn = false,
		onStudentsParsed,
		onRosterSelect,
		onSheetConnect,
		onSheetDisconnect,
		onResponsesDetected
	}: Props = $props();

	// Get app env context for fetching sheet data
	const env = getAppEnvContext();

	// Section expansion state - default to 'sheet' if user is logged in
	let expandedSection = $state<ImportSource>(userLoggedIn ? 'sheet' : 'paste');

	let pastedText = $state('');
	let parseError = $state('');
	let showFormatHelp = $state(false);
	let showSampleMenu = $state(false);
	let rosterQuery = $state('');

	// Sheet import state
	let selectedTab = $state<SheetTab | null>(null);
	let tabData = $state<RawSheetData | null>(null);
	let columnMappings = $state<Map<number, StudentField>>(new Map());
	let showMappingUI = $state(false);

	// Auto-detection state
	let isAutoDetecting = $state(false);
	let autoDetectMessage = $state('');
	let detectedRosterTab = $state<SheetTab | null>(null);
	let detectedResponsesTab = $state<SheetTab | null>(null);
	let detectedGroupNames = $state<string[]>([]);
	let allTabData = $state<Map<string, RawSheetData>>(new Map());

	// Derived
	let hasSheetConnection = $derived(sheetConnection !== null);
	let hasExistingRosters = $derived(existingRosters.length > 0);
	let hasRosterQuery = $derived.by(() => rosterQuery.trim().length > 0);
	const RECENT_ROSTER_COUNT = 3;
	let recentRosters = $derived.by(() => existingRosters.slice(0, RECENT_ROSTER_COUNT));
	let otherRosters = $derived.by(() => existingRosters.slice(RECENT_ROSTER_COUNT));
	let filteredRosters = $derived.by(() => {
		const query = rosterQuery.trim().toLowerCase();
		if (!query) return existingRosters;
		return existingRosters.filter((roster) => {
			const haystack = `${roster.activityName} ${roster.pool.name ?? ''}`.toLowerCase();
			return haystack.includes(query);
		});
	});

	// Field options for column mapping dropdown
	const fieldOptions: { value: StudentField; label: string }[] = [
		{ value: null, label: 'Select field...' },
		{ value: 'name', label: 'Full Name' },
		{ value: 'firstName', label: 'First Name' },
		{ value: 'lastName', label: 'Last Name' },
		{ value: 'id', label: 'ID / Email' },
		{ value: 'grade', label: 'Grade' },
		{ value: 'ignore', label: 'Ignore' }
	];

	// Format relative time
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
		return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
	}

	/**
	 * Smart guess for what a column contains based on header text.
	 */
	function guessColumnField(header: string): StudentField {
		const h = header.toLowerCase().trim();

		// ID / Email patterns
		if (h === 'email' || h === 'email address' || h.includes('email')) return 'id';
		if (h === 'id' || h === 'student id' || h === 'student_id' || h === 'studentid') return 'id';

		// Full name patterns
		if (h === 'name' || h === 'full name' || h === 'student name' || h === 'display name')
			return 'name';
		if (h.includes('first') && h.includes('last')) return 'name';
		if (h.includes('your') && h.includes('name')) return 'name';

		// First name patterns
		if (h === 'first name' || h === 'firstname' || h === 'first') return 'firstName';
		if (h === 'given name' || h === 'givenname') return 'firstName';

		// Last name patterns
		if (h === 'last name' || h === 'lastname' || h === 'last') return 'lastName';
		if (h === 'surname' || h === 'family name') return 'lastName';

		// Grade patterns
		if (h === 'grade' || h === 'grade level' || h === 'year' || h === 'class') return 'grade';

		// Ignore common non-student columns
		if (h === 'timestamp' || h.includes('timestamp')) return 'ignore';
		if (h === 'score' || h.includes('score')) return 'ignore';

		return null;
	}

	function handleSectionToggle(section: ImportSource) {
		expandedSection = section;
		if (section !== 'roster') {
			rosterQuery = '';
		}
		// Reset state when switching sections
		if (section === 'paste') {
			onRosterSelect(null);
			selectedTab = null;
			tabData = null;
			columnMappings = new Map();
			showMappingUI = false;
		} else if (section === 'roster') {
			pastedText = '';
			parseError = '';
			selectedTab = null;
			tabData = null;
			columnMappings = new Map();
			showMappingUI = false;
			onStudentsParsed([]);
		} else if (section === 'sheet') {
			onRosterSelect(null);
			pastedText = '';
			parseError = '';
			onStudentsParsed([]);
		}
	}

	function handleRosterSelect(poolId: string) {
		onRosterSelect(poolId);
	}

	function handleTabSelect(tab: SheetTab, data: RawSheetData) {
		selectedTab = tab;
		tabData = data;
		parseError = '';

		// Auto-guess column mappings
		const mappings = new Map<number, StudentField>();
		for (let i = 0; i < data.headers.length; i++) {
			const guessed = guessColumnField(data.headers[i]);
			mappings.set(i, guessed);
		}
		columnMappings = mappings;
		showMappingUI = true;
	}

	/**
	 * Auto-detect roster and responses tabs, then import students.
	 * Called when a sheet is connected.
	 */
	async function autoDetectAndImport(connection: SheetConnection) {
		if (!env) return;

		isAutoDetecting = true;
		autoDetectMessage = 'Analyzing spreadsheet tabs...';
		detectedRosterTab = null;
		detectedResponsesTab = null;
		detectedGroupNames = [];
		allTabData = new Map();

		try {
			// Load all tabs
			const tabDataMap = new Map<string, RawSheetData>();
			for (const tab of connection.tabs) {
				const result = await importFromSheetTab(env, {
					spreadsheetId: connection.spreadsheetId,
					tabTitle: tab.title
				});
				if (!isErr(result)) {
					tabDataMap.set(tab.gid, result.value);
				}
			}
			allTabData = tabDataMap;

			// Detect which tabs are roster and responses
			const detection = detectTabs(connection.tabs, tabDataMap);
			autoDetectMessage = detection.message;

			if (detection.rosterTab) {
				detectedRosterTab = detection.rosterTab;
				const rosterData = tabDataMap.get(detection.rosterTab.gid);

				if (rosterData) {
					// Auto-select this tab and set up column mappings
					selectedTab = detection.rosterTab;
					tabData = rosterData;

					const mappings = new Map<number, StudentField>();
					for (let i = 0; i < rosterData.headers.length; i++) {
						const guessed = guessColumnField(rosterData.headers[i]);
						mappings.set(i, guessed);
					}
					columnMappings = mappings;
					showMappingUI = true;

					// Auto-import if we have good mappings
					const hasName = Array.from(mappings.values()).includes('name');
					const hasFirstName = Array.from(mappings.values()).includes('firstName');
					const hasId = Array.from(mappings.values()).includes('id');
					if (hasName || hasFirstName || hasId) {
						parseSheetData(rosterData);
					}
				}
			}

			if (detection.responsesTab) {
				detectedResponsesTab = detection.responsesTab;
				const responsesData = tabDataMap.get(detection.responsesTab.gid);

				if (responsesData) {
					// Extract group names from responses
					const groupNames = extractGroupNames(responsesData);
					detectedGroupNames = groupNames;

					// Notify parent about detected responses
					if (groupNames.length > 0 && onResponsesDetected) {
						onResponsesDetected({
							responsesData,
							groupNames,
							responsesTab: detection.responsesTab
						});
					}
				}
			}

			// If no responses detected, clear any previous detection
			if (!detection.responsesTab && onResponsesDetected) {
				onResponsesDetected(null);
			}
		} catch (e) {
			autoDetectMessage = `Detection failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
		} finally {
			isAutoDetecting = false;
		}
	}

	/**
	 * Wrapper to handle sheet connection and trigger auto-detection.
	 */
	function handleSheetConnectWithAutoDetect(connection: SheetConnection) {
		onSheetConnect?.(connection);

		// Trigger auto-detection
		autoDetectAndImport(connection);
	}

	function handleMappingChange(columnIndex: number, field: StudentField) {
		const newMappings = new Map(columnMappings);
		newMappings.set(columnIndex, field);
		columnMappings = newMappings;
	}

	function getMappedColumnIndex(field: StudentField): number {
		for (const [idx, f] of columnMappings) {
			if (f === field) return idx;
		}
		return -1;
	}

	// Check if we have minimum required mappings
	let hasRequiredMappings = $derived(() => {
		const hasName = getMappedColumnIndex('name') >= 0;
		const hasFirstName = getMappedColumnIndex('firstName') >= 0;
		const hasId = getMappedColumnIndex('id') >= 0;
		return hasName || hasFirstName || hasId;
	});

	function importFromSheet() {
		if (!tabData) return;
		parseSheetData(tabData);
	}

	function parseSheetData(data: RawSheetData) {
		parseError = '';

		try {
			const nameIdx = getMappedColumnIndex('name');
			const firstNameIdx = getMappedColumnIndex('firstName');
			const lastNameIdx = getMappedColumnIndex('lastName');
			const idIdx = getMappedColumnIndex('id');
			const gradeIdx = getMappedColumnIndex('grade');

			if (nameIdx < 0 && firstNameIdx < 0 && idIdx < 0) {
				parseError = 'Please map at least one column to "Full Name", "First Name", or "ID / Email".';
				onStudentsParsed([]);
				return;
			}

			const parsed: ParsedStudent[] = [];
			const seenIds = new SvelteSet<string>();

			for (const row of data.rows) {
				const cells = row.cells;
				if (cells.every((c) => c === '')) continue;

				const rawName = nameIdx >= 0 ? (cells[nameIdx] ?? '').trim() : '';
				const rawFirstName = firstNameIdx >= 0 ? (cells[firstNameIdx] ?? '').trim() : '';
				const rawLastName = lastNameIdx >= 0 ? (cells[lastNameIdx] ?? '').trim() : '';
				const rawId = idIdx >= 0 ? (cells[idIdx] ?? '').trim() : '';
				const rawGrade = gradeIdx >= 0 ? (cells[gradeIdx] ?? '').trim() : undefined;

				let firstName = rawFirstName;
				let lastName = rawLastName;

				if (!firstName && rawName) {
					const nameParts = rawName.split(/\s+/);
					firstName = nameParts[0] ?? '';
					lastName = nameParts.slice(1).join(' ') ?? '';
				}

				const displayName = rawName || `${firstName} ${lastName}`.trim();
				const id = rawId || displayName.toLowerCase().replace(/\s+/g, '.');

				if (!id) continue;
				if (seenIds.has(id.toLowerCase())) continue;
				seenIds.add(id.toLowerCase());

				parsed.push({
					id: id.toLowerCase(),
					firstName,
					lastName,
					displayName: displayName || id,
					grade: rawGrade || undefined,
					meta: {}
				});
			}

			if (parsed.length === 0) {
				parseError = 'No valid student rows found. Check your column mappings.';
				onStudentsParsed([]);
				return;
			}

			onStudentsParsed(parsed);
		} catch (e) {
			parseError = `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			onStudentsParsed([]);
		}
	}

	function loadSampleData(rosterId: string) {
		const roster = sampleRosterById.get(rosterId);
		if (!roster) return;
		pastedText = roster.data;
		showSampleMenu = false;
		parseRoster();
	}

	function parseRoster() {
		parseError = '';

		if (!pastedText.trim()) {
			onStudentsParsed([]);
			return;
		}

		try {
			const lines = pastedText.trim().split('\n');
			if (lines.length < 2) {
				parseError = 'Need at least a header row and one student row.';
				onStudentsParsed([]);
				return;
			}

			const delimiter = lines[0].includes('\t') ? '\t' : ',';
			const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

			const nameIdx = headers.findIndex(
				(h) => h === 'name' || h === 'display name' || h === 'student name' || h === 'full name'
			);
			const idIdx = headers.findIndex(
				(h) => h === 'id' || h === 'email' || h === 'student id' || h === 'student_id'
			);

			if (nameIdx === -1 && idIdx === -1) {
				parseError =
					'Could not find "name" or "id" columns. Make sure your header row includes these.';
				onStudentsParsed([]);
				return;
			}

			const gradeIdx = headers.findIndex((h) => h === 'grade' || h === 'grade level');

			const parsed: ParsedStudent[] = [];
			const seenIds = new SvelteSet<string>();

			for (let i = 1; i < lines.length; i++) {
				const cells = lines[i].split(delimiter).map((c) => c.trim());
				if (cells.every((c) => c === '')) continue;

				const rawName = nameIdx >= 0 ? (cells[nameIdx] ?? '') : '';
				const rawId = idIdx >= 0 ? (cells[idIdx] ?? '') : '';
				const rawGrade = gradeIdx >= 0 ? (cells[gradeIdx] ?? '') : undefined;

				const id = rawId || rawName.toLowerCase().replace(/\s+/g, '.');
				if (!id) continue;
				if (seenIds.has(id.toLowerCase())) continue;
				seenIds.add(id.toLowerCase());

				const nameParts = rawName.split(/\s+/);
				const firstName = nameParts[0] ?? '';
				const lastName = nameParts.slice(1).join(' ') ?? '';

				parsed.push({
					id: id.toLowerCase(),
					firstName,
					lastName,
					displayName: rawName || id,
					grade: rawGrade,
					meta: {}
				});
			}

			if (parsed.length === 0) {
				parseError = 'No valid student rows found. Check your data format.';
				onStudentsParsed([]);
				return;
			}

			onStudentsParsed(parsed);
		} catch (e) {
			parseError = `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			onStudentsParsed([]);
		}
	}

	// Derived state for detected columns display
	let detectedColumns = $derived.by(() => {
		if (students.length === 0) return '';
		const cols: string[] = ['Name', 'ID'];
		if (students.some((s) => s.grade)) cols.push('Grade');
		return cols.join(', ');
	});

	function handlePaste() {
		setTimeout(parseRoster, 10);
	}

	// Check if current section has valid data
	let hasValidStudents = $derived(students.length > 0 || selectedRosterId !== null);
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Step 1 of 3: Add Your Students</h2>
		<p class="mt-1 text-sm text-gray-600">
			Choose how you'd like to add your students.
		</p>
	</div>

	<!-- Radio-card selection options -->
	<div class="space-y-3">
		<!-- Paste from spreadsheet -->
		<div class="rounded-xl border-2 overflow-hidden transition-colors {expandedSection === 'paste'
			? 'border-teal bg-teal-light/30'
			: 'border-gray-200 hover:border-gray-300'}">
			<button
				type="button"
				role="radio"
				aria-checked={expandedSection === 'paste' ? 'true' : 'false'}
				class="flex w-full items-center gap-4 p-4 text-left"
				onclick={() => handleSectionToggle('paste')}
			>
				<div class="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 {expandedSection === 'paste'
					? 'bg-teal/20'
					: 'bg-gray-100'}">
					<svg class="h-5 w-5 {expandedSection === 'paste' ? 'text-teal' : 'text-gray-600'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2">
						<span class="font-medium {expandedSection === 'paste' ? 'text-teal-dark' : 'text-gray-900'}">
							Paste from spreadsheet
						</span>
						{#if expandedSection === 'paste'}
							<svg class="h-5 w-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						{/if}
					</div>
					<p class="mt-0.5 text-sm {expandedSection === 'paste' ? 'text-teal-dark/80' : 'text-gray-500'}">
						Copy rows directly from Google Sheets or Excel
					</p>
				</div>
			</button>

			{#if expandedSection === 'paste'}
				<div class="p-4 space-y-4 border-t border-teal/20">
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<label class="block text-sm font-medium text-gray-700" for="roster-paste">
								Copy rows from Google Sheets
							</label>
							{#if devTools.enabled}
								<div class="relative">
									<button
										type="button"
										class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
										onclick={() => (showSampleMenu = !showSampleMenu)}
									>
										Load sample data
									</button>
									{#if showSampleMenu}
										<div
											class="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
										>
											{#each sampleRosters as roster}
												<button
													type="button"
													class="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
													onclick={() => loadSampleData(roster.id)}
												>
													<div class="font-medium text-gray-900">{roster.label}</div>
													<div class="text-xs text-gray-500">{roster.description}</div>
												</button>
											{/each}
										</div>
										<button
											type="button"
											class="fixed inset-0 z-10 cursor-default"
											aria-label="Close sample menu"
											onclick={() => (showSampleMenu = false)}
										></button>
									{/if}
								</div>
							{/if}
						</div>

						<textarea
							id="roster-paste"
							class="h-32 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal"
							bind:value={pastedText}
							onpaste={handlePaste}
							oninput={parseRoster}
							placeholder="name	id	grade
Alice Smith	alice@school.edu	9
Bob Jones	bob@school.edu	9"
						></textarea>
					</div>

					<!-- Format help toggle -->
					<div>
						<button
							type="button"
							class="flex items-center gap-1 text-sm text-teal hover:text-teal-dark"
							onclick={() => (showFormatHelp = !showFormatHelp)}
						>
							<span class="text-xs">{showFormatHelp ? '▼' : '▸'}</span>
							What format works?
						</button>

						{#if showFormatHelp}
							<div
								class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
							>
								<p class="mb-2">Copy rows from Google Sheets with columns for:</p>
								<ul class="ml-4 list-disc space-y-1">
									<li><strong>name</strong> (or "display name", "student name")</li>
									<li><strong>id</strong> (or "email", "student id") — unique identifier</li>
									<li><strong>grade</strong> (optional)</li>
								</ul>
								<p class="mt-2 text-xs text-gray-500">
									Tab-separated format from Google Sheets works best.
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Use existing roster -->
		{#if hasExistingRosters}
			<div class="rounded-xl border-2 overflow-hidden transition-colors {expandedSection === 'roster'
				? 'border-teal bg-teal-light/30'
				: 'border-gray-200 hover:border-gray-300'}">
				<button
					type="button"
					role="radio"
					aria-checked={expandedSection === 'roster' ? 'true' : 'false'}
					class="flex w-full items-center gap-4 p-4 text-left"
					onclick={() => handleSectionToggle('roster')}
				>
					<div class="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 {expandedSection === 'roster'
						? 'bg-teal/20'
						: 'bg-gray-100'}">
						<svg class="h-5 w-5 {expandedSection === 'roster' ? 'text-teal' : 'text-gray-600'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span class="font-medium {expandedSection === 'roster' ? 'text-teal-dark' : 'text-gray-900'}">
								Use existing roster
							</span>
							<span class="text-sm {expandedSection === 'roster' ? 'text-teal-dark/70' : 'text-gray-500'}">
								({existingRosters.length} saved)
							</span>
							{#if expandedSection === 'roster'}
								<svg class="h-5 w-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
							{/if}
						</div>
						<p class="mt-0.5 text-sm {expandedSection === 'roster' ? 'text-teal-dark/80' : 'text-gray-500'}">
							Reuse students from a previous activity
						</p>
					</div>
				</button>

				{#if expandedSection === 'roster'}
					<div class="p-4 space-y-3 border-t border-teal/20">
						<div>
							<label class="block text-sm font-medium text-gray-700" for="roster-search">
								Search rosters
							</label>
							<input
								id="roster-search"
								type="text"
								class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
								placeholder="Search by activity or roster name"
								bind:value={rosterQuery}
							/>
						</div>

						<div class="max-h-72 overflow-y-auto space-y-3 pr-1">
							{#if hasRosterQuery}
								{#if filteredRosters.length === 0}
									<p class="text-sm text-gray-500">
										No rosters match "{rosterQuery}"
									</p>
								{:else}
									<div class="space-y-2">
										<p class="text-xs font-medium uppercase tracking-wide text-gray-500">
											Results
										</p>
										{#each filteredRosters as roster (roster.pool.id)}
											<label
												class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors
													{selectedRosterId === roster.pool.id
													? 'border-teal bg-teal-light ring-1 ring-teal'
													: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
											>
												<input
													type="radio"
													name="roster-choice"
													checked={selectedRosterId === roster.pool.id}
													onchange={() => handleRosterSelect(roster.pool.id)}
													class="mt-0.5 h-4 w-4 text-teal accent-teal"
												/>
												<div class="flex-1">
													<div class="flex items-center justify-between">
														<span class="font-medium text-gray-900">
															{roster.activityName}
														</span>
														<span class="text-xs text-gray-500">
															{formatRelativeTime(roster.lastUsed)}
														</span>
													</div>
													<p class="mt-0.5 text-sm text-gray-600">
														{roster.studentCount} students
													</p>
												</div>
											</label>
										{/each}
									</div>
								{/if}
							{:else}
								{#if recentRosters.length > 0}
									<div class="space-y-2">
										<p class="text-xs font-medium uppercase tracking-wide text-gray-500">
											Recent
										</p>
										{#each recentRosters as roster (roster.pool.id)}
											<label
												class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors
													{selectedRosterId === roster.pool.id
													? 'border-teal bg-teal-light ring-1 ring-teal'
													: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
											>
												<input
													type="radio"
													name="roster-choice"
													checked={selectedRosterId === roster.pool.id}
													onchange={() => handleRosterSelect(roster.pool.id)}
													class="mt-0.5 h-4 w-4 text-teal accent-teal"
												/>
												<div class="flex-1">
													<div class="flex items-center justify-between">
														<span class="font-medium text-gray-900">
															{roster.activityName}
														</span>
														<span class="text-xs text-gray-500">
															{formatRelativeTime(roster.lastUsed)}
														</span>
													</div>
													<p class="mt-0.5 text-sm text-gray-600">
														{roster.studentCount} students
													</p>
												</div>
											</label>
										{/each}
									</div>
								{/if}

								{#if otherRosters.length > 0}
									<div class="space-y-2">
										<p class="text-xs font-medium uppercase tracking-wide text-gray-500">
											All rosters
										</p>
										{#each otherRosters as roster (roster.pool.id)}
											<label
												class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors
													{selectedRosterId === roster.pool.id
													? 'border-teal bg-teal-light ring-1 ring-teal'
													: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
											>
												<input
													type="radio"
													name="roster-choice"
													checked={selectedRosterId === roster.pool.id}
													onchange={() => handleRosterSelect(roster.pool.id)}
													class="mt-0.5 h-4 w-4 text-teal accent-teal"
												/>
												<div class="flex-1">
													<div class="flex items-center justify-between">
														<span class="font-medium text-gray-900">
															{roster.activityName}
														</span>
														<span class="text-xs text-gray-500">
															{formatRelativeTime(roster.lastUsed)}
														</span>
													</div>
													<p class="mt-0.5 text-sm text-gray-600">
														{roster.studentCount} students
													</p>
												</div>
											</label>
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Import from Google Sheets -->
		{#if userLoggedIn}
			<div class="rounded-xl border-2 overflow-hidden transition-colors {expandedSection === 'sheet'
				? 'border-teal bg-teal-light/30'
				: 'border-gray-200 hover:border-gray-300'}">
				<button
					type="button"
					role="radio"
					aria-checked={expandedSection === 'sheet' ? 'true' : 'false'}
					class="flex w-full items-center gap-4 p-4 text-left"
					onclick={() => handleSectionToggle('sheet')}
				>
					<div class="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 {expandedSection === 'sheet'
						? 'bg-teal/20'
						: 'bg-gray-100'}">
						<svg class="h-5 w-5 {expandedSection === 'sheet' ? 'text-teal' : 'text-gray-600'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span class="font-medium {expandedSection === 'sheet' ? 'text-teal-dark' : 'text-gray-900'}">
								Import from Google Sheets
							</span>
							<span class="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral">
								Recommended
							</span>
							{#if expandedSection === 'sheet'}
								<svg class="h-5 w-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
							{/if}
						</div>
						<p class="mt-0.5 text-sm {expandedSection === 'sheet' ? 'text-teal-dark/80' : 'text-gray-500'}">
							Paste a Google Sheets URL to auto-detect roster and groups
						</p>
					</div>
				</button>

				{#if expandedSection === 'sheet'}
					<div class="p-4 space-y-4 border-t border-teal/20">
						{#if hasSheetConnection && sheetConnection}
							<div
								class="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3"
							>
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
									<span class="text-sm font-medium text-green-800">
										Connected: {sheetConnection.title}
									</span>
									<span class="text-xs text-green-600">
										({sheetConnection.tabs.length} tabs)
									</span>
								</div>
								{#if onSheetDisconnect}
									<button
										type="button"
										onclick={onSheetDisconnect}
										class="text-sm text-green-700 hover:text-green-900"
									>
										Disconnect
									</button>
								{/if}
							</div>

							<!-- Auto-detection status -->
							{#if isAutoDetecting}
								<div class="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
									<svg class="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									<span class="text-sm text-blue-700">{autoDetectMessage}</span>
								</div>
							{:else if autoDetectMessage && (detectedRosterTab || detectedResponsesTab)}
								<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
									<p class="text-sm font-medium text-blue-800">{autoDetectMessage}</p>
									{#if detectedGroupNames.length > 0}
										<div class="mt-2 flex flex-wrap items-center gap-2">
											<span class="text-xs text-blue-600">Groups detected:</span>
											{#each detectedGroupNames.slice(0, 5) as groupName}
												<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
													{groupName}
												</span>
											{/each}
											{#if detectedGroupNames.length > 5}
												<span class="text-xs text-blue-600">+{detectedGroupNames.length - 5} more</span>
											{/if}
										</div>
										<p class="mt-2 text-xs text-blue-600">
											These groups will be available in Step 2.
										</p>
									{/if}
								</div>
							{/if}

							<TabSelector
								connection={sheetConnection}
								onTabSelect={handleTabSelect}
								label="Select tab with student roster"
								{selectedTab}
							/>

							<!-- Column mapping UI -->
							{#if showMappingUI && tabData}
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<p class="text-sm font-medium text-gray-700">Map columns to student fields:</p>
										<p class="text-xs text-gray-500">
											{#if hasRequiredMappings()}
												<span class="text-green-600">Ready to import</span>
											{:else}
												<span class="text-amber-600">Map at least name or email</span>
											{/if}
										</p>
									</div>

									<!-- Column mapping table -->
									<div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
										<table class="w-full text-sm">
											<thead>
												<tr class="border-b border-gray-200 bg-white">
													{#each tabData.headers as _, colIndex}
														<th class="min-w-[130px] px-2 py-2">
															<select
																class="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-teal focus:ring-1 focus:ring-teal {columnMappings.get(
																	colIndex
																) === null
																	? 'text-gray-400'
																	: 'text-gray-900'}"
																value={columnMappings.get(colIndex) ?? ''}
																onchange={(e) => {
																	const val = (e.target as HTMLSelectElement).value;
																	handleMappingChange(
																		colIndex,
																		val === '' ? null : (val as StudentField)
																	);
																}}
															>
																{#each fieldOptions as option}
																	<option value={option.value ?? ''}>{option.label}</option>
																{/each}
															</select>
														</th>
													{/each}
												</tr>

												<tr class="border-b border-gray-300 bg-gray-50">
													{#each tabData.headers as header, colIndex}
														{@const mapping = columnMappings.get(colIndex)}
														<th
															class="px-2 py-1.5 text-left text-xs font-medium {mapping &&
															mapping !== 'ignore'
																? 'text-teal-700'
																: mapping === 'ignore'
																	? 'text-gray-400'
																	: 'text-gray-600'}"
														>
															<span class="truncate block max-w-[120px]" title={header}
																>{header}</span
															>
														</th>
													{/each}
												</tr>
											</thead>

											<tbody>
												{#each tabData.rows.slice(0, 3) as row, rowIdx}
													<tr
														class="border-b border-gray-100 {rowIdx % 2 === 0
															? 'bg-white'
															: 'bg-gray-50/50'}"
													>
														{#each row.cells as cell, colIndex}
															{@const mapping = columnMappings.get(colIndex)}
															<td
																class="max-w-[120px] truncate px-2 py-1.5 text-xs {mapping ===
																'ignore'
																	? 'text-gray-300'
																	: 'text-gray-600'}"
																title={cell}
															>
																{cell || '—'}
															</td>
														{/each}
													</tr>
												{/each}
											</tbody>
										</table>

										{#if tabData.rows.length > 3}
											<div
												class="border-t border-gray-200 bg-gray-50 px-3 py-1.5 text-center text-xs text-gray-500"
											>
												+{tabData.rows.length - 3} more rows
											</div>
										{/if}
									</div>

									<button
										type="button"
										onclick={importFromSheet}
										disabled={!hasRequiredMappings()}
										class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Import {tabData.rows.length} Students
									</button>
								</div>
							{/if}
						{:else}
							{#if onSheetConnect}
								<SheetConnector
									onConnect={handleSheetConnectWithAutoDetect}
									existingConnection={sheetConnection}
									allowDisconnect={false}
								/>
							{:else}
								<p class="text-sm text-gray-600">
									Sheet connection is not available.
								</p>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Parse error -->
	{#if parseError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-3">
			<p class="text-sm text-red-700">{parseError}</p>
		</div>
	{/if}

	<!-- Student preview (shown when students parsed or roster selected) -->
	{#if students.length > 0}
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
				<div class="flex items-center gap-2">
					<span class="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
						<svg
							class="h-3 w-3 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
					</span>
					<span class="font-medium text-gray-900">{students.length} students detected</span>
				</div>
				{#if detectedColumns}
					<span class="text-xs text-gray-500">Detected: {detectedColumns}</span>
				{/if}
			</div>

			<div class="max-h-48 overflow-y-auto">
				<table class="w-full text-sm">
					<thead class="sticky top-0 bg-gray-50">
						<tr class="border-b border-gray-200">
							<th class="px-4 py-2 text-left font-medium text-gray-700">Name</th>
							<th class="px-4 py-2 text-left font-medium text-gray-700">ID</th>
							{#if students.some((s) => s.grade)}
								<th class="px-4 py-2 text-left font-medium text-gray-700">Grade</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each students.slice(0, 8) as student, i (student.id)}
							<tr class="border-b border-gray-100 {i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
								<td class="px-4 py-2 text-gray-900">{student.displayName}</td>
								<td class="px-4 py-2 font-mono text-xs text-gray-600">{student.id}</td>
								{#if students.some((s) => s.grade)}
									<td class="px-4 py-2 text-gray-600">{student.grade ?? '—'}</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>

				{#if students.length > 8}
					<div
						class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-center text-xs text-gray-500"
					>
						...and {students.length - 8} more students
					</div>
				{/if}
			</div>
		</div>
	{:else if selectedRosterId !== null}
		<!-- Show selected roster info -->
		{@const selectedRoster = existingRosters.find((r) => r.pool.id === selectedRosterId)}
		{#if selectedRoster}
			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<div class="flex items-center gap-2">
					<span class="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
						<svg
							class="h-3 w-3 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
					</span>
					<span class="font-medium text-green-800">
						Using {selectedRoster.studentCount} students from "{selectedRoster.activityName}"
					</span>
				</div>
			</div>
		{/if}
	{/if}
</div>
