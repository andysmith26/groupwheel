<script lang="ts">
  /**
   * StudentPreferencesEditor.svelte
   *
   * Allows teachers to manually edit individual student group preferences
   * and "never together" constraints.
   * Simple, intuitive interface for busy teachers.
   *
   * Features:
   * - View all students with their current preferences
   * - Click to edit a student's ranked group choices
   * - Set "never together" pairs (avoidStudentIds)
   * - Drag to reorder preference ranks
   * - Quick clear/reset options
   */

  import type {
    ParsedStudent,
    ParsedPreference
  } from '$lib/application/useCases/createGroupingActivity';

  interface Props {
    /** All students */
    students: ParsedStudent[];
    /** Available group names */
    groupNames: string[];
    /** Current preferences */
    preferences: ParsedPreference[];
    /** Callback when preferences change */
    onPreferencesChange: (preferences: ParsedPreference[]) => void;
  }

  let { students, groupNames, preferences, onPreferencesChange }: Props = $props();

  // Local state
  let searchQuery = $state('');
  let editingStudentId = $state<string | null>(null);
  let editingChoices = $state<string[]>([]);
  let editingAvoidStudents = $state<string[]>([]);
  let activeTab = $state<'groups' | 'avoid'>('groups');

  // Derived
  let filteredStudents = $derived(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.displayName.toLowerCase().includes(query)
    );
  });

  let studentsById = $derived(() => {
    const map = new Map<string, ParsedStudent>();
    for (const s of students) {
      map.set(s.id, s);
    }
    return map;
  });

  let preferencesMap = $derived(() => {
    const map = new Map<string, string[]>();
    for (const pref of preferences) {
      map.set(pref.studentId, pref.likeGroupIds ?? []);
    }
    return map;
  });

  let avoidStudentsMap = $derived(() => {
    const map = new Map<string, string[]>();
    for (const pref of preferences) {
      map.set(pref.studentId, pref.avoidStudentIds ?? []);
    }
    return map;
  });

  let studentsWithPrefs = $derived(() => {
    return preferences.filter((p) => p.likeGroupIds && p.likeGroupIds.length > 0).length;
  });

  let studentsWithAvoids = $derived(() => {
    return preferences.filter((p) => p.avoidStudentIds && p.avoidStudentIds.length > 0).length;
  });

  function getStudentPrefs(studentId: string): string[] {
    return preferencesMap().get(studentId) ?? [];
  }

  function getStudentAvoids(studentId: string): string[] {
    return avoidStudentsMap().get(studentId) ?? [];
  }

  function getStudentName(studentId: string): string {
    const student = studentsById().get(studentId);
    return student?.displayName ?? studentId;
  }

  function startEditing(student: ParsedStudent) {
    editingStudentId = student.id;
    editingChoices = [...getStudentPrefs(student.id)];
    editingAvoidStudents = [...getStudentAvoids(student.id)];
    activeTab = 'groups';
  }

  function cancelEditing() {
    editingStudentId = null;
    editingChoices = [];
    editingAvoidStudents = [];
    activeTab = 'groups';
  }

  function saveEditing() {
    if (!editingStudentId) return;

    // Update preferences
    const newPrefs = [...preferences];
    const existingIndex = newPrefs.findIndex((p) => p.studentId === editingStudentId);

    const hasChoices = editingChoices.length > 0;
    const hasAvoids = editingAvoidStudents.length > 0;

    if (!hasChoices && !hasAvoids) {
      // Remove preference if no choices and no avoids
      if (existingIndex >= 0) {
        newPrefs.splice(existingIndex, 1);
      }
    } else {
      const newPref: ParsedPreference = {
        studentId: editingStudentId,
        likeGroupIds: hasChoices ? editingChoices : undefined,
        avoidStudentIds: hasAvoids ? editingAvoidStudents : undefined
      };

      if (existingIndex >= 0) {
        newPrefs[existingIndex] = newPref;
      } else {
        newPrefs.push(newPref);
      }
    }

    onPreferencesChange(newPrefs);
    editingStudentId = null;
    editingChoices = [];
    editingAvoidStudents = [];
    activeTab = 'groups';
  }

  function toggleChoice(groupName: string) {
    const index = editingChoices.indexOf(groupName);
    if (index >= 0) {
      editingChoices = editingChoices.filter((c) => c !== groupName);
    } else {
      editingChoices = [...editingChoices, groupName];
    }
  }

  function toggleAvoidStudent(studentId: string) {
    const index = editingAvoidStudents.indexOf(studentId);
    if (index >= 0) {
      editingAvoidStudents = editingAvoidStudents.filter((id) => id !== studentId);
    } else {
      editingAvoidStudents = [...editingAvoidStudents, studentId];
    }
  }

  function moveChoiceUp(index: number) {
    if (index <= 0) return;
    const newChoices = [...editingChoices];
    [newChoices[index - 1], newChoices[index]] = [newChoices[index], newChoices[index - 1]];
    editingChoices = newChoices;
  }

  function moveChoiceDown(index: number) {
    if (index >= editingChoices.length - 1) return;
    const newChoices = [...editingChoices];
    [newChoices[index], newChoices[index + 1]] = [newChoices[index + 1], newChoices[index]];
    editingChoices = newChoices;
  }

  function clearStudentPrefs(studentId: string) {
    const newPrefs = preferences.filter((p) => p.studentId !== studentId);
    onPreferencesChange(newPrefs);
  }

  function clearAllPrefs() {
    onPreferencesChange([]);
  }
