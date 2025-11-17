<script lang="ts">
	import { setAppDataContext } from '$lib/contexts/appData';
	import HorizontalGroupLayout from '$lib/components/HorizontalGroupLayout.svelte';
	import VerticalGroupLayout from '$lib/components/VerticalGroupLayout.svelte';
	import Inspector from '$lib/components/Inspector/Inspector.svelte';
	import UnassignedHorizontal from '$lib/components/UnassignedHorizontal.svelte';
	import { ensurePreferences } from '$lib/data/roster';
	import { getDisplayName } from '$lib/utils/friends';
	import { initializeDragMonitor, type DropState } from '$lib/utils/pragmatic-dnd';
	import type { Student, Group, Mode } from '$lib/types';
	import type { StudentPreference } from '$lib/types/preferences';
	import { commandStore } from '$lib/stores/commands.svelte';
	import { createUiControlsStore } from '$lib/stores/uiControlsStore';
	import {
		SHEET_DATA_GUIDANCE,
		SheetDataError,
		getTestRosterDataset,
		normalizeSheetResponse,
		parseRosterFromPaste,
		parseRosterFromSheets,
		type RosterData
	} from '$lib/services/rosterImport';
	import { createGroupAssignmentService } from '$lib/services/groupAssignment';
	import { onMount } from 'svelte';

	// ---------- STATE ----------
	let rawPaste = $state('');
	let parseError = $state<string | null>(null);

	// Core datasets: students and preferences
	// studentsById holds Student objects (without friendIds)
	let studentsById = $state<Record<string, Student>>({});
	// preferencesById holds StudentPreference objects keyed by student id
	let preferencesById = $state<Record<string, StudentPreference>>({});
	// deterministic original order (ids)
	let studentOrder = $state<string[]>([]);

	// unknown preferred ids encountered in paste (friends not in roster)
	let unknownFriendIds = $state<Set<string>>(new Set());

	// UI mode: groups by count or by target size
	let mode = $state<Mode>('COUNT');

	// controls
	let numberOfGroups = $state(4);
	let targetGroupSize = $state(10);
	let showGender = $state(true);

	// groups
	// Read groups from store (reactive)
	// This creates a reactive reference - when store's groups change, UI updates
	let groups = $derived(commandStore.groups);
	const unassigned = $derived.by(() => {
		const assignedIds = new Set(groups.flatMap((g) => g.memberIds));
		return studentOrder.filter((id) => !assignedIds.has(id));
	});

	// selection/highlight
	let selectedStudentId = $state<string | null>(null);

        let isLoadingFromSheet = $state(false);
        let sheetLoadError = $state('');
        let sheetLoadGuidance = $state<string[]>([]);

        // Add after other state declarations (around line 40)
        let currentlyDragging = $state<string | null>(null); // student ID being dragged

        // Collapse state for vertical layout
        let collapsedGroups = $state<Set<string>>(new Set());

        const {
                toggleCollapse,
                handleDragStart,
                handleStudentClick,
                handleDrop
        } = createUiControlsStore({
                getGroups: () => groups,
                commandStore,
                getCollapsedGroups: () => collapsedGroups,
                setCollapsedGroups: (next) => (collapsedGroups = next),
                getSelectedStudentId: () => selectedStudentId,
                setSelectedStudentId: (value) => (selectedStudentId = value),
                setCurrentlyDragging: (value) => (currentlyDragging = value)
        });

        const { clearAndRandomAssign, autoAssignBalanced, studentHappiness } =
                createGroupAssignmentService({
                        commandStore,
                        getGroups: () => groups,
                        getStudentOrder: () => studentOrder,
                        getPreferencesById: () => preferencesById,
                        getStudentsById: () => studentsById,
                        resetCollapsedGroups: () => (collapsedGroups = new Set())
                });

        // Layout mode determination
        const useVerticalLayout = $derived(groups.length > 5);

	// Set up context - must be at top level, not in $effect
	// Provide students and preferences to child components
	setAppDataContext({ studentsById, preferencesById });

	console.log(
		'🟣 Context set in +page.svelte with studentsById count:',
		Object.keys(studentsById).length,
		'and preferencesById count:',
		Object.keys(preferencesById).length
	);

	// ---------- HELPERS ----------
	const uid = () => Math.random().toString(36).slice(2, 9);

        function applyRosterData(data: RosterData) {
                Object.keys(studentsById).forEach((key) => delete studentsById[key]);
                Object.keys(preferencesById).forEach((key) => delete preferencesById[key]);

                Object.assign(studentsById, data.studentsById);
                Object.assign(preferencesById, data.preferencesById);

                studentOrder = data.studentOrder;
                unknownFriendIds = data.unknownFriendIds;
                parseError = '';
        }

	function resetAll() {
		groups = [];
		selectedStudentId = null;
		parseError = null;
		unknownFriendIds = new Set();
	}

	function clearAssignments() {
		// Create new groups with empty member lists
		const clearedGroups = commandStore.groups.map((g) => ({ ...g, memberIds: [] }));

		// Reinitialize store with cleared groups
		commandStore.initializeGroups(clearedGroups);

		selectedStudentId = null;

		// Clear collapsed state on destructive operation
		collapsedGroups = new Set();
	}

	function initGroups() {
		const total = studentOrder.length;
		let newGroups: Group[];

		if (mode === 'COUNT') {
			const n = Math.max(1, numberOfGroups | 0);
			newGroups = Array.from({ length: n }, (_, i) => ({
				id: uid(),
				name: `Group ${i + 1}`,
				capacity: Math.ceil(total / n),
				memberIds: []
			}));
		} else {
			const size = Math.max(1, targetGroupSize | 0);
			const n = Math.max(1, Math.ceil(total / size));
			newGroups = Array.from({ length: n }, (_, i) => ({
				id: uid(),
				name: `Group ${i + 1}`,
				capacity: size,
				memberIds: []
			}));
		}

		// Initialize groups in store (this clears history too)
		commandStore.initializeGroups(newGroups);
	}

        // ---------- TEST DATA ----------
        function loadTestData() {
                console.log('🧪 loadTestData called');
                sheetLoadError = '';
                sheetLoadGuidance = [];

                try {
                        resetAll();
                        const { students, connections } = getTestRosterDataset();
                        const parsed = parseRosterFromSheets(students, connections);
                        applyRosterData(parsed);

                        numberOfGroups = 5;
                        mode = 'COUNT';
                        initGroups();

                        console.log('🎯 loadTestData complete:', {
                                studentsById: Object.keys(studentsById).length,
                                studentOrder: studentOrder.length,
                                preferencesById: Object.keys(preferencesById).length,
                                groups: groups.length,
                                unassigned: unassigned.length
                        });
                } catch (error) {
                        parseError = error instanceof Error ? error.message : 'Unknown error';
                }
        }
	// ---------- LOAD FROM SHEETS API ----------

        async function loadFromSheets() {
                isLoadingFromSheet = true;
                sheetLoadError = '';
                sheetLoadGuidance = [];

                try {
                        const response = await fetch('/api/data');

                        if (!response.ok) {
                                const errorData = await response.json().catch(() => ({}));
                                throw new Error(errorData.error || 'Failed to load from Google Sheets');
                        }

                        const result = await response.json();

                        if (!result.success) {
                                throw new SheetDataError('Google Sheets did not return a successful response.');
                        }

                        const { students: normalizedStudents, connections: normalizedConnections } =
                                normalizeSheetResponse(result);

                        resetAll();
                        const parsed = parseRosterFromSheets(normalizedStudents, normalizedConnections);
                        applyRosterData(parsed);

                        initGroups();
                        sheetLoadGuidance = [];

                        console.log(`✅ Loaded ${result.studentCount} students from Google Sheets`);
                } catch (error) {
                        console.error('Failed to load from Google Sheets:', error);
                        if (error instanceof SheetDataError) {
                                sheetLoadError = error.message;
                                sheetLoadGuidance = error.guidance;
                                parseError = error.message;
                        } else {
                                const message = error instanceof Error ? error.message : 'Unknown error';
                                sheetLoadError = message;
                                sheetLoadGuidance = [];
                                parseError = message;
                        }
                } finally {
                        isLoadingFromSheet = false;
                }
        }

	// ---------- PARSING ----------
	/**
	 * Expected headers (order-insensitive, minimal):
	 * - "display name" (or "name")
	 * - "id" (unique email)
	 * - "friend 1 id", "friend 2 id", ..., any number of friend columns
	 *
	 * Notes:
	 * - Some students have no friends listed (friend columns may be empty or absent).
	 * - Some friend ids may not exist in the dataset → ignored.
	 */
        function parsePasted(text: string) {
                resetAll();
                sheetLoadError = '';
                sheetLoadGuidance = [];

                try {
                        const parsed = parseRosterFromPaste(text);
                        applyRosterData(parsed);
                        initGroups();
                } catch (error) {
                        parseError = error instanceof Error ? error.message : 'Unknown error';
                }
        }

        // Parsing helpers now live in $lib/services/rosterImport.ts

	// ---------- DnD with Pragmatic Drag and Drop ----------

	// Initialize monitor on mount
	let monitorCleanup: (() => void) | null = null;
	onMount(() => {
		monitorCleanup = initializeDragMonitor();
		return () => {
			monitorCleanup?.();
		};
	});

        function handleUpdateGroup(groupId: string, changes: Partial<Group>) {
                commandStore.updateGroup(groupId, changes);
        }

        const totalHappiness = $derived.by(() => {
                let sum = 0;
                for (const id of studentOrder) sum += studentHappiness(id);
                return sum;
        });
	// ---------- EXPORT ----------
	function copyTSV() {
		const rows: string[] = [];
		rows.push(['group', 'display name', 'id'].join('\t'));

		for (const g of groups) {
			for (const id of g.memberIds) {
				const s = studentsById[id];
				rows.push([g.name, s ? getDisplayName(s) : '', s?.id ?? ''].join('\t'));
			}
		}
		for (const id of unassigned) {
			const s = studentsById[id];
			rows.push(['Unassigned', s ? getDisplayName(s) : '', s?.id ?? ''].join('\t'));
		}

		const tsv = rows.join('\n');
		navigator.clipboard.writeText(tsv).catch(() => {});
	}

	// Keyboard shortcuts for undo/redo
	onMount(() => {
		function handleKeyboard(e: KeyboardEvent) {
			// Ctrl+Z (or Cmd+Z on Mac) = Undo
			if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
				e.preventDefault(); // Don't trigger browser undo
				commandStore.undo();
			}

			// Ctrl+Y (or Cmd+Shift+Z on Mac) = Redo
			if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
				e.preventDefault(); // Don't trigger browser redo
				commandStore.redo();
			}
		}

		window.addEventListener('keydown', handleKeyboard);

		// Cleanup: remove listener when component is destroyed
		return () => {
			window.removeEventListener('keydown', handleKeyboard);
		};
	});

	// ---------- DERIVED ----------
	const totalStudents = $derived(studentOrder.length);
	const placedCount = $derived(groups.reduce((acc, g) => acc + g.memberIds.length, 0));
	const unassignedCount = $derived(unassigned.length);
