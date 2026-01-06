<script lang="ts">
	/**
	 * PreferencesImportModal.svelte
	 *
	 * Modal for importing student preferences after groups are created.
	 * Supports paste import and optionally sheet import if connected.
	 */

	import type { Student, SheetConnection, SheetTab } from '$lib/domain';
	import type { RawSheetData } from '$lib/domain/import';
	import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';
	import { parseGroupRequests, generateExampleCsv } from '$lib/services/groupRequestImport';
	import TabSelector from '$lib/components/import/TabSelector.svelte';
	import {
		detectPreferenceFormat,
		type PreferenceFormatDetection
	} from '$lib/application/useCases/extractGroupsFromPreferences';
	import { parseAllMatrixPreferences } from '$lib/utils/matrixPreferenceParser';

	interface Props {
		isOpen: boolean;
		students: Student[];
		groupNames: string[];
		programId: string;
		sheetConnection: SheetConnection | null;
		onSuccess: (preferences: ParsedPreference[], warnings: string[]) => void;
		onCancel: () => void;
	}

	const {
		isOpen,
		students,
		groupNames,
		programId,
		sheetConnection = null,
		onSuccess,
		onCancel
	}: Props = $props();

	// Import source
	type ImportSource = 'paste' | 'sheet';
	let importSource = $state<ImportSource>(sheetConnection ? 'sheet' : 'paste');
	let hasSheetConnection = $derived(sheetConnection !== null);

	// Paste import state
	let pastedText = $state('');
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

	// Sheet import state
	let selectedTab = $state<SheetTab | null>(null);
	let tabData = $state<RawSheetData | null>(null);
	let formatDetection = $state<PreferenceFormatDetection | null>(null);
	let sheetParseError = $state('');
	let isParsingSheet = $state(false);
	let studentIdColumnIndex = $state<number>(-1);
	let sheetPreferences = $state<ParsedPreference[]>([]);
	let sheetWarnings = $state<string[]>([]);

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			pastedText = '';
			parseResult = null;
			selectedTab = null;
			tabData = null;
			formatDetection = null;
			sheetParseError = '';
			studentIdColumnIndex = -1;
			sheetPreferences = [];
			sheetWarnings = [];
			importSource = sheetConnection ? 'sheet' : 'paste';
		}
	});

	function handleSourceChange(source: ImportSource) {
		importSource = source;
		// Reset state when switching
		if (source === 'paste') {
			selectedTab = null;
			tabData = null;
			formatDetection = null;
			sheetParseError = '';
			studentIdColumnIndex = -1;
			sheetPreferences = [];
			sheetWarnings = [];
		} else {
			pastedText = '';
			parseResult = null;
		}
	}

	function guessStudentIdColumn(header: string): boolean {
		const h = header.toLowerCase().trim();
		if (h === 'email' || h === 'email address' || h.includes('email')) return true;
		if (h === 'id' || h === 'student id' || h === 'student_id' || h === 'studentid') return true;
		if (h === 'username' || h === 'user') return true;
		return false;
	}

	function handleTabSelect(tab: SheetTab, data: RawSheetData) {
		selectedTab = tab;
		tabData = data;
		sheetParseError = '';
		sheetPreferences = [];
		sheetWarnings = [];

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

	function parseSheetPreferences() {
		if (!tabData || !formatDetection) return;

		isParsingSheet = true;
		sheetParseError = '';
		sheetPreferences = [];
		sheetWarnings = [];

		try {
			const warnings: string[] = [];

			if (formatDetection.format === 'matrix' && formatDetection.matrixColumns) {
				// Matrix format parsing
				const matrixPrefs = parseAllMatrixPreferences(tabData, formatDetection.matrixColumns);

				if (studentIdColumnIndex < 0) {
					sheetParseError = 'Please select which column contains the student ID or email.';
					isParsingSheet = false;
					return;
				}

				const parsed: ParsedPreference[] = [];
				const studentIdSet = new Set(students.map((s) => s.id.toLowerCase()));

				for (let i = 0; i < tabData.rows.length; i++) {
					const row = tabData.rows[i];
					const studentId = row.cells[studentIdColumnIndex]?.toLowerCase().trim();

					if (!studentId) continue;

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
					sheetPreferences = parsed;
					sheetWarnings = warnings;
				}
			} else {
				// Standard format
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
					sheetPreferences = result.preferences;
					sheetWarnings = result.warnings;
				}
			}
		} catch (e) {
			sheetParseError = `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`;
		} finally {
			isParsingSheet = false;
		}
	}

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
	}

	// Watch for text changes
	$effect(() => {
		if (pastedText.trim()) {
			handlePaste();
		} else {
			parseResult = null;
		}
	});

	function handleImport() {
		if (importSource === 'paste' && parseResult && parseResult.preferences.length > 0) {
			onSuccess(parseResult.preferences, parseResult.warnings);
		} else if (importSource === 'sheet' && sheetPreferences.length > 0) {
			onSuccess(sheetPreferences, sheetWarnings);
		}
	}

	let canImport = $derived(
		(importSource === 'paste' && parseResult && parseResult.preferences.length > 0) ||
		(importSource === 'sheet' && sheetPreferences.length > 0)
	);

	let exampleCsv = $derived(generateExampleCsv(groupNames));
