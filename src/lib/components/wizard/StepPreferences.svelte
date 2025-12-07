<script lang="ts">
	/**
	 * StepPreferences.svelte
	 *
	 * Step 2 of the Create Groups wizard: paste preference data (optional).
	 * Validates preferences against the roster and shows warnings for mismatches.
	 */

	import { dev } from '$app/environment';
	import type { ParsedStudent, ParsedPreference } from '$lib/application/useCases/createGroupingActivity';

	interface Props {
		/** Students from Step 1 (used to validate preferences) */
		students: ParsedStudent[];

		/** Current parsed preferences */
		preferences: ParsedPreference[];

		/** Callback when preferences are parsed */
		onPreferencesParsed: (preferences: ParsedPreference[], warnings: string[]) => void;
	}

	let { students, preferences, onPreferencesParsed }: Props = $props();

	let pastedText = $state('');
	let parseError = $state('');
	let warnings = $state<string[]>([]);
	let showFormatHelp = $state(false);
	let showAllWarnings = $state(false);

	// Build lookup for student IDs
	let studentIdSet = $derived(new Set(students.map((s) => s.id.toLowerCase())));
	let studentById = $derived(new Map(students.map((s) => [s.id.toLowerCase(), s])));

	// Sample data for dev mode (matches sample roster)
	const SAMPLE_PREFERENCES = `student_id	friend 1 id	friend 2 id	friend 3 id
alice@school.edu	bob@school.edu	carol@school.edu	
bob@school.edu	alice@school.edu	dave@school.edu	
carol@school.edu	alice@school.edu	eve@school.edu	
dave@school.edu	bob@school.edu	frank@school.edu	
eve@school.edu	carol@school.edu	grace@school.edu	
frank@school.edu	dave@school.edu	henry@school.edu	
grace@school.edu	eve@school.edu	alice@school.edu	
henry@school.edu	frank@school.edu	bob@school.edu	`;

	function loadSampleData() {
		pastedText = SAMPLE_PREFERENCES;
		parsePreferences();
	}

	function parsePreferences() {
		parseError = '';
		warnings = [];

		if (!pastedText.trim()) {
			onPreferencesParsed([], []);
			return;
		}

		try {
			const lines = pastedText.trim().split('\n');
			if (lines.length < 2) {
				parseError = 'Need at least a header row and one preference row.';
				onPreferencesParsed([], []);
				return;
			}

			// Parse header
			const delimiter = lines[0].includes('\t') ? '\t' : ',';
			const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

			// First column should be student ID
			const studentColIdx = 0;

			// Remaining columns are friend preferences
			const friendColStartIdx = 1;

			// Parse data rows
			const parsed: ParsedPreference[] = [];
			const newWarnings: string[] = [];
			const seenStudents = new Set<string>();

			for (let i = 1; i < lines.length; i++) {
				const cells = lines[i].split(delimiter).map((c) => c.trim());

				// Skip empty rows
				if (cells.every((c) => c === '')) continue;

				const studentId = (cells[studentColIdx] ?? '').toLowerCase();

				if (!studentId) continue;

				// Check if student is in roster
				if (!studentIdSet.has(studentId)) {
					newWarnings.push(`Row ${i + 1}: "${studentId}" not in roster, skipped`);
					continue;
				}

				// Check for duplicates
				if (seenStudents.has(studentId)) {
					newWarnings.push(`Row ${i + 1}: duplicate entry for "${studentId}", using first`);
					continue;
				}
				seenStudents.add(studentId);

				// Parse friend preferences
				const likeStudentIds: string[] = [];
				for (let j = friendColStartIdx; j < cells.length; j++) {
					const friendId = cells[j]?.toLowerCase().trim();
					if (!friendId) continue;

					if (!studentIdSet.has(friendId)) {
						const studentName = studentById.get(studentId)?.displayName ?? studentId;
						newWarnings.push(`${studentName}: listed "${friendId}" who is not in roster`);
						continue;
					}

					// Avoid self-reference
					if (friendId === studentId) continue;

					// Avoid duplicates within same student's preferences
					if (!likeStudentIds.includes(friendId)) {
						likeStudentIds.push(friendId);
					}
				}

				parsed.push({
					studentId,
					likeStudentIds
				});
			}

			warnings = newWarnings;
			onPreferencesParsed(parsed, newWarnings);
		} catch (e) {
			parseError = `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			onPreferencesParsed([], []);
		}
	}

	// Parse on paste
	function handlePaste() {
		setTimeout(parsePreferences, 10);
	}

	// Helper to get display name for a student ID
	function getDisplayName(id: string): string {
		return studentById.get(id.toLowerCase())?.displayName ?? id;
	}

	// Compute coverage stats
	let coverageStats = $derived.by(() => {
		const withPrefs = preferences.length;
		const total = students.length;
		const percent = total > 0 ? Math.round((withPrefs / total) * 100) : 0;
		return { withPrefs, total, percent };
	});
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Who wants to work together?</h2>
		<p class="mt-1 text-sm text-gray-600">
			If you collected partner preferences, paste them here. This step is optional.
		</p>
	</div>

	<!-- Paste area -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="block text-sm font-medium text-gray-700" for="preferences-paste">
				Preference data
			</label>
			{#if dev}
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
			id="preferences-paste"
			class="h-36 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
			bind:value={pastedText}
			onpaste={handlePaste}
			oninput={parsePreferences}
			placeholder="student_id	friend 1 id	friend 2 id
alice@school.edu	bob@school.edu	carol@school.edu
bob@school.edu	alice@school.edu	dave@school.edu"
		></textarea>
	</div>

	<!-- Format help toggle -->
	<div>
		<button
			type="button"
			class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
			onclick={() => (showFormatHelp = !showFormatHelp)}
		>
			<span class="text-xs">{showFormatHelp ? '▼' : '▸'}</span>
			What format works?
		</button>

		{#if showFormatHelp}
			<div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
				<p class="mb-2">Paste a table with:</p>
				<ul class="ml-4 list-disc space-y-1">
					<li><strong>First column:</strong> student ID (must match roster)</li>
					<li><strong>Remaining columns:</strong> IDs of students they want to work with</li>
				</ul>
				<p class="mt-2 text-xs text-gray-500">
					Column headers don't matter. Earlier columns = higher preference.
				</p>
			</div>
		{/if}
	</div>

	<!-- Parse error -->
	{#if parseError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-3">
			<p class="text-sm text-red-700">{parseError}</p>
		</div>
	{/if}

	<!-- Preview (only shown when preferences parsed) -->
	{#if preferences.length > 0}
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
					<span class="font-medium text-gray-900">
						{coverageStats.withPrefs} of {coverageStats.total} students have preferences
					</span>
				</div>
				<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
					{coverageStats.percent}% coverage
				</span>
			</div>

			<!-- Preview list -->
			<div class="max-h-48 divide-y divide-gray-100 overflow-y-auto">
				{#each preferences.slice(0, 6) as pref}
					<div class="flex items-center gap-3 px-4 py-2">
						<span class="font-medium text-gray-900">{getDisplayName(pref.studentId)}</span>
						<span class="text-gray-400">→</span>
						<span class="text-gray-600">
							{pref.likeStudentIds.map(getDisplayName).join(', ') || '(no valid preferences)'}
						</span>
					</div>
				{/each}

				{#if preferences.length > 6}
					<div class="bg-gray-50 px-4 py-2 text-center text-xs text-gray-500">
						...and {preferences.length - 6} more students
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Warnings -->
	{#if warnings.length > 0}
		<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-yellow-800">
					{warnings.length} warning{warnings.length === 1 ? '' : 's'} (data saved anyway)
				</p>
				{#if warnings.length > 3}
					<button
						type="button"
						class="text-xs text-yellow-700 underline"
						onclick={() => (showAllWarnings = !showAllWarnings)}
					>
						{showAllWarnings ? 'Show less' : 'Show all'}
					</button>
				{/if}
			</div>
			<ul class="mt-2 ml-4 list-disc space-y-1 text-xs text-yellow-700">
				{#each showAllWarnings ? warnings : warnings.slice(0, 3) as warning}
					<li>{warning}</li>
				{/each}
				{#if !showAllWarnings && warnings.length > 3}
					<li class="text-yellow-600">...and {warnings.length - 3} more</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>
