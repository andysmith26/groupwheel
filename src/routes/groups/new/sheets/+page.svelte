<script lang="ts">
	/**
	 * /groups/new/sheets/+page.svelte
	 *
	 * Import roster from Google Sheets with column mapping.
	 * After successful import, redirects to the main groups wizard
	 * with the imported roster pre-selected.
	 */

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { RawSheetData, ColumnMapping } from '$lib/domain/import';
	import { importRosterWithMapping } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import GoogleSheetImport from '$lib/components/import/GoogleSheetImport.svelte';

	// Environment
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	onMount(() => {
		env = getAppEnvContext();
	});

	// State
	let isImporting = $state(false);
	let importError = $state('');
	let importSuccess = $state<{ poolId: string; studentCount: number } | null>(null);

	// Handle successful import from the GoogleSheetImport component
	async function handleImportComplete(data: {
		sheetData: RawSheetData;
		mappings: ColumnMapping[];
		poolName: string;
	}) {
		if (!env) {
			importError = 'Application not ready. Please refresh and try again.';
			return;
		}

		isImporting = true;
		importError = '';

		try {
			const result = await importRosterWithMapping(env, {
				rawData: data.sheetData,
				columnMappings: data.mappings,
				poolName: data.poolName,
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			});

			if (isErr(result)) {
				switch (result.error.type) {
					case 'MISSING_REQUIRED_MAPPINGS':
						importError = `Missing required field mappings: ${result.error.missingFields.join(', ')}`;
						break;
					case 'DUPLICATE_MAPPINGS':
						importError = `Fields mapped to multiple columns: ${result.error.duplicateFields.join(', ')}`;
						break;
					case 'NO_VALID_ROWS':
						importError = 'No valid student data found. Check your column mappings.';
						break;
					case 'VALIDATION_FAILED':
						importError = `Validation failed: ${result.error.validation.summary.invalidCount} rows had errors.`;
						break;
					default:
						importError = result.error.message || 'Import failed';
				}
				isImporting = false;
				return;
			}

			// Success!
			importSuccess = {
				poolId: result.value.pool.id,
				studentCount: result.value.studentsImported
			};

			// Show success briefly, then redirect to main wizard
			setTimeout(() => {
				// Redirect to main wizard - could pass poolId as query param
				// For now, just go to groups page
				goto('/groups');
			}, 1500);
		} catch (e) {
			importError = e instanceof Error ? e.message : 'An unexpected error occurred';
			isImporting = false;
		}
	}

	function handleCancel() {
		goto('/groups/new');
	}
</script>

<svelte:head>
	<title>Import from Google Sheets | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-3xl p-4">
	<!-- Header -->
	<header class="mb-6">
		<nav class="mb-4">
			<a href="/groups/new" class="text-sm text-teal hover:text-teal-dark hover:underline">
				← Back to Create Groups
			</a>
		</nav>
		<h1 class="text-2xl font-semibold text-gray-900">Import from Google Sheets</h1>
	</header>

	<!-- Loading state -->
	{#if !env}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if importSuccess}
		<!-- Success state -->
		<div class="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
			<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
				<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					></path>
				</svg>
			</div>
			<h2 class="text-lg font-medium text-green-900">Import Complete!</h2>
			<p class="mt-1 text-sm text-green-700">
				Successfully imported {importSuccess.studentCount} students.
			</p>
			<p class="mt-2 text-xs text-green-600">Redirecting...</p>
		</div>
	{:else if isImporting}
		<!-- Importing state -->
		<div class="flex flex-col items-center justify-center py-12">
			<div
				class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent"
			></div>
			<p class="text-gray-600">Importing students...</p>
		</div>
	{:else}
		<!-- Main import UI -->
		{#if importError}
			<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
				<p class="text-sm text-red-700">{importError}</p>
				<button
					type="button"
					class="mt-2 text-sm text-red-600 hover:underline"
					onclick={() => (importError = '')}
				>
					Dismiss
				</button>
			</div>
		{/if}

		<GoogleSheetImport onImportComplete={handleImportComplete} onCancel={handleCancel} />
	{/if}
</div>
