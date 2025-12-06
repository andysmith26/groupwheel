<script lang="ts">
	/**
	 * /groups/new/+page.svelte
	 *
	 * Unified "Create Groups" wizard.
	 * Consolidates the previous Pool import + Program creation + Preferences upload
	 * into a single guided flow.
	 *
	 * See: docs/decisions/2025-12-01-unified-create-groups-wizard.md
	 */

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Pool, Program } from '$lib/domain';
	import type { ParsedStudent, ParsedPreference } from '$lib/services/createGroupingActivity';
	import { createGroupingActivity } from '$lib/services/createGroupingActivity';

	import WizardProgress from '$lib/components/wizard/WizardProgress.svelte';
	import StepSelectRoster from '$lib/components/wizard/StepSelectRoster.svelte';
	import StepStudents from '$lib/components/wizard/StepStudents.svelte';
	import StepPreferences from '$lib/components/wizard/StepPreferences.svelte';
	import StepName from '$lib/components/wizard/StepName.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	onMount(async () => {
		env = getAppEnvContext();
		await loadExistingRosters();
	});

	// --- Existing rosters (for returning users) ---
	interface RosterOption {
		pool: Pool;
		activityName: string;
		lastUsed: Date;
		studentCount: number;
	}

	let existingRosters = $state<RosterOption[]>([]);
	let loadingRosters = $state(true);

	async function loadExistingRosters() {
		if (!env) return;
		loadingRosters = true;

		try {
			const pools = await env.poolRepo.listAll();
			const programs = await env.programRepo.listAll();

			// Build roster options from pools, using associated program name
			const options: RosterOption[] = [];

			for (const pool of pools) {
				// Find programs using this pool
				const associatedPrograms = programs.filter((p) => p.poolId === pool.id);
				const latestProgram = associatedPrograms.sort(
					(a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
				)[0];

				options.push({
					pool,
					activityName: latestProgram?.name ?? pool.name.replace(' - Roster', ''),
					lastUsed: new Date(latestProgram?.createdAt ?? pool.createdAt ?? Date.now()),
					studentCount: pool.memberIds.length
				});
			}

			// Sort by most recently used
			existingRosters = options.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
		} catch (e) {
			console.error('Failed to load existing rosters:', e);
		} finally {
			loadingRosters = false;
		}
	}

	// --- Wizard state ---

	// Step management
	// Steps: 0 = select roster (only if returning user), 1 = students, 2 = preferences, 3 = name
	let currentStep = $state(0);
	let hasExistingRosters = $derived(existingRosters.length > 0);

	// Determine actual step sequence based on whether user is new or returning
	let stepLabels = $derived(
		hasExistingRosters
			? ['Start', 'Students', 'Preferences', 'Name']
			: ['Students', 'Preferences', 'Name']
	);
	let totalSteps = $derived(stepLabels.length);

	// Normalize step for display (1-indexed for progress indicator)
	let displayStep = $derived(currentStep + 1);

	// Data collected through wizard
	let selectedRosterId = $state<string | null>(null);
	let students = $state<ParsedStudent[]>([]);
	let preferences = $state<ParsedPreference[]>([]);
	let preferenceWarnings = $state<string[]>([]);
	let activityName = $state('');

	// Submission state
	let isSubmitting = $state(false);
	let submitError = $state('');

	// --- Step navigation ---

	function canProceed(): boolean {
		if (hasExistingRosters) {
			// With roster selection step
			switch (currentStep) {
				case 0: // Select roster
					return true; // Always can proceed (either new or existing selected)
				case 1: // Students
					return selectedRosterId !== null || students.length > 0;
				case 2: // Preferences
					return true; // Optional step
				case 3: // Name
					return activityName.trim().length > 0;
			}
		} else {
			// New user flow (no roster selection)
			switch (currentStep) {
				case 0: // Students
					return students.length > 0;
				case 1: // Preferences
					return true; // Optional step
				case 2: // Name
					return activityName.trim().length > 0;
			}
		}
		return false;
	}

	function nextStep() {
		// Special handling: if reusing roster, skip students step
		if (hasExistingRosters && currentStep === 0 && selectedRosterId !== null) {
			// Load students from selected pool
			loadStudentsFromPool(selectedRosterId);
			currentStep = 2; // Skip to preferences
			return;
		}

		if (currentStep < totalSteps - 1) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			// If we skipped students step, go back to roster selection
			if (hasExistingRosters && currentStep === 2 && selectedRosterId !== null) {
				currentStep = 0;
				return;
			}
			currentStep--;
		}
	}

	async function loadStudentsFromPool(poolId: string) {
		if (!env) return;

		const pool = await env.poolRepo.getById(poolId);
		if (!pool) return;

		// Load students from pool
		const loadedStudents: ParsedStudent[] = [];
		for (const studentId of pool.memberIds) {
			const student = await env.studentRepo.getById(studentId);
			if (student) {
				loadedStudents.push({
					id: student.id,
					firstName: student.firstName,
					lastName: student.lastName,
					displayName: `${student.firstName} ${student.lastName}`.trim() || student.id,
					grade: student.meta?.grade as string | undefined,
					meta: student.meta
				});
			}
		}
		students = loadedStudents;
	}

	// --- Callbacks from step components ---

	function handleRosterSelect(poolId: string | null) {
		selectedRosterId = poolId;
		if (poolId === null) {
			// Reset students when switching to "new"
			students = [];
		}
	}

	function handleStudentsParsed(parsed: ParsedStudent[]) {
		students = parsed;
	}

	function handlePreferencesParsed(parsed: ParsedPreference[], warnings: string[]) {
		preferences = parsed;
		preferenceWarnings = warnings;
	}

	function handleNameChange(name: string) {
		activityName = name;
	}

	// --- Submission ---

	async function handleSubmit() {
		if (!env) {
			submitError = 'Application not ready. Please try again.';
			return;
		}

		if (!canProceed()) {
			submitError = 'Please complete all required fields.';
			return;
		}

		isSubmitting = true;
		submitError = '';

		try {
			const result = await createGroupingActivity(env, {
				activityName: activityName.trim(),
				students,
				preferences,
				existingPoolId: selectedRosterId ?? undefined,
				ownerStaffId: 'owner-1'
			});

			if (result.type === 'err') {
				submitError = result.error.message;
				isSubmitting = false;
				return;
			}

			// Success! Navigate to the new activity
			goto(`/groups/${result.value.program.id}`);
		} catch (e) {
			submitError = `Unexpected error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			isSubmitting = false;
		}
	}

	// --- Cancel ---

	let showCancelConfirm = $state(false);

	function handleCancel() {
		// If no data entered, just leave
		if (students.length === 0 && preferences.length === 0 && !activityName.trim()) {
			goto('/groups');
			return;
		}
		showCancelConfirm = true;
	}

	function confirmCancel() {
		goto('/groups');
	}

	// --- Computed helpers ---

	let isLastStep = $derived(currentStep === totalSteps - 1);
	let isFirstStep = $derived(currentStep === 0);

	// Determine which step component to show
	let activeStepType = $derived.by(() => {
		if (hasExistingRosters) {
			switch (currentStep) {
				case 0:
					return 'select-roster';
				case 1:
					return 'students';
				case 2:
					return 'preferences';
				case 3:
					return 'name';
			}
		} else {
			switch (currentStep) {
				case 0:
					return 'students';
				case 1:
					return 'preferences';
				case 2:
					return 'name';
			}
		}
		return 'students';
	});

	// For roster reuse context in name step
	let isReusingRoster = $derived(selectedRosterId !== null);
	let reusedRosterName = $derived(
		existingRosters.find((r) => r.pool.id === selectedRosterId)?.activityName
	);
</script>

<svelte:head>
	<title>Create Groups | Friend Hat</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-4">
	<!-- Header -->
	<header class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-semibold text-gray-900">Create Groups</h1>
		<button
			type="button"
			class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
			onclick={handleCancel}
		>
			Cancel
		</button>
	</header>

	<!-- Progress indicator -->
	{#if !loadingRosters}
		<div class="mb-8">
			<WizardProgress currentStep={displayStep} {totalSteps} labels={stepLabels} />
		</div>
	{/if}

	<!-- Step content -->
	<div class="mb-8">
		{#if loadingRosters}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500">Loading...</p>
			</div>
		{:else if activeStepType === 'select-roster'}
			<StepSelectRoster {existingRosters} {selectedRosterId} onSelect={handleRosterSelect} />
		{:else if activeStepType === 'students'}
			<StepStudents {students} onStudentsParsed={handleStudentsParsed} />
		{:else if activeStepType === 'preferences'}
			<StepPreferences {students} {preferences} onPreferencesParsed={handlePreferencesParsed} />
		{:else if activeStepType === 'name'}
			<StepName
				{activityName}
				onNameChange={handleNameChange}
				{students}
				{preferences}
				{isReusingRoster}
				{reusedRosterName}
			/>
		{/if}
	</div>

	<!-- Error display -->
	{#if submitError}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
			<p class="text-sm text-red-700">{submitError}</p>
		</div>
	{/if}

	<!-- Navigation buttons -->
	{#if !loadingRosters}
		<div class="flex items-center justify-between border-t border-gray-200 pt-6">
			<div>
				{#if !isFirstStep}
					<button
						type="button"
						class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
						onclick={prevStep}
					>
						← Back
					</button>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				<!-- Skip button for preferences step -->
				{#if activeStepType === 'preferences' && preferences.length === 0}
					<button
						type="button"
						class="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
						onclick={nextStep}
					>
						Skip
					</button>
				{/if}

				<!-- Main action button -->
				{#if isLastStep}
					<button
						type="button"
						class="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						disabled={!canProceed() || isSubmitting}
						onclick={handleSubmit}
					>
						{isSubmitting ? 'Creating...' : 'Create Groups'}
					</button>
				{:else}
					<button
						type="button"
						class="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						disabled={!canProceed()}
						onclick={nextStep}
					>
						Continue →
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Cancel confirmation modal -->
{#if showCancelConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
			<h3 class="text-lg font-medium text-gray-900">Discard this activity?</h3>
			<p class="mt-2 text-sm text-gray-600">
				Your pasted data won't be saved. You'll need to start over.
			</p>
			<div class="mt-4 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					onclick={() => (showCancelConfirm = false)}
				>
					Keep editing
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
					onclick={confirmCancel}
				>
					Discard
				</button>
			</div>
		</div>
	</div>
{/if}
