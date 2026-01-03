<script lang="ts">
	/**
	 * StepPreferences.svelte
	 *
	 * Step 3 of the Create Groups wizard: import group requests (optional).
	 *
	 * Teachers can paste CSV/TSV data from a Google Form or spreadsheet
	 * containing student group preferences (ranked choices).
	 *
	 * Supports two formats:
	 * 1. Standard format (Shape B):
	 *    Student ID, Choice 1, Choice 2, Choice 3
	 *    alice@test.com, Art Club, Music Club, Drama Club
	 *
	 * 2. Matrix format (Google Forms grid):
	 *    Student ID, Question: [Art Club], Question: [Music Club], ...
	 *    alice@test.com, 1st Choice, 2nd Choice, ...
	 */

	import { devTools } from '$lib/stores/devTools.svelte';
	import type {
		ParsedStudent,
		ParsedPreference
	} from '$lib/application/useCases/createGroupingActivity';
	import { parseGroupRequests, generateExampleCsv } from '$lib/services/groupRequestImport';
	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData } from '$lib/domain/import';
	import TabSelector from '$lib/components/import/TabSelector.svelte';
	import {
		detectPreferenceFormat,
		type PreferenceFormatDetection,
		type MatrixPreferenceColumn
	} from '$lib/application/useCases/extractGroupsFromPreferences';
	import {
		parseAllMatrixPreferences,
		extractChoiceRank
	} from '$lib/utils/matrixPreferenceParser';

	type ImportSource = 'paste' | 'sheet';

	interface Props {
		/** Students from Step 1 (used to validate preferences) */
		students: ParsedStudent[];

		/** Group names from Step 2 (used to validate group choices) */
		groupNames: string[];

		/** Current parsed preferences */
		preferences: ParsedPreference[];

		/** Callback when preferences are parsed */
		onPreferencesParsed: (preferences: ParsedPreference[], warnings: string[]) => void;

		/** Optional: connected Google Sheet for import */
		sheetConnection?: SheetConnection | null;
	}

	let { students, groupNames, preferences, onPreferencesParsed, sheetConnection = null }: Props = $props();

	// Local state
	let pastedText = $state('');

	// Import source selection
	let importSource = $state<ImportSource>(sheetConnection ? 'sheet' : 'paste');
	let hasSheetConnection = $derived(sheetConnection !== null);

	// Sheet import state
	let selectedTab = $state<SheetTab | null>(null);
	let tabData = $state<RawSheetData | null>(null);
	let formatDetection = $state<PreferenceFormatDetection | null>(null);
	let sheetParseError = $state('');
	let isParsingSheet = $state(false);
	let studentIdColumnIndex = $state<number>(-1);

	type PreferenceField = 'studentId' | 'ignore' | null;

	/**
	 * Guess if a column contains student IDs/emails
	 */
	function guessStudentIdColumn(header: string): boolean {
		const h = header.toLowerCase().trim();
		if (h === 'email' || h === 'email address' || h.includes('email')) return true;
		if (h === 'id' || h === 'student id' || h === 'student_id' || h === 'studentid') return true;
		if (h === 'username' || h === 'user') return true;
		return false;
	}

	function handleSourceChange(source: ImportSource) {
		importSource = source;
		// Reset state when switching
		if (source === 'paste') {
			selectedTab = null;
			tabData = null;
			formatDetection = null;
			sheetParseError = '';
			studentIdColumnIndex = -1;
		} else {
			pastedText = '';
		}
	}

	function handleTabSelect(tab: SheetTab, data: RawSheetData) {
		selectedTab = tab;
		tabData = data;
		sheetParseError = '';

		// Auto-detect format
		formatDetection = detectPreferenceFormat(data);

		// Auto-guess student ID column
		studentIdColumnIndex = -1;
		for (let i = 0; i < data.headers.length; i++) {
			if (guessStudentIdColumn(data.headers[i])) {
				studentIdColumnIndex = i;
				break;
			}
		}
	}

	// Preview state
	type PreviewItem = { studentId: string; studentName: string; choices: string[] };
	let previewPreferences = $state<PreviewItem[]>([]);

	function handleStudentIdColumnChange(index: number) {
		studentIdColumnIndex = index;
		// Generate preview when student ID column changes
		updatePreview();
	}

	function updatePreview() {
		if (!tabData || !formatDetection || studentIdColumnIndex < 0) {
			previewPreferences = [];
			return;
		}

		const preview: PreviewItem[] = [];
		const studentMap = new Map(students.map((s) => [s.id.toLowerCase(), s]));

		if (formatDetection.format === 'matrix' && formatDetection.matrixColumns) {
			const matrixPrefs = parseAllMatrixPreferences(tabData, formatDetection.matrixColumns);

			for (let i = 0; i < Math.min(tabData.rows.length, 5); i++) {
				const row = tabData.rows[i];
				const studentId = row.cells[studentIdColumnIndex]?.toLowerCase().trim();
				if (!studentId) continue;

				const student = studentMap.get(studentId);
				const matrixPref = matrixPrefs[i];

				if (matrixPref.rankedChoices.length > 0) {
					preview.push({
						studentId,
						studentName: student ? `${student.firstName} ${student.lastName}`.trim() : studentId,
						choices: matrixPref.rankedChoices
					});
				}
			}
		}

		previewPreferences = preview;
	}

	function parseSheetPreferences() {
		if (!tabData || !formatDetection) return;

		isParsingSheet = true;
		sheetParseError = '';

		try {
			const warnings: string[] = [];

			if (formatDetection.format === 'matrix' && formatDetection.matrixColumns) {
				// Matrix format parsing
				const matrixPrefs = parseAllMatrixPreferences(tabData, formatDetection.matrixColumns);

				// Use the selected student ID column
				if (studentIdColumnIndex < 0) {
					sheetParseError = 'Please select which column contains the student ID or email.';
					isParsingSheet = false;
					return;
				}

				const idColIdx = studentIdColumnIndex;

				// Convert matrix preferences to ParsedPreference format
				const parsed: ParsedPreference[] = [];
				const studentIdSet = new Set(students.map((s) => s.id.toLowerCase()));

				for (let i = 0; i < tabData.rows.length; i++) {
					const row = tabData.rows[i];
					const studentId = row.cells[idColIdx]?.toLowerCase().trim();

					if (!studentId) continue;

					// Check if student exists in roster
					if (!studentIdSet.has(studentId)) {
						warnings.push(`Row ${row.rowIndex}: Unknown student "${studentId}"`);
						continue;
					}

					const matrixPref = matrixPrefs[i];
					if (matrixPref.rankedChoices.length > 0) {
						parsed.push({
							studentId,
							likeGroupIds: matrixPref.rankedChoices
						});
					}
				}

				if (parsed.length === 0) {
					sheetParseError = 'No valid preferences found. Check that student IDs match your roster.';
				} else {
					onPreferencesParsed(parsed, warnings);
				}
			} else {
				// Standard format - use existing parser
				// Convert sheet data to CSV-like text
				const csvLines = [tabData.headers.join(',')];
				for (const row of tabData.rows) {
					csvLines.push(row.cells.join(','));
				}
				const csvText = csvLines.join('\n');

				const result = parseGroupRequests(csvText, {
					groupNames,
					studentIds: students.map((s) => s.id)
				});

				if (result.preferences.length === 0) {
					sheetParseError = 'No valid preferences found. Check the data format.';
				} else {
					onPreferencesParsed(result.preferences, result.warnings);
				}
			}
		} catch (e) {
			sheetParseError = `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`;
		} finally {
			isParsingSheet = false;
		}
	}

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
			{#if hasSheetConnection}
				Import preferences from your connected sheet or paste data.
			{:else}
				If you collected group preferences from students, paste them here.
			{/if}
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
		<!-- Source toggle (only show if sheet is connected) -->
		{#if hasSheetConnection}
			<div class="flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors {importSource === 'sheet'
						? 'border-teal bg-teal/5 text-teal'
						: 'border-gray-200 text-gray-600 hover:border-gray-300'}"
					onclick={() => handleSourceChange('sheet')}
				>
					<div class="flex items-center justify-center gap-2">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						Import from Sheet
					</div>
				</button>
				<button
					type="button"
					class="flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors {importSource === 'paste'
						? 'border-teal bg-teal/5 text-teal'
						: 'border-gray-200 text-gray-600 hover:border-gray-300'}"
					onclick={() => handleSourceChange('paste')}
				>
					<div class="flex items-center justify-center gap-2">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
						Paste Data
					</div>
				</button>
			</div>
		{/if}

		<!-- Sheet import UI -->
		{#if importSource === 'sheet' && sheetConnection}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
				<TabSelector
					connection={sheetConnection}
					onTabSelect={handleTabSelect}
					label="Select tab with preference data"
					{selectedTab}
				/>

				<!-- Format detection result -->
				{#if formatDetection && tabData}
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
						<div class="flex items-start gap-3">
							<svg class="h-5 w-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div class="flex-1">
								<p class="text-sm font-medium text-blue-900">
									{#if formatDetection.format === 'matrix'}
										Matrix format detected
									{:else if formatDetection.format === 'standard'}
										Standard format detected
									{:else}
										Unknown format
									{/if}
								</p>
								<p class="mt-1 text-sm text-blue-700">{formatDetection.description}</p>

								{#if formatDetection.previewGroups.length > 0}
									<div class="mt-2">
										<p class="text-xs text-blue-600 mb-1">Groups found:</p>
										<div class="flex flex-wrap gap-1">
											{#each formatDetection.previewGroups as group}
												<span class="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
													{group}
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- Student ID column selector -->
						<div class="border-t border-blue-200 pt-3">
							<label for="student-id-column" class="block text-sm font-medium text-blue-900 mb-2">
								Which column contains the student ID or email?
							</label>
							<select
								id="student-id-column"
								class="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								value={studentIdColumnIndex}
								onchange={(e) => handleStudentIdColumnChange(parseInt((e.target as HTMLSelectElement).value))}
							>
								<option value={-1}>Select column...</option>
								{#each tabData.headers as header, idx}
									<option value={idx}>
										{header}
										{#if guessStudentIdColumn(header)}(likely){/if}
									</option>
								{/each}
							</select>

							{#if studentIdColumnIndex >= 0}
								<p class="mt-1 text-xs text-blue-600">
									Preview: {tabData.rows.slice(0, 2).map(r => r.cells[studentIdColumnIndex]).join(', ')}...
								</p>
							{/if}
						</div>

						<!-- Preferences preview -->
						{#if previewPreferences.length > 0}
							<div class="border-t border-blue-200 pt-3">
								<p class="text-sm font-medium text-blue-900 mb-2">Preview of parsed preferences:</p>
								<div class="rounded-lg border border-blue-100 bg-white divide-y divide-blue-100">
									{#each previewPreferences as item}
										<div class="px-3 py-2">
											<p class="font-medium text-gray-900 text-sm">{item.studentName}</p>
											<p class="text-xs text-gray-500 mt-0.5">
												Choices: <span class="text-blue-700">{item.choices.join(' → ')}</span>
											</p>
										</div>
									{/each}
								</div>
								{#if tabData && tabData.rows.length > 5}
									<p class="mt-1 text-xs text-blue-600">
										+{tabData.rows.length - 5} more students...
									</p>
								{/if}
							</div>
						{/if}

						<!-- Import button -->
						<button
							type="button"
							onclick={parseSheetPreferences}
							disabled={isParsingSheet || formatDetection.format === 'unknown' || studentIdColumnIndex < 0}
							class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isParsingSheet}
								Importing...
							{:else if studentIdColumnIndex < 0}
								Select student ID column to import
							{:else}
								Import Preferences
							{/if}
						</button>
					</div>
				{/if}

				<!-- Sheet parse error -->
				{#if sheetParseError}
					<div class="rounded-lg border border-red-200 bg-red-50 p-3">
						<p class="text-sm text-red-700">{sheetParseError}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Paste area (shown when paste mode or no sheet connection) -->
		{#if importSource === 'paste' || !hasSheetConnection}
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
					class="mt-1 block h-48 w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-teal focus:ring-teal"
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
					class="text-sm text-teal hover:text-teal-dark hover:underline"
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
	{/if}

	<!-- Help text -->
	<div class="rounded-lg border border-teal/20 bg-teal-light p-4">
		<h3 class="text-sm font-medium text-teal-dark">Tips</h3>
		<ul class="mt-2 list-inside list-disc space-y-1 text-sm text-teal-dark">
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
