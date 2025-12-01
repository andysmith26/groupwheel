<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import type { Pool, ProgramType, ProgramTimeSpan } from '$lib/domain';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { createProgram } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import { parsePreferencesFromPaste } from '$lib/utils/parsePreferencesFromPaste';

	let env: ReturnType<typeof getAppEnvContext> | null = null;
	let pools: Pool[] = [];
	let poolsLoading = true;

	onMount(async () => {
		env = getAppEnvContext();
		await loadPools();
	});

	async function loadPools() {
		if (!env) return;
		poolsLoading = true;
		try {
			pools = await env.poolRepo.listAll();
		} catch (e) {
			console.error('Failed to load pools:', e);
		} finally {
			poolsLoading = false;
		}
	}

	// Form state
	let programName = '';
	let programType: ProgramType = 'CLASS_ACTIVITY';
	let termLabel = '';
	let selectedPoolId = '';
	let ownerStaffId = 'owner-1';

	// Preferences state
	let preferencesPaste = '';
	let preferencesWarnings: string[] = [];

	let isSubmitting = false;
	let errorMessage = '';

	// Import result tracking
	let importResult: {
		programName: string;
		preferencesImported: number;
		preferencesSkipped: number;
		warnings: string[];
	} | null = null;

	// Sample data for dev mode - preferences that match the sample roster from pools/import
	const SAMPLE_PREFERENCES = `student_id	friend 1 id	friend 2 id	friend 3 id
alice@school.edu	bob@school.edu	carol@school.edu	eve@school.edu
bob@school.edu	alice@school.edu	dave@school.edu	
carol@school.edu	alice@school.edu	eve@school.edu	grace@school.edu
dave@school.edu	bob@school.edu	frank@school.edu	henry@school.edu
eve@school.edu	carol@school.edu	grace@school.edu	alice@school.edu
frank@school.edu	dave@school.edu	henry@school.edu	
grace@school.edu	eve@school.edu	carol@school.edu	
henry@school.edu	frank@school.edu	dave@school.edu	`;

	function loadSampleData() {
		programName = 'Sample Advisory Groups';
		programType = 'ADVISORY';
		termLabel = 'Fall 2024';
		preferencesPaste = SAMPLE_PREFERENCES;
		// Auto-select first pool if available
		if (pools.length > 0 && !selectedPoolId) {
			selectedPoolId = pools[0].id;
		}
	}

	function buildTimeSpan(): ProgramTimeSpan {
		const label = termLabel.trim() || 'Unlabeled term';
		return { termLabel: label };
	}

	function validatePreferences(poolMemberIds: string[]): { valid: boolean; warnings: string[] } {
		if (!preferencesPaste.trim()) {
			return { valid: true, warnings: [] };
		}

		const warnings: string[] = [];
		const memberSet = new Set(poolMemberIds);

		try {
			const parsed = parsePreferencesFromPaste(preferencesPaste);

			for (const pref of parsed) {
				// Check if student is in pool
				if (!memberSet.has(pref.studentId)) {
					warnings.push(
						`Student "${pref.studentId}" is not in the selected Pool (will be skipped)`
					);
				}

				// Check if friend IDs are in pool
				for (const friendId of pref.likeStudentIds) {
					if (!memberSet.has(friendId)) {
						warnings.push(
							`Friend "${friendId}" for student "${pref.studentId}" is not in Pool (will be ignored)`
						);
					}
				}
			}
		} catch (e) {
			return {
				valid: false,
				warnings: [e instanceof Error ? e.message : 'Failed to parse preferences']
			};
		}

		return { valid: true, warnings };
	}

	async function handleCreateProgram() {
		errorMessage = '';
		preferencesWarnings = [];

		if (!env) {
			errorMessage = 'Application environment not ready yet.';
			return;
		}

		if (!programName.trim()) {
			errorMessage = 'Program name is required.';
			return;
		}

		if (!selectedPoolId) {
			errorMessage = 'Please select a Pool for this Program.';
			return;
		}

		// Find selected pool to get member IDs for validation
		const selectedPool = pools.find((p) => p.id === selectedPoolId);
		if (!selectedPool) {
			errorMessage = 'Selected Pool not found.';
			return;
		}

		// Validate preferences if provided
		const validation = validatePreferences(selectedPool.memberIds);
		if (!validation.valid) {
			errorMessage = validation.warnings[0];
			return;
		}
		preferencesWarnings = validation.warnings;

		isSubmitting = true;
		try {
			// 1. Create the Program
			const result = await createProgram(env, {
				name: programName.trim(),
				type: programType,
				timeSpan: buildTimeSpan(),
				primaryPoolId: selectedPoolId,
				ownerStaffIds: [ownerStaffId]
			});

			if (isErr(result)) {
				switch (result.error.type) {
					case 'POOL_NOT_FOUND':
						errorMessage = `Pool not found: ${result.error.poolId}`;
						break;
					case 'INVALID_TIME_SPAN':
					case 'DOMAIN_VALIDATION_FAILED':
					case 'INTERNAL_ERROR':
						errorMessage = result.error.message;
						break;
					default:
						errorMessage = 'Unknown error creating Program.';
				}
				return;
			}

			const program = result.value;

			// 2. Save preferences if provided
			let prefsImported = 0;
			let prefsSkipped = 0;
			const importWarnings: string[] = [];

			if (preferencesPaste.trim()) {
				try {
					const parsed = parsePreferencesFromPaste(preferencesPaste);
					const memberSet = new Set(selectedPool.memberIds);

					// Cast to concrete type to access setForProgram
					const prefRepo =
						env.preferenceRepo as import('$lib/infrastructure/repositories/inMemory').InMemoryPreferenceRepository;

					const prefsToSave: Array<{
						id: string;
						programId: string;
						studentId: string;
						payload: { likeStudentIds: string[] };
					}> = [];

					for (const pref of parsed) {
						// Only save preferences for students in the pool
						if (memberSet.has(pref.studentId)) {
							// Filter friend IDs to only those in the pool
							const validFriendIds = pref.likeStudentIds.filter((id) => memberSet.has(id));
							const skippedFriends = pref.likeStudentIds.filter((id) => !memberSet.has(id));

							if (skippedFriends.length > 0) {
								importWarnings.push(
									`${pref.studentId}: skipped ${skippedFriends.length} friend(s) not in Pool`
								);
							}

							prefsToSave.push({
								id: env.idGenerator.generateId(),
								programId: program.id,
								studentId: pref.studentId,
								payload: { likeStudentIds: validFriendIds }
							});
							prefsImported++;
						} else {
							prefsSkipped++;
							importWarnings.push(`Skipped preferences for "${pref.studentId}" (not in Pool)`);
						}
					}

					// Use setForProgram to save all at once
					prefRepo.setForProgram(program.id, prefsToSave);
				} catch (e) {
					console.warn('Failed to save some preferences:', e);
					importWarnings.push(e instanceof Error ? e.message : 'Failed to parse preferences');
				}
			}

			// Set import result for display
			importResult = {
				programName: program.name,
				preferencesImported: prefsImported,
				preferencesSkipped: prefsSkipped,
				warnings: importWarnings
			};

			// Show result briefly, then redirect
			setTimeout(() => goto(`/programs/${program.id}`), 2500);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Program | Friend Hat</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Create Program</h1>
			<p class="text-sm text-gray-600">
				A Program uses a Pool to generate student groupings based on preferences.
			</p>
		</div>
		<a
			href="/programs"
			class="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
		>
			← Back to Programs
		</a>
	</header>

	<form class="space-y-8" on:submit|preventDefault={handleCreateProgram}>
		<!-- Section 1: Program Details -->
		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium text-gray-900">Program Details</h2>
				{#if dev}
					<button
						type="button"
						class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
						on:click={loadSampleData}
					>
						Load sample data
					</button>
				{/if}
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-1">
					<label class="block text-sm font-medium" for="program-name">
						Program name <span class="text-red-500">*</span>
					</label>
					<input
						id="program-name"
						class="w-full rounded-md border p-2 text-sm"
						bind:value={programName}
						placeholder="e.g., Fall Advisory Groups"
						required
					/>
				</div>

				<div class="space-y-1">
					<label class="block text-sm font-medium" for="program-type">Program type</label>
					<select
						id="program-type"
						class="w-full rounded-md border p-2 text-sm"
						bind:value={programType}
					>
						<option value="CLASS_ACTIVITY">Class Activity</option>
						<option value="CLUBS">Clubs</option>
						<option value="ADVISORY">Advisory</option>
						<option value="CABINS">Cabins</option>
						<option value="OTHER">Other</option>
					</select>
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-1">
					<label class="block text-sm font-medium" for="term-label">Term / Time Period</label>
					<input
						id="term-label"
						class="w-full rounded-md border p-2 text-sm"
						bind:value={termLabel}
						placeholder="e.g., Fall 2024"
					/>
				</div>

				<div class="space-y-1">
					<label class="block text-sm font-medium" for="owner-staff-id">Owner Staff ID</label>
					<input
						id="owner-staff-id"
						class="w-full rounded-md border p-2 text-sm"
						bind:value={ownerStaffId}
						placeholder="owner-1"
					/>
				</div>
			</div>
		</section>

		<!-- Section 2: Select Pool -->
		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium text-gray-900">Select Pool</h2>
				<a href="/pools/import" class="text-sm text-blue-600 hover:underline">
					+ Create new Pool
				</a>
			</div>

			{#if poolsLoading}
				<p class="text-sm text-gray-500">Loading pools...</p>
			{:else if pools.length === 0}
				<div class="rounded-md border-2 border-dashed border-gray-300 p-6 text-center">
					<p class="text-sm text-gray-600">No Pools available.</p>
					<a
						href="/pools/import"
						class="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
					>
						Import a roster first
					</a>
				</div>
			{:else}
				<div class="space-y-2">
					{#each pools as pool (pool.id)}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-gray-50"
							class:border-blue-500={selectedPoolId === pool.id}
							class:bg-blue-50={selectedPoolId === pool.id}
						>
							<input
								type="radio"
								name="pool"
								value={pool.id}
								bind:group={selectedPoolId}
								class="h-4 w-4 text-blue-600"
							/>
							<div class="flex-1">
								<span class="font-medium">{pool.name}</span>
								<span class="ml-2 text-sm text-gray-500">
									({pool.memberIds.length} students)
								</span>
							</div>
							<span class="text-xs text-gray-400">{pool.type}</span>
						</label>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Section 3: Preferences (Optional) -->
		<section class="space-y-4">
			<div>
				<h2 class="text-lg font-medium text-gray-900">Student Preferences (Optional)</h2>
				<p class="text-sm text-gray-600">
					Upload friend preferences to improve grouping. These will be used when generating
					scenarios.
				</p>
			</div>

			<details class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
				<summary class="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
					Preferences format guide
				</summary>
				<div class="mt-3 space-y-3 text-gray-700">
					<p>Paste a table with student IDs and their friend preferences:</p>
					<div class="rounded bg-white p-2 font-mono text-xs">
						<pre>student_id	friend 1 id	friend 2 id	friend 3 id
alice@school.edu	bob@school.edu	carol@school.edu	
bob@school.edu	alice@school.edu	dave@school.edu	
carol@school.edu	alice@school.edu		</pre>
					</div>
					<ul class="ml-4 list-disc space-y-1 text-xs">
						<li>First column must be the student ID (matching Pool roster)</li>
						<li>Subsequent columns are friend preferences in order of preference</li>
						<li>Empty cells are ignored</li>
						<li>Students not in the Pool will be skipped with a warning</li>
					</ul>
				</div>
			</details>

			<div class="space-y-2">
				<label class="block text-sm font-medium" for="preferences-paste">
					Preferences data (TSV/CSV)
				</label>
				<textarea
					id="preferences-paste"
					class="h-36 w-full rounded-md border p-3 font-mono text-sm"
					bind:value={preferencesPaste}
					placeholder="student_id	friend 1 id	friend 2 id
alice@school.edu	bob@school.edu	carol@school.edu"
				></textarea>
			</div>

			{#if preferencesWarnings.length > 0}
				<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3">
					<p class="text-sm font-medium text-yellow-800">Warnings (data will still be saved):</p>
					<ul class="mt-1 ml-4 list-disc text-xs text-yellow-700">
						{#each preferencesWarnings.slice(0, 5) as warning}
							<li>{warning}</li>
						{/each}
						{#if preferencesWarnings.length > 5}
							<li>...and {preferencesWarnings.length - 5} more</li>
						{/if}
					</ul>
				</div>
			{/if}
		</section>

		<!-- Actions -->
		<div class="flex items-center gap-3 border-t pt-6">
			<button
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
				type="submit"
				disabled={isSubmitting || pools.length === 0}
			>
				{isSubmitting ? 'Creating...' : 'Create Program'}
			</button>
			<a class="text-sm text-gray-600 hover:underline" href="/programs">Cancel</a>
		</div>
	</form>

	{#if errorMessage}
		<div class="rounded-md border border-red-200 bg-red-50 px-4 py-3">
			<p class="text-sm text-red-700">{errorMessage}</p>
		</div>
	{/if}

	{#if importResult}
		<div class="space-y-2 rounded-md border border-green-200 bg-green-50 px-4 py-3">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
				<p class="font-medium text-green-800">
					Program "{importResult.programName}" created successfully!
				</p>
			</div>

			<div class="space-y-1 text-sm text-green-700">
				<p>
					<strong>Preferences:</strong>
					{importResult.preferencesImported} imported
					{#if importResult.preferencesSkipped > 0}
						, {importResult.preferencesSkipped} skipped
					{/if}
				</p>

				{#if importResult.warnings.length > 0}
					<details class="mt-2">
						<summary class="cursor-pointer text-yellow-700 hover:text-yellow-800">
							{importResult.warnings.length} warning(s)
						</summary>
						<ul class="mt-1 ml-4 max-h-32 list-disc overflow-y-auto text-xs text-yellow-700">
							{#each importResult.warnings as warning}
								<li>{warning}</li>
							{/each}
						</ul>
					</details>
				{/if}
			</div>

			<p class="text-xs text-green-600">Redirecting to program page...</p>
		</div>
	{/if}
</div>
