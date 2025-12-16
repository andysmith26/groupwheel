<script lang="ts">
	/**
	 * StepPreferences.svelte
	 *
	 * Step 3 of the Create Groups wizard: import group requests (optional).
	 *
	 * Teachers can paste CSV/TSV data from a Google Form or spreadsheet
	 * containing student group preferences (ranked choices).
	 *
	 * Expected format:
	 *   Student ID, Choice 1, Choice 2, Choice 3
	 *   alice@test.com, Art Club, Music Club, Drama Club
	 *   bob@test.com, Chess Club, Art Club,
	 */

	import { devTools } from '$lib/stores/devTools.svelte';
	import type {
		ParsedStudent,
		ParsedPreference
	} from '$lib/application/useCases/createGroupingActivity';
	import { parseGroupRequests, generateExampleCsv } from '$lib/services/groupRequestImport';

	interface Props {
		/** Students from Step 1 (used to validate preferences) */
		students: ParsedStudent[];

		/** Group names from Step 2 (used to validate group choices) */
		groupNames: string[];

		/** Current parsed preferences */
		preferences: ParsedPreference[];

		/** Callback when preferences are parsed */
		onPreferencesParsed: (preferences: ParsedPreference[], warnings: string[]) => void;
	}

	let { students, groupNames, preferences, onPreferencesParsed }: Props = $props();

	// Local state
	let pastedText = $state('');

	/**
	 * Generate sample preference data for dev mode testing.
	 * Uses current students and group names to create realistic preferences.
	 */
	function generateSamplePreferences(): string {
		if (students.length === 0 || groupNames.length === 0) {
			return '';
		}

		const lines = ['Student ID,Choice 1,Choice 2,Choice 3'];

		// Give each student randomized preferences from available groups
		for (const student of students) {
			// Shuffle groups and pick up to 3
			const shuffled = [...groupNames].sort(() => Math.random() - 0.5);
			const choices = shuffled.slice(0, Math.min(3, shuffled.length));

			// Some students have fewer preferences (more realistic)
			const numChoices = Math.random() > 0.3 ? choices.length : Math.max(1, choices.length - 1);
			const finalChoices = choices.slice(0, numChoices);

			lines.push([student.id, ...finalChoices].join(','));
		}

		return lines.join('\n');
	}

	function loadSampleData() {
		pastedText = generateSamplePreferences();
		handlePaste();
	}
	let parseResult = $state<{
		preferences: ParsedPreference[];
		warnings: string[];
		stats: {
			totalRows: number;
			imported: number;
			skipped: number;
			unknownStudents: string[];
			unknownGroups: string[];
		};
	} | null>(null);
	let showExample = $state(false);

	// Derived
	let hasGroups = $derived(groupNames.length > 0);
	let exampleCsv = $derived(generateExampleCsv(groupNames));

	function handlePaste() {
		if (!pastedText.trim()) {
			parseResult = null;
			return;
		}

		const result = parseGroupRequests(pastedText, {
			groupNames,
			studentIds: students.map((s) => s.id)
		});

		parseResult = result;

		// Auto-commit if there are results
		if (result.preferences.length > 0) {
			onPreferencesParsed(result.preferences, result.warnings);
		}
	}

	function handleClear() {
		pastedText = '';
		parseResult = null;
		onPreferencesParsed([], []);
	}

	function handleSkip() {
		onPreferencesParsed([], []);
	}

	// Watch for text changes and parse
	$effect(() => {
		if (pastedText.trim()) {
			handlePaste();
		}
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="text-lg font-medium text-gray-900">Group Requests (Optional)</h2>
		<p class="mt-1 text-sm text-gray-600">
			If you collected group preferences from students, paste them here.
		</p>
	</div>

	<!-- No groups warning -->
	{#if !hasGroups}
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
			<div class="flex">
				<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<div class="ml-3">
					<p class="text-sm text-amber-700">
						<strong>No groups defined.</strong> Go back to the Groups step to create named groups before
						importing requests. Or skip this step to use random assignment.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main content when groups exist -->
		<div class="space-y-4">
			<!-- Paste area -->
			<div>
				<div class="flex items-center justify-between">
					<label for="paste-area" class="block text-sm font-medium text-gray-700">
						Paste CSV or TSV data
					</label>
					{#if devTools.enabled && students.length > 0 && groupNames.length > 0}
						<button
							type="button"
							class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
							onclick={loadSampleData}
						>
							Load sample data
						</button>
					{/if}
				</div>
				<textarea
					id="paste-area"
					bind:value={pastedText}
					class="mt-1 block h-48 w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
					placeholder="Student ID,Choice 1,Choice 2,Choice 3&#10;alice@example.com,Art Club,Music Club,Drama Club&#10;bob@example.com,Chess Club,Art Club,"
				></textarea>
				<p class="mt-1 text-xs text-gray-500">
					Expected columns: Student ID, Choice 1, Choice 2, ... (choices are group names)
				</p>
			</div>

			<!-- Example toggle -->
			<div>
				<button
					type="button"
					class="text-sm text-blue-600 hover:text-blue-800 hover:underline"
					onclick={() => (showExample = !showExample)}
				>
					{showExample ? 'Hide example' : 'Show example format'}
				</button>

				{#if showExample}
					<div class="mt-2 rounded-lg bg-gray-50 p-3">
						<p class="mb-2 text-xs font-medium text-gray-600">Example CSV with your groups:</p>
						<pre class="overflow-x-auto text-xs text-gray-700">{exampleCsv}</pre>
					</div>
				{/if}
			</div>

			<!-- Parse results -->
			{#if parseResult}
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
					<h3 class="text-sm font-medium text-gray-900">Import Results</h3>

					<div class="mt-2 grid grid-cols-3 gap-4 text-center">
						<div>
							<div class="text-2xl font-semibold text-green-600">{parseResult.stats.imported}</div>
							<div class="text-xs text-gray-500">Imported</div>
						</div>
						<div>
							<div class="text-2xl font-semibold text-amber-600">{parseResult.stats.skipped}</div>
							<div class="text-xs text-gray-500">Skipped</div>
						</div>
						<div>
							<div class="text-2xl font-semibold text-gray-600">{parseResult.stats.totalRows}</div>
							<div class="text-xs text-gray-500">Total Rows</div>
						</div>
					</div>

					{#if parseResult.warnings.length > 0}
						<div class="mt-3 border-t border-gray-200 pt-3">
							<details class="text-sm">
								<summary class="cursor-pointer text-amber-700">
									{parseResult.warnings.length} warning{parseResult.warnings.length === 1
										? ''
										: 's'}
								</summary>
								<ul
									class="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-xs text-gray-600"
								>
									{#each parseResult.warnings.slice(0, 20) as warning}
										<li>{warning}</li>
									{/each}
									{#if parseResult.warnings.length > 20}
										<li class="text-gray-400">... and {parseResult.warnings.length - 20} more</li>
									{/if}
								</ul>
							</details>
						</div>
					{/if}

					{#if parseResult.stats.unknownGroups.length > 0}
						<div class="mt-3 border-t border-gray-200 pt-3">
							<p class="text-xs text-gray-600">
								<strong>Unknown groups:</strong>
								{parseResult.stats.unknownGroups.slice(0, 5).join(', ')}
								{#if parseResult.stats.unknownGroups.length > 5}
									... and {parseResult.stats.unknownGroups.length - 5} more
								{/if}
							</p>
							<p class="mt-1 text-xs text-gray-500">
								Make sure group names match exactly (case-insensitive).
							</p>
						</div>
					{/if}
				</div>

				<!-- Clear button -->
				<div class="flex justify-end">
					<button
						type="button"
						class="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
						onclick={handleClear}
					>
						Clear and start over
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Help text -->
	<div class="rounded-lg border border-blue-100 bg-blue-50 p-4">
		<h3 class="text-sm font-medium text-blue-900">Tips</h3>
		<ul class="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
			<li>Export your Google Form responses as CSV</li>
			<li>Student IDs should match those from your roster</li>
			<li>Group names should match the groups you created in the previous step</li>
			<li>Empty choices are fine - not every student needs to rank all groups</li>
		</ul>
	</div>

	<!-- Available groups reference -->
	{#if hasGroups}
		<div class="rounded-lg border border-gray-200 p-4">
			<h3 class="text-sm font-medium text-gray-900">Available Groups</h3>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each groupNames as name}
					<span class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{name}</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Dev tools info -->
	{#if devTools.enabled}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
			<p class="text-xs text-gray-500">
				Dev mode: Students: {students.length}, Groups: {groupNames.length}, Preferences: {preferences.length}
			</p>
		</div>
	{/if}
</div>
