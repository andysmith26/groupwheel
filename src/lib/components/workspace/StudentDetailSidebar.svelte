<script lang="ts">
  /**
   * StudentDetailSidebar.svelte
   *
   * Right-side panel showing student details with full CRUD support.
   * Supports three modes: view (read-only), edit (modify fields), create (new student).
   */

  import type { Student } from '$lib/domain';
  import type { StudentPreference } from '$lib/domain/preference';
  import { getCanonicalId } from '$lib/domain/student';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { getStudentProfile } from '$lib/services/appEnvUseCases';
  import { isOk } from '$lib/types/result';
  import type { StudentProfile } from '$lib/application/useCases/getStudentProfile';
  import CollapsibleSection from '$lib/components/setup/CollapsibleSection.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { Button, InlineError } from '$lib/components/ui';

  interface RecentGroupmate {
    studentName: string;
    count: number;
  }

  interface Props {
    student: Student | null;
    preferences?: StudentPreference | null;
    groupNameMap?: Record<string, string>;
    recentGroupmates?: RecentGroupmate[];
    mode: 'view' | 'edit' | 'create';
    onClose: () => void;
    onSave: (data: {
      firstName: string;
      lastName?: string;
      gradeLevel?: string;
      gender?: string;
    }) => Promise<boolean>;
    onDelete: () => void;
    onEditMode: () => void;
    onCancelEdit: () => void;
  }

  let {
    student,
    preferences = null,
    groupNameMap = {},
    recentGroupmates = [],
    mode,
    onClose,
    onSave,
    onDelete,
    onEditMode,
    onCancelEdit
  }: Props = $props();

  let env = $derived(getAppEnvContext());

  // --- Profile data (loaded async) ---
  let profile = $state<StudentProfile | null>(null);
  let loading = $state(true);
  let loadError = $state<string | null>(null);

  // --- Sub-view state ---
  let showHistory = $state(false);

  // --- Section states (within history view) ---
  let historyExpanded = $state(true);
  let observationsExpanded = $state(true);
  let groupmatesExpanded = $state(false);

  // --- Form state ---
  let formFirstName = $state('');
  let formLastName = $state('');
  let formGradeLevel = $state('');
  let formGender = $state('');
  let formError = $state<string | null>(null);
  let isSaving = $state(false);

  let firstNameInputEl = $state<HTMLInputElement | null>(null);

  const isEditing = $derived(mode === 'edit' || mode === 'create');

  const fullName = $derived(
    student ? `${student.firstName} ${student.lastName ?? ''}`.trim() || student.id : ''
  );

  const canonicalId = $derived(student ? getCanonicalId(student) : null);

  // Populate form when entering edit mode or switching students
  $effect(() => {
    if (mode === 'edit' && student) {
      formFirstName = student.firstName ?? '';
      formLastName = student.lastName ?? '';
      formGradeLevel = student.gradeLevel ?? '';
      formGender = student.gender ?? '';
      formError = null;
    } else if (mode === 'create') {
      formFirstName = '';
      formLastName = '';
      formGradeLevel = '';
      formGender = '';
      formError = null;
    }
  });

  // Auto-focus first name input when entering edit/create mode
  $effect(() => {
    if (isEditing && firstNameInputEl) {
      requestAnimationFrame(() => {
        firstNameInputEl?.focus();
        if (mode === 'edit') {
          firstNameInputEl?.select();
        }
      });
    }
  });

  // Reset sub-view and load profile when student changes (view mode only)
  $effect(() => {
    if (canonicalId && mode === 'view') {
      showHistory = false;
      loadProfile(canonicalId);
    }
  });

  async function loadProfile(identityId: string) {
    loading = true;
    loadError = null;
    profile = null;

    if (!env) {
      loading = false;
      return;
    }

    const result = await getStudentProfile(env, { identityId });
    if (isOk(result)) {
      profile = result.value;
    } else {
      loadError = result.error.type === 'IDENTITY_NOT_FOUND' ? null : 'Failed to load profile';
    }
    loading = false;
  }

  async function handleSubmit() {
    const trimmedFirst = formFirstName.trim();
    if (!trimmedFirst) {
      formError = 'First name is required';
      return;
    }

    isSaving = true;
    formError = null;

    const success = await onSave({
      firstName: trimmedFirst,
      lastName: formLastName.trim() || undefined,
      gradeLevel: formGradeLevel.trim() || undefined,
      gender: formGender.trim() || undefined
    });

    isSaving = false;

    if (!success) {
      formError = 'Failed to save. Please try again.';
    }
  }

  function handleFormKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  }

  function formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function formatPreferenceRank(rank: number | null): string {
    if (rank === null) return 'No preference';
    if (rank === 1) return '1st choice';
    if (rank === 2) return '2nd choice';
    if (rank === 3) return '3rd choice';
    return `${rank}th choice`;
  }
</script>