</script>

<div class="space-y-4">
  <!-- Header with search and actions -->
  <div class="flex items-center justify-between gap-4">
    <div class="flex-1">
      {#if students.length > 10}
        <input
          type="text"
          placeholder="Search students..."
          class="w-full max-w-xs rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal"
          bind:value={searchQuery}
        />
      {/if}
    </div>
    {#if studentsWithPrefs() > 0}
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-red-600"
        onclick={clearAllPrefs}
      >
        Clear all
      </button>
    {/if}
  </div>

  <!-- Student list -->
  <div class="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
    {#if filteredStudents().length === 0}
      <div class="p-4 text-center text-sm text-gray-500">
        {#if searchQuery}
          No students match "{searchQuery}"
        {:else}
          No students in this roster
        {/if}
      </div>
    {:else}
      {#each filteredStudents() as student (student.id)}
        {@const prefs = getStudentPrefs(student.id)}
        <div class="group">
          {#if editingStudentId === student.id}
            <!-- Editing mode -->
            <div class="bg-teal-50 p-3">
              <div class="mb-3 flex items-center justify-between">
                <span class="font-medium text-gray-900">{student.displayName}</span>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="text-sm text-gray-500 hover:text-gray-700"
                    onclick={cancelEditing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="text-sm font-medium text-teal hover:text-teal-dark"
                    onclick={saveEditing}
                  >
                    Save
                  </button>
                </div>
              </div>

              <!-- Tabs -->
              <div class="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors {activeTab ===
                  'groups'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'}"
                  onclick={() => (activeTab = 'groups')}
                >
                  Group Preferences
                  {#if editingChoices.length > 0}
                    <span class="ml-1 text-teal">({editingChoices.length})</span>
                  {/if}
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors {activeTab ===
                  'avoid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'}"
                  onclick={() => (activeTab = 'avoid')}
                >
                  Never Together
                  {#if editingAvoidStudents.length > 0}
                    <span class="ml-1 text-red-500">({editingAvoidStudents.length})</span>
                  {/if}
                </button>
              </div>

              {#if activeTab === 'groups'}
                <!-- Group selection -->
                <div class="space-y-2">
                  <p class="text-xs text-gray-600">
                    Click groups to add/remove, use arrows to reorder:
                  </p>

                  <!-- Selected choices with reorder -->
                  {#if editingChoices.length > 0}
                    <div class="mb-2 flex flex-wrap gap-1">
                      {#each editingChoices as choice, index (choice)}
                        <div
                          class="inline-flex items-center gap-1 rounded-full bg-teal px-2 py-1 text-xs text-white"
                        >
                          <span class="font-medium">{index + 1}.</span>
                          <span>{choice}</span>
                          <div class="ml-1 flex gap-0.5">
                            {#if index > 0}
                              <button
                                type="button"
                                class="rounded p-0.5 hover:bg-teal-dark"
                                onclick={() => moveChoiceUp(index)}
                                aria-label="Move up"
                              >
                                <svg
                                  class="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              </button>
                            {/if}
                            {#if index < editingChoices.length - 1}
                              <button
                                type="button"
                                class="rounded p-0.5 hover:bg-teal-dark"
                                onclick={() => moveChoiceDown(index)}
                                aria-label="Move down"
                              >
                                <svg
                                  class="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            {/if}
                          </div>
                          <button
                            type="button"
                            class="rounded p-0.5 hover:bg-teal-dark"
                            onclick={() => toggleChoice(choice)}
                            aria-label="Remove"
                          >
                            <svg
                              class="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  <!-- Available groups -->
                  <div class="flex flex-wrap gap-1">
                    {#each groupNames as group (group)}
                      {@const isSelected = editingChoices.includes(group)}
                      <button
                        type="button"
                        class="rounded-full border px-2.5 py-1 text-xs transition-colors {isSelected
                          ? 'border-teal bg-teal/10 text-teal'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}"
                        onclick={() => toggleChoice(group)}
                      >
                        {group}
                      </button>
                    {/each}
                  </div>
                </div>
              {:else}
                <!-- Avoid students selection -->
                <div class="space-y-2">
                  <p class="text-xs text-gray-600">
                    Select students who should never be in the same group as {student.firstName}:
                  </p>

                  <!-- Selected avoids -->
                  {#if editingAvoidStudents.length > 0}
                    <div class="mb-2 flex flex-wrap gap-1">
                      {#each editingAvoidStudents as avoidId (avoidId)}
                        <div
                          class="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs text-white"
                        >
                          <span>{getStudentName(avoidId)}</span>
                          <button
                            type="button"
                            class="rounded p-0.5 hover:bg-red-600"
                            onclick={() => toggleAvoidStudent(avoidId)}
                            aria-label="Remove"
                          >
                            <svg
                              class="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  <!-- Available students to avoid -->
                  <div class="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                    {#each students.filter((s) => s.id !== editingStudentId) as otherStudent (otherStudent.id)}
                      {@const isSelected = editingAvoidStudents.includes(otherStudent.id)}
                      <button
                        type="button"
                        class="rounded-full border px-2.5 py-1 text-xs transition-colors {isSelected
                          ? 'border-red-400 bg-red-50 text-red-600'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}"
                        onclick={() => toggleAvoidStudent(otherStudent.id)}
                      >
                        {otherStudent.displayName}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <!-- View mode -->
            {@const avoids = getStudentAvoids(student.id)}
            <button
              type="button"
              class="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
              onclick={() => startEditing(student)}
            >
              <div class="min-w-0 flex-1">
                <span class="text-sm text-gray-900">{student.displayName}</span>
                {#if prefs.length > 0 || avoids.length > 0}
                  <div class="mt-1 flex flex-wrap gap-1">
                    {#each prefs as pref, index (pref)}
                      <span
                        class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                      >
                        <span class="mr-0.5 font-medium text-gray-500">{index + 1}.</span>
                        {pref}
                      </span>
                    {/each}
                    {#each avoids as avoidId (avoidId)}
                      <span
                        class="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600"
                      >
                        <svg
                          class="mr-0.5 h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                        {getStudentName(avoidId)}
                      </span>
                    {/each}
                  </div>
                {:else}
                  <p class="mt-0.5 text-xs text-gray-400">No preferences</p>
                {/if}
              </div>
              <svg
                class="ml-2 h-4 w-4 flex-shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Helper text -->
  <p class="text-xs text-gray-500">
    Click a student to edit their group preferences or set "never together" constraints.
  </p>
</div>
