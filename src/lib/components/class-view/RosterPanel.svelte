<script lang="ts">
  /**
   * RosterPanel — Left panel of Class View showing the student roster.
   *
   * Scrollable student list with count and Import button.
   * Clicking a student expands an inline detail panel below their name
   * showing preferences, recent groupmates, and inactive toggle.
   * See: project definition.md — Part 3 (Class View), WP4, WP11
   */

  import type { Student } from '$lib/domain';
  import type { StudentPreference } from '$lib/domain/preference';

  interface RecentGroupmate {
    studentName: string;
    count: number;
  }

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
    /** ID of currently selected student (for highlight) */
    selectedStudentId?: string | null;
    /** Set of student IDs marked inactive at pool level */
    inactiveStudentIds?: Set<string>;
    /** Called when the active/inactive toggle is clicked for a student */
    onToggleActive?: (studentId: string) => void;
    /** Preferences for the currently selected student */
    selectedStudentPreferences?: StudentPreference | null;
    /** Map of group IDs to display names */
    groupNameMap?: Record<string, string>;
    /** Recent groupmates for the currently selected student */
    selectedStudentRecentGroupmates?: RecentGroupmate[];
    /** Called when the edit button is clicked for the selected student */
    onEditStudent?: () => void;
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
    selectedStudentId = null,
    inactiveStudentIds = new Set(),
    onToggleActive,
    selectedStudentPreferences = null,
    groupNameMap = {},
    selectedStudentRecentGroupmates = [],
    onEditStudent
  }: Props = $props();

  let studentCount = $derived(students.length);
  let inactiveCount = $derived(inactiveStudentIds.size);
  let activeStudents = $derived(students.filter((s) => !inactiveStudentIds.has(s.id)));
  let inactiveStudents = $derived(students.filter((s) => inactiveStudentIds.has(s.id)));

  function studentDisplayName(student: Student): string {
    if (student.firstName && student.lastName) return `${student.firstName} ${student.lastName}`;
    if (student.firstName) return student.firstName;
    if (student.lastName) return student.lastName;
    return 'Student';
  }
</script>

{#snippet studentRow(student: Student, isInactive: boolean)}
  <li>
    <button
      type="button"
      onclick={() => onStudentClick?.(student.id)}
      class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm
        {isInactive ? 'text-gray-400 italic' : hasPlaceholderStudents ? 'text-gray-400 italic' : 'text-gray-700'}
        {selectedStudentId === student.id
          ? isInactive ? 'bg-gray-100 ring-1 ring-gray-200' : 'bg-teal-50 ring-1 ring-teal-200'
          : 'hover:bg-gray-50'}
        cursor-pointer"
    >
      <span
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium
          {isInactive || hasPlaceholderStudents ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-600'}"
      >
        {(student.firstName?.[0] ?? student.lastName?.[0] ?? '?').toUpperCase()}
      </span>
      <span class="min-w-0 flex-1 truncate">
        {studentDisplayName(student)}
      </span>
      {#if isInactive}
        <!-- Eye-off icon for inactive -->
        <svg
          class="h-3.5 w-3.5 shrink-0 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
          />
        </svg>
      {:else if hasPreferenceData && !hasPlaceholderStudents}
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

    <!-- Inline detail panel (expanded when this student is selected) -->
    {#if selectedStudentId === student.id}
      {@const isStudentInactive = inactiveStudentIds.has(student.id)}
      {@const likeGroups = selectedStudentPreferences?.likeGroupIds ?? []}
      <div class="mx-2 mb-1 rounded-b-md border border-t-0 border-gray-200 bg-gray-50 px-3 py-2.5">
        <!-- Preferences -->
        {#if likeGroups.length > 0}
          <div class="mb-2">
            <h4 class="mb-1 text-[10px] font-medium tracking-wide text-gray-400 uppercase">
              Preferences
            </h4>
            <div class="flex flex-wrap gap-1">
              {#each likeGroups as choice, i}
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
                    {i === 0 ? 'bg-green-100 text-green-800' : i === 1 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'}"
                >
                  {i + 1}. {groupNameMap[choice] ?? choice}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Recent Groupmates -->
        {#if selectedStudentRecentGroupmates.length > 0}
          <div class="mb-2">
            <h4 class="mb-1 text-[10px] font-medium tracking-wide text-gray-400 uppercase">
              Recent Groupmates
            </h4>
            <div class="space-y-0.5">
              {#each selectedStudentRecentGroupmates.slice(0, 3) as groupmate}
                <div class="flex items-center justify-between text-[11px]">
                  <span class="truncate text-gray-600">{groupmate.studentName}</span>
                  <span class="ml-1 flex-shrink-0 text-gray-400">{groupmate.count}x</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Action buttons -->
        <div class="flex items-center gap-2 border-t border-gray-200 pt-2">
          {#if onToggleActive}
            <button
              type="button"
              onclick={() => onToggleActive?.(student.id)}
              class="flex items-center gap-1 text-[11px] {isStudentInactive
                ? 'text-teal-600 hover:text-teal-800'
                : 'text-gray-500 hover:text-gray-700'}"
            >
              {#if isStudentInactive}
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Mark active
              {:else}
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
                Mark inactive
              {/if}
            </button>
          {/if}
          {#if onEditStudent}
            <button
              type="button"
              onclick={onEditStudent}
              class="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Edit
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </li>
{/snippet}

<div class="flex h-full flex-col border-r bg-white">
  <div class="flex items-center justify-between border-b px-4 py-3">
    <div class="flex items-center gap-2">
      <h2 class="text-sm font-semibold text-gray-900">Roster</h2>
      <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {studentCount}{#if inactiveCount > 0}
          <span class="text-gray-400">({inactiveCount} inactive)</span>{/if}
      </span>
      {#if hasPlaceholderStudents}
        <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Placeholders
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
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- WP11: Gentle upgrade prompt for quick-start placeholder students -->
  {#if hasPlaceholderStudents}
    <div class="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <p class="text-sm text-amber-800">These are placeholder names.</p>
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
        {#each activeStudents as student (student.id)}
          {@render studentRow(student, false)}
        {/each}
      </ul>

      {#if inactiveStudents.length > 0}
        <div class="mt-3 border-t border-gray-100 pt-2">
          <p class="px-3 pb-1 text-xs font-medium text-gray-400">Inactive</p>
          <ul class="space-y-0.5" role="list">
            {#each inactiveStudents as student (student.id)}
              {@render studentRow(student, true)}
            {/each}
          </ul>
        </div>
      {/if}
    {/if}
  </div>
</div>
