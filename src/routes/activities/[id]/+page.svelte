<script lang="ts">
	/**
	 * /activities/[id]/+page.svelte
	 *
	 * Main Activity Page - All-in-one configuration and management.
	 * Combines setup (students, groups, preferences) with quick access to workspace.
	 * Designed for busy teachers who want a simple, single-page experience.
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
		generateCandidate,
		createScenarioFromCandidate
	} from '$lib/services/appEnvUseCases';
	import { isErr, isOk } from '$lib/types/result';
	import type { Program, Pool, Scenario, Student, Preference, Session, GroupTemplate } from '$lib/domain';
	import type { GroupShell } from '$lib/utils/groupShellValidation';
	import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';

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
	let generating = $state(false);

	// --- Section expand states ---
	let expandedSection = $state<'students' | 'groups' | 'history' | null>('groups');

	// --- Group configuration state ---
	let groupShells = $state<GroupShell[]>([]);
	let groupsModified = $state(false);

	// --- Modal states ---
	let showTemplatePicker = $state(false);
	let showSaveTemplate = $state(false);
	let showGenerateConfirm = $state(false);

	// --- Name editing ---
	let isEditingName = $state(false);
	let editedName = $state('');
	let renameError = $state<string | null>(null);

	// --- Derived ---
	let hasGroups = $derived(scenario !== null && scenario.groups.length > 0);
	let studentCount = $derived(students.length);
	let groupCount = $derived(groupShells.length);

	// Convert preferences to ParsedPreference format
	let parsedPreferences = $derived<ParsedPreference[]>(
		preferences.map((p) => ({
			studentId: p.studentId,
			likeGroupIds: (p.payload as { likeGroupIds?: string[] })?.likeGroupIds ?? []
		}))
	);

	let preferencesCount = $derived(
		parsedPreferences.filter((pref) => (pref.likeGroupIds ?? []).length > 0).length
	);

	function formatDate(date: Date | undefined): string {
		if (!date) return '';
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTimeSpanLabel(timeSpan: Program['timeSpan']): string {
		if ('termLabel' in timeSpan) {
			const parsed = new Date(timeSpan.termLabel);
			return Number.isNaN(parsed.getTime()) ? timeSpan.termLabel : formatDate(parsed);
		}
		if (timeSpan.start) {
			return formatDate(timeSpan.start);
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
			// Default: 4 empty groups
			groupShells = [
				{ name: 'Group 1', capacity: null },
				{ name: 'Group 2', capacity: null },
				{ name: 'Group 3', capacity: null },
				{ name: 'Group 4', capacity: null }
			];
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

	// --- Generate groups ---
	function handleGenerateClick() {
		if (hasGroups) {
			showGenerateConfirm = true;
		} else {
			generateGroups();
		}
	}

	async function generateGroups() {
		if (!env || !program || !pool) return;

		generating = true;
		showGenerateConfirm = false;

		try {
			const candidateResult = await generateCandidate(env, {
				programId: program.id,
				algorithmId: 'balanced',
				algorithmConfig: {
					groups: groupShells.map((g) => ({
						name: g.name,
						capacity: g.capacity
					})),
					algorithm: 'balanced'
				}
			});

			if (isErr(candidateResult)) {
				const error = candidateResult.error;
				loadError = error.type === 'GROUPING_ALGORITHM_FAILED'
					? error.message
					: `Error: ${error.type}`;
				return;
			}

			const scenarioResult = await createScenarioFromCandidate(env, {
				programId: program.id,
				groups: candidateResult.value.groups,
				algorithmConfig: candidateResult.value.algorithmConfig,
				replaceExisting: true
			});

			if (isErr(scenarioResult)) {
				const error = scenarioResult.error;
				loadError = error.type === 'DOMAIN_VALIDATION_FAILED' || error.type === 'INTERNAL_ERROR'
					? error.message
					: `Error: ${error.type}`;
				return;
			}

			// Navigate to workspace on success
			await goto(`/activities/${program.id}/workspace`);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to generate groups';
		} finally {
			generating = false;
		}
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-3xl p-4">
	{#if loading}
		<div class="space-y-6">
			<!-- Header skeleton -->
			<div class="flex items-center gap-3">
				<Skeleton width="100px" height="1rem" />
			</div>
			<div class="flex items-center justify-between">
				<Skeleton width="200px" height="2rem" />
				<Skeleton width="120px" height="2.5rem" rounded="lg" />
			</div>
			<!-- Section skeletons -->
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
			<!-- Back link and Edit Groups button -->
			<div class="flex items-center justify-between">
				<a
					href="/activities"
					class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
				>
					<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Activities
				</a>

				<div class="flex items-center gap-3">
					{#if hasGroups}
						<a
							href="/activities/{program.id}/workspace"
							class="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark transition-colors"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							Edit Groups
						</a>
					{/if}
				</div>
			</div>

			<!-- Activity name (editable) -->
			<div class="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between">
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
						<p class="mt-1 text-sm text-gray-500">
							{formatTimeSpanLabel(program.timeSpan)}
						</p>
					</div>
				</div>

				<!-- Stats row -->
				<div class="mt-3 flex items-center gap-4 text-sm text-gray-600">
					<span>
						<span class="font-medium text-gray-900">{studentCount}</span>
						{studentCount === 1 ? 'student' : 'students'}
					</span>
					<span class="text-gray-300">|</span>
					<span>
						<span class="font-medium text-gray-900">{groupCount}</span>
						{groupCount === 1 ? 'group' : 'groups'}
					</span>
					{#if preferencesCount > 0}
						<span class="text-gray-300">|</span>
						<span>
							<span class="font-medium text-gray-900">{preferencesCount}</span>
							with preferences
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Setup sections -->
		<div class="space-y-3">
			<!-- Students section -->
			<SetupStudentsSection
				{students}
				isExpanded={expandedSection === 'students'}
				onToggle={handleSectionToggle('students')}
				onAddStudent={handleAddStudent}
				onRemoveStudent={handleRemoveStudent}
				preferences={parsedPreferences}
				getEditStudentHref={(studentId) => `/activities/${program.id}/students/${studentId}`}
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

		<!-- Generate button -->
		<div class="mt-6 flex justify-center">
			<button
				type="button"
				class="rounded-lg bg-coral px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-coral-dark disabled:opacity-50 transition-colors"
				onclick={handleGenerateClick}
				disabled={generating || groupShells.length === 0 || studentCount === 0}
			>
				{#if generating}
					<span class="flex items-center gap-2">
						<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Generating...
					</span>
				{:else if hasGroups}
					Regenerate Groups
				{:else}
					Generate Groups
				{/if}
			</button>
		</div>

		{#if !hasGroups && studentCount > 0}
			<p class="mt-2 text-center text-sm text-gray-500">
				Configure your groups above, then generate to assign students
			</p>
		{/if}
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

<!-- Generate Confirmation Modal -->
{#if showGenerateConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
			<h3 class="text-lg font-medium text-gray-900">Regenerate Groups?</h3>
			<p class="mt-2 text-sm text-gray-600">
				This will create new group assignments. Your current arrangement will be replaced.
			</p>
			<div class="mt-4 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					onclick={() => (showGenerateConfirm = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
					onclick={generateGroups}
				>
					Regenerate
				</button>
			</div>
		</div>
	</div>
{/if}
