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
	import { createWorkspacePageVm } from '$lib/stores/workspace-page-vm.svelte';
	import { activityHeader } from '$lib/stores/activityHeader.svelte';
	import { workspaceHeader } from '$lib/stores/workspaceHeader.svelte';
	import { buildPreferenceMap } from '$lib/utils/preferenceAdapter';
	import type { Scenario, Student, Group } from '$lib/domain';

	import UnassignedArea from '$lib/components/editing/UnassignedArea.svelte';
	import GroupEditingLayout, {
		type LayoutMode
	} from '$lib/components/editing/GroupEditingLayout.svelte';
	import ConfirmDialog from '$lib/components/editing/ConfirmDialog.svelte';
	import InlineGroupGenerator from '$lib/components/workspace/InlineGroupGenerator.svelte';
	import HistorySelector from '$lib/components/editing/HistorySelector.svelte';
	import GenerationErrorBanner from '$lib/components/workspace/GenerationErrorBanner.svelte';
	import StudentInfoTooltip from '$lib/components/editing/StudentInfoTooltip.svelte';
	import {
		getWorkspaceGroupsDisplayOrder,
		normalizeWorkspaceRowLayout,
		type WorkspaceRowLayout
	} from '$lib/services/appEnvUseCases';
	import { err, ok } from '$lib/types/result';
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

	const workspaceVm = createWorkspacePageVm(getAppEnvContext());

	let vmState = $derived(workspaceVm.state);
	let env = $derived(vmState.env);
	let program = $derived(vmState.program);
	let pool = $derived(vmState.pool);
	let students = $derived(vmState.students);
	let preferences = $derived(vmState.preferences);
	let scenario = $derived(vmState.scenario);
	let sessions = $derived(vmState.sessions);
	let latestPublishedSession = $derived(vmState.latestPublishedSession);
	let loading = $derived(vmState.loading);
	let loadError = $derived(vmState.loadError);
	let editingStore = $derived(vmState.editingStore);
	let view = $derived(vmState.view);
	let showPreferencesModal = $derived(vmState.showPreferencesModal);
	let showStartOverConfirm = $derived(vmState.showStartOverConfirm);
	let isRegenerating = $derived(vmState.isRegenerating);
	let generationError = $derived(vmState.generationError);
	let isRetryingGeneration = $derived(vmState.isRetryingGeneration);
	let showGuidanceBanner = $derived(vmState.showGuidanceBanner);
	let bannerDismissed = $derived(vmState.bannerDismissed);
	let guidedStep = $derived(vmState.guidedStep);
	let newGroupId = $derived(vmState.newGroupId);
	let showDeleteGroupConfirm = $derived(vmState.showDeleteGroupConfirm);
	let groupToDelete = $derived(vmState.groupToDelete);
	let pairingStats = $derived(vmState.pairingStats);
	let showAlphabetizeConfirm = $derived(vmState.showAlphabetizeConfirm);
	let groupToAlphabetize = $derived(vmState.groupToAlphabetize);
	let resultHistory = $derived(vmState.resultHistory);
	let currentHistoryIndex = $derived(vmState.currentHistoryIndex);
	let isTryingAnother = $derived(vmState.isTryingAnother);
	let avoidRecentGroupmates = $derived(vmState.avoidRecentGroupmates);

	// --- UI state ---
	let draggingId = $state<string | null>(null);
	let flashingIds = $state<Set<string>>(new Set());

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

	// --- Layout mode (derived from UI settings) ---
	let layoutMode = $derived<LayoutMode>(uiSettings.groupLayout === 'wrap' ? 'masonry' : 'row');

	$effect(() => {
		activityHeader.setName(program?.name ?? null);
	});

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

	let hasEditsSincePublish = $derived(workspaceVm.actions.detectEditsSincePublish());

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
		workspaceVm.actions.syncScenarioAlgorithmConfig(nextConfig);
	});

	// --- Handle preferences import ---
	async function handlePreferencesImport(
		parsedPreferences: ParsedPreference[],
		_warnings: string[]
	) {
		const result = await workspaceVm.actions.importPreferences(parsedPreferences);
		if (result.status === 'ok') {
			workspaceVm.actions.closePreferencesModal();
			showToast(`Imported ${result.value} preferences. Regenerate to apply.`);
			return;
		}

		showToast('Error saving preferences');
	}

	onMount(async () => {
		await workspaceVm.actions.init($page.params.id, $page.url.searchParams);
	});

	onDestroy(() => {
		workspaceVm.actions.dispose();
		commandRunner.dispose();
	});

	function handleInlineGenerated(newScenario: Scenario) {
		workspaceVm.actions.handleInlineGenerated(newScenario);
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
		await workspaceVm.actions.retryGeneration();
	}

	function handleDrop(payload: {
		studentId: string;
		source: string;
		target: string;
		targetIndex?: number;
	}) {
		if (!editingStore) return;

		void commandRunner.run({
			run: () => workspaceVm.actions.moveStudent(payload),
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

		void commandRunner.run({
			run: () => workspaceVm.actions.reorderStudent(payload),
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
		await commandRunner.run({
			run: () => workspaceVm.actions.handleStartOver(),
			errorMessage: 'Regeneration failed'
		});
	}

	function switchToHistoryEntry(index: number) {
		workspaceVm.actions.switchToHistoryEntry(index);
	}

	async function handleTryAnother() {
		await commandRunner.run({
			run: () => workspaceVm.actions.handleTryAnother(),
			errorMessage: 'Generation failed'
		});
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
		workspaceVm.actions.handleSaveStatusEffects(
			(message) => showToast(message),
			(error) => console.warn('Scenario auto-save retrying after error', { error })
		);
	});

	function handleAddGroup() {
		void commandRunner.run({
			run: () => workspaceVm.actions.createGroup(),
			onSuccess: () => {
				workspaceVm.actions.clearNewGroupIdSoon(100);
			},
			errorMessage: 'Failed to create group'
		});
	}

	function handleUpdateGroup(groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) {
		void commandRunner.run({
			run: () => workspaceVm.actions.updateGroup(groupId, changes),
			errorMessage: (reason) =>
				reason === 'duplicate_name' ? 'A group with this name already exists' : null
		});
	}

	function handleDeleteGroup(groupId: string) {
		void commandRunner.run({
			run: () => workspaceVm.actions.requestDeleteGroup(groupId),
			errorMessage: 'Failed to delete group'
		});
	}

	function confirmDeleteGroup() {
		void commandRunner.run({
			run: () => workspaceVm.actions.confirmDeleteGroup(),
			errorMessage: 'Failed to delete group'
		});
	}

	function cancelDeleteGroup() {
		workspaceVm.actions.cancelDeleteGroup();
	}

	function handleAlphabetize(groupId: string) {
		workspaceVm.actions.requestAlphabetize(groupId);
	}

	function confirmAlphabetize() {
		void commandRunner.run({
			run: () => workspaceVm.actions.confirmAlphabetize(studentsById),
			successMessage: (groupName) => `"${groupName}" sorted alphabetically`,
			errorMessage: 'Failed to alphabetize group'
		});
	}

	function cancelAlphabetize() {
		workspaceVm.actions.cancelAlphabetize();
	}

	function handleAlphabetizeUnassigned() {
		void commandRunner.run({
			run: () => workspaceVm.actions.alphabetizeUnassigned(studentsById),
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
		const result = await workspaceVm.actions.publishToClass(hasEditsSincePublish);
		if (result.status === 'err') {
			showToast(result.error);
			return;
		}

		goto(`/activities/${result.value.programId}/live`);
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
						onAdvance={() => workspaceVm.actions.advanceGuidanceStep()}
						onShowToClass={handleShowToClassClick}
						onDismiss={() => workspaceVm.actions.dismissGuidanceBanner()}
					/>
				</div>
			{/if}

			<!-- Preferences prompt banner (only shown when no preferences and groups exist) -->
			{#if scenario && view && preferencesCount === 0 && program}
				<div class="mx-auto mb-4 max-w-6xl">
					<PreferencesPromptBanner
						activityId={program.id}
						onImportClick={() => workspaceVm.actions.openPreferencesModal()}
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
						onError={(msg) => workspaceVm.actions.setGenerationError(msg)}
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
									onToggle={(checked) => workspaceVm.actions.setAvoidRecentGroupmates(checked)}
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
							onclick={() => workspaceVm.actions.openStartOverConfirm()}
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
			workspaceVm.actions.closeStartOverConfirm();
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
		onCancel={() => workspaceVm.actions.closePreferencesModal()}
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
