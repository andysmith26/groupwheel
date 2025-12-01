<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import type { PoolType } from '$lib/domain';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { importRoster } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';

	let env: ReturnType<typeof getAppEnvContext> | null = null;

	onMount(() => {
		env = getAppEnvContext();
	});

	let pastedText = '';
	let poolName = '';
	let poolType: PoolType = 'CLASS';
	let ownerStaffId = 'owner-1';
	let schoolId = '';

	let errorMessage = '';
	let successMessage = '';
	let isSubmitting = false;

	const SAMPLE_ROSTER = `name	id	grade
Alice Smith	alice@school.edu	9
Bob Jones	bob@school.edu	9
Carol White	carol@school.edu	9
Dave Brown	dave@school.edu	9
Eve Davis	eve@school.edu	10
Frank Miller	frank@school.edu	10
Grace Wilson	grace@school.edu	10
Henry Taylor	henry@school.edu	10`;

	function loadSampleData() {
		pastedText = SAMPLE_ROSTER;
		poolName = 'Sample Class 2024-25';
		poolType = 'GRADE';
	}

	async function handleImport() {
		errorMessage = '';
		successMessage = '';

		if (!env) {
			errorMessage = 'Application environment not ready yet. Please try again in a moment.';
			return;
		}

		if (!pastedText.trim()) {
			errorMessage = 'Please paste roster text before importing.';
			return;
		}

		if (!poolName.trim()) {
			errorMessage = 'Please enter a name for this Pool.';
			return;
		}

		isSubmitting = true;
		const result = await importRoster(env, {
			pastedText,
			poolName: poolName.trim(),
			poolType,
			ownerStaffId,
			schoolId: schoolId.trim() || undefined
		});
		isSubmitting = false;

		if (isErr(result)) {
			switch (result.error.type) {
				case 'PARSE_ERROR':
					errorMessage = result.error.message;
					break;
				case 'OWNER_STAFF_NOT_FOUND':
					errorMessage = `Owner staff not found: ${result.error.staffId}`;
					break;
				case 'NO_STUDENTS_IN_ROSTER':
				case 'DOMAIN_VALIDATION_FAILED':
				case 'INTERNAL_ERROR':
					errorMessage = result.error.message;
					break;
				default:
					errorMessage = 'Unknown error importing roster.';
			}
			return;
		}

		successMessage = `Created "${result.value.name}" with ${result.value.memberIds.length} students. Redirecting...`;
		setTimeout(() => goto('/pools'), 1500);
	}
</script>

<svelte:head>
	<title>Import Roster | Friend Hat</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Import Roster</h1>
			<p class="text-sm text-gray-600">
				Create a Pool by pasting roster data. Pools are reusable rosters for Programs.
			</p>
		</div>
		<a
			href="/pools"
			class="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
		>
			← Back to Pools
		</a>
	</header>

	<form class="space-y-6" on:submit|preventDefault={handleImport}>
		<!-- Instructions -->
		<details class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
			<summary class="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
				How to import from Google Sheets
			</summary>
			<ol class="mt-3 ml-4 list-decimal space-y-2 text-gray-700">
				<li>Open your roster spreadsheet in Google Sheets</li>
				<li>
					Ensure you have columns for:
					<code class="rounded bg-gray-200 px-1">name</code> (or
					<code class="rounded bg-gray-200 px-1">display name</code>) and
					<code class="rounded bg-gray-200 px-1">id</code> (unique identifier like email)
				</li>
				<li>Optional: <code class="rounded bg-gray-200 px-1">grade</code> column</li>
				<li>Select all data rows including the header row</li>
				<li>Copy (Ctrl+C or Cmd+C)</li>
				<li>Paste into the text area below</li>
			</ol>
			<div class="mt-3 rounded bg-white p-2 font-mono text-xs">
				<div class="text-gray-500">Example:</div>
				<pre class="mt-1 text-gray-700">name	id	grade
Alice Smith	alice@school.edu	9
Bob Jones	bob@school.edu	9
Carol White	carol@school.edu	10</pre>
			</div>
		</details>

		<!-- Roster paste area -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<label class="block text-sm font-medium" for="roster-paste">Roster data (TSV/CSV)</label>
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
			<textarea
				id="roster-paste"
				class="h-48 w-full rounded-md border p-3 font-mono text-sm"
				bind:value={pastedText}
				placeholder="name	id	grade
Alice Smith	alice@school.edu	9
Bob Jones	bob@school.edu	9"
			></textarea>
			<p class="text-xs text-gray-500">
				Required: <code class="rounded bg-gray-100 px-1">name</code> and
				<code class="rounded bg-gray-100 px-1">id</code> columns. Tab-separated (TSV) format from Google
				Sheets works best.
			</p>
		</div>

		<!-- Pool metadata -->
		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-1">
				<label class="block text-sm font-medium" for="pool-name">
					Pool name <span class="text-red-500">*</span>
				</label>
				<input
					id="pool-name"
					class="w-full rounded-md border p-2 text-sm"
					bind:value={poolName}
					placeholder="e.g., Grade 9 2024-25"
					required
				/>
			</div>

			<div class="space-y-1">
				<label class="block text-sm font-medium" for="pool-type">Pool type</label>
				<select id="pool-type" class="w-full rounded-md border p-2 text-sm" bind:value={poolType}>
					<option value="CLASS">Class</option>
					<option value="GRADE">Grade</option>
					<option value="SCHOOL">School</option>
					<option value="TRIP">Trip</option>
					<option value="CUSTOM">Custom</option>
				</select>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-1">
				<label class="block text-sm font-medium" for="owner-staff-id">Owner staff ID</label>
				<input
					id="owner-staff-id"
					class="w-full rounded-md border p-2 text-sm"
					bind:value={ownerStaffId}
					placeholder="owner-1"
				/>
				<p class="text-xs text-gray-500">Default: owner-1 (MVP placeholder)</p>
			</div>

			<div class="space-y-1">
				<label class="block text-sm font-medium" for="school-id">School ID (optional)</label>
				<input
					id="school-id"
					class="w-full rounded-md border p-2 text-sm"
					bind:value={schoolId}
					placeholder="SCH-001"
				/>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3">
			<button
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
				type="submit"
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Creating Pool...' : 'Create Pool'}
			</button>
			<a class="text-sm text-blue-600 underline" href="/pools">Cancel</a>
		</div>
	</form>

	{#if errorMessage}
		<div class="rounded-md border border-red-200 bg-red-50 px-4 py-3">
			<p class="text-sm text-red-700">{errorMessage}</p>
		</div>
	{/if}

	{#if successMessage}
		<div class="rounded-md border border-green-200 bg-green-50 px-4 py-3">
			<p class="text-sm text-green-700">{successMessage}</p>
		</div>
	{/if}
</div>
