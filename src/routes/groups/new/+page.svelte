<script lang="ts">
	/**
	 * /groups/new/+page.svelte
	 *
	 * Unified "Create Groups" wizard.
	 * Consolidates the previous Pool import + Program creation + Preferences upload
	 * into a single guided flow.
	 *
	 * On completion, auto-generates groups and redirects to the workspace.
	 *
	 * See: docs/decisions/2025-12-01-unified-create-groups-wizard.md
	 */

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Pool, GroupTemplate } from '$lib/domain';
	import {
		createGroupingActivity,
		generateScenario,
		listGroupTemplates,
		listPools,
		listPrograms,
		getPoolWithStudents
	} from '$lib/services/appEnvUseCases';
	import type { ParsedStudent, ParsedPreference } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';

	import WizardProgress from '$lib/components/wizard/WizardProgress.svelte';
	import StepSelectRoster from '$lib/components/wizard/StepSelectRoster.svelte';
	import StepStudents from '$lib/components/wizard/StepStudents.svelte';
	import StepGroupsUnified from '$lib/components/wizard/StepGroupsUnified.svelte';
	import StepPreferences from '$lib/components/wizard/StepPreferences.svelte';
	import StepName from '$lib/components/wizard/StepName.svelte';
	import type { GroupShellConfig } from '$lib/components/wizard/StepGroups.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	onMount(async () => {
		env = getAppEnvContext();
		await Promise.all([loadExistingRosters(), loadGroupTemplates()]);
	});

	// --- Group templates ---
	let groupTemplates = $state<GroupTemplate[]>([]);
	let selectedTemplateId = $state<string | null>(null);

	async function loadGroupTemplates() {
		if (!env) return;
		const result = await listGroupTemplates(env);
		if (isErr(result)) {
			console.error('Failed to load group templates');
		} else {
			groupTemplates = result.value;
		}
	}

	function handleTemplateSelect(templateId: string | null) {
		selectedTemplateId = templateId;

		if (templateId) {
			// Find the template and populate groups
			const template = groupTemplates.find((t) => t.id === templateId);
			if (template) {
				groupCreationGroups = template.groups.map((g) => ({
					name: g.name,
					capacity: g.capacity
				}));
			}
		}
		// Don't clear groups when deselecting - let user keep their edits
	}

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
			const [poolsResult, programsResult] = await Promise.all([listPools(env), listPrograms(env)]);

			if (isErr(poolsResult) || isErr(programsResult)) {
				console.error('Failed to load rosters or programs');
				loadingRosters = false;
				return;
			}

			const pools = poolsResult.value;
			const programs = programsResult.value;

			// Build roster options from pools, using associated program name
			const options: RosterOption[] = [];

			for (const pool of pools) {
				// Find programs using this pool
				const associatedPrograms = programs.filter(
					(p) => p.program.primaryPoolId === pool.id || p.program.poolIds?.includes(pool.id)
				);
				const latestProgram = associatedPrograms.sort((a, b) =>
					a.program.name.localeCompare(b.program.name)
				)[0]?.program;
				let lastUsed = new Date();
				if (latestProgram?.timeSpan) {
					if ('start' in latestProgram.timeSpan && latestProgram.timeSpan.start) {
						lastUsed = latestProgram.timeSpan.start;
					} else if ('termLabel' in latestProgram.timeSpan) {
						const parsed = new Date(latestProgram.timeSpan.termLabel);
						lastUsed = isNaN(parsed.getTime()) ? new Date() : parsed;
					}
				}

				options.push({
					pool,
					activityName: latestProgram?.name ?? pool.name.replace(' - Roster', ''),
					lastUsed,
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
	// Steps vary based on user type (new vs. returning) but are fixed regardless of group creation mode:
	// New user: Students → Groups → Preferences → Name
	// Returning user: Start → Students → Groups → Preferences → Name
	// The Groups step includes both the fork question and content (shell builder or size controls)
	let currentStep = $state(0);
	let hasExistingRosters = $derived(existingRosters.length > 0);

	// Group creation mode: 'specific' (shows shell builder) or 'auto' (shows size controls)
	// Both modes are handled within the unified Groups step, keeping step count fixed
	let groupCreationMode = $state<'specific' | 'auto' | null>(null);

	// Helper function to compute step labels based on roster state
	// Step labels are now fixed regardless of group creation mode
	function computeStepLabels(hasRosters: boolean): string[] {
		if (hasRosters) {
			return ['Start', 'Students', 'Groups', 'Preferences', 'Name'];
		}
		return ['Students', 'Groups', 'Preferences', 'Name'];
	}

	// Determine actual step sequence based on whether user is new or returning
	// The "Groups" step now contains both fork question and content (unified)
	let stepLabels = $derived.by(() => computeStepLabels(hasExistingRosters));
	let totalSteps = $derived(stepLabels.length);

	// Normalize step for display (1-indexed for progress indicator)
	let displayStep = $derived(currentStep + 1);

	// Data collected through wizard
	let selectedRosterId = $state<string | null>(null);
	let students = $state<ParsedStudent[]>([]);
	let preferences = $state<ParsedPreference[]>([]);
	let activityName = $state('');
	let groupCreationGroups = $state<Array<{ name: string; capacity: number | null }>>([]);
	let shellBuilderValid = $state(false);
	let groupConfig = $state<GroupShellConfig>({
		groups: [],
		targetGroupCount: null,
		minSize: 4,
		maxSize: 6
	});
	let unifiedGroupsValid = $state(false); // Validity from StepGroupsUnified

	// Submission state
	let isSubmitting = $state(false);
	let submitError = $state('');

	// --- Step navigation ---

	function canProceed(): boolean {
		const stepType = activeStepType;
		switch (stepType) {
			case 'select-roster':
				return true; // Always can proceed (either new or existing selected)
			case 'students':
				return selectedRosterId !== null || students.length > 0;
			case 'groups-unified':
				return unifiedGroupsValid;
			case 'preferences':
				return true; // Optional step
			case 'name':
				return activityName.trim().length > 0;
		}
		return false;
	}

	function nextStep() {
		// Special handling: if reusing roster, skip students step
		if (hasExistingRosters && currentStep === 0 && selectedRosterId !== null) {
			// Load students from selected pool
			loadStudentsFromPool(selectedRosterId);
			groupCreationMode = null; // Reset group creation mode to ensure consistent wizard state
			currentStep = 2; // Jump to groups fork
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

		const result = await getPoolWithStudents(env, { poolId });
		if (isErr(result)) {
			console.error('Failed to load pool with students:', result.error);
			return;
		}

		const { students: loadedStudents } = result.value;

		// Transform students to ParsedStudent format for the wizard
		students = loadedStudents.map((student) => {
			const meta =
				student.meta && typeof student.meta === 'object'
					? Object.fromEntries(
							Object.entries(student.meta).filter(
								([, value]) => typeof value === 'string'
							) as Array<[string, string]>
						)
					: undefined;
			return {
				id: student.id,
				firstName: student.firstName ?? '',
				lastName: student.lastName ?? '',
				displayName: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || student.id,
				grade: typeof student.meta?.grade === 'string' ? student.meta.grade : undefined,
				meta
			};
		});
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

	function handlePreferencesParsed(parsed: ParsedPreference[], _warnings: string[]) {
		void _warnings;
		preferences = parsed;
	}

	// --- Callbacks for StepGroupsUnified ---

	function handleUnifiedModeChange(mode: 'specific' | 'auto') {
		groupCreationMode = mode;
	}

	function handleUnifiedShellGroupsChange(
		groups: Array<{ name: string; capacity: number | null }>
	) {
		groupCreationGroups = groups;
		// Also update groupConfig for algorithm
		groupConfig = {
			...groupConfig,
			groups
		};
	}

	function handleUnifiedSizeConfigChange(config: { min: number | null; max: number | null }) {
		groupConfig = {
			...groupConfig,
			minSize: config.min,
			maxSize: config.max
		};
	}

	function handleUnifiedValidityChange(isValid: boolean) {
		unifiedGroupsValid = isValid;
	}

	function handleNameChange(name: string) {
		activityName = name;
	}

	function buildAlgorithmConfig() {
		// If specific mode, use the groups from shell builder
		if (groupCreationMode === 'specific') {
			const sanitizedGroups = groupCreationGroups
				.filter((g) => g.name.trim().length > 0)
				.map((g) => ({
					name: g.name.trim(),
					capacity: Number.isFinite(g.capacity ?? NaN) ? g.capacity : null
				}));

			return {
				groups: sanitizedGroups.length > 0 ? sanitizedGroups : undefined,
				minGroupSize: groupConfig.minSize ?? undefined,
				maxGroupSize: groupConfig.maxSize ?? undefined
			} as const;
		}

		// Auto mode - let algorithm decide
		return {
			targetGroupCount: groupConfig.targetGroupCount ?? undefined,
			minGroupSize: groupConfig.minSize ?? undefined,
			maxGroupSize: groupConfig.maxSize ?? undefined
		} as const;
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
			// Step 1: Create the activity
			const result = await createGroupingActivity(env, {
				activityName: activityName.trim(),
				students,
				preferences,
				existingPoolId: selectedRosterId ?? undefined,
				ownerStaffId: 'owner-1'
			});

			if (isErr(result)) {
				submitError = result.error.message;
				isSubmitting = false;
				return;
			}

			const { program } = result.value;

			// Step 2: AUTO-GENERATE groups
			const generateResult = await generateScenario(env, {
				programId: program.id,
				algorithmConfig: buildAlgorithmConfig()
			});

			if (isErr(generateResult)) {
				// Activity created but generation failed - redirect with error param
				// so workspace page can show contextual error banner
				console.warn('Auto-generation failed:', generateResult.error);
				goto(`/groups/${program.id}?genError=${encodeURIComponent(generateResult.error.type)}`);
				return;
			}

			// Step 3: Redirect to workspace
			goto(`/groups/${program.id}`);
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
	// Step sequence is now fixed: Start? → Students → Groups (unified) → Preferences → Name
	let activeStepType = $derived.by(
		(): 'select-roster' | 'students' | 'groups-unified' | 'preferences' | 'name' => {
			if (hasExistingRosters) {
				// Returning user flow: Start → Students → Groups → Preferences → Name
				switch (currentStep) {
					case 0:
						return 'select-roster';
					case 1:
						return 'students';
					case 2:
						return 'groups-unified';
					case 3:
						return 'preferences';
					case 4:
						return 'name';
				}
			} else {
				// New user flow: Students → Groups → Preferences → Name
				switch (currentStep) {
					case 0:
						return 'students';
					case 1:
						return 'groups-unified';
					case 2:
						return 'preferences';
					case 3:
						return 'name';
				}
			}
			return 'students';
		}
	);

	// For roster reuse context in name step
	let isReusingRoster = $derived(selectedRosterId !== null);
	let reusedRosterName = $derived(
		existingRosters.find((r) => r.pool.id === selectedRosterId)?.activityName
	);

	// Extract group names from shell builder for preferences step
	// Only available when in 'specific' mode with defined groups
	let shellGroupNames = $derived(
		groupCreationMode === 'specific'
			? groupCreationGroups.map((g) => g.name).filter((n) => n.trim().length > 0)
			: []
	);
</script>

<svelte:head>
	<title>Create Groups | Groupwheel</title>
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
		{:else if activeStepType === 'groups-unified'}
			<StepGroupsUnified
				mode={groupCreationMode}
				shellGroups={groupCreationGroups}
				sizeConfig={{ min: groupConfig.minSize, max: groupConfig.maxSize }}
				templates={groupTemplates}
				{selectedTemplateId}
				onModeChange={handleUnifiedModeChange}
				onShellGroupsChange={handleUnifiedShellGroupsChange}
				onSizeConfigChange={handleUnifiedSizeConfigChange}
				onValidityChange={handleUnifiedValidityChange}
				onTemplateSelect={handleTemplateSelect}
			/>
		{:else if activeStepType === 'preferences'}
			<StepPreferences
				{students}
				{preferences}
				groupNames={shellGroupNames}
				onPreferencesParsed={handlePreferencesParsed}
			/>
		{:else if activeStepType === 'name'}
			<StepName
				{activityName}
				onNameChange={handleNameChange}
				{students}
				{groupConfig}
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