</script>

<!-- LAYOUT -->
<div class="mx-auto max-w-7xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Group Hat v3 — MVP</h1>
		<div class="text-sm text-gray-500">Privacy-first • Client-side • No data stored</div>
	</header>

	<!-- PASTE & PARSE -->
	<section class="grid gap-4 md:grid-cols-3">
		<div class="space-y-2 md:col-span-2">
			<label class="block text-sm font-medium">Paste from Google Sheets (TSV/CSV)</label>
			<textarea
				class="h-40 w-full rounded-md border p-2 font-mono text-sm"
				bind:value={rawPaste}
				placeholder="Headers required: display name | name, id, friend 1 id, friend 2 id, ..."
			>
			</textarea>
			<div class="flex items-center gap-2">
				<button
					class="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
					on:click={() => parsePasted(rawPaste)}
				>
					Parse data
				</button>
				<button
					class="rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
					on:click={loadFromSheets}
					disabled={isLoadingFromSheet}
				>
					{isLoadingFromSheet ? '⏳ Loading...' : '📊 Load from Sheet'}
				</button>
				<button class="rounded-md border px-3 py-2 hover:bg-gray-50" on:click={loadTestData}>
					🧪 Load Test Data
				</button>
				{#if sheetLoadError}
					<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
						<p class="font-semibold">{sheetLoadError}</p>
						{#if sheetLoadGuidance.length > 0}
							<ul class="mt-2 list-disc space-y-1 pl-5 text-red-700">
								{#each sheetLoadGuidance as tip}
									<li>{tip}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{:else if parseError}
					<span class="text-sm text-red-600">{parseError}</span>
				{:else if totalStudents > 0}
					<span class="text-sm text-gray-600">
						Parsed <strong>{totalStudents}</strong> students.
						{#if unknownFriendIds.size > 0}
							Ignored <strong>{unknownFriendIds.size}</strong> friend id{unknownFriendIds.size === 1
								? ''
								: 's'} not in list.
						{/if}
					</span>
				{/if}
			</div>
			<p class="text-xs text-gray-500">
				Required columns: <code>display name</code> (or <code>name</code>), <code>id</code> (unique
				email). Any number of <code>friend N id</code> columns are supported. Missing/unknown friend
				ids are ignored.
			</p>
		</div>

		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium">Mode</label>
				<select class="rounded-md border p-1 text-sm" bind:value={mode}>
					<option value="COUNT">Number of groups</option>
					<option value="SIZE">Target group size</option>
				</select>
			</div>

			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={showGender} />
				Show gender badges
			</label>

			{#if mode === 'COUNT'}
				<div class="space-y-1">
					<label class="block text-sm">Number of groups</label>
					<input
						type="number"
						min="1"
						class="w-32 rounded-md border p-1"
						bind:value={numberOfGroups}
					/>
				</div>
			{:else}
				<div class="space-y-1">
					<label class="block text-sm">Target group size</label>
					<input
						type="number"
						min="1"
						class="w-32 rounded-md border p-1"
						bind:value={targetGroupSize}
					/>
				</div>
			{/if}

			<div class="flex flex-wrap gap-2">
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={initGroups}
					disabled={totalStudents === 0}
				>
					Create/Reset groups
				</button>
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={clearAssignments}
					disabled={groups.length === 0}
				>
					Clear assignments
				</button>
			</div>

			<div class="space-y-1 text-sm">
				<div>Total students: <strong>{totalStudents}</strong></div>
				<div>
					Placed: <strong>{placedCount}</strong> • Unassigned: <strong>{unassignedCount}</strong>
				</div>
				<div>Total happiness: <strong>{totalHappiness}</strong></div>
			</div>

			<div class="flex flex-wrap gap-2">
				<button
					class="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
					disabled={groups.length === 0}
					on:click={autoAssignBalanced}
				>
					Auto-assign (honor friends)
				</button>
				<button
					class="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
					disabled={groups.length === 0}
					on:click={clearAndRandomAssign}
				>
					Random assign
				</button>
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={copyTSV}
					disabled={totalStudents === 0}
				>
					Copy TSV for Sheets
				</button>

				<!-- Undo/Redo Controls -->
				<div class="flex flex-wrap items-center gap-2 border-t pt-3">
					<button
						class="rounded-md border bg-white px-3 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
						on:click={() => commandStore.undo()}
						disabled={!commandStore.canUndo}
						title="Undo last action (Ctrl+Z)"
					>
						⬅️ Undo
					</button>

					<button
						class="rounded-md border bg-white px-3 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
						on:click={() => commandStore.redo()}
						disabled={!commandStore.canRedo}
						title="Redo last undone action (Ctrl+Y)"
					>
						➡️ Redo
					</button>

					<div class="text-sm text-gray-600">
						<span class="font-medium">History:</span>
						{commandStore.getHistoryState().length} commands
						{#if commandStore.getHistoryState().index >= 0}
							(at position {commandStore.getHistoryState().index + 1})
						{:else}
							(empty)
						{/if}
					</div>
				</div>
				<!-- Debug Panel (remove in production) -->
				<div class="mt-4 rounded border border-gray-300 bg-gray-50 p-3">
					<h3 class="mb-2 text-sm font-semibold text-gray-700">Debug Info</h3>
					<div class="space-y-1 font-mono text-xs">
						<div>
							<span class="text-gray-600">Store groups:</span>
							{commandStore.groups.length} groups
						</div>
						<div>
							<span class="text-gray-600">History:</span>
							{commandStore.getHistoryState().length} commands, index: {commandStore.getHistoryState()
								.index}
						</div>
						<div>
							<span class="text-gray-600">Can undo:</span>
							{commandStore.canUndo ? '✅' : '❌'}
						</div>
						<div>
							<span class="text-gray-600">Can redo:</span>
							{commandStore.canRedo ? '✅' : '❌'}
						</div>

						<!-- Show groups detail -->
						<details class="mt-2">
							<summary class="cursor-pointer text-gray-600 hover:text-gray-900">
								Groups detail
							</summary>
							<pre class="mt-1 max-h-40 overflow-auto text-xs">
{JSON.stringify(commandStore.groups, null, 2)}
      </pre>
						</details>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- GROUP EDITOR -->
	{#if groups.length > 0}
		<section class="space-y-3">
			<!-- Unassigned students horizontal list -->
			<UnassignedHorizontal
				studentIds={unassigned}
				{selectedStudentId}
				{currentlyDragging}
				onDrop={handleDrop}
				onDragStart={handleDragStart}
				onClick={handleStudentClick}
			/>

			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium">Groups</h2>
				<button
					class="rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
					on:click={() =>
						groups.push({
							id: uid(),
							name: `Group ${groups.length + 1}`,
							capacity: null,
							memberIds: []
						})}
				>
					+ Add group
				</button>
			</div>

			{#if useVerticalLayout}
				<VerticalGroupLayout
					{groups}
					{selectedStudentId}
					{currentlyDragging}
					{collapsedGroups}
					onDrop={handleDrop}
					onDragStart={handleDragStart}
					onClick={handleStudentClick}
					onUpdateGroup={handleUpdateGroup}
					onToggleCollapse={toggleCollapse}
				/>
			{:else}
				<HorizontalGroupLayout
					{groups}
					{selectedStudentId}
					{currentlyDragging}
					onDrop={handleDrop}
					onDragStart={handleDragStart}
					onClick={handleStudentClick}
					onUpdateGroup={handleUpdateGroup}
				/>
			{/if}
		</section>
	{/if}
	<Inspector {selectedStudentId} />
</div>
