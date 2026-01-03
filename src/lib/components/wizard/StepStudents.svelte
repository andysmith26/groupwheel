<script lang="ts">
	/**
	 * StepStudents.svelte
	 *
	 * Step 1 of the Create Groups wizard: paste roster data or import from sheet.
	 * Handles paste detection, parsing, preview, and validation.
	 */

	import { devTools } from '$lib/stores/devTools.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ParsedStudent } from '$lib/application/useCases/createGroupingActivity';
	import { sampleRosters, sampleRosterById } from '$lib/content/sampleRosters';
	import type { SheetConnection, SheetTab } from '$lib/domain/sheetConnection';
	import type { RawSheetData, ColumnMapping, MappedField } from '$lib/domain/import';
	import TabSelector from '$lib/components/import/TabSelector.svelte';

	type ImportSource = 'paste' | 'sheet';
	type StudentField = 'name' | 'id' | 'firstName' | 'lastName' | 'grade' | 'ignore' | null;

	interface Props {
		students: ParsedStudent[];
		onStudentsParsed: (students: ParsedStudent[]) => void;
		/** Optional: connected Google Sheet for import */
		sheetConnection?: SheetConnection | null;
	}

	let { students, onStudentsParsed, sheetConnection = null }: Props = $props();

	let pastedText = $state('');
	let parseError = $state('');
	let showFormatHelp = $state(false);
	let showSampleMenu = $state(false);

	// Import source selection
	let importSource = $state<ImportSource>(sheetConnection ? 'sheet' : 'paste');
	let hasSheetConnection = $derived(sheetConnection !== null);

	// Sheet import state
	let selectedTab = $state<SheetTab | null>(null);
	let tabData = $state<RawSheetData | null>(null);
	let columnMappings = $state<Map<number, StudentField>>(new Map());
	let showMappingUI = $state(false);

	// Field options for column mapping dropdown
	const fieldOptions: { value: StudentField; label: string }[] = [
		{ value: null, label: 'Select field...' },
		{ value: 'name', label: 'Full Name' },
		{ value: 'firstName', label: 'First Name' },
		{ value: 'lastName', label: 'Last Name' },
		{ value: 'id', label: 'ID / Email' },
		{ value: 'grade', label: 'Grade' },
		{ value: 'ignore', label: 'Ignore' }
	];

	/**
	 * Smart guess for what a column contains based on header text.
	 */
	function guessColumnField(header: string): StudentField {
		const h = header.toLowerCase().trim();

		// ID / Email patterns
		if (h === 'email' || h === 'email address' || h.includes('email')) return 'id';
		if (h === 'id' || h === 'student id' || h === 'student_id' || h === 'studentid') return 'id';

		// Full name patterns
		if (h === 'name' || h === 'full name' || h === 'student name' || h === 'display name') return 'name';
		if (h.includes('first') && h.includes('last')) return 'name'; // "First & Last Name"
		if (h.includes('your') && h.includes('name')) return 'name'; // "Your Name" or "Your First & Last Name"

		// First name patterns
		if (h === 'first name' || h === 'firstname' || h === 'first') return 'firstName';
		if (h === 'given name' || h === 'givenname') return 'firstName';

		// Last name patterns
		if (h === 'last name' || h === 'lastname' || h === 'last') return 'lastName';
		if (h === 'surname' || h === 'family name') return 'lastName';

		// Grade patterns
		if (h === 'grade' || h === 'grade level' || h === 'year' || h === 'class') return 'grade';

		// Ignore common non-student columns
		if (h === 'timestamp' || h.includes('timestamp')) return 'ignore';
		if (h === 'score' || h.includes('score')) return 'ignore';

		return null;
	}

	function handleSourceChange(source: ImportSource) {
		importSource = source;
		// Reset state when switching
		if (source === 'paste') {
			selectedTab = null;
			tabData = null;
			columnMappings = new Map();
			showMappingUI = false;
		} else {
			pastedText = '';
			parseError = '';
		}
	}

	function handleTabSelect(tab: SheetTab, data: RawSheetData) {
		selectedTab = tab;
		tabData = data;
		parseError = '';

		// Auto-guess column mappings
		const mappings = new Map<number, StudentField>();
		for (let i = 0; i < data.headers.length; i++) {
			const guessed = guessColumnField(data.headers[i]);
			mappings.set(i, guessed);
		}
		columnMappings = mappings;
		showMappingUI = true;
	}

	function handleMappingChange(columnIndex: number, field: StudentField) {
		const newMappings = new Map(columnMappings);
		newMappings.set(columnIndex, field);
		columnMappings = newMappings;
	}

	function getMappedColumnIndex(field: StudentField): number {
		for (const [idx, f] of columnMappings) {
			if (f === field) return idx;
		}
		return -1;
	}

	// Check if we have minimum required mappings
	let hasRequiredMappings = $derived(() => {
		const hasName = getMappedColumnIndex('name') >= 0;
		const hasFirstName = getMappedColumnIndex('firstName') >= 0;
		const hasId = getMappedColumnIndex('id') >= 0;
		// Need either name or firstName, and ideally id (but can generate from name)
		return hasName || hasFirstName || hasId;
	});

	function importFromSheet() {
		if (!tabData) return;
		parseSheetData(tabData);
	}

	function parseSheetData(data: RawSheetData) {
		parseError = '';

		try {
			// Use column mappings to find indices
			const nameIdx = getMappedColumnIndex('name');
			const firstNameIdx = getMappedColumnIndex('firstName');
			const lastNameIdx = getMappedColumnIndex('lastName');
			const idIdx = getMappedColumnIndex('id');
			const gradeIdx = getMappedColumnIndex('grade');

			// Need at least one identifying field
			if (nameIdx < 0 && firstNameIdx < 0 && idIdx < 0) {
				parseError = 'Please map at least one column to "Full Name", "First Name", or "ID / Email".';
				onStudentsParsed([]);
				return;
			}

			// Parse data rows
			const parsed: ParsedStudent[] = [];
			const seenIds = new SvelteSet<string>();

			for (const row of data.rows) {
				const cells = row.cells;

				// Skip empty rows
				if (cells.every((c) => c === '')) continue;

				// Extract values based on mappings
				const rawName = nameIdx >= 0 ? (cells[nameIdx] ?? '').trim() : '';
				const rawFirstName = firstNameIdx >= 0 ? (cells[firstNameIdx] ?? '').trim() : '';
				const rawLastName = lastNameIdx >= 0 ? (cells[lastNameIdx] ?? '').trim() : '';
				const rawId = idIdx >= 0 ? (cells[idIdx] ?? '').trim() : '';
				const rawGrade = gradeIdx >= 0 ? (cells[gradeIdx] ?? '').trim() : undefined;

				// Determine first/last name
				let firstName = rawFirstName;
				let lastName = rawLastName;

				if (!firstName && rawName) {
					// Parse full name into first/last
					const nameParts = rawName.split(/\s+/);
					firstName = nameParts[0] ?? '';
					lastName = nameParts.slice(1).join(' ') ?? '';
				}

				// Determine ID
				const displayName = rawName || `${firstName} ${lastName}`.trim();
				const id = rawId || displayName.toLowerCase().replace(/\s+/g, '.');

				if (!id) continue; // Skip rows with no identifiable ID

				// Skip duplicates
				if (seenIds.has(id.toLowerCase())) continue;
				seenIds.add(id.toLowerCase());

				parsed.push({
					id: id.toLowerCase(),
					firstName,
					lastName,
					displayName: displayName || id,
					grade: rawGrade || undefined,
					meta: {}
				});
			}

			if (parsed.length === 0) {
				parseError = 'No valid student rows found. Check your column mappings.';
				onStudentsParsed([]);
				return;
			}

			onStudentsParsed(parsed);
		} catch (e) {
			parseError = `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			onStudentsParsed([]);
		}
	}

	function loadSampleData(rosterId: string) {
		const roster = sampleRosterById.get(rosterId);
		if (!roster) return;
		pastedText = roster.data;
		showSampleMenu = false;
		parseRoster();
	}

	function parseRoster() {
		parseError = '';

		if (!pastedText.trim()) {
			onStudentsParsed([]);
			return;
		}

		try {
			const lines = pastedText.trim().split('\n');
			if (lines.length < 2) {
				parseError = 'Need at least a header row and one student row.';
				onStudentsParsed([]);
				return;
			}

			// Parse header to find column indices
			const delimiter = lines[0].includes('\t') ? '\t' : ',';
			const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

			// Find required columns
			const nameIdx = headers.findIndex(
				(h) => h === 'name' || h === 'display name' || h === 'student name' || h === 'full name'
			);
			const idIdx = headers.findIndex(
				(h) => h === 'id' || h === 'email' || h === 'student id' || h === 'student_id'
			);

			if (nameIdx === -1 && idIdx === -1) {
				parseError =
					'Could not find "name" or "id" columns. Make sure your header row includes these.';
				onStudentsParsed([]);
				return;
			}

			// Find optional columns
			const gradeIdx = headers.findIndex((h) => h === 'grade' || h === 'grade level');

			// Parse data rows
			const parsed: ParsedStudent[] = [];
			const seenIds = new SvelteSet<string>();

			for (let i = 1; i < lines.length; i++) {
				const cells = lines[i].split(delimiter).map((c) => c.trim());

				// Skip empty rows
				if (cells.every((c) => c === '')) continue;

				const rawName = nameIdx >= 0 ? (cells[nameIdx] ?? '') : '';
				const rawId = idIdx >= 0 ? (cells[idIdx] ?? '') : '';
				const rawGrade = gradeIdx >= 0 ? (cells[gradeIdx] ?? '') : undefined;

				// Generate ID from name if no ID column
				const id = rawId || rawName.toLowerCase().replace(/\s+/g, '.');

				if (!id) continue; // Skip rows with no identifiable ID

				// Skip duplicates
				if (seenIds.has(id.toLowerCase())) continue;
				seenIds.add(id.toLowerCase());

				// Parse name into first/last
				const nameParts = rawName.split(/\s+/);
				const firstName = nameParts[0] ?? '';
				const lastName = nameParts.slice(1).join(' ') ?? '';

				parsed.push({
					id: id.toLowerCase(),
					firstName,
					lastName,
					displayName: rawName || id,
					grade: rawGrade,
					meta: {}
				});
			}

			if (parsed.length === 0) {
				parseError = 'No valid student rows found. Check your data format.';
				onStudentsParsed([]);
				return;
			}

			onStudentsParsed(parsed);
		} catch (e) {
			parseError = `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			onStudentsParsed([]);
		}
	}

	// Derived state for detected columns display
	let detectedColumns = $derived.by(() => {
		if (students.length === 0) return '';
		const cols: string[] = ['Name', 'ID'];
		if (students.some((s) => s.grade)) cols.push('Grade');
		return cols.join(', ');
	});

	// Parse on paste
	function handlePaste() {
		// Small delay to let the textarea value update
		setTimeout(parseRoster, 10);
	}
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Who are your students?</h2>
		<p class="mt-1 text-sm text-gray-600">
			{#if hasSheetConnection}
				Import from your connected sheet or paste roster data.
			{:else}
				Paste your class roster from Google Sheets. We'll detect names and emails automatically.
			{/if}
		</p>
	</div>

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
				label="Select tab with student roster"
				{selectedTab}
			/>

			<!-- Column mapping UI -->
			{#if showMappingUI && tabData}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium text-gray-700">Map columns to student fields:</p>
						<p class="text-xs text-gray-500">
							{#if hasRequiredMappings()}
								<span class="text-green-600">Ready to import</span>
							{:else}
								<span class="text-amber-600">Map at least name or email</span>
							{/if}
						</p>
					</div>

					<!-- Column mapping table -->
					<div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
						<table class="w-full text-sm">
							<thead>
								<!-- Mapping dropdowns row -->
								<tr class="border-b border-gray-200 bg-white">
									{#each tabData.headers as _, colIndex}
										<th class="min-w-[130px] px-2 py-2">
											<select
												class="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-teal focus:ring-1 focus:ring-teal {columnMappings.get(colIndex) === null
													? 'text-gray-400'
													: 'text-gray-900'}"
												value={columnMappings.get(colIndex) ?? ''}
												onchange={(e) => {
													const val = (e.target as HTMLSelectElement).value;
													handleMappingChange(colIndex, val === '' ? null : val as StudentField);
												}}
											>
												{#each fieldOptions as option}
													<option value={option.value ?? ''}>{option.label}</option>
												{/each}
											</select>
										</th>
									{/each}
								</tr>

								<!-- Original header row -->
								<tr class="border-b border-gray-300 bg-gray-50">
									{#each tabData.headers as header, colIndex}
										{@const mapping = columnMappings.get(colIndex)}
										<th class="px-2 py-1.5 text-left text-xs font-medium {mapping && mapping !== 'ignore' ? 'text-teal-700' : mapping === 'ignore' ? 'text-gray-400' : 'text-gray-600'}">
											<span class="truncate block max-w-[120px]" title={header}>{header}</span>
										</th>
									{/each}
								</tr>
							</thead>

							<tbody>
								{#each tabData.rows.slice(0, 3) as row, rowIdx}
									<tr class="border-b border-gray-100 {rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
										{#each row.cells as cell, colIndex}
											{@const mapping = columnMappings.get(colIndex)}
											<td class="max-w-[120px] truncate px-2 py-1.5 text-xs {mapping === 'ignore' ? 'text-gray-300' : 'text-gray-600'}" title={cell}>
												{cell || '—'}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>

						{#if tabData.rows.length > 3}
							<div class="border-t border-gray-200 bg-gray-50 px-3 py-1.5 text-center text-xs text-gray-500">
								+{tabData.rows.length - 3} more rows
							</div>
						{/if}
					</div>

					<!-- Import button -->
					<button
						type="button"
						onclick={importFromSheet}
						disabled={!hasRequiredMappings()}
						class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Import {tabData.rows.length} Students
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Paste area (shown when paste mode or no sheet connection) -->
	{#if importSource === 'paste' || !hasSheetConnection}
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="block text-sm font-medium text-gray-700" for="roster-paste">
				Roster data
			</label>
			{#if devTools.enabled}
				<div class="relative">
					<button
						type="button"
						class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
						onclick={() => (showSampleMenu = !showSampleMenu)}
					>
						Load sample data
					</button>
					{#if showSampleMenu}
						<div
							class="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
						>
							{#each sampleRosters as roster}
								<button
									type="button"
									class="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
									onclick={() => loadSampleData(roster.id)}
								>
									<div class="font-medium text-gray-900">{roster.label}</div>
									<div class="text-xs text-gray-500">{roster.description}</div>
								</button>
							{/each}
						</div>
						<button
							type="button"
							class="fixed inset-0 z-10 cursor-default"
							aria-label="Close sample menu"
							onclick={() => (showSampleMenu = false)}
						></button>
					{/if}
				</div>
			{/if}
		</div>

		<textarea
			id="roster-paste"
			class="h-40 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal"
			bind:value={pastedText}
			onpaste={handlePaste}
			oninput={parseRoster}
			placeholder="name	id	grade
Alice Smith	alice@school.edu	9
Bob Jones	bob@school.edu	9"
		></textarea>
	</div>

	<!-- Format help toggle -->
	<div>
		<button
			type="button"
			class="flex items-center gap-1 text-sm text-teal hover:text-teal-dark"
			onclick={() => (showFormatHelp = !showFormatHelp)}
		>
			<span class="text-xs">{showFormatHelp ? '▼' : '▸'}</span>
			What format works?
		</button>

		{#if showFormatHelp}
			<div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
				<p class="mb-2">Copy rows from Google Sheets with columns for:</p>
				<ul class="ml-4 list-disc space-y-1">
					<li><strong>name</strong> (or "display name", "student name")</li>
					<li><strong>id</strong> (or "email", "student id") — unique identifier</li>
					<li><strong>grade</strong> (optional)</li>
				</ul>
				<p class="mt-2 text-xs text-gray-500">
					Tab-separated format from Google Sheets works best.
				</p>
			</div>
		{/if}
	</div>
	{/if}

	<!-- Parse error -->
	{#if parseError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-3">
			<p class="text-sm text-red-700">{parseError}</p>
		</div>
	{/if}

	<!-- Preview (only shown when students parsed successfully) -->
	{#if students.length > 0}
		<div class="rounded-lg border border-gray-200 bg-white">
			<!-- Preview header -->
			<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
				<div class="flex items-center gap-2">
					<span class="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
						<svg
							class="h-3 w-3 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
					</span>
					<span class="font-medium text-gray-900">Found {students.length} students</span>
				</div>
				<span class="text-xs text-gray-500">Detected: {detectedColumns}</span>
			</div>

			<!-- Preview table -->
			<div class="max-h-48 overflow-y-auto">
				<table class="w-full text-sm">
					<thead class="sticky top-0 bg-gray-50">
						<tr class="border-b border-gray-200">
							<th class="px-4 py-2 text-left font-medium text-gray-700">Name</th>
							<th class="px-4 py-2 text-left font-medium text-gray-700">ID</th>
							{#if students.some((s) => s.grade)}
								<th class="px-4 py-2 text-left font-medium text-gray-700">Grade</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each students.slice(0, 8) as student, i (student.id)}
							<tr class="border-b border-gray-100 {i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
								<td class="px-4 py-2 text-gray-900">{student.displayName}</td>
								<td class="px-4 py-2 font-mono text-xs text-gray-600">{student.id}</td>
								{#if students.some((s) => s.grade)}
									<td class="px-4 py-2 text-gray-600">{student.grade ?? '—'}</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>

				{#if students.length > 8}
					<div
						class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-center text-xs text-gray-500"
					>
						...and {students.length - 8} more students
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
