<script lang="ts">
  /**
   * RosterPanel — Left panel of Class View showing the student roster.
   *
   * Scrollable student list with count and Import button.
   * Shows an upgrade prompt when the roster has placeholder students (WP11).
   * See: project definition.md — Part 3 (Class View), WP4, WP11
   */

  import type { Student } from '$lib/domain';

  interface Props {
    students: Student[];
    loading: boolean;
    onImport: () => void;
    /** Per-student flag: does this student have any preferences? */
    studentHasPreferences?: Map<string, boolean>;
    /** True when any student has preference data (controls whether indicators are shown) */
    hasPreferenceData?: boolean;
    /** True when all students are quick-start placeholders (WP11) */
    hasPlaceholderStudents?: boolean;
    /** Called when the "+" add student button is clicked */
    onAddStudent?: () => void;
    /** Called when a student row is clicked */
    onStudentClick?: (studentId: string) => void;
    /** Called when mouse enters a student row (for preference highlighting) */
    onStudentHover?: (studentId: string) => void;
    /** Called when mouse leaves a student row */
    onStudentHoverEnd?: () => void;
    /** ID of currently selected student (for highlight) */
    selectedStudentId?: string | null;
  }

  let {
    students,
    loading,
    onImport,
    studentHasPreferences = new Map(),
    hasPreferenceData = false,
    hasPlaceholderStudents = false,
    onAddStudent,
    onStudentClick,
    onStudentHover,
    onStudentHoverEnd,
    selectedStudentId = null
  }: Props = $props();

  let studentCount = $derived(students.length);
  let preferencesCollectedCount = $derived.by(() => {
    if (!hasPreferenceData) return 0;
    let count = 0;
    for (const [, has] of studentHasPreferences) {
      if (has) count++;
    }
    return count;
  });
</script>

<div class="flex h-full flex-col border-r bg-white">
  <div class="flex items-center justify-between border-b px-4 py-3">
    <div class="flex items-center gap-2">
      <h2 class="text-sm font-semibold text-gray-900">Roster</h2>
      <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {studentCount}
      </span>
      {#if hasPlaceholderStudents}
        <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Placeholders
        </span>
      {:else if hasPreferenceData}
        <span
          class="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700"
          title="{preferencesCollectedCount} of {studentCount} students have preferences"
        >
          {preferencesCollectedCount} prefs
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-1.5">
      {#if onAddStudent}
        <button
          type="button"
          onclick={onAddStudent}
          class="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
          aria-label="Add student"
          title="Add student"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      {/if}
      <button
        type="button"
        onclick={onImport}
        class="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        aria-label={hasPlaceholderStudents ? 'Import real roster' : 'Import roster'}
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        Import
      </button>
    </div>
  </div>

  <!-- WP11: Gentle upgrade prompt for quick-start placeholder students -->
  {#if hasPlaceholderStudents}
    <div class="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <p class="text-sm text-amber-800">
        These are placeholder names.
      </p>
      <button
        type="button"
        onclick={onImport}
        class="mt-1.5 text-sm font-medium text-amber-700 underline hover:text-amber-900"
      >
        Add real names? Import your roster.
      </button>
    </div>
  {/if}

  <div class="flex-1 overflow-y-auto px-2 py-2">
    {#if loading}
      <div class="space-y-2 px-2">
        {#each Array(8) as _}
          <div class="h-8 animate-pulse rounded-md bg-gray-100"></div>
        {/each}
      </div>
    {:else if students.length === 0}
      <div class="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg
            class="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
          </svg>
        </div>
        <p class="text-sm text-gray-500">No students yet</p>
        <button
          type="button"
          onclick={onImport}
          class="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          Import your roster
        </button>
      </div>
    {:else}
      <ul class="space-y-0.5" role="list">
        {#each students as student (student.id)}
          <li>
          <button
            type="button"
            onclick={() => onStudentClick?.(student.id)}
            onmouseenter={() => onStudentHover?.(student.id)}
            onmouseleave={() => onStudentHoverEnd?.()}
            class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm {hasPlaceholderStudents ? 'text-gray-400 italic' : 'text-gray-700'} {selectedStudentId === student.id ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-gray-50'} cursor-pointer"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full {hasPlaceholderStudents ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-600'} text-xs font-medium"
            >
              {(student.firstName?.[0] ?? student.lastName?.[0] ?? '?').toUpperCase()}
            </span>
            <span class="min-w-0 flex-1 truncate">
              {#if student.firstName && student.lastName}
                {student.firstName} {student.lastName}
              {:else if student.firstName}
                {student.firstName}
              {:else if student.lastName}
                {student.lastName}
              {:else}
                Student
              {/if}
            </span>
            {#if hasPreferenceData && !hasPlaceholderStudents}
              {#if studentHasPreferences.get(student.id)}
                <span
                  class="h-2 w-2 shrink-0 rounded-full bg-teal-500"
                  title="Has preferences"
                  aria-label="Has preferences"
                ></span>
              {:else}
                <span
                  class="h-2 w-2 shrink-0 rounded-full bg-gray-300"
                  title="No preferences"
                  aria-label="No preferences"
                ></span>
              {/if}
            {/if}
          </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
