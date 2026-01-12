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
	import { activityHeader } from '$lib/stores/activityHeader.svelte';
	import { workspaceHeader } from '$lib/stores/workspaceHeader.svelte';
	import {
		ScenarioEditingStore,
		type ScenarioEditingView,
		type SaveStatus
	} from '$lib/stores/scenarioEditingStore';
	import { buildPreferenceMap } from '$lib/utils/preferenceAdapter';
	import type { Program, Pool, Scenario, Student, Preference, Group } from '$lib/domain';

	import UnassignedArea from '$lib/components/editing/UnassignedArea.svelte';
	import GroupEditingLayout, {
		type LayoutMode
	} from '$lib/components/editing/GroupEditingLayout.svelte';
	import ConfirmDialog from '$lib/components/editing/ConfirmDialog.svelte';
	import EmptyWorkspaceState from '$lib/components/workspace/EmptyWorkspaceState.svelte';
	import HistorySelector from '$lib/components/editing/HistorySelector.svelte';
	import type { ScenarioSatisfaction } from '$lib/domain';
	import GenerationErrorBanner from '$lib/components/workspace/GenerationErrorBanner.svelte';
	import ShowToClassPrompt from '$lib/components/workspace/ShowToClassPrompt.svelte';
	import StudentInfoTooltip from '$lib/components/editing/StudentInfoTooltip.svelte';
	import {
		generateScenario,
		getActivityData,
		createSession,
		publishSession
	} from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Session } from '$lib/domain';
	import PublishSessionModal from '$lib/components/editing/PublishSessionModal.svelte';
	import PreferencesPromptBanner from '$lib/components/workspace/PreferencesPromptBanner.svelte';
	import PreferencesImportModal from '$lib/components/workspace/PreferencesImportModal.svelte';
	import {
		buildAssignmentList,
		exportToCSV,
		exportToTSV,
		exportGroupsToCSV,
		exportGroupsToColumnsTSV
	} from '$lib/utils/csvExport';
	import {
		downloadActivityFile,
		downloadActivityScreenshot,
		generateExportFilename,
		type ActivityExportData
	} from '$lib/utils/activityFile';
	import { extractStudentPreference } from '$lib/domain/preference';
	import { computeAnalyticsSync } from '$lib/application/useCases/computeAnalyticsSync';
	import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';

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

	// --- Preferences modal state ---
	let showPreferencesModal = $state(false);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Editing store (initialized when scenario exists) ---
	let editingStore: ScenarioEditingStore | null = $state(null);
	let view = $state<ScenarioEditingView | null>(null);

	// --- UI state ---
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
	let layoutMode = $state<LayoutMode>('row');

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

	$effect(() => {
		activityHeader.setName(program?.name ?? null);
	});

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
	let topChoicePercent = $derived(view?.currentAnalytics?.percentAssignedTopChoice ?? null);
	let topTwoPercent = $derived(view?.currentAnalytics?.percentAssignedTop2 ?? null);

	$effect(() => {
		if (!scenario || !view) {
			workspaceHeader.clear();
			return;
		}

		workspaceHeader.set({
			canUndo: view.canUndo,
			canRedo: view.canRedo,
			topChoicePercent,
			topTwoPercent,
			onUndo: () => editingStore?.undo(),
			onRedo: () => editingStore?.redo(),
			onExportCSV: handleExportCSV,
			onExportTSV: handleExportTSV,
			onExportGroupsSummary: handleExportGroupsSummary,
			onExportGroupsColumns: handleExportGroupsColumns,
			onExportActivitySchema: handleExportActivitySchema,
			onExportActivityScreenshot: handleExportActivityScreenshot
		});
	});

	type RowLayoutConfig = { top: string[]; bottom: string[] };

	// Detect if scenario has been edited since last publish
	let hasEditsSincePublish = $derived.by(() => {
		if (!view?.lastModifiedAt || !latestPublishedSession?.publishedAt) {
			return true; // No publish yet or no scenario, so treat as "has edits"
		}
		return view.lastModifiedAt > latestPublishedSession.publishedAt;
	});

	let activeStudentId = $derived(draggingId ?? tooltipStudentId);

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

	let studentHasPreferences = $derived.by(() => {
		const prefs = new Map<string, boolean>();
		for (const studentId of students.map((s) => s.id)) {
			const studentPrefs = preferenceMap[studentId]?.likeGroupIds;
			prefs.set(studentId, Boolean(studentPrefs && studentPrefs.length > 0));
		}
		return prefs;
	});

	// --- Group names for preferences modal ---
	let groupNames = $derived(view?.groups.map((g) => g.name) ?? []);

	function isStringArray(value: unknown): value is string[] {
		return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
	}

	function getRowLayoutConfig(config: unknown): RowLayoutConfig | null {
		if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
		const workspace = (config as Record<string, unknown>).workspace;
		if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) return null;
		const rowLayout = (workspace as Record<string, unknown>).rowLayout;
		if (!rowLayout || typeof rowLayout !== 'object' || Array.isArray(rowLayout)) return null;
		const top = (rowLayout as Record<string, unknown>).top;
		const bottom = (rowLayout as Record<string, unknown>).bottom;
		if (!isStringArray(top) || !isStringArray(bottom)) return null;
		return { top: [...top], bottom: [...bottom] };
	}

	function dedupeRowLayoutEntries(ids: string[], seen: Set<string>): string[] {
		const sanitized: string[] = [];
		for (const id of ids) {
			if (seen.has(id)) continue;
			seen.add(id);
			sanitized.push(id);
		}
		return sanitized;
	}

	function computeInitialRowLayout(groups: Group[]): RowLayoutConfig {
		if (groups.length === 0) return { top: [], bottom: [] };
		const sortedBySize = [...groups].sort(
			(a, b) => b.memberIds.length - a.memberIds.length
		);
		const bottomCount = Math.ceil(sortedBySize.length / 2);
		const bottomIds = new Set(sortedBySize.slice(0, bottomCount).map((group) => group.id));
		return {
			top: groups.filter((group) => !bottomIds.has(group.id)).map((group) => group.id),
			bottom: groups.filter((group) => bottomIds.has(group.id)).map((group) => group.id)
		};
	}

	function normalizeRowLayout(layout: RowLayoutConfig, groups: Group[]): RowLayoutConfig {
		const groupIds = new Set(groups.map((group) => group.id));
		const seen = new Set<string>();
		const top = dedupeRowLayoutEntries(
			layout.top.filter((id) => groupIds.has(id)),
			seen
		);
		const bottom = dedupeRowLayoutEntries(
			layout.bottom.filter((id) => groupIds.has(id)),
			seen
		);
		const missing = groups
			.filter((group) => !seen.has(group.id))
			.map((group) => group.id);
		const nextTop = top;
		const nextBottom = missing.length > 0 ? [...bottom, ...missing] : bottom;

		if (nextTop.length === 0 && nextBottom.length === groups.length) {
			return computeInitialRowLayout(groups);
		}
		if (nextBottom.length === 0 && nextTop.length === groups.length) {
			return computeInitialRowLayout(groups);
		}

		return {
			top: nextTop,
			bottom: nextBottom
		};
	}

	function rowLayoutEquals(a: RowLayoutConfig, b: RowLayoutConfig): boolean {
		const same = (left: string[], right: string[]) =>
			left.length === right.length && left.every((value, index) => value === right[index]);
		return same(a.top, b.top) && same(a.bottom, b.bottom);
	}

	function setRowLayoutConfig(config: unknown, rowLayout: RowLayoutConfig): unknown {
		const base =
			config && typeof config === 'object' && !Array.isArray(config)
				? { ...(config as Record<string, unknown>) }
				: {};
		const workspace =
			base.workspace && typeof base.workspace === 'object' && !Array.isArray(base.workspace)
				? { ...(base.workspace as Record<string, unknown>) }
				: {};
		return {
			...base,
			workspace: {
				...workspace,
				rowLayout: {
					top: [...rowLayout.top],
					bottom: [...rowLayout.bottom]
				}
			}
		};
	}

	let resolvedRowLayout = $derived.by(() => {
		if (!view) return null;
		const stored = getRowLayoutConfig(scenario?.algorithmConfig);
		const base = stored ?? computeInitialRowLayout(view.groups);
		return normalizeRowLayout(base, view.groups);
	});

	$effect(() => {
		if (!scenario || !editingStore || !resolvedRowLayout) return;
		const stored = getRowLayoutConfig(scenario.algorithmConfig);
		if (stored && rowLayoutEquals(stored, resolvedRowLayout)) return;

		const nextConfig = setRowLayoutConfig(scenario.algorithmConfig, resolvedRowLayout);
		editingStore.updateAlgorithmConfig(nextConfig);
		scenario = { ...scenario, algorithmConfig: nextConfig };
	});

	// --- Handle preferences import ---
	async function handlePreferencesImport(
		parsedPreferences: ParsedPreference[],
		_warnings: string[]
	) {
		if (!env || !program) return;

		try {
			// Save preferences to repository for persistence
			const prefRepo = env.preferenceRepo;
			const generateId = () => `pref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

			// Save each preference
			for (const parsed of parsedPreferences) {
				const pref: Preference = {
					id: generateId(),
					programId: program.id,
					studentId: parsed.studentId,
					payload: {
						studentId: parsed.studentId,
						likeGroupIds: parsed.likeGroupIds ?? [],
						avoidGroupIds: [],
						avoidStudentIds: []
					}
				};
				await prefRepo.save(pref);
			}

			// Reload preferences from repository to update local state
			preferences = await prefRepo.listByProgramId(program.id);

			showPreferencesModal = false;
			showToast(`Imported ${parsedPreferences.length} preferences. Regenerate to apply.`);
		} catch (e) {
			console.error('Error saving preferences:', e);
			showToast('Error saving preferences');
		}
	}

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
		activityHeader.clear();
		workspaceHeader.clear();
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

	function flashStudent(id: string) {
		flashingIds = new Set([id]);
		setTimeout(() => {
			flashingIds = new Set();
		}, 900);
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
	}

	async function handleExportTSV() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const assignments = buildAssignmentList(view.groups, studentsMap);
		const tsv = exportToTSV(assignments);
		const success = await env?.clipboard?.writeText(tsv);
		showToast(success ? 'Copied! Paste directly into Google Sheets' : 'Failed to copy');
	}

	async function handleExportGroupsSummary() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const csv = exportGroupsToCSV(view.groups, studentsMap);
		const success = await env?.clipboard?.writeText(csv);
		showToast(success ? 'Groups summary copied!' : 'Failed to copy');
	}

	async function handleExportGroupsColumns() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const tsv = exportGroupsToColumnsTSV(view.groups, studentsMap);
		const success = await env?.clipboard?.writeText(tsv);
		showToast(success ? 'Groups copied for Sheets!' : 'Failed to copy');
	}

	function buildActivityExportData(): ActivityExportData | null {
		if (!program || !view) return null;
		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			activity: {
				name: program.name,
				type: program.type
			},
			roster: {
				students: students.map((s) => ({
					id: s.id,
					firstName: s.firstName,
					lastName: s.lastName,
					gradeLevel: s.gradeLevel,
					gender: s.gender,
					meta: s.meta
				}))
			},
			preferences: preferences.map((p) => {
				const payload = extractStudentPreference(p);
				return {
					studentId: p.studentId,
					likeGroupIds: payload.likeGroupIds,
					avoidStudentIds: payload.avoidStudentIds,
					avoidGroupIds: payload.avoidGroupIds
				};
			}),
			scenario: {
				groups: view.groups.map((g) => ({
					id: g.id,
					name: g.name,
					capacity: g.capacity,
					memberIds: [...g.memberIds]
				})),
				algorithmConfig: scenario?.algorithmConfig
			}
		};
	}

	async function handleExportActivitySchema() {
		if (!program) return;
		const exportData = buildActivityExportData();
		if (!exportData) return;
		const filename = generateExportFilename(program.name);
		downloadActivityFile(exportData, filename);
		showToast('Schema downloaded');
	}

	async function handleExportActivityScreenshot() {
		if (!program) return;
		const filename = generateExportFilename(program.name);
		const screenshotName = filename.replace(/\.json$/i, '.png');
		const screenshotSuccess = await downloadActivityScreenshot(screenshotName);
		showToast(screenshotSuccess ? 'Screenshot downloaded' : 'Screenshot failed');
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

<div class="flex h-full min-h-0 flex-col">
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
		<!-- Main content area -->
		<div class="flex flex-1 min-h-0 overflow-hidden">
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

				<!-- Preferences prompt banner (only shown when no preferences and groups exist) -->
				{#if scenario && view && preferencesCount === 0 && program}
					<div class="mx-auto max-w-6xl mb-4">
						<PreferencesPromptBanner
							activityId={program.id}
							onImportClick={() => showPreferencesModal = true}
						/>
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
						<HistorySelector
							historyLength={resultHistory.length}
							currentIndex={currentHistoryIndex}
							onSelect={switchToHistoryEntry}
						/>

						<UnassignedArea
							{studentsById}
							unassignedIds={view.unassignedStudentIds}
							{draggingId}
							onDrop={handleDrop}
							onDragStart={(id) => (draggingId = id)}
							onDragEnd={handleDragEnd}
							{flashingIds}
							onStudentHoverStart={handleTooltipShow}
							onStudentHoverEnd={handleTooltipHide}
						/>

					</div>

					<div class={layoutMode === 'row' ? '' : 'mx-auto max-w-6xl'}>
						<GroupEditingLayout
							groups={view.groups}
							{studentsById}
							{draggingId}
							onDrop={handleDrop}
							onDragStart={(id) => (draggingId = id)}
							onDragEnd={handleDragEnd}
							{flashingIds}
							onUpdateGroup={handleUpdateGroup}
							onDeleteGroup={handleDeleteGroup}
							onAddGroup={handleAddGroup}
							{newGroupId}
							selectedStudentPreferences={activeStudentPreferences}
							layout={layoutMode}
							rowOrderTop={resolvedRowLayout?.top ?? []}
							rowOrderBottom={resolvedRowLayout?.bottom ?? []}
							{studentPreferenceRanks}
							{studentHasPreferences}
							onStudentHoverStart={handleTooltipShow}
							onStudentHoverEnd={handleTooltipHide}
						/>
					</div>

					<!-- Footer hint removed for compact view -->
				{/if}
			</main>

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

		<!-- Preferences Import Modal -->
		<PreferencesImportModal
			isOpen={showPreferencesModal}
			{students}
			{groupNames}
			programId={program?.id ?? ''}
			sheetConnection={null}
			onSuccess={handlePreferencesImport}
			onCancel={() => showPreferencesModal = false}
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
