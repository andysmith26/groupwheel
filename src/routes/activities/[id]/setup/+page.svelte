<script lang="ts">
	/**
	 * /activities/[id]/setup/+page.svelte
	 *
	 * Setup Page - Configure groups, roster, and preferences for an activity.
	 * Part of the UX Overhaul Phase 4.
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
		renameActivity
	} from '$lib/services/appEnvUseCases';
	import { isErr, isOk } from '$lib/types/result';
	import type { Program, Pool, Scenario, Student, Preference, Session, GroupTemplate } from '$lib/domain';
	import type { GroupShell } from '$lib/utils/groupShellValidation';
	import type { ParsedStudent, ParsedPreference } from '$lib/application/useCases/createGroupingActivity';
	import {
		generateCandidate,
		createScenarioFromCandidate
	} from '$lib/services/appEnvUseCases';
	import { getStudentDisplayName } from '$lib/domain/student';

	// Section components
	import SetupStudentsSection from '$lib/components/setup/SetupStudentsSection.svelte';
	import SetupGroupsSection from '$lib/components/setup/SetupGroupsSection.svelte';
	import SetupPrefsSection from '$lib/components/setup/SetupPrefsSection.svelte';
	import SetupHistorySection from '$lib/components/setup/SetupHistorySection.svelte';
	import TemplatePickerModal from '$lib/components/setup/TemplatePickerModal.svelte';
	import SaveTemplateModal from '$lib/components/setup/SaveTemplateModal.svelte';

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
	let expandedSection = $state<'students' | 'groups' | 'preferences' | 'history' | null>('groups');

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

	// --- Derived ---
	let hasGroups = $derived(scenario !== null && scenario.groups.length > 0);
	let studentCount = $derived(students.length);
	let groupCount = $derived(groupShells.length);

	// Convert students to ParsedStudent format for preferences component
	let parsedStudents = $derived<ParsedStudent[]>(
		students.map((s) => ({
			id: s.id,
			firstName: s.firstName,
			lastName: s.lastName ?? '',
			displayName: getStudentDisplayName(s),
			grade: s.gradeLevel
		}))
	);

	// Convert preferences to ParsedPreference format
	let parsedPreferences = $derived<ParsedPreference[]>(
		preferences.map((p) => ({
			studentId: p.studentId,
			likeGroupIds: (p.payload as { likeGroupIds?: string[] })?.likeGroupIds ?? []
		}))
	);

	// Group names for validation
	let groupNames = $derived(groupShells.map((g) => g.name).filter((n) => n.trim()));

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

	// --- Section toggle handlers ---
	function handleSectionToggle(section: 'students' | 'groups' | 'preferences' | 'history') {
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

		// Refresh data
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

		// Update local state
		students = students.filter((s) => s.id !== studentId);

		// If student was removed from groups, update scenario
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

		// Refresh templates
		await loadTemplates();
	}

	// --- Preference handlers ---
	function handlePreferencesChange(newPrefs: ParsedPreference[], _warnings: string[]) {
		// Convert parsed preferences back to Preference format
		preferences = newPrefs.map((p, i) => ({
			id: `pref-${i}`,
			programId: program?.id ?? '',
			studentId: p.studentId,
			payload: {
				studentId: p.studentId,
				likeGroupIds: p.likeGroupIds ?? [],
				avoidStudentIds: p.avoidStudentIds ?? [],
				avoidGroupIds: [],
				meta: {}
			}
		}));
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
			// Step 1: Generate candidate grouping with our group shells
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

			// Step 2: Persist the generated groups as a scenario
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

	// --- Name editing ---
	function startEditingName() {
		if (program) {
			editedName = program.name;
			isEditingName = true;
		}
	}

	async function saveNameEdit() {
		if (!env || !program || !editedName.trim()) return;

		const result = await renameActivity(env, {
			programId: program.id,
			newName: editedName.trim()
		});

		if (isOk(result)) {
			program = { ...program, name: editedName.trim() };
		}

		isEditingName = false;
	}

	function cancelNameEdit() {
		isEditingName = false;
		editedName = '';
	}

	function handleNameKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveNameEdit();
		} else if (event.key === 'Escape') {
			cancelNameEdit();
		}
	}
</script>

<svelte:head>
	<title>Setup - {program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-4">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading...</p>
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
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a
						href="/activities/{program.id}"
						class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
					>
						<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						Back
					</a>
				</div>

				<button
					type="button"
					class="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
					onclick={handleGenerateClick}
					disabled={generating || groupShells.length === 0}
				>
					{#if generating}
						Generating...
					{:else if hasGroups}
						Regenerate Groups
					{:else}
						Generate Groups
					{/if}
				</button>
			</div>

			<!-- Activity name (editable) -->
			<div class="mt-4">
				{#if isEditingName}
					<div class="flex items-center gap-2">
						<input
							type="text"
							class="flex-1 rounded-md border-gray-300 text-2xl font-semibold focus:border-teal focus:ring-teal"
							bind:value={editedName}
							onkeydown={handleNameKeyDown}
							onblur={saveNameEdit}
						/>
						<button
							type="button"
							class="rounded p-1 text-gray-400 hover:bg-gray-100"
							onclick={cancelNameEdit}
							aria-label="Cancel editing"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				{:else}
					<button
						type="button"
						class="group flex items-center gap-2 text-left"
						onclick={startEditingName}
					>
						<h1 class="text-2xl font-semibold text-gray-900">{program.name}</h1>
						<svg
							class="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
						</svg>
					</button>
				{/if}
				<p class="mt-1 text-sm text-gray-600">
					{studentCount} students &middot; {groupCount} groups configured
				</p>
			</div>
		</div>

		<!-- Setup sections -->
		<div class="space-y-4">
			<!-- Students section -->
			<SetupStudentsSection
				{students}
				isExpanded={expandedSection === 'students'}
				onToggle={handleSectionToggle('students')}
				onAddStudent={handleAddStudent}
				onRemoveStudent={handleRemoveStudent}
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

			<!-- Preferences section -->
			<SetupPrefsSection
				students={parsedStudents}
				{groupNames}
				preferences={parsedPreferences}
				isExpanded={expandedSection === 'preferences'}
				onToggle={handleSectionToggle('preferences')}
				onPreferencesChange={handlePreferencesChange}
			/>

			<!-- History section -->
			<SetupHistorySection
				{sessions}
				{students}
				isExpanded={expandedSection === 'history'}
				onToggle={handleSectionToggle('history')}
			/>
		</div>

		<!-- Bottom action bar -->
		<div class="mt-8 flex justify-end">
			{#if hasGroups}
				<a
					href="/activities/{program.id}/workspace"
					class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
				>
					Edit Groups
				</a>
			{/if}
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
