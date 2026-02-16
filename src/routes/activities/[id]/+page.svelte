<script lang="ts">
	/**
	 * /activities/[id]/+page.svelte
	 *
	 * Smart Activity Entry Point — serves both personas:
	 * - Math teacher (daily): one tap "New Groups" → generates + opens workspace
	 * - Clubs admin (semester): "Edit Current Groups" → full workspace
	 *
	 * Setup (students, groups, preferences) and History are accessible
	 * but collapsed by default.
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import {
		getActivityData,
		addStudentToPool,
		removeStudentFromPool,
		listGroupTemplates,
		createGroupTemplate,
		renameActivity,
		quickGenerateGroups
	} from '$lib/services/appEnvUseCases';
	import { isErr, isOk } from '$lib/types/result';
	import type { Program, Pool, Scenario, Student, Preference, Session, GroupTemplate } from '$lib/domain';
	import type { GroupShell } from '$lib/utils/groupShellValidation';
	import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';
	import {
		getGenerationSettings,
		saveGenerationSettings,
		type GenerationSettings
	} from '$lib/utils/generationSettings';

	// Section components
	import SetupStudentsSection from '$lib/components/setup/SetupStudentsSection.svelte';
	import SetupHistorySection from '$lib/components/setup/SetupHistorySection.svelte';
	import TemplatePickerModal from '$lib/components/setup/TemplatePickerModal.svelte';
	import SaveTemplateModal from '$lib/components/setup/SaveTemplateModal.svelte';
	import GroupCard from '$lib/components/activity/GroupCard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let scenario = $state<Scenario | null>(null);
	let students = $state<Student[]>([]);
	let preferences = $state<Preference[]>([]);
	let sessions = $state<Session[]>([]);
	let templates = $state<GroupTemplate[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Generation states ---
	let isGeneratingNew = $state(false);
	let generateError = $state<string | null>(null);

	// --- Generation settings ---
	let generationSettings = $state<GenerationSettings>({ groupSize: 4, avoidRecentGroupmates: true });

	// --- Setup section expand states ---
	let expandedSection = $state<'students' | 'history' | null>(null);

	// --- Group configuration state ---
	let groupShells = $state<GroupShell[]>([]);

	// --- Modal states ---
	let showTemplatePicker = $state(false);
	let showSaveTemplate = $state(false);

	// --- Name editing ---
	let isEditingName = $state(false);
	let editedName = $state('');
	let renameError = $state<string | null>(null);

	// --- Derived ---
	let hasGroups = $derived(scenario !== null && scenario.groups.length > 0);
	let studentCount = $derived(students.length);

	let parsedPreferences = $derived<ParsedPreference[]>(
		preferences.map((p) => ({
			studentId: p.studentId,
			likeGroupIds: (p.payload as { likeGroupIds?: string[] })?.likeGroupIds ?? []
		}))
	);

	let publishedSessions = $derived(
		sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED')
	);

	function formatTimeSpanLabel(timeSpan: Program['timeSpan']): string {
		if ('termLabel' in timeSpan) {
			const parsed = new Date(timeSpan.termLabel);
			if (Number.isNaN(parsed.getTime())) return timeSpan.termLabel;
			return parsed.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		}
		if (timeSpan.start) {
			return timeSpan.start.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		}
		return '';
	}

	onMount(async () => {
		env = getAppEnvContext();
		await Promise.all([loadActivityData(), loadTemplates()]);
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
				loadError = `Activity not found`;
			} else {
				loadError = result.error.message;
			}
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		pool = data.pool;
		scenario = data.scenario;
		students = data.students;
		preferences = data.preferences;
		sessions = data.sessions;

		// Initialize group shells from scenario or create defaults
		if (scenario && scenario.groups.length > 0) {
			groupShells = scenario.groups.map((g) => ({
				name: g.name,
				capacity: g.capacity
			}));
		} else {
			groupShells = [
				{ name: 'Group 1', capacity: null },
				{ name: 'Group 2', capacity: null },
				{ name: 'Group 3', capacity: null },
				{ name: 'Group 4', capacity: null }
			];
		}

		// Load generation settings from localStorage
		generationSettings = getGenerationSettings(programId);

		// If no published sessions, default avoid-recent to false
		const published = sessions.filter(
			(s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED'
		);
		if (published.length === 0) {
			generationSettings.avoidRecentGroupmates = false;
		}

		loading = false;
	}

	async function loadTemplates() {
		if (!env) return;
		const result = await listGroupTemplates(env);
		if (isOk(result)) {
			templates = result.value;
		}
	}

	// --- Name editing ---
	function startEditingName() {
		if (program) {
			editedName = program.name;
			renameError = null;
			isEditingName = true;
		}
	}

	async function saveNameEdit() {
		if (!env || !program) return;

		const trimmed = editedName.trim();
		if (!trimmed) {
			renameError = 'Activity name cannot be empty';
			return;
		}

		const result = await renameActivity(env, {
			programId: program.id,
			newName: trimmed
		});

		if (isErr(result)) {
			renameError = result.error.message;
			return;
		}

		program = { ...program, name: trimmed };
		isEditingName = false;
	}

	function cancelNameEdit() {
		isEditingName = false;
		renameError = null;
	}

	function handleNameKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveNameEdit();
		} else if (event.key === 'Escape') {
			cancelNameEdit();
		}
	}

	// --- Section toggle handlers ---
	function handleSectionToggle(section: 'students' | 'history') {
		return (isExpanded: boolean) => {
			expandedSection = isExpanded ? section : null;
		};
	}

	// --- Student handlers ---
	async function handleAddStudent(firstName: string, lastName?: string) {
		if (!env || !pool) return;

		const result = await addStudentToPool(env, {
			poolId: pool.id,
			firstName,
			lastName
		});

		if (isErr(result)) {
			const error = result.error;
			if (error.type === 'VALIDATION_ERROR') {
				throw new Error(error.message);
			} else if (error.type === 'STUDENT_ALREADY_EXISTS') {
				throw new Error(`Student ${error.studentId} already exists`);
			} else if (error.type === 'POOL_NOT_FOUND') {
				throw new Error('Roster not found');
			}
			throw new Error('Failed to add student');
		}

		students = [...students, result.value.student];
	}

	async function handleRemoveStudent(studentId: string) {
		if (!env || !pool || !program) return;

		const result = await removeStudentFromPool(env, {
			poolId: pool.id,
			studentId,
			programId: program.id
		});

		if (isErr(result)) {
			throw new Error(
				result.error.type === 'STUDENT_NOT_IN_POOL'
					? 'Student not found in roster'
					: 'Failed to remove student'
			);
		}

		students = students.filter((s) => s.id !== studentId);

		if (result.value.removedFromGroup && result.value.updatedScenario) {
			scenario = result.value.updatedScenario;
		}
	}

	// --- Group handlers ---
	function handleGroupsChange(newGroups: GroupShell[]) {
		groupShells = newGroups;
	}

	function handleUseTemplate() {
		showTemplatePicker = true;
	}

	function handleSaveAsTemplate() {
		showSaveTemplate = true;
	}

	function handleSelectTemplate(shells: GroupShell[]) {
		groupShells = shells;
		generationSettings = { ...generationSettings, customShells: shells };
		showTemplatePicker = false;
	}

	async function handleSaveTemplate(name: string, description?: string) {
		if (!env) return;

		const result = await createGroupTemplate(env, {
			name,
			description,
			groups: groupShells.map((g) => ({
				name: g.name,
				capacity: g.capacity
			}))
		});

		if (isErr(result)) {
			throw new Error(result.error.message);
		}

		await loadTemplates();
	}

	// --- Settings change handler ---
	function handleSettingsChange(settings: GenerationSettings) {
		generationSettings = settings;
	}

	// --- History arrangement loader ---
	async function handleLoadArrangement(sessionId: string) {
		if (!env) return null;

		const session = sessions.find((s) => s.id === sessionId);
		if (!session) return null;

		// Reconstruct groups from placements (which snapshot group names at creation time)
		// rather than loading the mutable scenario
		const placements = await env.placementRepo.listBySessionId(sessionId);
		if (placements.length === 0) return null;

		const groupMap = new Map<string, { id: string; name: string; memberIds: string[] }>();
		for (const p of placements) {
			let group = groupMap.get(p.groupId);
			if (!group) {
				group = { id: p.groupId, name: p.groupName, memberIds: [] };
				groupMap.set(p.groupId, group);
			}
			group.memberIds.push(p.studentId);
		}

		const groups = Array.from(groupMap.values()).map((g) => ({
			id: g.id,
			name: g.name,
			capacity: null,
			memberIds: g.memberIds
		}));

		return { session, groups };
	}

	// --- Generate groups (unified) ---
	async function handleGenerate() {
		if (!env || !program) return;

		isGeneratingNew = true;
		generateError = null;

		saveGenerationSettings(program.id, generationSettings);

		const result = await quickGenerateGroups(env, {
			programId: program.id,
			groupSize: generationSettings.groupSize,
			groups: generationSettings.customShells,
			avoidRecentGroupmates: generationSettings.avoidRecentGroupmates
		});

		if (isErr(result)) {
			generateError =
				result.error.type === 'GROUPING_ALGORITHM_FAILED'
					? result.error.message
					: `Failed to generate groups: ${result.error.type}`;
			isGeneratingNew = false;
			return;
		}

		await goto(`/activities/${program.id}/workspace`);
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-3xl p-4">
	{#if loading}
		<div class="space-y-6">
			<div class="flex items-center gap-3">
				<Skeleton width="100px" height="1rem" />
			</div>
			<div class="flex items-center justify-between">
				<Skeleton width="200px" height="2rem" />
				<Skeleton width="120px" height="2.5rem" rounded="lg" />
			</div>
			{#each Array(3) as _}
				<div class="rounded-lg border border-gray-200 p-4">
					<div class="flex items-center justify-between">
						<Skeleton width="40%" height="1.25rem" />
						<Skeleton width="60px" height="1rem" />
					</div>
				</div>
			{/each}
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-6">
			<p class="text-red-700">{loadError}</p>
			<a href="/activities" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
				Back to activities
			</a>
		</div>
	{:else if program}
		<!-- Header -->
		<div class="mb-6">
			<!-- Back link -->
			<a
				href="/activities"
				class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
			>
				<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Activities
			</a>

			<!-- Activity name + student count -->
			<div class="mt-3 flex items-start justify-between">
				<div class="min-w-0 flex-1">
					{#if isEditingName}
						<div class="flex items-center gap-2">
							<input
								type="text"
								class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xl font-semibold shadow-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
								bind:value={editedName}
								onkeydown={handleNameKeyDown}
								onblur={saveNameEdit}
							/>
						</div>
						{#if renameError}
							<p class="mt-1 text-sm text-red-600">{renameError}</p>
						{/if}
					{:else}
						<button
							type="button"
							class="group flex items-center gap-2 text-left"
							onclick={startEditingName}
							title="Click to rename"
						>
							<h1 class="text-2xl font-semibold text-gray-900">{program.name}</h1>
							<svg
								class="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
							</svg>
						</button>
					{/if}
				</div>
				<span class="ml-4 mt-1 text-sm text-gray-500">
					{studentCount} {studentCount === 1 ? 'student' : 'students'}
				</span>
			</div>
			{#if formatTimeSpanLabel(program.timeSpan)}
				<p class="mt-1 text-sm text-gray-400">{formatTimeSpanLabel(program.timeSpan)}</p>
			{/if}
		</div>

		<!-- Generate error -->
		{#if generateError}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
				{generateError}
			</div>
		{/if}

		{#if studentCount === 0}
			<!-- No students yet: prompt to add students -->
			<div class="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
				<svg class="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<h2 class="mt-3 text-lg font-medium text-gray-900">Add students to get started</h2>
				<p class="mt-1 text-sm text-gray-500">
					Add students in the Setup section below, then generate groups.
				</p>
			</div>
		{:else}
			<GroupCard
				{studentCount}
				{groupShells}
				{generationSettings}
				hasPublishedSessions={publishedSessions.length > 0}
				hasExistingGroups={hasGroups}
				existingGroupCount={scenario?.groups.length ?? 0}
				isGenerating={isGeneratingNew}
				{generateError}
				onGroupShellsChange={handleGroupsChange}
				onSettingsChange={handleSettingsChange}
				onGenerate={handleGenerate}
				onEditCurrentGroups={() => goto(`/activities/${program!.id}/workspace`)}
				onUseTemplate={handleUseTemplate}
				onSaveAsTemplate={handleSaveAsTemplate}
			/>
		{/if}

		<!-- Divider -->
		<div class="my-6 border-t border-gray-200"></div>

		<!-- Setup & History sections (collapsed by default) -->
		<div class="space-y-3">
			<!-- Students section -->
			<SetupStudentsSection
				{students}
				isExpanded={expandedSection === 'students'}
				onToggle={handleSectionToggle('students')}
				onAddStudent={handleAddStudent}
				onRemoveStudent={handleRemoveStudent}
				preferences={parsedPreferences}
				getEditStudentHref={(studentId) => `/activities/${program!.id}/students/${studentId}`}
			/>

			<!-- History section -->
			<SetupHistorySection
				{sessions}
				{students}
				isExpanded={expandedSection === 'history'}
				onToggle={handleSectionToggle('history')}
				onLoadArrangement={handleLoadArrangement}
			/>
		</div>
	{/if}
</div>

<!-- Template Picker Modal -->
<TemplatePickerModal
	isOpen={showTemplatePicker}
	{templates}
	onClose={() => (showTemplatePicker = false)}
	onSelectTemplate={handleSelectTemplate}
/>

<!-- Save Template Modal -->
<SaveTemplateModal
	isOpen={showSaveTemplate}
	groups={groupShells}
	onClose={() => (showSaveTemplate = false)}
	onSave={handleSaveTemplate}
/>