<aside
  class="flex h-full w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white"
  aria-label="Student detail panel"
>
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
    <div class="min-w-0">
      {#if mode === 'create'}
        <h2 class="text-sm font-semibold text-gray-900">Add Student</h2>
      {:else if mode === 'edit'}
        <h2 class="truncate text-sm font-semibold text-gray-900">Edit Student</h2>
      {:else}
        <h2 class="truncate text-sm font-semibold text-gray-900">{fullName}</h2>
        {#if student?.gradeLevel}
          <p class="text-xs text-gray-500">Grade {student.gradeLevel}</p>
        {/if}
      {/if}
    </div>
    <div class="flex flex-shrink-0 items-center gap-1">
      {#if mode === 'view' && student}
        <button
          type="button"
          onclick={onEditMode}
          class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Edit student"
          title="Edit student"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      {/if}
      <button
        type="button"
        onclick={onClose}
        class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close panel"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>

  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto">
    {#if isEditing}
      <!-- Edit/Create Form -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <form
        class="space-y-4 px-4 py-4"
        onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        onkeydown={handleFormKeydown}
      >
        <div>
          <label for="student-first-name" class="block text-xs font-medium text-gray-700">
            First Name <span class="text-red-500">*</span>
          </label>
          <input
            id="student-first-name"
            type="text"
            bind:this={firstNameInputEl}
            bind:value={formFirstName}
            placeholder="First name"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label for="student-last-name" class="block text-xs font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="student-last-name"
            type="text"
            bind:value={formLastName}
            placeholder="Last name"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label for="student-grade" class="block text-xs font-medium text-gray-700">
            Grade Level
          </label>
          <input
            id="student-grade"
            type="text"
            bind:value={formGradeLevel}
            placeholder="e.g. 5, 10th, Senior"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label for="student-gender" class="block text-xs font-medium text-gray-700">
            Gender
          </label>
          <select
            id="student-gender"
            bind:value={formGender}
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">Not specified</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="X">Non-binary</option>
          </select>
        </div>

        {#if formError}
          <InlineError message={formError} size="xs" dismissible onDismiss={() => (formError = null)} />
        {/if}

        <div class="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <Button variant="ghost" onclick={onCancelEdit} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onclick={handleSubmit} disabled={isSaving}>
            {#if isSaving}
              Saving...
            {:else if mode === 'create'}
              Add Student
            {:else}
              Save
            {/if}
          </Button>
        </div>
      </form>
    {:else if student}
      <!-- View Mode -->
      <div class="space-y-4 px-4 py-3">
        {#if showHistory}
          <!-- History sub-view -->
          <button
            type="button"
            onclick={() => (showHistory = false)}
            class="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to overview
          </button>

          {#if loading}
            <div class="space-y-3 pt-2">
              <Skeleton width="100%" height="1rem" />
              <Skeleton width="80%" height="0.75rem" />
              <Skeleton width="100%" height="3rem" rounded="md" />
              <Skeleton width="100%" height="3rem" rounded="md" />
            </div>
          {:else if loadError}
            <div class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {loadError}
            </div>
          {:else if profile}
            <!-- Profile Summary -->
            {#if profile.summary.totalGroupings > 0}
              <div class="grid grid-cols-3 gap-2">
                <div class="rounded-md border border-gray-200 p-2 text-center">
                  <p class="text-sm font-semibold text-gray-900">{profile.summary.activityCount}</p>
                  <p class="text-[10px] text-gray-500">Activities</p>
                </div>
                <div class="rounded-md border border-gray-200 p-2 text-center">
                  <p class="text-sm font-semibold text-gray-900">{profile.summary.totalGroupings}</p>
                  <p class="text-[10px] text-gray-500">Groupings</p>
                </div>
                <div class="rounded-md border border-gray-200 p-2 text-center">
                  <p class="text-sm font-semibold text-green-600">
                    {profile.summary.firstChoicePercentage}%
                  </p>
                  <p class="text-[10px] text-gray-500">1st Choice</p>
                </div>
              </div>
            {/if}

            <!-- Grouping History -->
            {#if profile.placementHistory.length > 0}
              <CollapsibleSection
                title="Grouping History"
                summary="{profile.placementHistory.length} placements"
                isExpanded={historyExpanded}
                onToggle={(expanded) => (historyExpanded = expanded)}
              >
                <div class="space-y-1.5">
                  {#each profile.placementHistory.slice(0, 10) as item}
                    <div class="rounded border border-gray-100 px-2.5 py-1.5 text-xs">
                      <div class="flex items-center justify-between">
                        <span class="font-medium text-gray-900">{item.groupName}</span>
                        {#if item.placement.preferenceRank === 1}
                          <span
                            class="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800"
                            >1st</span
                          >
                        {:else if item.placement.preferenceRank === 2}
                          <span
                            class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800"
                            >2nd</span
                          >
                        {:else if item.placement.preferenceRank !== null}
                          <span
                            class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                            >{formatPreferenceRank(item.placement.preferenceRank)}</span
                          >
                        {/if}
                      </div>
                      <div class="mt-0.5 text-gray-500">
                        {item.activityName}{item.session?.name ? ` · ${item.session.name}` : ''} · {formatDate(item.session?.startDate)}
                      </div>
                    </div>
                  {/each}
                  {#if profile.placementHistory.length > 10}
                    <p class="text-center text-[10px] text-gray-400">
                      +{profile.placementHistory.length - 10} more
                    </p>
                  {/if}
                </div>
              </CollapsibleSection>
            {/if}

            <!-- Past Observations -->
            {#if profile.observations.length > 0}
              <CollapsibleSection
                title="Past Observations"
                summary="{profile.observations.length} notes"
                isExpanded={observationsExpanded}
                onToggle={(expanded) => (observationsExpanded = expanded)}
              >
                <div class="space-y-1.5">
                  {#each profile.observations.slice(0, 5) as obs}
                    <div class="rounded border border-gray-100 px-2.5 py-1.5 text-xs">
                      <div class="flex items-center gap-1.5">
                        {#if obs.sentiment === 'POSITIVE'}
                          <span class="text-green-500">+</span>
                        {:else if obs.sentiment === 'NEGATIVE'}
                          <span class="text-red-500">-</span>
                        {:else}
                          <span class="text-gray-400">o</span>
                        {/if}
                        <span class="text-gray-500">{formatDate(obs.createdAt)}</span>
                      </div>
                      {#if obs.content}
                        <p class="mt-0.5 text-gray-700">{obs.content}</p>
                      {/if}
                    </div>
                  {/each}
                  {#if profile.observations.length > 5}
                    <p class="text-center text-[10px] text-gray-400">
                      +{profile.observations.length - 5} more
                    </p>
                  {/if}
                </div>
              </CollapsibleSection>
            {/if}

            <!-- Frequent Groupmates (cross-activity) -->
            {#if profile.pairingStats.length > 0}
              <CollapsibleSection
                title="Frequent Groupmates"
                summary="{profile.pairingStats.length} students"
                isExpanded={groupmatesExpanded}
                onToggle={(expanded) => (groupmatesExpanded = expanded)}
              >
                <div class="space-y-1">
                  {#each profile.pairingStats.slice(0, 8) as stat}
                    <div class="flex items-center justify-between text-xs">
                      <span class="truncate text-gray-700">{stat.otherStudentName}</span>
                      <span class="ml-2 flex-shrink-0 text-gray-400">{stat.count}x</span>
                    </div>
                  {/each}
                </div>
              </CollapsibleSection>
            {/if}

            <!-- Empty state -->
            {#if profile.summary.totalGroupings === 0 && profile.observations.length === 0}
              <div class="rounded-md border-2 border-dashed border-gray-200 p-4 text-center">
                <p class="text-xs text-gray-500">No history yet for this student.</p>
              </div>
            {/if}
          {:else}
            <!-- No canonical identity — show limited view -->
            <div class="rounded-md border-2 border-dashed border-gray-200 p-4 text-center">
              <p class="text-xs text-gray-500">No cross-activity history available.</p>
              <p class="mt-1 text-[10px] text-gray-400">History builds as you save sessions.</p>
            </div>
          {/if}
        {:else}
          <!-- Overview sub-view (default): preferences & recent groupmates -->

          <!-- Current Preferences -->
          {#if preferences}
            {@const likeGroups = preferences.likeGroupIds ?? []}
            {#if likeGroups.length > 0}
              <div>
                <h3 class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Preferences
                </h3>
                <div class="flex flex-wrap gap-1.5">
                  {#each likeGroups as choice, i}
                    <span
                      class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {i + 1}. {groupNameMap[choice] ?? choice}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}

          <!-- Recent Groupmates (from current activity pairing stats) -->
          {#if recentGroupmates.length > 0}
            <div>
              <h3 class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                Recent Groupmates
              </h3>
              <div class="space-y-1">
                {#each recentGroupmates.slice(0, 5) as groupmate}
                  <div class="flex items-center justify-between text-xs">
                    <span class="truncate text-gray-700">{groupmate.studentName}</span>
                    <span class="ml-2 flex-shrink-0 text-gray-400">{groupmate.count}x</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- View History link -->
          {#if !loading && profile && (profile.summary.totalGroupings > 0 || profile.observations.length > 0)}
            <button
              type="button"
              onclick={() => (showHistory = true)}
              class="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              View history ({profile.summary.totalGroupings} groupings)
            </button>
          {/if}

          <!-- Remove from roster -->
          <div class="border-t border-gray-100 pt-3">
            <button
              type="button"
              onclick={onDelete}
              class="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
              </svg>
              Remove from roster
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</aside>
