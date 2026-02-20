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
		normalizeWorkspaceRowLayout,
		generateComparisonScenario,
		type WorkspaceRowLayout
	} from '$lib/services/appEnvUseCases';
	import { isOk } from '$lib/types/result';
	import ScenarioComparison from '$lib/components/editing/ScenarioComparison.svelte';
	import PreferencesPromptBanner from '$lib/components/workspace/PreferencesPromptBanner.svelte';
	import PreferencesImportModal from '$lib/components/workspace/PreferencesImportModal.svelte';
	import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import GroupColumnSkeleton from '$lib/components/ui/GroupColumnSkeleton.svelte';
	import RepeatedGroupingHint from '$lib/components/workspace/RepeatedGroupingHint.svelte';
	import GuidedStepper from '$lib/components/workspace/GuidedStepper.svelte';
	import StudentDetailSidebar from '$lib/components/workspace/StudentDetailSidebar.svelte';
	import SatisfactionSummary from '$lib/components/workspace/SatisfactionSummary.svelte';
	import CardSizeToggle from '$lib/components/workspace/CardSizeToggle.svelte';
	import GroupLayoutToggle from '$lib/components/workspace/GroupLayoutToggle.svelte';
	import WorkspaceActionBar from '$lib/components/workspace/WorkspaceActionBar.svelte';
	import { uiSettings } from '$lib/stores/uiSettings.svelte';
	import { cardSizeStyle } from '$lib/utils/cardSizeTokens';
	import {
		WorkspaceCommandRunner,
		type WorkspaceToastAction
	} from '$lib/stores/workspace-command-runner.svelte';
	import { createWorkspaceExportHandlers } from '$lib/stores/workspace-export-handlers';
	import { createWorkspaceStudentAnalytics } from '$lib/stores/workspace-student-analytics.svelte';
	import { createWorkspaceKeyboardMoveHandlers } from '$lib/stores/workspace-keyboard-move.svelte';
	import { createWorkspaceStudentLookup } from '$lib/stores/workspace-student-lookup.svelte';
	import { interpretAnalytics } from '$lib/utils/analyticsInterpretation';

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
	let keyboardController = $derived(vmState.keyboardController);
	let tooltipController = $derived(vmState.tooltipController);
	let sidebarController = $derived(vmState.sidebarController);

	// --- UI state ---
	let draggingId = $state<string | null>(null);
	let flashingIds = $state<Set<string>>(new Set());
	let isComparing = $state(false);
	let comparisonCandidate = $state<import('$lib/services/appEnvUseCases').ComparisonCandidate | null>(null);
	let pickedUpStudentId = $derived(keyboardController.state.pickedUpStudentId);
	let keyboardAnnouncement = $derived(keyboardController.state.announcement);
	const commandRunner = new WorkspaceCommandRunner({
		onAnnounce: (message) => {
			keyboardController.actions.announce(message);
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
	let groupCount = $derived(view?.groups.length ?? 0);
	let qualityLabel = $derived.by(() => {
		if (!view?.currentAnalytics || groupCount === 0 || preferencesCount === 0) return null;
		return interpretAnalytics({
			current: view.currentAnalytics,
			baseline: view.baseline,
			studentCount: students.length,
			groupCount
		}).topChoiceLabel;
	});

	// --- Composable modules ---
	const analytics = createWorkspaceStudentAnalytics({
		getView: () => view,
		getStudents: () => students,
		getPreferenceMap: () => preferenceMap,
		getPairingStats: () => pairingStats,
		getActiveStudentId: () => draggingId ?? tooltipController.state.studentId
	});

	const studentLookup = createWorkspaceStudentLookup({
		getTooltipController: () => tooltipController,
		getSidebarController: () => sidebarController,
		getStudentsById: () => studentsById,
		getPreferenceMap: () => preferenceMap,
		getStudentRecentGroupmates: () => analytics.studentRecentGroupmates,
		getDraggingId: () => draggingId
	});

	let hasEditsSincePublish = $derived(workspaceVm.actions.detectEditsSincePublish());

	let sizeStyle = $derived(cardSizeStyle(uiSettings.cardSize));

	// --- Group names for preferences modal ---
	let groupNames = $derived(view?.groups.map((g) => g.name) ?? []);

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

	const exportHandlers = createWorkspaceExportHandlers({
		getView: () => view,
		getProgram: () => program,
		getScenario: () => scenario,
		getStudentsById: () => studentsById,
		getStudents: () => students,
		getPreferences: () => preferences,
		getResolvedRowLayout: () => resolvedRowLayout,
		getEnv: () => env,
		commandRunner,
		showToast
	});

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
			qualityLabel,
			hasPreferences: preferencesCount > 0,
			isComparing,
			onCompare: preferencesCount > 0 ? handleCompare : null,
			onUndo: () => editingStore?.undo(),
			onRedo: () => editingStore?.redo(),
			onExportCSV: exportHandlers.handleExportCSV,
			onExportTSV: exportHandlers.handleExportTSV,
			onExportGroupsSummary: exportHandlers.handleExportGroupsSummary,
			onExportGroupsColumns: exportHandlers.handleExportGroupsColumns,
			onExportActivitySchema: exportHandlers.handleExportActivitySchema,
			onExportActivityScreenshot: exportHandlers.handleExportActivityScreenshot
		});
	});

	const keyboardMoveHandlers = createWorkspaceKeyboardMoveHandlers({
		getKeyboardController: () => keyboardController,
		getView: () => view,
		getEditingStore: () => editingStore,
		getResolvedRowLayout: () => resolvedRowLayout,
		flashStudent
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

	// --- Show to class handler ---
	async function handleShowToClassClick() {
		const result = await workspaceVm.actions.publishToClass(hasEditsSincePublish);
		if (result.status === 'err') {
			showToast(result.error);
			return;
		}

		goto(`/activities/${result.value.programId}/live`);
	}

	// --- Comparison handlers ---
	async function handleCompare() {
		if (!env || !program || !scenario || !view) return;
		isComparing = true;

		const result = await generateComparisonScenario(env, {
			programId: program.id,
			groups: view.groups.map((g) => ({ name: g.name, capacity: g.capacity }))
		});

		isComparing = false;

		if (isOk(result)) {
			comparisonCandidate = result.value;
		} else {
			showToast('Failed to generate comparison');
		}
	}

	function handleKeepCurrent() {
		comparisonCandidate = null;
	}

	async function handleUseAlternative() {
		if (!comparisonCandidate || !editingStore) return;
		editingStore.regenerate(comparisonCandidate.groups);
		comparisonCandidate = null;
	}

	function handleDragEnd() {
		draggingId = null;
		studentLookup.handleDragEnd();
	}

	// Clear tooltip when any drag starts
	$effect(() => {
		if (draggingId) {
			tooltipController.actions.hide();
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
							baseline={view.baseline}
							{groupCount}
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
							studentHasPreferences={analytics.studentHasPreferences}
							onStudentHoverStart={studentLookup.handleTooltipShow}
							onStudentHoverEnd={studentLookup.handleTooltipHide}
							{pickedUpStudentId}
							onKeyboardPickUp={keyboardMoveHandlers.handleKeyboardPickUp}
							onKeyboardDrop={keyboardMoveHandlers.handleKeyboardDrop}
							onKeyboardCancel={keyboardMoveHandlers.handleKeyboardCancel}
							onKeyboardMove={keyboardMoveHandlers.handleKeyboardMove}
							onAlphabetize={handleAlphabetizeUnassigned}
							onStudentClick={studentLookup.handleStudentClick}
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
							selectedStudentPreferences={analytics.activeStudentPreferences}
							layout={layoutMode}
							rowOrderTop={resolvedRowLayout?.top ?? []}
							rowOrderBottom={resolvedRowLayout?.bottom ?? []}
							studentPreferenceRanks={analytics.studentPreferenceRanks}
							studentHasPreferences={analytics.studentHasPreferences}
							onStudentHoverStart={studentLookup.handleTooltipShow}
							onStudentHoverEnd={studentLookup.handleTooltipHide}
							{pickedUpStudentId}
							onKeyboardPickUp={keyboardMoveHandlers.handleKeyboardPickUp}
							onKeyboardDrop={keyboardMoveHandlers.handleKeyboardDrop}
							onKeyboardCancel={keyboardMoveHandlers.handleKeyboardCancel}
							onKeyboardMove={keyboardMoveHandlers.handleKeyboardMove}
							onStudentClick={studentLookup.handleStudentClick}
						/>
					</div>
				</div>
			{/if}
		</main>

		<!-- Student Detail Sidebar -->
		{#if studentLookup.sidebarStudent && scenario && view}
			<StudentDetailSidebar
				student={studentLookup.sidebarStudent}
				preferences={studentLookup.sidebarPreferences}
				recentGroupmates={studentLookup.sidebarRecentGroupmates}
				onClose={() => sidebarController.actions.close()}
			/>
		{/if}

		<!-- Workspace Action Bar -->
		{#if scenario && view}
			<WorkspaceActionBar
				{isTryingAnother}
				{isRegenerating}
				onTryAnother={handleTryAnother}
				onStartOver={() => workspaceVm.actions.openStartOverConfirm()}
				onShowToClass={handleShowToClassClick}
			/>
		{/if}
	</div>

	<!-- Scenario Comparison -->
	{#if comparisonCandidate && view && view.currentAnalytics}
		<ScenarioComparison
			currentGroups={view.groups}
			currentAnalytics={view.currentAnalytics}
			alternativeGroups={comparisonCandidate.groups}
			alternativeAnalytics={comparisonCandidate.analytics}
			studentCount={students.length}
			{groupCount}
			{studentsById}
			onKeepCurrent={handleKeepCurrent}
			onUseAlternative={handleUseAlternative}
			onClose={handleKeepCurrent}
		/>
	{/if}

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
	{#if studentLookup.tooltipStudent}
		<StudentInfoTooltip
			student={studentLookup.tooltipStudent}
			preferences={studentLookup.tooltipPreferences}
			recentGroupmates={studentLookup.tooltipRecentGroupmates}
			x={tooltipController.state.x}
			y={tooltipController.state.y}
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
