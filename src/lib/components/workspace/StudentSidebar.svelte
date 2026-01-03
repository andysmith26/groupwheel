<script lang="ts">
	import type { Student, StudentPreference } from '$lib/domain';

	const {
		students = [],
		preferenceMap = {},
		selectedStudentId = null,
		programId = '',
		onSelect,
		onClose
	} = $props<{
		students?: Student[];
		preferenceMap?: Record<string, StudentPreference>;
		selectedStudentId?: string | null;
		programId?: string;
		onSelect?: (id: string) => void;
		onClose?: () => void;
	}>();

	// Get group choices for a student (now showing requested group IDs)
	function getGroupChoices(studentId: string): string[] {
		const pref = preferenceMap[studentId];
		if (!pref?.likeGroupIds?.length) return [];
		return pref.likeGroupIds;
	}

	const studentsWithPrefs = $derived(
		students.filter((s: Student) => preferenceMap[s.id]?.likeGroupIds?.length > 0).length
	);
</script>

<aside class="w-72 flex-shrink-0 border-l border-gray-200 bg-gray-50">
	<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
		<div>
			<h2 class="font-semibold text-gray-900">Students</h2>
			<p class="text-xs text-gray-500">
				{students.length} total · {studentsWithPrefs} with requests
			</p>
		</div>
		<button
			type="button"
			class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
			onclick={onClose}
			aria-label="Close sidebar"
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

	<div class="h-full overflow-y-auto">
		<ul class="divide-y divide-gray-200">
			{#each students as student (student.id)}
				{@const choices = getGroupChoices(student.id)}
				{@const isSelected = selectedStudentId === student.id}
				<li>
					<div
						class="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white {isSelected
							? 'bg-blue-50 ring-1 ring-blue-200 ring-inset'
							: ''}"
					>
						<button
							type="button"
							class="min-w-0 flex-1 text-left"
							onclick={() => onSelect?.(student.id)}
						>
							<p class="font-medium text-gray-900">
								{student.firstName}
								{student.lastName}
							</p>
							{#if choices.length > 0}
								<p class="mt-1 text-xs text-gray-500">
									Choices: {choices.join(' → ')}
								</p>
							{:else}
								<p class="mt-1 text-xs text-gray-400">No requests</p>
							{/if}
						</button>
						{#if programId}
							<a
								href="/groups/{programId}/students/{student.id}"
								class="ml-2 flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
								title="View placement history"
								aria-label="View placement history for {student.firstName} {student.lastName}"
								onclick={(e) => e.stopPropagation()}
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</a>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	</div>
</aside>
