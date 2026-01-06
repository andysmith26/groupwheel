<script lang="ts">
	/**
	 * /activities/[id]/workspace/+page.svelte
	 *
	 * Workspace - The main group editing interface.
	 * Features drag-and-drop editing, undo/redo, and analytics.
	 * Part of the UX Overhaul (Approach C).
	 *
	 * This is adapted from the original /groups/[id]/+page.svelte
	 */
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import {
		ScenarioEditingStore,
		type ScenarioEditingView,
		type SaveStatus
	} from '$lib/stores/scenarioEditingStore';
	import { buildPreferenceMap } from '$lib/utils/preferenceAdapter';
	import type { Program, Pool, Scenario, Student, Preference, Group } from '$lib/domain';

	import EditingToolbar from '$lib/components/editing/EditingToolbar.svelte';
	import AnalyticsPanel from '$lib/components/editing/AnalyticsPanel.svelte';
	import UnassignedArea from '$lib/components/editing/UnassignedArea.svelte';
	import GroupEditingLayout, {
		type LayoutMode
	} from '$lib/components/editing/GroupEditingLayout.svelte';
	import ConfirmDialog from '$lib/components/editing/ConfirmDialog.svelte';
	import StudentSidebar from '$lib/components/workspace/StudentSidebar.svelte';
	import EmptyWorkspaceState from '$lib/components/workspace/EmptyWorkspaceState.svelte';
	import HistorySelector from '$lib/components/editing/HistorySelector.svelte';
	import type { ScenarioSatisfaction } from '$lib/domain';
	import GenerationErrorBanner from '$lib/components/workspace/GenerationErrorBanner.svelte';
	import WorkspaceHeader from '$lib/components/workspace/WorkspaceHeader.svelte';
	import ShowToClassPrompt from '$lib/components/workspace/ShowToClassPrompt.svelte';
	import StudentInfoTooltip from '$lib/components/editing/StudentInfoTooltip.svelte';
	import {
		generateScenario,
		getActivityData,
		createSession,
		publishSession,
		renameActivity
	} from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Session } from '$lib/domain';
	import PublishSessionModal from '$lib/components/editing/PublishSessionModal.svelte';
	import {
		buildAssignmentList,
		exportToCSV,
		exportToTSV,
		exportGroupsToCSV
	} from '$lib/utils/csvExport';
	import { computeAnalyticsSync } from '$lib/application/useCases/computeAnalyticsSync';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data (loaded on mount) ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let students = $state<Student[]>([]);
	let preferences = $state<Preference[]>([]);
	let scenario = $state<Scenario | null>(null);
	let sessions = $state<Session[]>([]);
	let latestPublishedSession = $state<Session | null>(null);

	// --- Publish modal state ---
	let showPublishModal = $state(false);
	let isPublishing = $state(false);
	let publishError = $state<string | null>(null);

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

	// --- Post-creation guidance banner (from wizard redirect) ---
	let showGuidanceBanner = $state(false);
	let bannerDismissed = $state(false);

	// --- Group shell editing state ---
	let newGroupId = $state<string | null>(null);
	let showDeleteGroupConfirm = $state(false);
	let groupToDelete = $state<{ id: string; name: string; memberCount: number } | null>(null);

	// --- Export menu state ---
	let showExportMenu = $state(false);

	// --- Show to class prompt state ---
	let showShowToClassPrompt = $state(false);
	let showToClassPublishing = $state(false);
	let showToClassError = $state<string | null>(null);

	// --- Student tooltip state ---
	let tooltipStudentId = $state<string | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let dragCooldown = $state(false); // Brief cooldown after drag to prevent spurious tooltips

	// --- Keyboard handler cleanup ---
	let keyboardCleanup: (() => void) | null = null;

	// --- Layout mode ---
	let layoutMode = $state<LayoutMode>('masonry');

	// --- Result history state (session-only) ---
	interface HistoryEntry {
		id: string;
		groups: Group[];
		generatedAt: Date;
		analytics: ScenarioSatisfaction;
	}

	const MAX_HISTORY = 3;
	let resultHistory = $state<HistoryEntry[]>([]);
	let currentHistoryIndex = $state<number>(-1);
	let isTryingAnother = $state(false);
	let savedCurrentGroups = $state<Group[] | null>(null);

	// --- Toast ---
	let toastMessage = $state('');
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastSaveStatus = $state<SaveStatus | null>(null);

	// --- Derived ---
	let studentsById = $derived<Record<string, Student>>(
		Object.fromEntries(students.map((s) => [s.id, s]))
	);
	let preferenceMap = $derived(buildPreferenceMap(preferences));
	let preferencesCount = $derived(
		students.filter((s) => preferenceMap[s.id]?.likeGroupIds?.length > 0).length
	);

	// Detect if scenario has been edited since last publish
	let hasEditsSincePublish = $derived.by(() => {
		if (!view?.lastModifiedAt || !latestPublishedSession?.publishedAt) {
			return true; // No publish yet or no scenario, so treat as "has edits"
		}
		return view.lastModifiedAt > latestPublishedSession.publishedAt;
	});

	let activeStudentId = $derived(draggingId ?? selectedStudentId);

	let activeStudentPreferences = $derived.by(() => {
		if (!activeStudentId || !view) return null;
		const groupNamePrefs = preferenceMap[activeStudentId]?.likeGroupIds ?? null;
		if (!groupNamePrefs || groupNamePrefs.length === 0) return null;

		const nameToId = new Map(view.groups.map((g) => [g.name, g.id]));
		const groupIdPrefs = groupNamePrefs
			.map((name) => nameToId.get(name))
			.filter((id): id is string => id !== undefined);

		return groupIdPrefs.length > 0 ? groupIdPrefs : null;
	});

	// --- Tooltip student data ---
	let tooltipStudent = $derived(tooltipStudentId ? studentsById[tooltipStudentId] ?? null : null);
	let tooltipPreferences = $derived(
		tooltipStudentId ? preferenceMap[tooltipStudentId] ?? null : null
	);
	let tooltipCurrentGroup = $derived.by(() => {
		if (!tooltipStudentId || !view) return null;
		const group = view.groups.find((g) => g.memberIds.includes(tooltipStudentId!));
		return group?.name ?? null;
	});
	let tooltipPreferenceRank = $derived.by(() => {
		if (!tooltipStudentId || !tooltipPreferences?.likeGroupIds || !tooltipCurrentGroup) {
			return null;
		}
		const rank = tooltipPreferences.likeGroupIds.indexOf(tooltipCurrentGroup);
		return rank >= 0 ? rank + 1 : null;
	});

	// --- Compute preference ranks for all students ---
	let studentPreferenceRanks = $derived.by(() => {
		if (!view) return new Map<string, number | null>();
		const ranks = new Map<string, number | null>();

		for (const group of view.groups) {
			for (const studentId of group.memberIds) {
				const prefs = preferenceMap[studentId]?.likeGroupIds;
				if (!prefs || prefs.length === 0) {
					ranks.set(studentId, null);
					continue;
				}
				const rank = prefs.indexOf(group.name);
				ranks.set(studentId, rank >= 0 ? rank + 1 : null);
			}
		}

		return ranks;
	});

	onMount(async () => {
		env = getAppEnvContext();

		// Check for generation error flag
		const errorParam = $page.url.searchParams.get('genError');
		if (errorParam) {
			generationError = errorParam;
			const cleanUrl = new URL($page.url);
			cleanUrl.searchParams.delete('genError');
			history.replaceState({}, '', cleanUrl.pathname);
		}

		// Check for post-creation banner flag
		const bannerParam = $page.url.searchParams.get('showBanner');
		if (bannerParam === 'true') {
			showGuidanceBanner = true;
			const cleanUrl = new URL($page.url);
			cleanUrl.searchParams.delete('showBanner');
			history.replaceState({}, '', cleanUrl.pathname);
		}

		// Set up keyboard shortcuts for undo/redo
		function handleKeydown(event: KeyboardEvent) {
			// Skip if user is typing in an input field
			const target = event.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
				return;
			}

			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const modKey = isMac ? event.metaKey : event.ctrlKey;

			if (modKey && event.key === 'z') {
				if (event.shiftKey) {
					// Redo: Cmd/Ctrl+Shift+Z
					event.preventDefault();
					editingStore?.redo();
				} else {
					// Undo: Cmd/Ctrl+Z
					event.preventDefault();
					editingStore?.undo();
				}
			}
		}

		document.addEventListener('keydown', handleKeydown);
		keyboardCleanup = () => document.removeEventListener('keydown', handleKeydown);

		await loadActivityData();
	});

	onDestroy(() => {
		keyboardCleanup?.();
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
		sessions = data.sessions;
		latestPublishedSession = data.latestPublishedSession;

		if (!scenario) {
			// No groups yet - redirect to setup
			goto(`/activities/${programId}/setup`);
			return;
		}

		initializeEditingStore(scenario);
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

	async function handleRetryGeneration() {
		if (!env || !program) return;

		isRetryingGeneration = true;

		const result = await generateScenario(env, {
			programId: program.id
		});

		if (isErr(result)) {
			generationError = result.error.type;
			isRetryingGeneration = false;
			return;
		}

		scenario = result.value;
		generationError = null;
		initializeEditingStore(result.value);
		isRetryingGeneration = false;
	}

	function handleDrop(payload: { studentId: string; source: string; target: string }) {
		if (!editingStore) return;

		const currentSourceGroup = view?.groups.find((g) => g.memberIds.includes(payload.studentId));
		const normalizedSource = currentSourceGroup ? currentSourceGroup.id : 'unassigned';

		const result = editingStore.dispatch({
			type: 'MOVE_STUDENT',
			studentId: payload.studentId,
			source: normalizedSource,
			target: payload.target
		});

		if (!result.success) {
			if (result.reason === 'target_full') {
				showToast('Group is at capacity');
			} else if (result.reason === 'save_failed') {
				showToast('Save failed. Retry the save, then move students again.');
			} else {
				showToast('Move not allowed');
			}
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

		resultHistory = [];
		currentHistoryIndex = -1;
		savedCurrentGroups = null;

		await editingStore.regenerate(groups);
		isRegenerating = false;
	}

	function addToHistory(groups: Group[], analytics: ScenarioSatisfaction) {
		if (!env) return;

		const entry: HistoryEntry = {
			id: env.idGenerator.generateId(),
			groups: structuredClone(groups),
			generatedAt: new Date(),
			analytics
		};

		resultHistory = [entry, ...resultHistory].slice(0, MAX_HISTORY);
		currentHistoryIndex = -1;
	}

	function switchToHistoryEntry(index: number) {
		if (!editingStore) return;

		if (index === -1) {
			if (savedCurrentGroups && currentHistoryIndex !== -1) {
				editingStore.regenerate(savedCurrentGroups);
				savedCurrentGroups = null;
			}
			currentHistoryIndex = -1;
			return;
		}

		if (index < 0 || index >= resultHistory.length) return;

		if (currentHistoryIndex === -1 && view?.groups) {
			savedCurrentGroups = structuredClone(view.groups);
		}

		currentHistoryIndex = index;
		const entry = resultHistory[index];
		editingStore.regenerate(entry.groups);
	}

	async function handleTryAnother() {
		if (!env || !scenario || !editingStore) return;

		const currentGroups = view?.groups ?? scenario.groups ?? [];
		let currentAnalytics = view?.currentAnalytics ?? view?.baseline;
		if (!currentAnalytics && scenario) {
			currentAnalytics = computeAnalyticsSync({
				groups: currentGroups,
				preferences,
				participantSnapshot: scenario.participantSnapshot,
				programId: scenario.programId
			});
		}
		if (currentHistoryIndex === -1 && currentGroups.length > 0 && currentAnalytics) {
			addToHistory(currentGroups, currentAnalytics);
		}

		savedCurrentGroups = null;
		isTryingAnother = true;

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

	$effect(() => {
		const status = view?.saveStatus ?? null;
		const error = view?.saveError ?? null;

		if (status && status !== lastSaveStatus) {
			if (status === 'failed') {
				showToast(error ? `Save failed: ${error}` : 'Save failed. Please retry.');
				console.error('Scenario save failed', { error });
			} else if (status === 'error' && error) {
				console.warn('Scenario auto-save retrying after error', { error });
			}
		}

		lastSaveStatus = status;
	});

	function handleAddGroup() {
		if (!editingStore) return;

		const result = editingStore.createGroup();
		if (result.success && result.groupId) {
			newGroupId = result.groupId;
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
			}
		}
	}

	function handleDeleteGroup(groupId: string) {
		if (!editingStore || !view) return;

		const group = view.groups.find((g) => g.id === groupId);
		if (!group) return;

		if (group.memberIds.length > 0) {
			groupToDelete = {
				id: groupId,
				name: group.name,
				memberCount: group.memberIds.length
			};
			showDeleteGroupConfirm = true;
		} else {
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

	async function handleExportCSV() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const assignments = buildAssignmentList(view.groups, studentsMap);
		const csv = exportToCSV(assignments);
		const success = await env?.clipboard?.writeText(csv);
		showToast(success ? 'CSV copied to clipboard!' : 'Failed to copy');
		showExportMenu = false;
	}

	async function handleExportTSV() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const assignments = buildAssignmentList(view.groups, studentsMap);
		const tsv = exportToTSV(assignments);
		const success = await env?.clipboard?.writeText(tsv);
		showToast(success ? 'Copied! Paste directly into Google Sheets' : 'Failed to copy');
		showExportMenu = false;
	}

	async function handleExportGroupsSummary() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const csv = exportGroupsToCSV(view.groups, studentsMap);
		const success = await env?.clipboard?.writeText(csv);
		showToast(success ? 'Groups summary copied!' : 'Failed to copy');
		showExportMenu = false;
	}

	async function handlePublish(data: {
		sessionName: string;
		academicYear: string;
		startDate: Date;
		endDate: Date;
	}) {
		if (!env || !program || !scenario || !view) return;

		isPublishing = true;
		publishError = null;

		const sessionResult = await createSession(env, {
			programId: program.id,
			name: data.sessionName,
			academicYear: data.academicYear,
			startDate: data.startDate,
			endDate: data.endDate
		});

		if (isErr(sessionResult)) {
			const err = sessionResult.error;
			publishError =
				err.type === 'PROGRAM_NOT_FOUND'
					? 'Program not found'
					: 'message' in err
						? err.message
						: 'Failed to create session';
			isPublishing = false;
			return;
		}

		const session = sessionResult.value;

		const publishResult = await publishSession(env, {
			sessionId: session.id,
			scenarioId: scenario.id
		});

		if (isErr(publishResult)) {
			const err = publishResult.error;
			publishError =
				err.type === 'SESSION_NOT_FOUND'
					? 'Session not found'
					: err.type === 'SCENARIO_NOT_FOUND'
						? 'Scenario not found'
						: err.type === 'SESSION_ALREADY_PUBLISHED'
							? 'Session already published'
							: 'message' in err
								? err.message
								: 'Failed to publish session';
			isPublishing = false;
			return;
		}

		latestPublishedSession = publishResult.value;
		sessions = [...sessions, publishResult.value];
		showPublishModal = false;
		isPublishing = false;
		showToast('Groups published successfully!');
	}

	// --- Activity name rename handler ---
	async function handleNameChange(newName: string) {
		if (!env || !program) return;

		const result = await renameActivity(env, {
			programId: program.id,
			newName
		});

		if (isErr(result)) {
			showToast(result.error.message ?? 'Failed to rename activity');
			throw new Error(result.error.message);
		}

		// Update local state
		program = { ...program, name: newName };
		showToast('Activity renamed');
	}

	// --- Show to class handlers ---
	function handleShowToClassClick() {
		if (latestPublishedSession && !hasEditsSincePublish) {
			// Already published and no edits since → go directly to present
			goto(`/activities/${program?.id}/present`);
		} else {
			// Never published OR has edits since last publish → show prompt
			showShowToClassPrompt = true;
			showToClassError = null;
		}
	}

	async function handlePublishAndPresent() {
		if (!env || !program || !scenario) return;

		showToClassPublishing = true;
		showToClassError = null;

		// Create a session with default values
		const now = new Date();
		const endDate = new Date(now);
		endDate.setMonth(endDate.getMonth() + 6);

		const sessionResult = await createSession(env, {
			programId: program.id,
			name: `${program.name} - ${now.toLocaleDateString()}`,
			academicYear: `${now.getFullYear()}-${now.getFullYear() + 1}`,
			startDate: now,
			endDate
		});

		if (isErr(sessionResult)) {
			const err = sessionResult.error;
			showToClassError =
				'message' in err ? err.message : `Failed to create session: ${err.type}`;
			showToClassPublishing = false;
			return;
		}

		const publishResult = await publishSession(env, {
			sessionId: sessionResult.value.id,
			scenarioId: scenario.id
		});

		if (isErr(publishResult)) {
			const err = publishResult.error;
			showToClassError = 'message' in err ? err.message : `Failed to publish: ${err.type}`;
			showToClassPublishing = false;
			return;
		}

		latestPublishedSession = publishResult.value;
		sessions = [...sessions, publishResult.value];
		showShowToClassPrompt = false;
		showToClassPublishing = false;

		goto(`/activities/${program.id}/present`);
	}

	function handleJustPreview() {
		showShowToClassPrompt = false;
		goto(`/activities/${program?.id}/present`);
	}

	// --- Tooltip handlers ---
	function handleTooltipShow(studentId: string, x: number, y: number) {
		// Don't show tooltip if a drag is in progress or just ended
		if (draggingId || dragCooldown) return;
		tooltipStudentId = studentId;
		tooltipX = x;
		tooltipY = y;
	}

	function handleTooltipHide() {
		tooltipStudentId = null;
	}

	// Handle drag end with cooldown to prevent spurious tooltips from DOM reflow
	function handleDragEnd() {
		draggingId = null;
		dragCooldown = true;
		// Clear cooldown after DOM has settled
		setTimeout(() => {
			dragCooldown = false;
		}, 150);
	}

	// Clear tooltip when any drag starts
	$effect(() => {
		if (draggingId) {
			tooltipStudentId = null;
		}
	});
</script>

<svelte:head>
	<title>{program?.name ?? 'Workspace'} | Groupwheel</title>
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
				<a href="/activities" class="mt-2 inline-block text-sm text-blue-600 underline">
					← Back to activities
				</a>
			</div>
		</div>
	{:else if program}
		<!-- Header -->
		<WorkspaceHeader
			programId={program.id}
			programName={program.name}
			onNameChange={handleNameChange}
			onExportCSV={handleExportCSV}
			onExportTSV={handleExportTSV}
			onExportGroupsSummary={handleExportGroupsSummary}
			onShowToClass={handleShowToClassClick}
			hasGroups={!!scenario && !!view}
			onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
			{sidebarOpen}
		/>

		<!-- Main content area -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Workspace (main area) -->
			<main class="flex-1 overflow-y-auto p-4">
				<!-- Post-creation guidance banner -->
				{#if showGuidanceBanner && !bannerDismissed && scenario && view}
					<div class="mx-auto max-w-6xl mb-4">
						<div class="rounded-lg border border-teal-200 bg-teal-50 p-4 flex items-start justify-between gap-4">
							<div class="flex items-start gap-3">
								<div class="flex-shrink-0 mt-0.5">
									<svg class="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div>
									<p class="font-medium text-teal-900">Groups generated!</p>
									<p class="text-sm text-teal-700 mt-1">
										Drag students between groups to adjust placements.
										{#if preferencesCount === 0}
											<a
												href="/activities/{program?.id}/setup#preferences"
												class="underline hover:text-teal-800"
											>
												Import student preferences
											</a> for smarter placement.
										{/if}
									</p>
								</div>
							</div>
							<button
								type="button"
								onclick={() => bannerDismissed = true}
								class="flex-shrink-0 text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-100"
								aria-label="Dismiss banner"
							>
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				{/if}

				{#if generationError && (!scenario || !view)}
					<div class="mx-auto max-w-2xl py-8">
						<GenerationErrorBanner
							errorType={generationError}
							isRetrying={isRetryingGeneration}
							onRetry={handleRetryGeneration}
							programId={program.id}
						/>
					</div>
				{:else if !scenario || !view}
					<EmptyWorkspaceState studentCount={students.length} {preferencesCount} />
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
							onStartOver={() => (showStartOverConfirm = true)}
							onTryAnother={handleTryAnother}
							onToggleAnalytics={() => (analyticsOpen = !analyticsOpen)}
							onRetrySave={() => editingStore?.retrySave()}
							canPublish={view.saveStatus === 'saved' || view.saveStatus === 'idle'}
							isPublished={latestPublishedSession !== null && !hasEditsSincePublish}
							publishedSessionName={latestPublishedSession?.name ?? ''}
							onPublish={() => (showPublishModal = true)}
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
							onDragStart={(id) => (draggingId = id)}
							onDragEnd={handleDragEnd}
							{flashingIds}
						/>

						<!-- Layout toggle -->
						<div class="flex justify-end">
							<div class="inline-flex rounded-lg border border-gray-200 bg-white p-1">
								<button
									type="button"
									class={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										layoutMode === 'masonry'
											? 'bg-gray-100 text-gray-900'
											: 'text-gray-500 hover:text-gray-700'
									}`}
									onclick={() => (layoutMode = 'masonry')}
									aria-pressed={layoutMode === 'masonry'}
								>
									Grid
								</button>
								<button
									type="button"
									class={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										layoutMode === 'row'
											? 'bg-gray-100 text-gray-900'
											: 'text-gray-500 hover:text-gray-700'
									}`}
									onclick={() => (layoutMode = 'row')}
									aria-pressed={layoutMode === 'row'}
								>
									Row
								</button>
							</div>
						</div>
					</div>

					<div class={layoutMode === 'row' ? '' : 'mx-auto max-w-6xl'}>
						<GroupEditingLayout
							groups={view.groups}
							{studentsById}
							{selectedStudentId}
							{draggingId}
							onDrop={handleDrop}
							onDragStart={(id) => (draggingId = id)}
							onSelect={selectStudent}
							onDragEnd={handleDragEnd}
							{flashingIds}
							onUpdateGroup={handleUpdateGroup}
							onDeleteGroup={handleDeleteGroup}
							onAddGroup={handleAddGroup}
							{newGroupId}
							selectedStudentPreferences={activeStudentPreferences}
							layout={layoutMode}
							{studentPreferenceRanks}
							onStudentHoverStart={handleTooltipShow}
							onStudentHoverEnd={handleTooltipHide}
						/>
					</div>

					<!-- Footer hint -->
					<div class="mt-4 text-center text-sm text-gray-400">
						Drag students between groups &middot; Changes save automatically
					</div>
				{/if}
			</main>

			<!-- Sidebar -->
			{#if sidebarOpen}
				<StudentSidebar
					{students}
					{preferenceMap}
					{selectedStudentId}
					programId={program?.id}
					onSelect={selectStudent}
					onClose={() => (sidebarOpen = false)}
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
			onCancel={() => {
				showStartOverConfirm = false;
			}}
		/>

		<!-- Delete Group confirmation dialog -->
		<ConfirmDialog
			open={showDeleteGroupConfirm}
			title="Delete group?"
			message={groupToDelete
				? `"${groupToDelete.name}" has ${groupToDelete.memberCount} student${groupToDelete.memberCount !== 1 ? 's' : ''}. They will be moved to Unassigned.`
				: ''}
			confirmLabel="Delete"
			onConfirm={confirmDeleteGroup}
			onCancel={cancelDeleteGroup}
		/>

		<!-- Publish Session Modal -->
		<PublishSessionModal
			isOpen={showPublishModal}
			programName={program?.name ?? ''}
			onPublish={handlePublish}
			onCancel={() => {
				showPublishModal = false;
				publishError = null;
			}}
			{isPublishing}
			error={publishError}
		/>

		<!-- Show to Class Prompt -->
		<ShowToClassPrompt
			open={showShowToClassPrompt}
			isPublishing={showToClassPublishing}
			error={showToClassError}
			onPublishAndPresent={handlePublishAndPresent}
			onJustPreview={handleJustPreview}
			onCancel={() => {
				showShowToClassPrompt = false;
				showToClassError = null;
			}}
		/>

		<!-- Student Info Tooltip -->
		{#if tooltipStudent}
			<StudentInfoTooltip
				student={tooltipStudent}
				preferences={tooltipPreferences}
				currentGroupName={tooltipCurrentGroup}
				preferenceRank={tooltipPreferenceRank}
				x={tooltipX}
				y={tooltipY}
				visible={true}
			/>
		{/if}

		<!-- Toast -->
		{#if toastMessage}
			<div
				class="fixed right-4 bottom-4 z-50 rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg"
			>
				{toastMessage}
			</div>
		{/if}
	{/if}
</div>
