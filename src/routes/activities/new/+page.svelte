<script lang="ts">
	/**
	 * /activities/new/+page.svelte
	 *
	 * Simplified 3-step "Create Activity" wizard (Phase 2 UX Overhaul).
	 *
	 * Step 1: Students - Paste, reuse roster, or import from Google Sheets
	 * Step 2: Groups - Define groups (manual or auto-split)
	 * Step 3: Review & Generate - Name activity, review summary, create groups
	 *
	 * On completion, generates groups immediately and navigates to Workspace.
	 */

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Pool, GroupTemplate, SheetConnection } from '$lib/domain';
	import {
		createGroupingActivity,
		listGroupTemplates,
		listPools,
		listPrograms,
		getPoolWithStudents,
		isAuthenticated,
		generateScenario
	} from '$lib/services/appEnvUseCases';
	import type { ParsedStudent } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';

	import WizardProgress from '$lib/components/wizard/WizardProgress.svelte';
	import StepStudentsUnified from '$lib/components/wizard/StepStudentsUnified.svelte';
	import StepGroupsUnified from '$lib/components/wizard/StepGroupsUnified.svelte';
	import StepReviewGenerate from '$lib/components/wizard/StepReviewGenerate.svelte';
	import SheetConnector from '$lib/components/import/SheetConnector.svelte';
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
			const template = groupTemplates.find((t) => t.id === templateId);
			if (template) {
				groupCreationGroups = template.groups.map((g) => ({
					name: g.name,
					capacity: g.capacity
				}));
			}
		}
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

	// --- Google Sheets connection (optional) ---
	let sheetConnection = $state<SheetConnection | null>(null);
	let showSheetConnector = $state(false);

	function handleSheetConnect(connection: SheetConnection) {
		sheetConnection = connection;
		showSheetConnector = false;
	}

	function handleSheetDisconnect() {
		sheetConnection = null;
	}

	// Check if user is logged in (needed for Google Sheets)
	let userLoggedIn = $derived(env ? isAuthenticated(env) : false);

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

			const options: RosterOption[] = [];

			for (const pool of pools) {
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

			existingRosters = options.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
		} catch (e) {
			console.error('Failed to load existing rosters:', e);
		} finally {
			loadingRosters = false;
		}
	}

	// --- Wizard state (simplified 3 steps) ---
	const stepLabels = ['Students', 'Groups', 'Review'];
	const totalSteps = 3;
	let currentStep = $state(0);

	// Group creation mode: 'specific' (shows shell builder) or 'auto' (shows size controls)
	let groupCreationMode = $state<'specific' | 'auto' | null>(null);

	// Data collected through wizard
	let selectedRosterId = $state<string | null>(null);
	let students = $state<ParsedStudent[]>([]);
	let activityName = $state('');
	let groupCreationGroups = $state<Array<{ name: string; capacity: number | null }>>([]);
	let groupConfig = $state<GroupShellConfig>({
		groups: [],
		targetGroupCount: null,
		minSize: 4,
		maxSize: 6
	});
	let unifiedGroupsValid = $state(false);

	// Submission state
	let isSubmitting = $state(false);
	let submitError = $state('');

	// --- Step navigation ---

	let displayStep = $derived(currentStep + 1);

	let activeStepType = $derived.by((): 'students' | 'groups' | 'review' => {
		switch (currentStep) {
			case 0:
				return 'students';
			case 1:
				return 'groups';
			case 2:
				return 'review';
		}
		return 'students';
	});

	function canProceed(): boolean {
		switch (activeStepType) {
			case 'students':
				return selectedRosterId !== null || students.length > 0;
			case 'groups':
				return unifiedGroupsValid;
			case 'review':
				return activityName.trim().length > 0;
		}
		return false;
	}

	function nextStep() {
		if (currentStep < totalSteps - 1) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
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
			students = [];
		} else {
			loadStudentsFromPool(poolId);
		}
	}

	function handleStudentsParsed(parsed: ParsedStudent[]) {
		students = parsed;
	}

	function handleUnifiedModeChange(mode: 'specific' | 'auto') {
		groupCreationMode = mode;
	}

	function handleUnifiedShellGroupsChange(
		groups: Array<{ name: string; capacity: number | null }>
	) {
		groupCreationGroups = groups;
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
			// 1. Create the activity (program + pool)
			const result = await createGroupingActivity(env, {
				activityName: activityName.trim(),
				students,
				preferences: [], // No preferences in simplified wizard
				existingPoolId: selectedRosterId ?? undefined,
				ownerStaffId: 'owner-1'
			});

			if (isErr(result)) {
				submitError = result.error.message;
				isSubmitting = false;
				return;
			}

			const { program } = result.value;

			// 2. Generate groups immediately
			const algorithmConfig = buildAlgorithmConfig();
			const genResult = await generateScenario(env, {
				programId: program.id,
				algorithmConfig
			});

			if (isErr(genResult)) {
				// Activity created but generation failed - navigate to workspace with error
				goto(`/activities/${program.id}/workspace?genError=${genResult.error.type}`);
				return;
			}

			// 3. Success! Navigate to workspace with banner flag
			goto(`/activities/${program.id}/workspace?showBanner=true`);
		} catch (e) {
			submitError = `Unexpected error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			isSubmitting = false;
		}
	}

	// --- Cancel ---

	let showCancelConfirm = $state(false);

	function handleCancel() {
		if (students.length === 0 && !activityName.trim()) {
			goto('/activities');
			return;
		}
		showCancelConfirm = true;
	}

	function confirmCancel() {
		goto('/activities');
	}

	// --- Computed helpers ---

	let isLastStep = $derived(currentStep === totalSteps - 1);
	let isFirstStep = $derived(currentStep === 0);

	let isReusingRoster = $derived(selectedRosterId !== null);
	let reusedRosterName = $derived(
		existingRosters.find((r) => r.pool.id === selectedRosterId)?.activityName
	);
</script>

<svelte:head>
	<title>Create Activity | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-4">
	<!-- Header -->
	<header class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-semibold text-gray-900">Create Activity</h1>
		<button
			type="button"
			class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
			onclick={handleCancel}
		>
			Cancel
		</button>
	</header>

	<!-- Google Sheets connector (optional) -->
	{#if userLoggedIn && !loadingRosters}
		<div class="mb-6">
			{#if sheetConnection}
				<div
					class="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3"
				>
					<div class="flex items-center gap-2">
						<svg
							class="h-5 w-5 text-green-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span class="text-sm font-medium text-green-800">
							Connected: {sheetConnection.title}
						</span>
						<span class="text-xs text-green-600">
							({sheetConnection.tabs.length} tabs)
						</span>
					</div>
					<button
						type="button"
						onclick={handleSheetDisconnect}
						class="text-sm text-green-700 hover:text-green-900"
					>
						Disconnect
					</button>
				</div>
			{:else if showSheetConnector}
				<SheetConnector
					onConnect={handleSheetConnect}
					existingConnection={sheetConnection}
					allowDisconnect={true}
					onDisconnect={handleSheetDisconnect}
				/>
				<button
					type="button"
					onclick={() => (showSheetConnector = false)}
					class="mt-2 text-sm text-gray-500 hover:text-gray-700"
				>
					Cancel
				</button>
			{:else}
				<button
					type="button"
					onclick={() => (showSheetConnector = true)}
					class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					Connect a Google Sheet (optional)
				</button>
			{/if}
		</div>
	{/if}

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
		{:else if activeStepType === 'students'}
			<StepStudentsUnified
				{students}
				{selectedRosterId}
				{existingRosters}
				{sheetConnection}
				{userLoggedIn}
				onStudentsParsed={handleStudentsParsed}
				onRosterSelect={handleRosterSelect}
			/>
		{:else if activeStepType === 'groups'}
			<StepGroupsUnified
				mode={groupCreationMode}
				shellGroups={groupCreationGroups}
				sizeConfig={{ min: groupConfig.minSize, max: groupConfig.maxSize }}
				templates={groupTemplates}
				{selectedTemplateId}
				{sheetConnection}
				onModeChange={handleUnifiedModeChange}
				onShellGroupsChange={handleUnifiedShellGroupsChange}
				onSizeConfigChange={handleUnifiedSizeConfigChange}
				onValidityChange={handleUnifiedValidityChange}
				onTemplateSelect={handleTemplateSelect}
			/>
		{:else if activeStepType === 'review'}
			<StepReviewGenerate
				{activityName}
				onNameChange={handleNameChange}
				{students}
				{groupConfig}
				{isReusingRoster}
				{reusedRosterName}
				{isSubmitting}
				onSubmit={handleSubmit}
			/>
		{/if}
	</div>

	<!-- Error display -->
	{#if submitError}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
			<p class="text-sm text-red-700">{submitError}</p>
		</div>
	{/if}

	<!-- Navigation buttons (not shown on review step - it has its own submit) -->
	{#if !loadingRosters && activeStepType !== 'review'}
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
				<button
					type="button"
					class="rounded-md bg-teal px-6 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
					disabled={!canProceed()}
					onclick={nextStep}
				>
					Continue →
				</button>
			</div>
		</div>
	{/if}

	<!-- Back button on review step -->
	{#if !loadingRosters && activeStepType === 'review'}
		<div class="flex items-center border-t border-gray-200 pt-6">
			<button
				type="button"
				class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
				onclick={prevStep}
			>
				← Back
			</button>
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
