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
	import SetupGroupsSection from '$lib/components/setup/SetupGroupsSection.svelte';
	import SetupHistorySection from '$lib/components/setup/SetupHistorySection.svelte';
	import TemplatePickerModal from '$lib/components/setup/TemplatePickerModal.svelte';
	import SaveTemplateModal from '$lib/components/setup/SaveTemplateModal.svelte';
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
	let showSettingsEditor = $state(false);

	// --- Setup section expand states ---
	let expandedSection = $state<'students' | 'groups' | 'history' | null>(null);

	// --- Group configuration state ---
	let groupShells = $state<GroupShell[]>([]);
	let groupsModified = $state(false);

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
	let groupCount = $derived(groupShells.length);

	let parsedPreferences = $derived<ParsedPreference[]>(
		preferences.map((p) => ({
			studentId: p.studentId,
			likeGroupIds: (p.payload as { likeGroupIds?: string[] })?.likeGroupIds ?? []
		}))
	);

	let preferencesCount = $derived(
		parsedPreferences.filter((pref) => (pref.likeGroupIds ?? []).length > 0).length
	);

	let publishedSessions = $derived(
		sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED')
	);

	let latestPublishedSession = $derived(
		publishedSessions.length > 0
			? publishedSessions.sort(
					(a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
				)[0]
			: null
	);

	let computedGroupCount = $derived(
		studentCount > 0 && generationSettings.groupSize > 0
			? Math.ceil(studentCount / generationSettings.groupSize)
			: 0
	);

	let maxGroupSize = $derived(Math.max(2, Math.min(8, Math.floor(studentCount / 2))));

	function formatDate(date: Date | undefined): string {
		if (!date) return '';
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

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
	function handleSectionToggle(section: 'students' | 'groups' | 'history') {
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
		groupsModified = true;
	}

	function handleUseTemplate() {
		showTemplatePicker = true;
	}

	function handleSaveAsTemplate() {
		showSaveTemplate = true;
	}

	function handleSelectTemplate(shells: GroupShell[]) {
		groupShells = shells;
		groupsModified = true;
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

	// --- Generation settings handlers ---
	function decrementGroupSize() {
		if (generationSettings.groupSize > 2) {
			generationSettings = {
				...generationSettings,
				groupSize: generationSettings.groupSize - 1
			};
		}
	}

	function incrementGroupSize() {
		if (generationSettings.groupSize < maxGroupSize) {
			generationSettings = {
				...generationSettings,
				groupSize: generationSettings.groupSize + 1
			};
		}
	}

	function toggleAvoidRecent() {
		generationSettings = {
			...generationSettings,
			avoidRecentGroupmates: !generationSettings.avoidRecentGroupmates
		};
	}

	// --- Generate new groups ---
	async function handleNewGroups() {
		if (!env || !program) return;

		isGeneratingNew = true;
		generateError = null;

		saveGenerationSettings(program.id, generationSettings);

		const result = await quickGenerateGroups(env, {
			programId: program.id,
			groupSize: generationSettings.groupSize,
			groupNamePrefix: 'Group',
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

	// --- First-time generate (from inline picker) ---
	async function handleFirstGenerate() {
		if (!env || !program) return;

		isGeneratingNew = true;
		generateError = null;

		saveGenerationSettings(program.id, generationSettings);

		const result = await quickGenerateGroups(env, {
			programId: program.id,
			groupSize: generationSettings.groupSize,
			groupNamePrefix: 'Group',
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
		{:else if !hasGroups}
			<!-- First-time: inline group size picker -->
			<div class="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-gray-900">Generate your first groups</h2>
				<p class="mt-1 text-sm text-gray-500">{studentCount} students</p>

				<!-- Group size selector -->
				<div class="mt-5">
					<label class="mb-2 block text-sm font-medium text-gray-700" for="first-group-size">
						Students per group
					</label>
					<div class="flex items-center gap-4">
						<button
							onclick={decrementGroupSize}
							disabled={generationSettings.groupSize <= 2}
							class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-lg font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							-
						</button>
						<span id="first-group-size" class="min-w-[2ch] text-center text-3xl font-semibold text-gray-900">
							{generationSettings.groupSize}
						</span>
						<button
							onclick={incrementGroupSize}
							disabled={generationSettings.groupSize >= maxGroupSize}
							class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-lg font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							+
						</button>
					</div>
					<p class="mt-2 text-sm text-gray-500">
						{computedGroupCount} group{computedGroupCount !== 1 ? 's' : ''}
					</p>
				</div>

				<!-- Generate button -->
				<button
					type="button"
					class="mt-6 w-full rounded-lg bg-teal px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					onclick={handleFirstGenerate}
					disabled={isGeneratingNew}
				>
					{#if isGeneratingNew}
						<span class="inline-flex items-center gap-2">
							<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
							</svg>
							Generating...
						</span>
					{:else}
						Generate Groups
					{/if}
				</button>
			</div>
		{:else}
			<!-- Has groups: show two primary action cards -->
			<div class="space-y-3">
				<!-- New Groups card -->
				<div class="relative">
					<div
						class="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-teal {isGeneratingNew ? 'opacity-60' : ''}"
					>
						<div class="flex items-center justify-between">
							<button
								type="button"
								class="flex-1 text-left"
								onclick={handleNewGroups}
								disabled={isGeneratingNew}
							>
								<div class="flex items-center gap-2">
									{#if isGeneratingNew}
										<svg class="h-5 w-5 animate-spin text-teal" viewBox="0 0 24 24" fill="none">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
										</svg>
									{:else}
										<svg class="h-5 w-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
									{/if}
									<h2 class="text-lg font-semibold text-gray-900">
										{isGeneratingNew ? 'Generating...' : 'New Groups'}
									</h2>
								</div>
								<p class="mt-1 text-sm text-gray-500">
									Groups of {generationSettings.groupSize}
									{#if generationSettings.avoidRecentGroupmates && publishedSessions.length > 0}
										<span class="text-gray-400"> · avoid recent groupmates</span>
									{/if}
								</p>
							</button>
							<button
								type="button"
								class="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
								onclick={() => (showSettingsEditor = !showSettingsEditor)}
							>
								Change
							</button>
						</div>
					</div>

					<!-- Settings popover -->
					{#if showSettingsEditor}
						<div class="mt-2 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
							<div class="flex items-center justify-between">
								<label class="text-sm font-medium text-gray-700" for="settings-group-size">
									Students per group
								</label>
								<div class="flex items-center gap-3">
									<button
										onclick={decrementGroupSize}
										disabled={generationSettings.groupSize <= 2}
										class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										-
									</button>
									<span id="settings-group-size" class="min-w-[2ch] text-center text-xl font-semibold text-gray-900">
										{generationSettings.groupSize}
									</span>
									<button
										onclick={incrementGroupSize}
										disabled={generationSettings.groupSize >= maxGroupSize}
										class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										+
									</button>
								</div>
							</div>
							<p class="mt-1 text-xs text-gray-400">
								{computedGroupCount} group{computedGroupCount !== 1 ? 's' : ''}
							</p>

							{#if publishedSessions.length > 0}
								<label class="mt-3 flex cursor-pointer items-center gap-3">
									<input
										type="checkbox"
										checked={generationSettings.avoidRecentGroupmates}
										onchange={toggleAvoidRecent}
										class="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
									/>
									<div>
										<span class="text-sm font-medium text-gray-700">Avoid recent groupmates</span>
										<p class="text-xs text-gray-500">Try to mix students into different groups</p>
									</div>
								</label>
							{/if}

							<button
								type="button"
								class="mt-3 w-full rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
								onclick={() => {
									if (program) saveGenerationSettings(program.id, generationSettings);
									showSettingsEditor = false;
								}}
							>
								Done
							</button>
						</div>
					{/if}
				</div>

				<!-- Edit Current Groups card -->
				<a
					href="/activities/{program.id}/workspace"
					class="block rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-teal"
				>
					<div class="flex items-center gap-2">
						<svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						<h2 class="text-lg font-semibold text-gray-900">Edit Current Groups</h2>
					</div>
					<p class="mt-1 text-sm text-gray-500">
						{scenario?.groups.length ?? 0} groups
						{#if latestPublishedSession?.publishedAt}
							<span class="text-gray-400">
								· last shown {formatDate(latestPublishedSession.publishedAt)}
							</span>
						{/if}
					</p>
				</a>
			</div>
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

			<!-- Groups section -->
			<SetupGroupsSection
				groups={groupShells}
				isExpanded={expandedSection === 'groups'}
				onToggle={handleSectionToggle('groups')}
				onGroupsChange={handleGroupsChange}
				onUseTemplate={handleUseTemplate}
				onSaveAsTemplate={handleSaveAsTemplate}
				hasChanges={groupsModified && hasGroups}
			/>

			<!-- History section -->
			<SetupHistorySection
				{sessions}
				{students}
				isExpanded={expandedSection === 'history'}
				onToggle={handleSectionToggle('history')}
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
