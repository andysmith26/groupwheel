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
	import InlineGroupGenerator from '$lib/components/workspace/InlineGroupGenerator.svelte';
	import HistorySelector from '$lib/components/editing/HistorySelector.svelte';
	import type { ScenarioSatisfaction } from '$lib/domain';
	import GenerationErrorBanner from '$lib/components/workspace/GenerationErrorBanner.svelte';
	import StudentInfoTooltip from '$lib/components/editing/StudentInfoTooltip.svelte';
	import {
		createWorkspaceHistoryEntry,
		detectWorkspaceEditsSincePublish,
		generateScenario,
		getProgramPairingStats,
		type PairingStat,
		getWorkspaceGroupsDisplayOrder,
		insertWorkspaceHistoryEntry,
		getActivityData,
		normalizeWorkspaceRowLayout,
		selectWorkspaceHistoryEntry,
		showToClass,
		type WorkspaceHistoryEntry,
		type WorkspaceHistoryState,
		type WorkspaceRowLayout
	} from '$lib/services/appEnvUseCases';
	import { err, isErr, ok } from '$lib/types/result';
	import type { Session } from '$lib/domain';
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
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import GroupColumnSkeleton from '$lib/components/ui/GroupColumnSkeleton.svelte';
	import RepeatedGroupingHint from '$lib/components/workspace/RepeatedGroupingHint.svelte';
	import GuidedStepper from '$lib/components/workspace/GuidedStepper.svelte';
	import StudentDetailSidebar from '$lib/components/workspace/StudentDetailSidebar.svelte';
	import SatisfactionSummary from '$lib/components/workspace/SatisfactionSummary.svelte';
	import CardSizeToggle from '$lib/components/workspace/CardSizeToggle.svelte';
	import GroupLayoutToggle from '$lib/components/workspace/GroupLayoutToggle.svelte';
	import { uiSettings } from '$lib/stores/uiSettings.svelte';
	import { cardSizeStyle } from '$lib/utils/cardSizeTokens';
	import {
		WorkspaceCommandRunner,
		type WorkspaceToastAction
	} from '$lib/stores/workspace-command-runner.svelte';

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

	// --- Post-creation guidance (from wizard redirect) ---
	let showGuidanceBanner = $state(false);
	let bannerDismissed = $state(false);
	let guidedStep = $state<1 | 2>(1);

	// --- Group shell editing state ---
	let newGroupId = $state<string | null>(null);
	let showDeleteGroupConfirm = $state(false);
	let groupToDelete = $state<{ id: string; name: string; memberCount: number } | null>(null);

	// --- Pairing stats for tooltip (loaded when 2+ published sessions) ---
	let pairingStats = $state<PairingStat[]>([]);

	// --- Alphabetize confirmation state ---
	let showAlphabetizeConfirm = $state(false);
	let groupToAlphabetize = $state<{ id: string; name: string; memberCount: number } | null>(null);

	// --- Student detail sidebar state ---
	let sidebarStudentId = $state<string | null>(null);

	// --- Student tooltip state ---
	let tooltipStudentId = $state<string | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let dragCooldown = $state(false); // Brief cooldown after drag to prevent spurious tooltips

	// --- Keyboard navigation state ---
	let pickedUpStudentId = $state<string | null>(null);
	let pickedUpFromContainer = $state<string | null>(null);
	let pickedUpFromIndex = $state<number>(0);
	let keyboardAnnouncement = $state<string>('');
	const commandRunner = new WorkspaceCommandRunner({
		onAnnounce: (message) => {
			keyboardAnnouncement = message;
		}
	});

	// --- Keyboard handler cleanup ---
	let keyboardCleanup: (() => void) | null = null;

	// --- Layout mode (derived from UI settings) ---
	let layoutMode = $derived<LayoutMode>(uiSettings.groupLayout === 'wrap' ? 'masonry' : 'row');

	// --- Result history state (session-only) ---
	const MAX_HISTORY = 3;
	let resultHistory = $state<WorkspaceHistoryEntry[]>([]);
	let currentHistoryIndex = $state<number>(-1);
	let isTryingAnother = $state(false);
	let savedCurrentGroups = $state<Group[] | null>(null);

	// --- Generation settings ---
	let avoidRecentGroupmates = $state(false);

	$effect(() => {
		activityHeader.setName(program?.name ?? null);
	});

	// --- Toast ---
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

	// Detect if scenario has been edited since last publish
	let hasEditsSincePublish = $derived.by(() => {
		const result = detectWorkspaceEditsSincePublish({
			scenarioLastModifiedAt: view?.lastModifiedAt,
			latestPublishedAt: latestPublishedSession?.publishedAt
		});

		if (result.status === 'ok') {
			return result.value.hasEditsSincePublish;
		}

		return true;
	});

	let sizeStyle = $derived(cardSizeStyle(uiSettings.cardSize));

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
	let tooltipStudent = $derived(tooltipStudentId ? (studentsById[tooltipStudentId] ?? null) : null);
	let tooltipPreferences = $derived(
		tooltipStudentId ? (preferenceMap[tooltipStudentId] ?? null) : null
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

	// --- Derive recent groupmates for tooltip from pairing stats ---
	let studentRecentGroupmates = $derived.by(() => {
		const groupmatesMap = new Map<string, Array<{ studentName: string; count: number }>>();

		// Group pairing stats by each student
		for (const pair of pairingStats) {
			// Add to student A's groupmates
			const groupmatesA = groupmatesMap.get(pair.studentAId) ?? [];
			groupmatesA.push({ studentName: pair.studentBName, count: pair.count });
			groupmatesMap.set(pair.studentAId, groupmatesA);

			// Add to student B's groupmates
			const groupmatesB = groupmatesMap.get(pair.studentBId) ?? [];
			groupmatesB.push({ studentName: pair.studentAName, count: pair.count });
			groupmatesMap.set(pair.studentBId, groupmatesB);
		}

		// Sort each student's groupmates by count (most frequent first)
		for (const [studentId, groupmates] of groupmatesMap) {
			groupmates.sort((a, b) => b.count - a.count);
			groupmatesMap.set(studentId, groupmates);
		}

		return groupmatesMap;
	});

	// --- Tooltip recent groupmates (must be after studentRecentGroupmates) ---
	let tooltipRecentGroupmates = $derived(
		tooltipStudentId ? (studentRecentGroupmates.get(tooltipStudentId) ?? []) : []
	);

	// --- Group names for preferences modal ---
	let groupNames = $derived(view?.groups.map((g) => g.name) ?? []);

	/**
	 * Get groups ordered by UI display order (top row first, then bottom row).
	 * This ensures exports match what users see on screen.
	 */
	function getGroupsInDisplayOrder(): Group[] {
		if (!view) return [];
		const result = getWorkspaceGroupsDisplayOrder({
			groups: view.groups,
			rowLayout: resolvedRowLayout
		});

		if (result.status === 'ok') {
			return result.value.groups;
		}

		return view.groups;
	}
	let rowLayoutState = $derived.by(() => {
		if (!view) return null;
		const result = normalizeWorkspaceRowLayout({
			groups: view.groups,
			algorithmConfig: scenario?.algorithmConfig
		});

		if (result.status === 'ok') {
			return result.value;
		}

		return null;
	});

	let resolvedRowLayout = $derived<WorkspaceRowLayout | null>(rowLayoutState?.rowLayout ?? null);

	$effect(() => {
		if (!scenario || !editingStore || !rowLayoutState?.shouldPersistConfig) return;

		const nextConfig = rowLayoutState.nextAlgorithmConfig;
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
						avoidStudentIds: parsed.avoidStudentIds ?? []
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
		commandRunner.dispose();
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

		// Load pairing stats if there are 2+ sessions with placements (meaningful history)
		const publishedSessions = sessions.filter(
			(s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED'
		);
		if (publishedSessions.length >= 2) {
			const statsResult = await getProgramPairingStats(env, { programId });
			if (!isErr(statsResult)) {
				pairingStats = statsResult.value.pairs;
			}
		}

		if (scenario) {
			initializeEditingStore(scenario);
		}
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

	function handleInlineGenerated(newScenario: Scenario) {
		scenario = newScenario;
		generationError = null;
		initializeEditingStore(newScenario);
	}

	function getStudentDisplayName(studentId: string): string {
		const student = studentsById[studentId];
		return student ? `${student.firstName} ${student.lastName ?? ''}`.trim() : 'Student';
	}

	function getContainerDisplayName(containerId: string): string {
		if (containerId === 'unassigned') {
			return 'Unassigned';
		}

		const group = view?.groups.find((item) => item.id === containerId);
		return group?.name ?? 'Unknown';
	}

	async function handleRetryGeneration() {
		if (!env || !program) return;
		const programId = program.id;

		isRetryingGeneration = true;

		await commandRunner.run({
			run: async () => {
				const result = await generateScenario(env!, {
					programId
				});

				if (isErr(result)) {
					return err(result.error.type);
				}

				return ok(result.value);
			},
			onSuccess: (nextScenario) => {
				scenario = nextScenario;
				generationError = null;
				initializeEditingStore(nextScenario);
			},
			onError: (errorType) => {
				generationError = errorType;
			}
		});

		isRetryingGeneration = false;
	}

	function handleDrop(payload: {
		studentId: string;
		source: string;
		target: string;
		targetIndex?: number;
	}) {
		if (!editingStore) return;

		const currentSourceGroup = view?.groups.find((g) => g.memberIds.includes(payload.studentId));
		const normalizedSource = currentSourceGroup ? currentSourceGroup.id : 'unassigned';

		void commandRunner.run({
			run: () => {
				const result = editingStore!.dispatch({
					type: 'MOVE_STUDENT',
					studentId: payload.studentId,
					source: normalizedSource,
					target: payload.target,
					targetIndex: payload.targetIndex
				});

				if (!result.success) {
					return err(result.reason ?? 'move_not_allowed');
				}

				return ok({
					studentId: payload.studentId,
					source: normalizedSource,
					target: payload.target
				});
			},
			onSuccess: ({ studentId }) => {
				flashStudent(studentId);
			},
			undo: () => {
				editingStore?.undo();
			},
			successMessage: ({ studentId }) => `${getStudentDisplayName(studentId)} moved.`,
			successSubtitle: ({ source, target }) =>
				`${getContainerDisplayName(source)} → ${getContainerDisplayName(target)}`,
			errorMessage: (reason) => {
				if (reason === 'target_full') return 'Group is at capacity';
				if (reason === 'save_failed')
					return 'Save failed. Retry the save, then move students again.';
				return 'Move not allowed';
			},
			announceMessage: ({ studentId, target }) =>
				`${getStudentDisplayName(studentId)} moved to ${getContainerDisplayName(target)}.`
		});
	}

	function handleReorder(payload: { groupId: string; studentId: string; newIndex: number }) {
		if (!editingStore || !view) return;

		// Handle unassigned area reordering
		if (payload.groupId === 'unassigned') {
			const currentIndex = view.unassignedStudentIds.indexOf(payload.studentId);
			if (currentIndex === -1) return;

			const newOrder = [...view.unassignedStudentIds];
			newOrder.splice(currentIndex, 1);
			newOrder.splice(payload.newIndex, 0, payload.studentId);

			void commandRunner.run({
				run: () => {
					const result = editingStore!.reorderUnassigned(newOrder);
					return result.success ? ok(payload.studentId) : err('reorder_failed');
				},
				onSuccess: (studentId) => {
					flashStudent(studentId);
				},
				undo: () => {
					editingStore?.undo();
				},
				successMessage: (studentId) => `${getStudentDisplayName(studentId)} reordered.`
			});
			return;
		}

		const group = view.groups.find((g) => g.id === payload.groupId);
		if (!group) return;

		// Compute the new order by moving the student to newIndex
		const currentIndex = group.memberIds.indexOf(payload.studentId);
		if (currentIndex === -1) return;

		const newOrder = [...group.memberIds];
		// Remove from current position
		newOrder.splice(currentIndex, 1);
		// Insert at new position
		newOrder.splice(payload.newIndex, 0, payload.studentId);

		void commandRunner.run({
			run: () => {
				const result = editingStore!.reorderGroup(payload.groupId, newOrder);
				return result.success ? ok(payload.studentId) : err('reorder_failed');
			},
			onSuccess: (studentId) => {
				flashStudent(studentId);
			},
			undo: () => {
				editingStore?.undo();
			},
			successMessage: (studentId) => `${getStudentDisplayName(studentId)} reordered.`
		});
	}

	async function handleStartOver() {
		if (!env || !scenario || !editingStore) return;
		showStartOverConfirm = false;
		isRegenerating = true;

		await commandRunner.run({
			run: async () => {
				const existingConfig = (scenario!.algorithmConfig as Record<string, unknown>) ?? {};
				const result = await env!.groupingAlgorithm.generateGroups({
					programId: scenario!.programId,
					studentIds: scenario!.participantSnapshot,
					algorithmConfig: {
						...existingConfig,
						avoidRecentGroupmates
					}
				});

				if (!result.success) {
					return err('regeneration_failed');
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

				await editingStore!.regenerate(groups);
				return ok(undefined);
			},
			errorMessage: 'Regeneration failed'
		});

		isRegenerating = false;
	}

	function addToHistory(groups: Group[], analytics: ScenarioSatisfaction) {
		if (!env) return;

		const entryResult = createWorkspaceHistoryEntry({
			id: env.idGenerator.generateId(),
			groups,
			generatedAt: new Date(),
			analytics
		});

		if (entryResult.status !== 'ok') return;

		const state: WorkspaceHistoryState = {
			entries: resultHistory,
			currentIndex: currentHistoryIndex,
			savedCurrentGroups
		};

		const nextState = insertWorkspaceHistoryEntry({
			state,
			entry: entryResult.value,
			maxEntries: MAX_HISTORY
		});

		if (nextState.status !== 'ok') return;

		resultHistory = nextState.value.entries;
		currentHistoryIndex = nextState.value.currentIndex;
		savedCurrentGroups = nextState.value.savedCurrentGroups;
	}

	function switchToHistoryEntry(index: number) {
		if (!editingStore) return;

		const state: WorkspaceHistoryState = {
			entries: resultHistory,
			currentIndex: currentHistoryIndex,
			savedCurrentGroups
		};

		const selection = selectWorkspaceHistoryEntry({
			state,
			index,
			currentGroups: view?.groups ?? null
		});

		if (selection.status !== 'ok') return;

		resultHistory = selection.value.state.entries;
		currentHistoryIndex = selection.value.state.currentIndex;
		savedCurrentGroups = selection.value.state.savedCurrentGroups;

		if (selection.value.groupsToApply) {
			editingStore.regenerate(selection.value.groupsToApply);
		}
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

		await commandRunner.run({
			run: async () => {
				const existingConfig = (scenario!.algorithmConfig as Record<string, unknown>) ?? {};
				const result = await env!.groupingAlgorithm.generateGroups({
					programId: scenario!.programId,
					studentIds: scenario!.participantSnapshot,
					algorithmConfig: {
						...existingConfig,
						seed: Date.now(),
						avoidRecentGroupmates
					}
				});

				if (!result.success) {
					return err('generation_failed');
				}

				const groups: Group[] = result.groups.map((g) => ({
					id: g.id,
					name: g.name,
					capacity: g.capacity,
					memberIds: g.memberIds
				}));

				await editingStore!.regenerate(groups);
				return ok(undefined);
			},
			errorMessage: 'Generation failed'
		});

		isTryingAnother = false;
	}

	function flashStudent(id: string) {
		flashingIds = new Set([id]);
		setTimeout(() => {
			flashingIds = new Set();
		}, 900);
	}

	function showToast(message: string, action?: WorkspaceToastAction, subtitle?: string) {
		commandRunner.showToast(message, action, subtitle);
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

		void commandRunner.run({
			run: () => {
				const result = editingStore!.createGroup();
				return result.success && result.groupId ? ok(result.groupId) : err('create_failed');
			},
			onSuccess: (groupId) => {
				newGroupId = groupId;
				setTimeout(() => {
					newGroupId = null;
				}, 100);
			},
			errorMessage: 'Failed to create group'
		});
	}

	function handleUpdateGroup(groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) {
		if (!editingStore) return;

		void commandRunner.run({
			run: () => {
				const result = editingStore!.updateGroup(groupId, changes);
				return result.success ? ok(undefined) : err(result.reason ?? 'update_failed');
			},
			errorMessage: (reason) =>
				reason === 'duplicate_name' ? 'A group with this name already exists' : null
		});
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
			void commandRunner.run({
				run: () => {
					const result = editingStore!.deleteGroup(groupId);
					return result.success ? ok(undefined) : err('delete_failed');
				},
				errorMessage: 'Failed to delete group'
			});
		}
	}

	function confirmDeleteGroup() {
		if (!editingStore || !groupToDelete) return;

		void commandRunner.run({
			run: () => {
				const result = editingStore!.deleteGroup(groupToDelete!.id);
				return result.success ? ok(undefined) : err('delete_failed');
			},
			errorMessage: 'Failed to delete group'
		});

		showDeleteGroupConfirm = false;
		groupToDelete = null;
	}

	function cancelDeleteGroup() {
		showDeleteGroupConfirm = false;
		groupToDelete = null;
	}

	function handleAlphabetize(groupId: string) {
		if (!editingStore || !view) return;

		const group = view.groups.find((g) => g.id === groupId);
		if (!group || group.memberIds.length < 2) return;

		// Show confirmation dialog
		groupToAlphabetize = {
			id: groupId,
			name: group.name,
			memberCount: group.memberIds.length
		};
		showAlphabetizeConfirm = true;
	}

	function confirmAlphabetize() {
		if (!editingStore || !groupToAlphabetize || !view) return;

		const targetId = groupToAlphabetize.id;
		const group = view.groups.find((g) => g.id === targetId);
		if (!group) {
			showAlphabetizeConfirm = false;
			groupToAlphabetize = null;
			return;
		}

		// Sort memberIds alphabetically by last name, then first name
		const sortedMemberIds = [...group.memberIds].sort((leftId, rightId) => {
			const left = studentsById[leftId];
			const right = studentsById[rightId];
			if (!left && !right) return leftId.localeCompare(rightId);
			if (!left) return 1;
			if (!right) return -1;

			const leftLast = (left.lastName ?? '').trim();
			const rightLast = (right.lastName ?? '').trim();
			const lastCompare = leftLast.localeCompare(rightLast, undefined, { sensitivity: 'base' });
			if (lastCompare !== 0) return lastCompare;

			const leftFirst = (left.firstName ?? '').trim();
			const rightFirst = (right.firstName ?? '').trim();
			const firstCompare = leftFirst.localeCompare(rightFirst, undefined, { sensitivity: 'base' });
			if (firstCompare !== 0) return firstCompare;

			return left.id.localeCompare(right.id);
		});

		void commandRunner.run({
			run: () => {
				const result = editingStore!.reorderGroup(group.id, sortedMemberIds);
				return result.success ? ok(group.name) : err('alphabetize_failed');
			},
			successMessage: (groupName) => `"${groupName}" sorted alphabetically`,
			errorMessage: 'Failed to alphabetize group'
		});

		showAlphabetizeConfirm = false;
		groupToAlphabetize = null;
	}

	function cancelAlphabetize() {
		showAlphabetizeConfirm = false;
		groupToAlphabetize = null;
	}

	function handleAlphabetizeUnassigned() {
		if (!editingStore || !view || view.unassignedStudentIds.length < 2) return;

		// Sort unassigned students alphabetically by last name, then first name
		const sortedIds = [...view.unassignedStudentIds].sort((leftId, rightId) => {
			const left = studentsById[leftId];
			const right = studentsById[rightId];
			if (!left && !right) return leftId.localeCompare(rightId);
			if (!left) return 1;
			if (!right) return -1;

			const leftLast = (left.lastName ?? '').trim();
			const rightLast = (right.lastName ?? '').trim();
			const lastCompare = leftLast.localeCompare(rightLast, undefined, { sensitivity: 'base' });
			if (lastCompare !== 0) return lastCompare;

			const leftFirst = (left.firstName ?? '').trim();
			const rightFirst = (right.firstName ?? '').trim();
			const firstCompare = leftFirst.localeCompare(rightFirst, undefined, { sensitivity: 'base' });
			if (firstCompare !== 0) return firstCompare;

			return left.id.localeCompare(right.id);
		});

		void commandRunner.run({
			run: () => {
				const result = editingStore!.reorderUnassigned(sortedIds);
				return result.success ? ok(undefined) : err('alphabetize_unassigned_failed');
			},
			undo: () => {
				editingStore?.undo();
			},
			successMessage: 'Unassigned students sorted alphabetically',
			errorMessage: 'Failed to sort unassigned students'
		});
	}

	async function runClipboardCommand(content: string, successMessage: string) {
		await commandRunner.run({
			run: async () => {
				const success = await env?.clipboard?.writeText(content);
				return success ? ok(undefined) : err('copy_failed');
			},
			successMessage,
			errorMessage: 'Failed to copy'
		});
	}

	async function handleExportCSV() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const orderedGroups = getGroupsInDisplayOrder();
		const assignments = buildAssignmentList(orderedGroups, studentsMap);
		const csv = exportToCSV(assignments);
		await runClipboardCommand(csv, 'CSV copied to clipboard!');
	}

	async function handleExportTSV() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const orderedGroups = getGroupsInDisplayOrder();
		const assignments = buildAssignmentList(orderedGroups, studentsMap);
		const tsv = exportToTSV(assignments);
		await runClipboardCommand(tsv, 'Copied! Paste directly into Google Sheets');
	}

	async function handleExportGroupsSummary() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const orderedGroups = getGroupsInDisplayOrder();
		const csv = exportGroupsToCSV(orderedGroups, studentsMap);
		await runClipboardCommand(csv, 'Groups summary copied!');
	}

	async function handleExportGroupsColumns() {
		if (!view) return;
		const studentsMap = new Map(Object.entries(studentsById));
		const orderedGroups = getGroupsInDisplayOrder();
		const tsv = exportGroupsToColumnsTSV(orderedGroups, studentsMap);
		await runClipboardCommand(tsv, 'Groups copied for Sheets!');
	}

	function buildActivityExportData(): ActivityExportData | null {
		if (!program || !view) return null;
		const orderedGroups = getGroupsInDisplayOrder();
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
				groups: orderedGroups.map((g) => ({
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

		await commandRunner.run({
			run: () => {
				downloadActivityFile(exportData, filename);
				return ok(undefined);
			},
			successMessage: 'Schema downloaded'
		});
	}

	async function handleExportActivityScreenshot() {
		if (!program) return;
		const filename = generateExportFilename(program.name);
		const screenshotName = filename.replace(/\.json$/i, '.png');

		await commandRunner.run({
			run: async () => {
				const screenshotSuccess = await downloadActivityScreenshot(screenshotName);
				return screenshotSuccess ? ok(undefined) : err('screenshot_failed');
			},
			successMessage: 'Screenshot downloaded',
			errorMessage: 'Screenshot failed'
		});
	}

	// --- Show to class handler ---
	async function handleShowToClassClick() {
		if (!env || !program || !scenario) return;

		if (latestPublishedSession && !hasEditsSincePublish) {
			// Already published and no edits since → go directly to live
			goto(`/activities/${program.id}/live`);
			return;
		}

		// Publish and navigate to live view
		const result = await showToClass(env, {
			programId: program.id,
			scenarioId: scenario.id
		});

		if (isErr(result)) {
			const message =
				result.error.type === 'INTERNAL_ERROR'
					? result.error.message
					: `Failed: ${result.error.type}`;
			showToast(message);
			return;
		}

		latestPublishedSession = result.value;
		sessions = [...sessions, result.value];
		goto(`/activities/${program.id}/live`);
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

	// --- Student detail sidebar handlers ---
	function handleStudentClick(studentId: string) {
		sidebarStudentId = sidebarStudentId === studentId ? null : studentId;
		tooltipStudentId = null; // hide tooltip when opening sidebar
	}

	let sidebarStudent = $derived(sidebarStudentId ? (studentsById[sidebarStudentId] ?? null) : null);
	let sidebarPreferences = $derived(
		sidebarStudentId ? (preferenceMap[sidebarStudentId] ?? null) : null
	);
	let sidebarRecentGroupmates = $derived(
		sidebarStudentId ? (studentRecentGroupmates.get(sidebarStudentId) ?? []) : []
	);

	// --- Keyboard navigation handlers ---
	function handleKeyboardPickUp(studentId: string, container: string, index: number) {
		pickedUpStudentId = studentId;
		pickedUpFromContainer = container;
		pickedUpFromIndex = index;

		const student = studentsById[studentId];
		const studentName = student
			? `${student.firstName} ${student.lastName ?? ''}`.trim()
			: studentId;
		keyboardAnnouncement = `${studentName} picked up. Use arrow keys to move, Enter to drop, Escape to cancel.`;
	}

	function handleKeyboardDrop() {
		if (!pickedUpStudentId || !pickedUpFromContainer) return;

		// The student is already in position (we move them as arrow keys are pressed)
		// So just clear the state
		const student = studentsById[pickedUpStudentId];
		const studentName = student
			? `${student.firstName} ${student.lastName ?? ''}`.trim()
			: pickedUpStudentId;
		keyboardAnnouncement = `${studentName} dropped.`;

		pickedUpStudentId = null;
		pickedUpFromContainer = null;
		pickedUpFromIndex = 0;
	}

	function handleKeyboardCancel() {
		if (!pickedUpStudentId || !pickedUpFromContainer) return;

		const student = studentsById[pickedUpStudentId];
		const studentName = student
			? `${student.firstName} ${student.lastName ?? ''}`.trim()
			: pickedUpStudentId;
		keyboardAnnouncement = `Move cancelled. ${studentName} returned to original position.`;

		pickedUpStudentId = null;
		pickedUpFromContainer = null;
		pickedUpFromIndex = 0;
	}

	function handleKeyboardMove(direction: 'up' | 'down' | 'left' | 'right') {
		if (!pickedUpStudentId || !view) return;

		// Find where the student currently is
		let currentContainer = pickedUpFromContainer;
		let currentIndex = pickedUpFromIndex;

		// Check if student is in a group or unassigned
		for (const group of view.groups) {
			const idx = group.memberIds.indexOf(pickedUpStudentId);
			if (idx !== -1) {
				currentContainer = group.id;
				currentIndex = idx;
				break;
			}
		}

		if (view.unassignedStudentIds.includes(pickedUpStudentId)) {
			currentContainer = 'unassigned';
			currentIndex = view.unassignedStudentIds.indexOf(pickedUpStudentId);
		}

		// Build list of all containers in visual order (unassigned, then top row L→R, then bottom row L→R)
		const visualGroupOrder = resolvedRowLayout
			? [...resolvedRowLayout.top, ...resolvedRowLayout.bottom]
			: view.groups.map((g) => g.id);
		const containers = ['unassigned', ...visualGroupOrder];
		const currentContainerIndex = containers.indexOf(currentContainer ?? 'unassigned');

		let targetContainer = currentContainer;
		let targetIndex = currentIndex;

		if (direction === 'up' && currentContainer !== 'unassigned') {
			// Move up within group (decrease index)
			const group = view.groups.find((g) => g.id === currentContainer);
			if (group && currentIndex > 0) {
				targetIndex = currentIndex - 1;
			}
		} else if (direction === 'down' && currentContainer !== 'unassigned') {
			// Move down within group (increase index)
			const group = view.groups.find((g) => g.id === currentContainer);
			if (group && currentIndex < group.memberIds.length - 1) {
				targetIndex = currentIndex + 1;
			}
		} else if (direction === 'left') {
			// Move to previous container
			if (currentContainerIndex > 0) {
				targetContainer = containers[currentContainerIndex - 1];
				targetIndex = 0; // Start at beginning of new container
			}
		} else if (direction === 'right') {
			// Move to next container
			if (currentContainerIndex < containers.length - 1) {
				targetContainer = containers[currentContainerIndex + 1];
				targetIndex = 0; // Start at beginning of new container
			}
		}

		// Only dispatch if something changed
		if (targetContainer !== currentContainer || targetIndex !== currentIndex) {
			const result = editingStore?.dispatch({
				type: 'MOVE_STUDENT',
				studentId: pickedUpStudentId,
				source: currentContainer ?? 'unassigned',
				target: targetContainer ?? 'unassigned',
				targetIndex
			});

			if (result?.success) {
				flashStudent(pickedUpStudentId);

				// Announce the move
				const student = studentsById[pickedUpStudentId];
				const studentName = student
					? `${student.firstName} ${student.lastName ?? ''}`.trim()
					: pickedUpStudentId;

				if (targetContainer === 'unassigned') {
					keyboardAnnouncement = `${studentName} moved to unassigned.`;
				} else {
					const group = view.groups.find((g) => g.id === targetContainer);
					const groupName = group?.name ?? targetContainer;
					keyboardAnnouncement = `${studentName} moved to ${groupName}, position ${targetIndex + 1}.`;
				}

				// After moving to a different container, the DOM element is remounted.
				// We need to restore focus to the new element after the DOM updates.
				if (targetContainer !== currentContainer) {
					const studentIdToFocus = pickedUpStudentId;
					requestAnimationFrame(() => {
						const newElement = document.querySelector(
							`[data-student-id="${studentIdToFocus}"]`
						) as HTMLElement | null;
						newElement?.focus();
					});
				}
			}
		}
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

{#if loading}
	<div class="flex gap-3 p-4">
		<!-- Left sidebar: Unassigned area skeleton -->
		<div class="w-[148px] flex-shrink-0">
			<div class="h-full rounded-xl bg-gray-50 p-3">
				<Skeleton width="100%" height="1rem" class="mb-3" />
				<div class="flex flex-col gap-2">
					{#each Array(6) as _}
						<Skeleton width="100%" height="2rem" rounded="md" />
					{/each}
				</div>
			</div>
		</div>
		<!-- Main area: Group columns skeleton -->
		<div class="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _}
				<GroupColumnSkeleton studentCount={4} />
			{/each}
		</div>
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
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Workspace (main area) -->
		<main class="flex-1 overflow-y-auto p-4">
			<!-- Post-creation guided stepper -->
			{#if showGuidanceBanner && !bannerDismissed && scenario && view}
				<div class="mx-auto mb-4 max-w-6xl">
					<GuidedStepper
						currentStep={guidedStep}
						onAdvance={() => (guidedStep = 2)}
						onShowToClass={handleShowToClassClick}
						onDismiss={() => (bannerDismissed = true)}
					/>
				</div>
			{/if}

			<!-- Preferences prompt banner (only shown when no preferences and groups exist) -->
			{#if scenario && view && preferencesCount === 0 && program}
				<div class="mx-auto mb-4 max-w-6xl">
					<PreferencesPromptBanner
						activityId={program.id}
						onImportClick={() => (showPreferencesModal = true)}
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
				<div class="mx-auto max-w-lg py-8">
					<InlineGroupGenerator
						programId={program.id}
						programName={program.name}
						studentCount={students.length}
						{sessions}
						onGenerated={handleInlineGenerated}
						onError={(msg) => (generationError = msg)}
					/>
				</div>
			{:else}
				<div class="mx-auto max-w-6xl space-y-4">
					<!-- Generation settings and history -->
					<div class="flex items-center justify-between gap-4">
						<HistorySelector
							historyLength={resultHistory.length}
							currentIndex={currentHistoryIndex}
							onSelect={switchToHistoryEntry}
						/>

						<div class="flex items-center gap-3">
							<GroupLayoutToggle />
							<CardSizeToggle />

							<!-- Repeated grouping hint with avoid recent toggle -->
							{#if sessions.length > 0 && program}
								<RepeatedGroupingHint
									activityId={program.id}
									checked={avoidRecentGroupmates}
									onToggle={(checked) => (avoidRecentGroupmates = checked)}
								/>
							{/if}
						</div>
					</div>

					<!-- Satisfaction summary (when preferences exist) -->
					{#if preferencesCount > 0 && view?.currentAnalytics}
						<SatisfactionSummary
							analytics={view.currentAnalytics}
							studentsWithPreferences={preferencesCount}
							totalStudents={students.length}
						/>
					{/if}
				</div>

				<div class="mt-4 flex gap-3" style={sizeStyle}>
					<!-- Left sidebar: Unassigned students -->
					<div style="width: var(--sidebar-width, 148px);" class="flex-shrink-0 self-stretch">
						<UnassignedArea
							{studentsById}
							unassignedIds={view.unassignedStudentIds}
							{draggingId}
							onDrop={handleDrop}
							onReorder={handleReorder}
							onDragStart={(id) => (draggingId = id)}
							onDragEnd={handleDragEnd}
							{flashingIds}
							{studentHasPreferences}
							onStudentHoverStart={handleTooltipShow}
							onStudentHoverEnd={handleTooltipHide}
							{pickedUpStudentId}
							onKeyboardPickUp={handleKeyboardPickUp}
							onKeyboardDrop={handleKeyboardDrop}
							onKeyboardCancel={handleKeyboardCancel}
							onKeyboardMove={handleKeyboardMove}
							onAlphabetize={handleAlphabetizeUnassigned}
							onStudentClick={handleStudentClick}
							vertical={true}
						/>
					</div>

					<!-- Main area: Group columns -->
					<div class="min-w-0 flex-1">
						<GroupEditingLayout
							groups={view.groups}
							{studentsById}
							{draggingId}
							onDrop={handleDrop}
							onReorder={handleReorder}
							onDragStart={(id) => (draggingId = id)}
							onDragEnd={handleDragEnd}
							{flashingIds}
							onUpdateGroup={handleUpdateGroup}
							onDeleteGroup={handleDeleteGroup}
							onAddGroup={handleAddGroup}
							onAlphabetize={handleAlphabetize}
							{newGroupId}
							selectedStudentPreferences={activeStudentPreferences}
							layout={layoutMode}
							rowOrderTop={resolvedRowLayout?.top ?? []}
							rowOrderBottom={resolvedRowLayout?.bottom ?? []}
							{studentPreferenceRanks}
							{studentHasPreferences}
							onStudentHoverStart={handleTooltipShow}
							onStudentHoverEnd={handleTooltipHide}
							{pickedUpStudentId}
							onKeyboardPickUp={handleKeyboardPickUp}
							onKeyboardDrop={handleKeyboardDrop}
							onKeyboardCancel={handleKeyboardCancel}
							onKeyboardMove={handleKeyboardMove}
							onStudentClick={handleStudentClick}
						/>
					</div>
				</div>
			{/if}
		</main>

		<!-- Student Detail Sidebar -->
		{#if sidebarStudent && scenario && view}
			<StudentDetailSidebar
				student={sidebarStudent}
				preferences={sidebarPreferences}
				recentGroupmates={sidebarRecentGroupmates}
				onClose={() => (sidebarStudentId = null)}
			/>
		{/if}

		<!-- Workspace Action Bar -->
		{#if scenario && view}
			<div
				class="sticky bottom-0 z-10 border-t border-gray-200/70 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
			>
				<div class="mx-auto flex max-w-6xl items-center justify-between">
					<div class="flex items-center gap-3">
						<button
							type="button"
							class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
							onclick={handleTryAnother}
							disabled={isTryingAnother || isRegenerating}
						>
							{#if isTryingAnother}
								<span class="inline-flex items-center gap-2">
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
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Generating...
								</span>
							{:else}
								Try Another
							{/if}
						</button>
						<button
							type="button"
							class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
							onclick={() => (showStartOverConfirm = true)}
							disabled={isTryingAnother || isRegenerating}
						>
							Start Over
						</button>
					</div>
					<button
						type="button"
						class="flex items-center gap-2 rounded-md bg-teal px-6 py-2 text-sm font-medium text-white hover:bg-teal-dark"
						onclick={handleShowToClassClick}
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
						Show to Class
					</button>
				</div>
			</div>
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

	<!-- Alphabetize Group confirmation dialog -->
	<ConfirmDialog
		open={showAlphabetizeConfirm}
		title="Sort alphabetically?"
		message={groupToAlphabetize
			? `This will rearrange all ${groupToAlphabetize.memberCount} students in "${groupToAlphabetize.name}" by last name. You can undo this change.`
			: ''}
		confirmLabel="Sort"
		onConfirm={confirmAlphabetize}
		onCancel={cancelAlphabetize}
	/>

	<!-- Preferences Import Modal -->
	<PreferencesImportModal
		isOpen={showPreferencesModal}
		{students}
		{groupNames}
		programId={program?.id ?? ''}
		sheetConnection={null}
		onSuccess={handlePreferencesImport}
		onCancel={() => (showPreferencesModal = false)}
	/>

	<!-- Student Info Tooltip -->
	{#if tooltipStudent}
		<StudentInfoTooltip
			student={tooltipStudent}
			preferences={tooltipPreferences}
			recentGroupmates={tooltipRecentGroupmates}
			x={tooltipX}
			y={tooltipY}
			visible={true}
			showProfileLink={true}
		/>
	{/if}

	<!-- Screen reader announcements for keyboard navigation -->
	<div aria-live="polite" aria-atomic="true" class="sr-only">
		{keyboardAnnouncement}
	</div>

	<!-- Toast -->
	{#if commandRunner.toast}
		<div
			class="fixed right-4 bottom-4 z-50 rounded-lg bg-gray-900/90 px-4 py-3 text-sm text-white shadow-lg"
			role="alert"
		>
			<div class="flex items-center gap-4">
				<div>
					<span class="font-medium">{commandRunner.toast.message}</span>
					{#if commandRunner.toast.subtitle}
						<span class="block text-xs text-gray-400">{commandRunner.toast.subtitle}</span>
					{/if}
				</div>
				{#if commandRunner.toast.action}
					<button
						onclick={() => {
							void commandRunner.toast?.action?.callback();
						}}
						class="font-medium whitespace-nowrap underline hover:no-underline"
					>
						{commandRunner.toast.action.label}
					</button>
				{/if}
			</div>
		</div>
	{/if}
{/if}
