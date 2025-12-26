<script lang="ts">
	/**
	 * StepStudents.svelte
	 *
	 * Step 1 of the Create Groups wizard: paste roster data.
	 * Handles paste detection, parsing, preview, and validation.
	 */

	import { devTools } from '$lib/stores/devTools.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ParsedStudent } from '$lib/application/useCases/createGroupingActivity';
	import { sampleRosters, sampleRosterById } from '$lib/content/sampleRosters';

	interface Props {
		students: ParsedStudent[];
		onStudentsParsed: (students: ParsedStudent[]) => void;
	}

	let { students, onStudentsParsed }: Props = $props();

	let pastedText = $state('');
	let parseError = $state('');
	let showFormatHelp = $state(false);

	let showSampleMenu = $state(false);

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
			Paste your class roster from Google Sheets. We'll detect names and emails automatically.
		</p>
	</div>

	<!-- Paste area -->
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
