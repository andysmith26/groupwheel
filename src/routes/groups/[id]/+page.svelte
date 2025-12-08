<script lang="ts">
	/**
	 * /groups/[id]/+page.svelte
	 *
	 * Activity detail page with inline group editor.
	 * Teachers can immediately drag students between groups without switching modes.
	 *
	 * Features:
	 * - Inline drag-and-drop group editing
	 * - Real-time satisfaction metrics
	 * - Undo/redo support (Ctrl+Z / Ctrl+Y)
	 * - Start Over button to regenerate groups
	 * - Auto-persist changes to repository
	 */

	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { setAppDataContext, type AppDataContext } from '$lib/contexts/appData';
	import { generateScenario, resetScenario } from '$lib/services/appEnvUseCases';
	import { isOk, isErr } from '$lib/types/result';
	import { commandStore } from '$lib/stores/commands.svelte';
	import { computeGroupsAnalytics } from '$lib/application/useCases/computeGroupsAnalytics';
	import { initializeDragMonitor, type DropState } from '$lib/utils/pragmatic-dnd';
	import type {
		Program,
		Pool,
		Scenario,
		Student,
		Preference,
		StudentPreference,
		Group
	} from '$lib/domain';
	import { extractStudentPreference } from '$lib/domain/preference';
	import type { ScenarioSatisfaction } from '$lib/domain/analytics';

	// Components
	import HorizontalGroupLayout from '$lib/components/group/HorizontalGroupLayout.svelte';
	import VerticalGroupLayout from '$lib/components/group/VerticalGroupLayout.svelte';
	import UnassignedSidebar from '$lib/components/roster/UnassignedSidebar.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Page data ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let students = $state<Student[]>([]);
	let preferences = $state<Preference[]>([]);
	let scenario = $state<Scenario | null>(null);

	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- UI state ---
	let selectedStudentId = $state<string | null>(null);
	let currentlyDragging = $state<string | null>(null);
	let flashingContainer = $state<string | null>(null);
	let showStartOverConfirm = $state(false);
	let isResetting = $state(false);
	let isGenerating = $state(false);
	let generateError = $state<string | null>(null);
	let collapsedGroups = $state<Set<string>>(new Set());
	let unassignedCollapsed = $state(false);

	// --- Derived state ---
	// Groups from command store (reactive)
	const groups = $derived(commandStore.groups);

	// Layout selection: horizontal for ≤5 groups, vertical for >5
	const useVerticalLayout = $derived(groups.length > 5);

	// Build context data for child components
	const studentsById = $derived(
		students.reduce(
			(acc, s) => {
				acc[s.id] = s;
				return acc;
			},
			{} as Record<string, Student>
		)
	);

	const preferencesById = $derived(
		preferences.reduce(
			(acc, p) => {
				acc[p.studentId] = extractStudentPreference(p);
				return acc;
			},
			{} as Record<string, StudentPreference>
		)
	);

	// Participant snapshot (all students who should be assigned)
	const participantSnapshot = $derived(scenario?.participantSnapshot ?? pool?.memberIds ?? []);

	// Unassigned students (derived from groups)
	const unassignedStudentIds = $derived.by(() => {
		const assignedIds = new Set(groups.flatMap((g) => g.memberIds));
		return participantSnapshot.filter((id) => !assignedIds.has(id));
	});

	// Real-time analytics (recalculates when groups change)
	const analytics = $derived.by<ScenarioSatisfaction | null>(() => {
		if (groups.length === 0 || preferences.length === 0) return null;
		return computeGroupsAnalytics({
			groups,
			preferences,
			participantSnapshot
		});
	});

	// Can undo/redo
	const canUndo = $derived(commandStore.canUndo);
	const canRedo = $derived(commandStore.canRedo);

	// --- Drag monitor cleanup ---
	let cleanupDragMonitor: (() => void) | null = null;

	// --- Debounced persistence ---
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		// Watch groups for changes and persist
		const currentGroups = groups;
		if (!env || !scenario || currentGroups.length === 0) return;

		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			persistGroups(currentGroups);
		}, 500); // 500ms debounce
	});

	async function persistGroups(groupsToSave: Group[]) {
		if (!env || !scenario) return;
		const updatedScenario: Scenario = {
			...scenario,
			groups: groupsToSave
		};
		try {
			await env.scenarioRepo.update(updatedScenario);
			scenario = updatedScenario;
		} catch (e) {
			console.error('Failed to persist groups:', e);
		}
	}

	// --- Keyboard shortcuts ---
	function handleKeydown(event: KeyboardEvent) {
		// Ctrl+Z / Cmd+Z for undo
		if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
			event.preventDefault();
			if (canUndo) commandStore.undo();
		}
		// Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z for redo
		if (
			(event.ctrlKey || event.metaKey) &&
			(event.key === 'y' || (event.key === 'z' && event.shiftKey))
		) {
			event.preventDefault();
			if (canRedo) commandStore.redo();
		}
		// Escape to deselect
		if (event.key === 'Escape') {
			selectedStudentId = null;
		}
	}

	// --- Mount/unmount ---
	onMount(async () => {
		env = getAppEnvContext();
		cleanupDragMonitor = initializeDragMonitor();
		await loadActivityData();
	});

	onDestroy(() => {
		if (cleanupDragMonitor) cleanupDragMonitor();
		if (saveTimeout) clearTimeout(saveTimeout);
	});

	// --- Data loading ---
	async function loadActivityData() {
		if (!env) return;

		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided.';
			loading = false;
			return;
		}

		try {
			// Load program
			program = await env.programRepo.getById(programId);
			if (!program) {
				loadError = `Activity not found: ${programId}`;
				loading = false;
				return;
			}

			// Load associated pool (use primaryPoolId or first poolId)
			const poolId = program.primaryPoolId ?? program.poolIds?.[0];
			if (poolId) {
				pool = await env.poolRepo.getById(poolId);
			}

			// Load students
			if (pool) {
				students = await env.studentRepo.getByIds(pool.memberIds);
			}

			// Load preferences
			preferences = await env.preferenceRepo.listByProgramId(programId);

			// Check for existing scenario (MVP: single scenario per program)
			const existingScenario = await env.scenarioRepo.getByProgramId(programId);
			if (existingScenario) {
				scenario = existingScenario;
				commandStore.initializeGroups(existingScenario.groups);
			}
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load activity data';
		} finally {
			loading = false;
		}
	}

	// --- Set context after data is loaded ---
	$effect(() => {
		if (students.length > 0) {
			setAppDataContext({
				studentsById,
				preferencesById
			});
		}
	});

	// --- Generate scenario (first time) ---
	async function handleGenerateScenario() {
		if (!env || !program) return;

		isGenerating = true;
		generateError = null;

		const result = await generateScenario(env, { programId: program.id });

		if (isErr(result)) {
			generateError = (() => {
				switch (result.error.type) {
					case 'PROGRAM_NOT_FOUND':
						return `Program not found: ${result.error.programId}`;
					case 'POOL_NOT_FOUND':
						return `Pool not found: ${result.error.poolId}`;
					case 'POOL_HAS_NO_MEMBERS':
						return `Pool has no members: ${result.error.poolId}`;
					case 'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM':
						return `Scenario already exists: ${result.error.scenarioId}`;
					case 'GROUPING_ALGORITHM_FAILED':
					case 'DOMAIN_VALIDATION_FAILED':
					case 'INTERNAL_ERROR':
						return result.error.message;
					default:
						return 'Failed to generate scenario';
				}
			})();
			isGenerating = false;
			return;
		}

		scenario = result.value;
		commandStore.initializeGroups(result.value.groups);
		isGenerating = false;
	}

	// --- Start Over (reset scenario) ---
	async function handleStartOver() {
		if (!env || !program) return;

		isResetting = true;

		const result = await resetScenario(env, { programId: program.id });

		if (isOk(result)) {
			scenario = result.value;
			commandStore.initializeGroups(result.value.groups);
		}

		isResetting = false;
		showStartOverConfirm = false;
	}

	// --- Drop handler ---
	function handleDrop(state: DropState) {
		const studentId = state.draggedItem.id;
		const sourceContainer = state.sourceContainer;
		const targetContainer = state.targetContainer;

		// No-op if dropped in same container
		if (sourceContainer === targetContainer) {
			currentlyDragging = null;
			return;
		}

		// Handle unassigning (dropping to unassigned sidebar)
		if (targetContainer === 'unassigned') {
			if (sourceContainer) {
				commandStore.dispatch({
					type: 'UNASSIGN_STUDENT',
					studentId,
					previousGroupId: sourceContainer
				});
				triggerFlash('unassigned');
			}
		}
		// Handle assigning to a group
		else if (targetContainer) {
			commandStore.dispatch({
				type: 'ASSIGN_STUDENT',
				studentId,
				groupId: targetContainer,
				previousGroupId: sourceContainer ?? undefined
			});
			triggerFlash(targetContainer);
		}

		currentlyDragging = null;
	}

	// --- Flash animation ---
	function triggerFlash(containerId: string) {
		flashingContainer = containerId;
		setTimeout(() => {
			flashingContainer = null;
		}, 700);
	}

	// --- Event handlers ---
	function handleDragStart(studentId: string) {
		currentlyDragging = studentId;
	}

	function handleStudentClick(studentId: string) {
		selectedStudentId = selectedStudentId === studentId ? null : studentId;
	}

	function handleUpdateGroup(groupId: string, changes: Partial<Group>) {
		commandStore.updateGroup(groupId, changes);
	}

	function handleToggleGroupCollapse(groupId: string) {
		const newCollapsed = new Set(collapsedGroups);
		if (newCollapsed.has(groupId)) {
			newCollapsed.delete(groupId);
		} else {
			newCollapsed.add(groupId);
		}
		collapsedGroups = newCollapsed;
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Activity'} | Friend Hat</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="mx-auto max-w-7xl space-y-4 p-4">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading activity...</p>
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<p class="text-red-700">{loadError}</p>
			<a href="/groups" class="mt-2 inline-block text-sm text-blue-600 underline">
				&larr; Back to activities
			</a>
		</div>
	{:else if program}
		<!-- Header -->
		<header class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<a href="/groups" class="text-sm text-gray-500 hover:text-gray-700">&larr; All activities</a>
				<h1 class="mt-1 text-2xl font-semibold text-gray-900">{program.name}</h1>
				<p class="text-sm text-gray-500">
					{students.length} students &middot; {preferences.length} with preferences
				</p>
			</div>

			{#if scenario}
				<!-- Controls when groups exist -->
				<div class="flex flex-wrap items-center gap-2">
					<!-- Undo/Redo buttons -->
					<button
						type="button"
						class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={!canUndo}
						onclick={() => commandStore.undo()}
						title="Undo (Ctrl+Z)"
					>
						Undo
					</button>
					<button
						type="button"
						class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={!canRedo}
						onclick={() => commandStore.redo()}
						title="Redo (Ctrl+Y)"
					>
						Redo
					</button>

					<span class="mx-2 h-6 w-px bg-gray-300"></span>

					<!-- Start Over button -->
					<button
						type="button"
						class="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
						onclick={() => (showStartOverConfirm = true)}
					>
						Start Over
					</button>
				</div>
			{/if}
		</header>

		{#if scenario}
			<!-- Metrics bar -->
			{#if analytics}
				<div class="flex flex-wrap gap-4 rounded-lg bg-gray-50 p-4">
					<div class="flex items-baseline gap-2">
						<span class="text-sm text-gray-500">Top choice</span>
						<span class="text-lg font-semibold text-green-700">
							{analytics.percentAssignedTopChoice.toFixed(0)}%
						</span>
					</div>
					{#if analytics.percentAssignedTop2 !== undefined}
						<div class="flex items-baseline gap-2">
							<span class="text-sm text-gray-500">Top 2</span>
							<span class="text-lg font-semibold text-blue-700">
								{analytics.percentAssignedTop2.toFixed(0)}%
							</span>
						</div>
					{/if}
					<div class="flex items-baseline gap-2">
						<span class="text-sm text-gray-500">Avg rank</span>
						<span class="text-lg font-semibold text-gray-700">
							{isNaN(analytics.averagePreferenceRankAssigned)
								? '—'
								: analytics.averagePreferenceRankAssigned.toFixed(1)}
						</span>
					</div>
					<div class="ml-auto flex items-baseline gap-2">
						<span class="text-sm text-gray-500">{groups.length} groups</span>
						{#if unassignedStudentIds.length > 0}
							<span class="text-sm text-amber-600">
								&middot; {unassignedStudentIds.length} unassigned
							</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Group editor -->
			<div class="flex gap-4">
				<!-- Unassigned sidebar -->
				{#if unassignedStudentIds.length > 0 || groups.length > 0}
					<UnassignedSidebar
						studentIds={unassignedStudentIds}
						{selectedStudentId}
						{currentlyDragging}
						{flashingContainer}
						isCollapsed={unassignedCollapsed}
						onDrop={handleDrop}
						onDragStart={handleDragStart}
						onClick={handleStudentClick}
						onToggleCollapse={() => (unassignedCollapsed = !unassignedCollapsed)}
					/>
				{/if}

				<!-- Groups area -->
				<div class="flex-1">
					{#if useVerticalLayout}
						<VerticalGroupLayout
							{groups}
							{selectedStudentId}
							{currentlyDragging}
							{collapsedGroups}
							{flashingContainer}
							onDrop={handleDrop}
							onDragStart={handleDragStart}
							onClick={handleStudentClick}
							onUpdateGroup={handleUpdateGroup}
							onToggleCollapse={handleToggleGroupCollapse}
						/>
					{:else}
						<HorizontalGroupLayout
							{groups}
							{selectedStudentId}
							{currentlyDragging}
							{flashingContainer}
							onDrop={handleDrop}
							onDragStart={handleDragStart}
							onClick={handleStudentClick}
							onUpdateGroup={handleUpdateGroup}
						/>
					{/if}
				</div>
			</div>
		{:else}
			<!-- No scenario yet - show generate button -->
			<div class="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
				<h2 class="text-lg font-medium text-gray-900">Generate Groups</h2>
				<p class="mt-2 text-sm text-gray-500">
					{#if preferences.length > 0}
						Create groups based on {preferences.length} student preferences
					{:else}
						Create random groups (no preferences loaded)
					{/if}
				</p>
				<button
					type="button"
					class="mt-4 rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
					disabled={isGenerating}
					onclick={handleGenerateScenario}
				>
					{isGenerating ? 'Generating...' : 'Generate Groups'}
				</button>

				{#if generateError}
					<p class="mt-3 text-sm text-red-600">{generateError}</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<!-- Start Over confirmation modal -->
{#if showStartOverConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
			<h3 class="text-lg font-medium text-gray-900">Start over?</h3>
			<p class="mt-2 text-sm text-gray-600">
				This will discard your current groups and generate new ones. Manual changes will be lost.
			</p>
			<div class="mt-4 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					onclick={() => (showStartOverConfirm = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
					onclick={handleStartOver}
					disabled={isResetting}
				>
					{isResetting ? 'Generating...' : 'Start Over'}
				</button>
			</div>
		</div>
	</div>
{/if}
