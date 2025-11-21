<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { parseRosterFromPaste } from '$lib/services/rosterImport';
	import type { ProgramTimeSpan, ProgramType, PoolType } from '$lib/domain';
	import { createPoolFromRoster, createProgram } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';

	let env: ReturnType<typeof getAppEnvContext> | null = null;

	onMount(() => {
		env = getAppEnvContext();
	});

	let rawPaste = '';
	let programName = '';
	let programType: ProgramType = 'CLASS_ACTIVITY';
	let termLabel = '';
	let poolName = '';
	let poolType: PoolType = 'CLASS';
	let ownerStaffId = 'owner-1'; // MVP placeholder; later tie to real Staff

	let isSubmitting = false;
	let parseError: string | null = null;
	let submitError: string | null = null;

	function buildTimeSpan(): ProgramTimeSpan {
		const label = termLabel.trim() || 'Unlabeled term';
		return { termLabel: label };
	}

	async function handleCreateProgram() {
		parseError = null;
		submitError = null;

		if (!env) {
			submitError = 'Application environment not ready yet. Please try again.';
			return;
		}

		if (!rawPaste.trim()) {
			parseError = 'Please paste roster data before creating a Program.';
			return;
		}

		if (!programName.trim()) {
			submitError = 'Program name is required.';
			return;
		}

		const effectivePoolName = poolName.trim() || `${programName.trim()} Pool`;

		let rosterData;
		try {
			rosterData = parseRosterFromPaste(rawPaste);
		} catch (e) {
			parseError =
				e instanceof Error ? e.message : 'Failed to parse roster data. Please check the format.';
			return;
		}

		isSubmitting = true;
		try {
			// 1. Create Pool from roster.
			const poolResult = await createPoolFromRoster(env, {
				rosterData,
				poolName: effectivePoolName,
				poolType,
				ownerStaffId
			});

			if (isErr(poolResult)) {
				switch (poolResult.error.type) {
					case 'OWNER_STAFF_NOT_FOUND':
						submitError = `Owner staff not found: ${poolResult.error.staffId}`;
						break;
					case 'NO_STUDENTS_IN_ROSTER':
					case 'DOMAIN_VALIDATION_FAILED':
					case 'INTERNAL_ERROR':
						submitError = poolResult.error.message;
						break;
					default:
						submitError = 'Unknown error creating Pool.';
				}
				return;
			}

			const pool = poolResult.value;

			// 2. Create Program referencing the new Pool.
			const programResult = await createProgram(env, {
				name: programName.trim(),
				type: programType,
				timeSpan: buildTimeSpan(),
				primaryPoolId: pool.id,
				ownerStaffIds: [ownerStaffId]
			});

			if (isErr(programResult)) {
				switch (programResult.error.type) {
					case 'POOL_NOT_FOUND':
					case 'INVALID_TIME_SPAN':
					case 'DOMAIN_VALIDATION_FAILED':
					case 'INTERNAL_ERROR':
						submitError = programResult.error.message;
						break;
					default:
						submitError = 'Unknown error creating Program.';
				}
				return;
			}

			// Success: navigate back to Programs list for now.
			await goto('/programs');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="mx-auto max-w-5xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Import Pool &amp; Create Program</h1>
			<p class="text-sm text-gray-600">
				Paste your roster data, then define a Program that will use that Pool.
			</p>
		</div>
		<a
			href="/programs"
			class="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
		>
			← Back to Programs
		</a>
	</header>

	<section class="grid gap-6 md:grid-cols-2">
		<!-- Roster paste -->
		<div class="space-y-2">
			<label class="block text-sm font-medium">Paste roster (TSV/CSV)</label>
			<textarea
				class="h-56 w-full rounded-md border p-2 font-mono text-sm"
				bind:value={rawPaste}
				placeholder="Headers required: display name | name, id, friend 1 id, friend 2 id, ..."
			/>
			<p class="text-xs text-gray-500">
				This uses the same parser as the existing workspace. Required columns:
				<code>display name</code> (or <code>name</code>), <code>id</code> (unique email). Any number
				of <code>friend N id</code> columns are supported. Missing/unknown friend ids are ignored.
			</p>
			{#if parseError}
				<p class="text-xs text-red-600">{parseError}</p>
			{/if}
		</div>

		<!-- Program + Pool form -->
		<div class="space-y-4">
			<div class="space-y-1">
				<label class="block text-sm font-medium">Program name</label>
				<input
					class="w-full rounded-md border p-2 text-sm"
					bind:value={programName}
					placeholder="Fall Clubs 2025"
				/>
			</div>

			<div class="space-y-1">
				<label class="block text-sm font-medium">Program type</label>
				<select class="w-full rounded-md border p-2 text-sm" bind:value={programType}>
					<option value="CLUBS">Clubs</option>
					<option value="ADVISORY">Advisory</option>
					<option value="CABINS">Cabins</option>
					<option value="CLASS_ACTIVITY">Class activity</option>
					<option value="OTHER">Other</option>
				</select>
			</div>

			<div class="space-y-1">
				<label class="block text-sm font-medium">Term label</label>
				<input
					class="w-full rounded-md border p-2 text-sm"
					bind:value={termLabel}
					placeholder="Fall 2025"
				/>
				<p class="text-xs text-gray-500">
					For MVP we store a simple term label instead of explicit dates.
				</p>
			</div>

			<div class="space-y-1">
				<label class="block text-sm font-medium">Pool name</label>
				<input
					class="w-full rounded-md border p-2 text-sm"
					bind:value={poolName}
					placeholder="Defaults to Program name + “Pool” if left blank"
				/>
			</div>

			<div class="space-y-1">
				<label class="block text-sm font-medium">Pool type</label>
				<select class="w-full rounded-md border p-2 text-sm" bind:value={poolType}>
					<option value="CLASS">Class</option>
					<option value="GRADE">Grade</option>
					<option value="TRIP">Trip</option>
					<option value="CUSTOM">Custom</option>
					<option value="SCHOOL">School</option>
				</select>
			</div>

			<!-- Owner staff ID is hardcoded/rough for MVP; later we can tie to real Staff. -->
			<div class="space-y-1">
				<label class="block text-sm font-medium">Owner staff ID (MVP)</label>
				<input
					class="w-full rounded-md border p-2 text-sm"
					bind:value={ownerStaffId}
					placeholder="owner-1"
				/>
				<p class="text-xs text-gray-500">
					For now, this must match a Staff record in the in-memory environment.
				</p>
			</div>

			{#if submitError}
				<p class="text-xs text-red-600">{submitError}</p>
			{/if}

			<button
				class="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				on:click|preventDefault={handleCreateProgram}
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Creating Program…' : 'Create Program'}
			</button>
		</div>
	</section>
</div>