</script>

{#if isOpen}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/50"
		onclick={onCancel}
		aria-label="Close modal"
	></button>

	<!-- Modal -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
		<div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
			<!-- Header -->
			<div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">Import Student Preferences</h2>
					<button
						type="button"
						class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
						onclick={onCancel}
						aria-label="Close"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<p class="mt-1 text-sm text-gray-600">
					Import group preferences to help the algorithm make smarter placements.
				</p>
			</div>

			<div class="p-6 space-y-6">
				<!-- Source toggle (only if sheet connected) -->
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
					<div class="space-y-4">
						<TabSelector
							connection={sheetConnection}
							onTabSelect={handleTabSelect}
							label="Select tab with preference data"
							{selectedTab}
						/>

						{#if formatDetection}
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
								<p class="text-sm">
									<span class="font-medium text-gray-700">Detected format:</span>
									<span class="ml-2 text-gray-600">
										{formatDetection.format === 'matrix' ? 'Matrix/Grid format' : 'Standard format'}
									</span>
								</p>
								{#if formatDetection.format === 'matrix' && formatDetection.matrixColumns}
									<p class="mt-1 text-sm text-gray-600">
										Found {formatDetection.matrixColumns.length} group columns
									</p>
								{/if}
							</div>

							{#if tabData && formatDetection.format === 'matrix'}
								<div>
									<label for="student-id-column" class="block text-sm font-medium text-gray-700 mb-2">
										Which column contains student IDs?
									</label>
									<select
										id="student-id-column"
										class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-teal"
										value={studentIdColumnIndex}
										onchange={(e) => studentIdColumnIndex = parseInt((e.target as HTMLSelectElement).value)}
									>
										<option value={-1}>Select column...</option>
										{#each tabData.headers as header, i}
											<option value={i}>{header}</option>
										{/each}
									</select>
								</div>
							{/if}

							<button
								type="button"
								class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
								onclick={parseSheetPreferences}
								disabled={isParsingSheet || (formatDetection.format === 'matrix' && studentIdColumnIndex < 0)}
							>
								{isParsingSheet ? 'Parsing...' : 'Parse Preferences'}
							</button>
						{/if}

						{#if sheetParseError}
							<div class="rounded-lg border border-red-200 bg-red-50 p-3">
								<p class="text-sm text-red-700">{sheetParseError}</p>
							</div>
						{/if}

						{#if sheetPreferences.length > 0}
							<div class="rounded-lg border border-green-200 bg-green-50 p-4">
								<p class="text-sm font-medium text-green-800">
									Found {sheetPreferences.length} student preferences
								</p>
								{#if sheetWarnings.length > 0}
									<p class="mt-1 text-sm text-amber-700">
										{sheetWarnings.length} warnings (some students not found)
									</p>
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Paste import UI -->
				{#if importSource === 'paste' || !hasSheetConnection}
					<div class="space-y-4">
						<div>
							<label for="preferences-paste" class="block text-sm font-medium text-gray-700 mb-2">
								Paste preference data (CSV/TSV)
							</label>
							<textarea
								id="preferences-paste"
								class="h-40 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal"
								bind:value={pastedText}
								placeholder="Student ID,Choice 1,Choice 2,Choice 3
alice@school.edu,Art Club,Music Club,Drama Club
bob@school.edu,Science Club,Art Club,Music Club"
							></textarea>
						</div>

						{#if exampleCsv && groupNames.length > 0}
							<details class="text-sm">
								<summary class="cursor-pointer text-teal hover:text-teal-dark">
									Show expected format
								</summary>
								<pre class="mt-2 rounded bg-gray-100 p-3 text-xs overflow-x-auto">{exampleCsv}</pre>
							</details>
						{/if}

						{#if parseResult}
							{#if parseResult.preferences.length > 0}
								<div class="rounded-lg border border-green-200 bg-green-50 p-4">
									<p class="text-sm font-medium text-green-800">
										Found {parseResult.preferences.length} student preferences
									</p>
									<p class="mt-1 text-sm text-green-700">
										{parseResult.stats.imported} imported, {parseResult.stats.skipped} skipped
									</p>
									{#if parseResult.warnings.length > 0}
										<details class="mt-2">
											<summary class="cursor-pointer text-sm text-amber-700">
												{parseResult.warnings.length} warnings
											</summary>
											<ul class="mt-1 text-xs text-amber-600 list-disc list-inside">
												{#each parseResult.warnings.slice(0, 5) as warning}
													<li>{warning}</li>
												{/each}
												{#if parseResult.warnings.length > 5}
													<li>...and {parseResult.warnings.length - 5} more</li>
												{/if}
											</ul>
										</details>
									{/if}
								</div>
							{:else}
								<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
									<p class="text-sm text-amber-700">
										No valid preferences found. Check that student IDs match your roster and group names match your groups.
									</p>
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end gap-3">
					<button
						type="button"
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={onCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
						disabled={!canImport}
						onclick={handleImport}
					>
						Import Preferences
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
