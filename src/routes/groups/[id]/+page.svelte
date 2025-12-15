<script lang="ts">
	/**
	 * Activity detail page with inline group editing.
	 *
	 * This page serves as the workspace for editing groups, with:
	 * - Drag-and-drop group editing
	 * - Toggleable student sidebar showing preferences
	 * - Real-time analytics
	 * - Undo/redo support
	 * - Auto-save functionality
	 */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { ScenarioEditingStore, type ScenarioEditingView } from '$lib/stores/scenarioEditingStore';
	import { buildPreferenceMap } from '$lib/utils/preferenceAdapter';
	import type { Program, Pool, Scenario, Student, Preference, Group } from '$lib/domain';

	import EditingToolbar from '$lib/components/editing/EditingToolbar.svelte';
	import AnalyticsPanel from '$lib/components/editing/AnalyticsPanel.svelte';
	import UnassignedArea from '$lib/components/editing/UnassignedArea.svelte';
	import GroupEditingLayout from '$lib/components/editing/GroupEditingLayout.svelte';
	import ConfirmDialog from '$lib/components/editing/ConfirmDialog.svelte';
	import StudentSidebar from '$lib/components/workspace/StudentSidebar.svelte';
	import EmptyWorkspaceState from '$lib/components/workspace/EmptyWorkspaceState.svelte';
	import HistorySelector from '$lib/components/editing/HistorySelector.svelte';
	import type { ScenarioSatisfaction } from '$lib/domain';
	import GenerationErrorBanner from '$lib/components/workspace/GenerationErrorBanner.svelte';
	import { generateScenario, getActivityData } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import { buildAssignmentList, exportToCSV, exportToTSV, exportGroupsToCSV, copyToClipboard } from '$lib/utils/csvExport';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data (loaded on mount) ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let students = $state<Student[]>([]);
	let preferences = $state<Preference[]>([]);
	let scenario = $state<Scenario | null>(null);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Editing store (initialized when scenario exists) ---
	let editingStore: ScenarioEditingStore | null = $state(null);
	let view = $state<ScenarioEditingView | null>(null);

	// --- UI state ---
	let sidebarOpen = $state(false);
	let analyticsOpen = $state(false);
	let selectedStudentId = $state<string | null>(null);
	let draggingId = $state<string | null>(null);
	let flashingIds = $state<Set<string>>(new Set());
	let showStartOverConfirm = $state(false);
	let isRegenerating = $state(false);

	// --- Generation error state (from wizard redirect) ---
	let generationError = $state<string | null>(null);
	let isRetryingGeneration = $state(false);

	// --- Group shell editing state ---
	let newGroupId = $state<string | null>(null);
	let showDeleteGroupConfirm = $state(false);
	let groupToDelete = $state<{ id: string; name: string; memberCount: number } | null>(null);

	// --- Export menu state ---
	let showExportMenu = $state(false);

	// --- Result history state (session-only) ---
	interface HistoryEntry {
		id: string;
		groups: Group[];
		generatedAt: Date;
		analytics: ScenarioSatisfaction;
	}

	const MAX_HISTORY = 3;
	let resultHistory = $state<HistoryEntry[]>([]);
	let currentHistoryIndex = $state<number>(-1); // -1 = current (live), 0+ = history index
	let isTryingAnother = $state(false);
	let savedCurrentGroups = $state<Group[] | null>(null); // Stores current groups when viewing history

	// --- Toast ---
	let toastMessage = $state('');
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;

	// --- Derived ---
	let studentsById = $derived<Record<string, Student>>(
		Object.fromEntries(students.map((s) => [s.id, s]))
	);
	let preferenceMap = $derived(buildPreferenceMap(preferences));
	let preferencesCount = $derived(
		students.filter((s) => preferenceMap[s.id]?.likeGroupIds?.length > 0).length
	);

	onMount(async () => {
		env = getAppEnvContext();

		// Check for generation error from wizard redirect
		const errorParam = $page.url.searchParams.get('genError');
		if (errorParam) {
			generationError = errorParam;
			// Clean the URL without triggering navigation
			const cleanUrl = new URL($page.url);
			cleanUrl.searchParams.delete('genError');
			history.replaceState({}, '', cleanUrl.pathname);
		}

		await loadActivityData();
	});

	async function loadActivityData() {
		if (!env) return;

		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided.';
			loading = false;
			return;
		}

		const result = await getActivityData(env, { programId });

		if (isErr(result)) {
			if (result.error.type === 'PROGRAM_NOT_FOUND') {
				loadError = `Activity not found: ${programId}`;
			} else {
				loadError = result.error.message;
			}
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		pool = data.pool;
		students = data.students;
		preferences = data.preferences;
		scenario = data.scenario;

		if (scenario) {
			initializeEditingStore(scenario);
		}
		// Note: If no scenario, page shows EmptyWorkspaceState (edge case -
		// normally wizard auto-generates before redirecting here)

		loading = false;
	}

	function initializeEditingStore(s: Scenario) {
		editingStore = new ScenarioEditingStore({
			scenarioRepo: env!.scenarioRepo,
			idGenerator: env!.idGenerator
		});
		editingStore.initialize(s, preferences);
		editingStore.subscribe((value) => {
			view = value;
		});
	}

	// --- Generation Retry Handler ---

	async function handleRetryGeneration() {
		if (!env || !program) return;

		isRetryingGeneration = true;

		const result = await generateScenario(env, {
			programId: program.id
		});

		if (isErr(result)) {
			// Update error message with new error
			generationError = result.error.type;
			isRetryingGeneration = false;
			return;
		}

		// Success - initialize the editing store and clear error
		scenario = result.value;
		generationError = null;
		initializeEditingStore(result.value);
		isRetryingGeneration = false;
	}

	// --- Event Handlers ---

	function handleDrop(payload: { studentId: string; source: string; target: string }) {
		if (!editingStore) return;

		// Normalize source based on current state to avoid stale container IDs
		const currentSourceGroup = view?.groups.find((g) => g.memberIds.includes(payload.studentId));
		const normalizedSource = currentSourceGroup ? currentSourceGroup.id : 'unassigned';

		const result = editingStore.dispatch({
			type: 'MOVE_STUDENT',
			studentId: payload.studentId,
			source: normalizedSource,
			target: payload.target
		});

		if (!result.success) {
			showToast(result.reason === 'target_full' ? 'Group is at capacity' : 'Move not allowed');
		} else {
			flashStudent(payload.studentId);
		}
	}

	async function handleStartOver() {
		if (!env || !scenario || !editingStore) return;
		showStartOverConfirm = false;
		isRegenerating = true;

		const result = await env.groupingAlgorithm.generateGroups({
			programId: scenario.programId,
			studentIds: scenario.participantSnapshot,
			algorithmConfig: scenario.algorithmConfig
		});

		if (!result.success) {
			showToast('Regeneration failed');
			isRegenerating = false;
			return;
		}

		const groups: Group[] = result.groups.map((g) => ({
			id: g.id,
			name: g.name,
			capacity: g.capacity,
			memberIds: g.memberIds
		}));

		// Clear history when starting over
		resultHistory = [];
		currentHistoryIndex = -1;
		savedCurrentGroups = null;

		await editingStore.regenerate(groups);
		isRegenerating = false;
	}

	// --- History Functions ---

	function addToHistory(groups: Group[], analytics: ScenarioSatisfaction) {
		if (!env) return;
		
		const entry: HistoryEntry = {
			id: env.idGenerator.generateId(),
			groups: structuredClone(groups),
			generatedAt: new Date(),
			analytics
		};

		resultHistory = [entry, ...resultHistory].slice(0, MAX_HISTORY);
		currentHistoryIndex = -1; // Switch to current (new result)
	}

	function switchToHistoryEntry(index: number) {
		if (!editingStore) return;

		if (index === -1) {
			// Switch back to current (live) result
			if (savedCurrentGroups && currentHistoryIndex !== -1) {
				// Restore the saved current groups
				editingStore.regenerate(savedCurrentGroups);
				savedCurrentGroups = null;
			}
			currentHistoryIndex = -1;
			return;
		}

		if (index < 0 || index >= resultHistory.length) return;

		// Save current groups before switching to history (only once)
		if (currentHistoryIndex === -1 && view?.groups) {
			savedCurrentGroups = structuredClone(view.groups);
		}

		currentHistoryIndex = index;
		const entry = resultHistory[index];
		// Load groups into editing store, resetting undo history
		editingStore.regenerate(entry.groups);
	}

	async function handleTryAnother() {
		if (!env || !scenario || !editingStore) return;

		// Save current state to history before generating new
		const currentGroups = view?.groups ?? [];
		const currentAnalytics = view?.currentAnalytics;
		if (currentHistoryIndex === -1 && currentGroups.length > 0 && currentAnalytics) {
			addToHistory(currentGroups, currentAnalytics);
		}

		// Clear saved current groups since we're generating a new current
		savedCurrentGroups = null;

		isTryingAnother = true;

		// Generate with new seed for variation
		const existingConfig = (scenario.algorithmConfig as Record<string, unknown>) ?? {};
		const result = await env.groupingAlgorithm.generateGroups({
			programId: scenario.programId,
			studentIds: scenario.participantSnapshot,
			algorithmConfig: {
				...existingConfig,
				seed: Date.now()
			}
		});

		if (!result.success) {
			showToast('Generation failed');
			isTryingAnother = false;
			return;
		}

		const groups: Group[] = result.groups.map((g) => ({
			id: g.id,
			name: g.name,
			capacity: g.capacity,
			memberIds: g.memberIds
		}));

		await editingStore.regenerate(groups);
		isTryingAnother = false;
	}

	function metricSummary(): string {
		if (!view?.currentAnalytics) return '';
		const top = Math.round(view.currentAnalytics.percentAssignedTopChoice);
		if (view.analyticsDelta?.topChoice === undefined) return `${top}% top choice`;
		const delta = Math.round(view.analyticsDelta.topChoice);
		const arrow = delta >= 0 ? '↑' : '↓';
		return `${top}% top choice (${arrow}${Math.abs(delta)}%)`;
	}

	function selectStudent(id: string) {
		selectedStudentId = selectedStudentId === id ? null : id;
	}

	function flashStudent(id: string) {
		flashingIds = new Set([id]);
		setTimeout(() => {
			flashingIds = new Set();
		}, 500);
	}

	function showToast(message: string) {
		toastMessage = message;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastMessage = '';
			toastTimeout = null;
		}, 2000);
	}

	// --- Group Shell Operations ---

	function handleAddGroup() {
		if (!editingStore) return;

		const result = editingStore.createGroup();
		if (result.success && result.groupId) {
			newGroupId = result.groupId;
			// Clear newGroupId after a brief moment so the focus only happens once
			setTimeout(() => {
				newGroupId = null;
			}, 100);
		} else {
			showToast('Failed to create group');
		}
	}

	function handleUpdateGroup(groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) {
		if (!editingStore) return;

		const result = editingStore.updateGroup(groupId, changes);
		if (!result.success) {
			if (result.reason === 'duplicate_name') {
				showToast('A group with this name already exists');
			} else if (result.reason === 'empty_name') {
				// Silently ignore - component will revert
			}
		}
	}

	function handleDeleteGroup(groupId: string) {
		if (!editingStore || !view) return;

		const group = view.groups.find((g) => g.id === groupId);
		if (!group) return;

		// If group has students, show confirmation
		if (group.memberIds.length > 0) {
			groupToDelete = {
				id: groupId,
				name: group.name,
				memberCount: group.memberIds.length
			};
			showDeleteGroupConfirm = true;
		} else {
			// Empty group - delete immediately
			const result = editingStore.deleteGroup(groupId);
			if (!result.success) {
				showToast('Failed to delete group');
			}
		}
	}

	function confirmDeleteGroup() {
		if (!editingStore || !groupToDelete) return;

		const result = editingStore.deleteGroup(groupToDelete.id);
		if (!result.success) {
			showToast('Failed to delete group');
		}

		showDeleteGroupConfirm = false;
		groupToDelete = null;
	}

	function cancelDeleteGroup() {
		showDeleteGroupConfirm = false;
		groupToDelete = null;
	}

	// --- Export functions ---
	async function handleExportCSV() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const assignments = buildAssignmentList(view.groups, studentsMap);
		const csv = exportToCSV(assignments);
		const success = await copyToClipboard(csv);
		showToast(success ? 'CSV copied to clipboard!' : 'Failed to copy');
		showExportMenu = false;
	}

	async function handleExportTSV() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const assignments = buildAssignmentList(view.groups, studentsMap);
		const tsv = exportToTSV(assignments);
		const success = await copyToClipboard(tsv);
		showToast(success ? 'Copied! Paste directly into Google Sheets' : 'Failed to copy');
		showExportMenu = false;
	}

	async function handleExportGroupsSummary() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const csv = exportGroupsToCSV(view.groups, studentsMap);
		const success = await copyToClipboard(csv);
		showToast(success ? 'Groups summary copied!' : 'Failed to copy');
		showExportMenu = false;
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="flex h-screen flex-col">
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-gray-500">Loading activity...</p>
		</div>
	{:else if loadError}
		<div class="p-4">
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<p class="text-red-700">{loadError}</p>
				<a href="/groups" class="mt-2 inline-block text-sm text-blue-600 underline">
					← Back to activities
				</a>
			</div>
		</div>
	{:else if program}
		<!-- Header -->
		<header class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
			<div>
				<a href="/groups" class="text-sm text-gray-500 hover:text-gray-700">← All activities</a>
				<h1 class="text-xl font-semibold text-gray-900">{program.name}</h1>
			</div>
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					onclick={() => sidebarOpen = !sidebarOpen}
				>
					{sidebarOpen ? 'Hide Students' : 'Students'}
				</button>
				{#if scenario && view}
					<!-- Export dropdown -->
					<div class="relative">
						<button
							type="button"
							class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
							onclick={() => showExportMenu = !showExportMenu}
						>
							Export ▾
						</button>
						{#if showExportMenu}
							<div
								class="absolute right-0 z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
								role="menu"
							>
								<button
									type="button"
									class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
									onclick={handleExportTSV}
									role="menuitem"
								>
									Copy for Google Sheets
									<span class="block text-xs text-gray-500">Tab-separated, paste directly</span>
								</button>
								<button
									type="button"
									class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
									onclick={handleExportCSV}
									role="menuitem"
								>
									Copy as CSV
									<span class="block text-xs text-gray-500">Student ID, Name, Grade, Group</span>
								</button>
								<button
									type="button"
									class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
									onclick={handleExportGroupsSummary}
									role="menuitem"
								>
									Copy Groups Summary
									<span class="block text-xs text-gray-500">One row per group with members</span>
								</button>
								<div class="my-1 border-t border-gray-100"></div>
								<a
									href="/groups/{$page.params.id}/students"
									class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
									role="menuitem"
								>
									Student View
									<span class="block text-xs text-gray-500">Shareable read-only view</span>
								</a>
							</div>
							<!-- Backdrop to close menu -->
							<button
								type="button"
								class="fixed inset-0 z-10"
								onclick={() => showExportMenu = false}
								aria-label="Close menu"
							></button>
						{/if}
					</div>
				{/if}
			</div>
		</header>

		<!-- Main content area -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Workspace (main area) -->
			<main class="flex-1 overflow-y-auto p-4">
				{#if generationError && (!scenario || !view)}
					<!-- Generation failed - show error banner with retry option -->
					<div class="mx-auto max-w-2xl py-8">
						<GenerationErrorBanner
							errorType={generationError}
							isRetrying={isRetryingGeneration}
							onRetry={handleRetryGeneration}
							programId={program.id}
						/>
					</div>
				{:else if !scenario || !view}
					<EmptyWorkspaceState
						studentCount={students.length}
						{preferencesCount}
					/>
				{:else}
					<div class="mx-auto max-w-6xl space-y-4">
						<EditingToolbar
							canUndo={view.canUndo}
							canRedo={view.canRedo}
							saveStatus={view.saveStatus}
							lastSavedAt={view.lastSavedAt}
							metricSummary={metricSummary()}
							{analyticsOpen}
							{isRegenerating}
							{isTryingAnother}
							onUndo={() => editingStore?.undo()}
							onRedo={() => editingStore?.redo()}
							onStartOver={() => showStartOverConfirm = true}
							onTryAnother={handleTryAnother}
							onToggleAnalytics={() => analyticsOpen = !analyticsOpen}
							onRetrySave={() => editingStore?.retrySave()}
						/>

						<HistorySelector
							historyLength={resultHistory.length}
							currentIndex={currentHistoryIndex}
							onSelect={switchToHistoryEntry}
						/>

						<AnalyticsPanel
							open={analyticsOpen}
							baseline={view.baseline}
							current={view.currentAnalytics}
							delta={view.analyticsDelta}
						/>

						<UnassignedArea
							{studentsById}
							unassignedIds={view.unassignedStudentIds}
							{selectedStudentId}
							{draggingId}
							onDrop={handleDrop}
							onSelect={selectStudent}
							onDragStart={(id) => draggingId = id}
							onDragEnd={() => draggingId = null}
							{flashingIds}
						/>

						<GroupEditingLayout
							groups={view.groups}
							{studentsById}
							{selectedStudentId}
							{draggingId}
							onDrop={handleDrop}
							onSelect={selectStudent}
							onDragStart={(id) => draggingId = id}
							onDragEnd={() => draggingId = null}
							{flashingIds}
							onUpdateGroup={handleUpdateGroup}
							onDeleteGroup={handleDeleteGroup}
							onAddGroup={handleAddGroup}
							{newGroupId}
						/>
					</div>
				{/if}
			</main>

			<!-- Sidebar -->
			{#if sidebarOpen}
				<StudentSidebar
					{students}
					{preferenceMap}
					{selectedStudentId}
					onSelect={selectStudent}
					onClose={() => sidebarOpen = false}
				/>
			{/if}
		</div>

		<!-- Start Over confirmation dialog -->
		<ConfirmDialog
			open={showStartOverConfirm}
			title="Start over?"
			message="This will discard all manual edits and regenerate groups from scratch."
			confirmLabel="Start Over"
			onConfirm={handleStartOver}
			onCancel={() => { showStartOverConfirm = false; }}
		/>

		<!-- Delete Group confirmation dialog -->
		<ConfirmDialog
			open={showDeleteGroupConfirm}
			title="Delete group?"
			message={groupToDelete ? `"${groupToDelete.name}" has ${groupToDelete.memberCount} student${groupToDelete.memberCount !== 1 ? 's' : ''}. They will be moved to Unassigned.` : ''}
			confirmLabel="Delete"
			onConfirm={confirmDeleteGroup}
			onCancel={cancelDeleteGroup}
		/>

		<!-- Toast -->
		{#if toastMessage}
			<div class="fixed bottom-4 right-4 z-50 rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg">
				{toastMessage}
			</div>
		{/if}
	{/if}
</div>
