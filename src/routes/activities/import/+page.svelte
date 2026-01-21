<script lang="ts">
	/**
	 * /activities/import/+page.svelte
	 *
	 * Import activity from a JSON file exported by another teacher.
	 * Creates a new activity with all roster, preferences, and group data.
	 */

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { importActivity } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import { Button, Alert, Spinner } from '$lib/components/ui';
	import {
		parseActivityFile,
		readFileAsText,
		type ActivityExportData,
		ACTIVITY_FILE_VERSION
	} from '$lib/utils/activityFile';

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// File state
	let fileInput: HTMLInputElement | null = $state(null);
	let isDragging = $state(false);
	let parseError = $state<string | null>(null);
	let parsedData = $state<ActivityExportData | null>(null);

	// Import state
	let isImporting = $state(false);
	let importError = $state<string | null>(null);

	onMount(() => {
		env = getAppEnvContext();
	});

	async function handleFileSelect(file: File) {
		parseError = null;
		parsedData = null;

		if (!file.name.endsWith('.json')) {
			parseError = 'Please select a JSON file';
			return;
		}

		try {
			const content = await readFileAsText(file);
			const result = parseActivityFile(content);

			if (!result.valid) {
				parseError = result.error;
				return;
			}

			parsedData = result.data;
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Failed to read file';
		}
	}

	function handleInputChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	async function handleImport() {
		if (!env || !parsedData) return;

		isImporting = true;
		importError = null;

		const result = await importActivity(env, {
			exportData: parsedData,
			ownerStaffId: 'owner-1',
			importScenario: true
		});

		if (isErr(result)) {
			importError = result.error.message;
			isImporting = false;
			return;
		}

		const { program, scenario } = result.value;

		// Navigate to workspace or main activity page depending on whether we have groups
		if (scenario) {
			goto(`/activities/${program.id}/workspace`);
		} else {
			goto(`/activities/${program.id}`);
		}
	}

	function formatDate(isoString: string): string {
		try {
			return new Date(isoString).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return isoString;
		}
	}

	function clearFile() {
		parsedData = null;
		parseError = null;
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<svelte:head>
	<title>Import Activity | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6 p-4">
	<header>
		<a href="/activities" class="text-sm text-gray-500 hover:text-gray-700">
			← Back to Activities
		</a>
		<h1 class="mt-2 text-2xl font-semibold">Import Activity</h1>
		<p class="mt-1 text-sm text-gray-600">
			Import a grouping activity from a file shared by another teacher.
		</p>
	</header>

	{#if !parsedData}
		<!-- File drop zone -->
		<div
			class="relative rounded-lg border-2 border-dashed p-8 text-center transition-colors {isDragging
				? 'border-teal bg-teal-50'
				: 'border-gray-300 hover:border-gray-400'}"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
		>
			<input
				bind:this={fileInput}
				type="file"
				accept=".json"
				class="hidden"
				onchange={handleInputChange}
			/>

			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
				<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
			</div>

			<p class="text-gray-600">
				Drag and drop a file here, or
				<button
					type="button"
					class="font-medium text-teal hover:text-teal-dark"
					onclick={() => fileInput?.click()}
				>
					browse
				</button>
			</p>
			<p class="mt-1 text-sm text-gray-500">JSON files only</p>
		</div>

		{#if parseError}
			<Alert variant="error">{parseError}</Alert>
		{/if}
	{:else}
		<!-- Preview card -->
		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-lg font-medium text-gray-900">{parsedData.activity.name}</h2>
					<p class="mt-1 text-sm text-gray-500">
						Exported {formatDate(parsedData.exportedAt)}
					</p>
				</div>
				<button
					type="button"
					class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
					onclick={clearFile}
					aria-label="Clear file"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div class="mt-4 grid grid-cols-3 gap-4 text-center">
				<div class="rounded-lg bg-gray-50 p-3">
					<p class="text-2xl font-semibold text-gray-900">
						{parsedData.roster.students.length}
					</p>
					<p class="text-sm text-gray-500">Students</p>
				</div>
				<div class="rounded-lg bg-gray-50 p-3">
					<p class="text-2xl font-semibold text-gray-900">
						{parsedData.preferences.length}
					</p>
					<p class="text-sm text-gray-500">Preferences</p>
				</div>
				<div class="rounded-lg bg-gray-50 p-3">
					<p class="text-2xl font-semibold text-gray-900">
						{parsedData.scenario?.groups.length ?? 0}
					</p>
					<p class="text-sm text-gray-500">Groups</p>
				</div>
			</div>

			{#if parsedData.scenario?.groups && parsedData.scenario.groups.length > 0}
				<div class="mt-4">
					<p class="text-sm font-medium text-gray-700">Groups:</p>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each parsedData.scenario.groups as group}
							<span class="rounded-full bg-teal-50 px-2.5 py-0.5 text-sm text-teal-700">
								{group.name}
								<span class="text-teal-500">({group.memberIds.length})</span>
							</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if parsedData.version > ACTIVITY_FILE_VERSION}
				<div class="mt-4">
					<Alert variant="warning">
						This file was created with a newer version of Groupwheel. Some features may not import
						correctly.
					</Alert>
				</div>
			{/if}
		</div>

		{#if importError}
			<Alert variant="error">{importError}</Alert>
		{/if}

		<div class="flex items-center justify-between">
			<Button variant="ghost" onclick={clearFile} disabled={isImporting}>
				Choose Different File
			</Button>
			<Button variant="primary" onclick={handleImport} disabled={isImporting} loading={isImporting}>
				{isImporting ? 'Importing...' : 'Import Activity'}
			</Button>
		</div>
	{/if}
</div>
