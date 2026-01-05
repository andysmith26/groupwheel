<script lang="ts">
	/**
	 * SetupStudentsSection.svelte
	 *
	 * Student roster management section for the Setup page.
	 * Allows viewing, searching, adding, and removing students.
	 */

	import type { Student } from '$lib/domain';
	import { getStudentDisplayName } from '$lib/domain/student';
	import CollapsibleSection from './CollapsibleSection.svelte';

	interface Props {
		/** List of students in the roster */
		students: Student[];
		/** Whether the section is expanded */
		isExpanded?: boolean;
		/** Callback when expand/collapse state changes */
		onToggle?: (isExpanded: boolean) => void;
		/** Callback to add a new student */
		onAddStudent?: (firstName: string, lastName?: string) => Promise<void>;
		/** Callback to remove a student */
		onRemoveStudent?: (studentId: string) => Promise<void>;
		/** Callback to import more students */
		onImportMore?: () => void;
		/** Whether operations are in progress */
		isLoading?: boolean;
	}

	let {
		students,
		isExpanded = false,
		onToggle,
		onAddStudent,
		onRemoveStudent,
		onImportMore,
		isLoading = false
	}: Props = $props();

	// Local state
	let searchQuery = $state('');
	let showAddForm = $state(false);
	let newFirstName = $state('');
	let newLastName = $state('');
	let addingStudent = $state(false);
	let addError = $state('');
	let removingStudentId = $state<string | null>(null);
	let confirmRemoveStudent = $state<Student | null>(null);

	// Derived state
	let studentCount = $derived(students.length);
	let showSearch = $derived(students.length > 20);
	let filteredStudents = $derived(() => {
		if (!searchQuery.trim()) return students;
		const query = searchQuery.toLowerCase().trim();
		return students.filter((s) => {
			const displayName = getStudentDisplayName(s).toLowerCase();
			return displayName.includes(query);
		});
	});

	let summary = $derived(() => {
		if (studentCount === 0) return 'No students yet';
		if (studentCount === 1) return '1 student';
		return `${studentCount} students`;
	});

	let previewNames = $derived(() => {
		const first3 = students.slice(0, 3).map((s) => getStudentDisplayName(s));
		if (students.length <= 3) return first3.join(', ');
		return `${first3.join(', ')}...`;
	});

	async function handleAddStudent() {
		if (!onAddStudent) return;
		const trimmedFirst = newFirstName.trim();
		if (!trimmedFirst) {
			addError = 'First name is required';
			return;
		}

		addingStudent = true;
		addError = '';

		try {
			await onAddStudent(trimmedFirst, newLastName.trim() || undefined);
			// Reset form
			newFirstName = '';
			newLastName = '';
			showAddForm = false;
		} catch (e) {
			addError = e instanceof Error ? e.message : 'Failed to add student';
		} finally {
			addingStudent = false;
		}
	}

	async function handleRemoveStudent(student: Student) {
		if (!onRemoveStudent) return;
		confirmRemoveStudent = student;
	}

	async function confirmRemove() {
		if (!confirmRemoveStudent || !onRemoveStudent) return;

		removingStudentId = confirmRemoveStudent.id;
		try {
			await onRemoveStudent(confirmRemoveStudent.id);
		} catch (e) {
			// Error handling could be improved
			console.error('Failed to remove student:', e);
		} finally {
			removingStudentId = null;
			confirmRemoveStudent = null;
		}
	}

	function cancelRemove() {
		confirmRemoveStudent = null;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleAddStudent();
		} else if (event.key === 'Escape') {
			showAddForm = false;
			newFirstName = '';
			newLastName = '';
			addError = '';
		}
	}
</script>

<CollapsibleSection
	title="Students"
	summary={summary()}
	helpText="View and edit your student roster"
	{isExpanded}
	{onToggle}
	isPrimary={true}
>
	{#snippet children()}
		<div class="space-y-4">
			<!-- Collapsed preview (shown in summary) -->

			<!-- Search (if many students) -->
			{#if showSearch}
				<div>
					<input
						type="text"
						placeholder="Search students..."
						class="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal"
						bind:value={searchQuery}
					/>
				</div>
			{/if}

			<!-- Student list -->
			<div class="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
				{#if filteredStudents().length === 0}
					<div class="p-4 text-center text-sm text-gray-500">
						{#if searchQuery}
							No students match "{searchQuery}"
						{:else}
							No students in this roster yet
						{/if}
					</div>
				{:else}
					{#each filteredStudents() as student (student.id)}
						<div
							class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 {removingStudentId === student.id ? 'opacity-50' : ''}"
						>
							<span class="text-sm text-gray-900">{getStudentDisplayName(student)}</span>
							{#if onRemoveStudent}
								<button
									type="button"
									class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
									onclick={() => handleRemoveStudent(student)}
									disabled={removingStudentId === student.id}
									aria-label={`Remove ${getStudentDisplayName(student)}`}
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							{/if}
						</div>
					{/each}
				{/if}
			</div>

			<!-- Add student form -->
			{#if showAddForm}
				<div class="rounded-md border border-gray-200 bg-gray-50 p-3">
					<div class="flex gap-2">
						<input
							type="text"
							placeholder="First name *"
							class="flex-1 rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal"
							bind:value={newFirstName}
							onkeydown={handleKeyDown}
							disabled={addingStudent}
						/>
						<input
							type="text"
							placeholder="Last name"
							class="flex-1 rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal"
							bind:value={newLastName}
							onkeydown={handleKeyDown}
							disabled={addingStudent}
						/>
					</div>
					{#if addError}
						<p class="mt-2 text-sm text-red-600">{addError}</p>
					{/if}
					<div class="mt-2 flex justify-end gap-2">
						<button
							type="button"
							class="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
							onclick={() => {
								showAddForm = false;
								newFirstName = '';
								newLastName = '';
								addError = '';
							}}
							disabled={addingStudent}
						>
							Cancel
						</button>
						<button
							type="button"
							class="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
							onclick={handleAddStudent}
							disabled={addingStudent || !newFirstName.trim()}
						>
							{addingStudent ? 'Adding...' : 'Add Student'}
						</button>
					</div>
				</div>
			{/if}

			<!-- Action buttons -->
			<div class="flex gap-2">
				{#if onAddStudent && !showAddForm}
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={() => (showAddForm = true)}
						disabled={isLoading}
					>
						+ Add Student
					</button>
				{/if}
				{#if onImportMore}
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={onImportMore}
						disabled={isLoading}
					>
						Import More
					</button>
				{/if}
			</div>
		</div>
	{/snippet}
</CollapsibleSection>

<!-- Remove confirmation modal -->
{#if confirmRemoveStudent}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
			<h3 class="text-lg font-medium text-gray-900">Remove Student?</h3>
			<p class="mt-2 text-sm text-gray-600">
				Are you sure you want to remove "{getStudentDisplayName(confirmRemoveStudent)}" from this roster?
				They will also be removed from any groups.
			</p>
			<div class="mt-4 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					onclick={cancelRemove}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
					onclick={confirmRemove}
				>
					Remove
				</button>
			</div>
		</div>
	</div>
{/if}
