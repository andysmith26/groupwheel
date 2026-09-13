<script lang="ts">
  /**
   * StudentDetailSidebar.svelte
   *
   * Right-side panel showing student details with full CRUD support.
   * Supports three modes: view (read-only), edit (modify fields), create (new student).
   */

  import {
    getStudentDisplayName,
    getStudentLongName,
    type Group,
    type Student,
    type Tag
  } from '$lib/domain';
  import type { StudentPreference } from '$lib/domain/preference';
  import { createEmptyStudentPreference } from '$lib/domain/preference';
  import {
    createEmptyPeerRequestWorkspaceSummary,
    type StudentPeerRequestWorkspaceSummary
  } from '$lib/application/useCases/getPeerRequestWorkspaceSummary';
  import { getCanonicalId, getSourceStudentId } from '$lib/domain/student';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { getStudentProfile } from '$lib/services/appEnvUseCases';
  import { isOk } from '$lib/types/result';
  import type { StudentProfile } from '$lib/application/useCases/getStudentProfile';
  import CollapsibleSection from '$lib/components/setup/CollapsibleSection.svelte';
  import PeerRequestQuickEditPanel from '$lib/components/class-view/PeerRequestQuickEditPanel.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { Button, InlineError } from '$lib/components/ui';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { resolveTagBadgeClasses } from '$lib/utils/tagColors';

  interface RecentGroupmate {
    studentName: string;
    count: number;
  }

  interface Props {
    student: Student | null;
    preferences?: StudentPreference | null;
    students?: Student[];
    groups?: Group[];
    tags?: Tag[];
    tagsById?: Record<string, Tag>;
    peerRequestSummary?: StudentPeerRequestWorkspaceSummary | null;
    groupNameMap?: Record<string, string>;
    recentGroupmates?: RecentGroupmate[];
    mode: 'view' | 'edit' | 'create';
    onClose: () => void;
    onSave: (data: {
      firstName: string;
      preferredName?: string;
      lastName?: string;
      gradeLevel?: string;
      gender?: string;
      tagIds?: string[];
      sourceStudentId?: string;
      preferences?: StudentPreference;
    }) => Promise<boolean>;
    onResolveOrCreateTagIds?: (rawTagNames: readonly string[] | undefined) => Promise<string[]>;
    onAddPeerRequest?: (payload: {
      requesterStudentId: string;
      requestedStudentId: string;
    }) => Promise<void> | void;
    onQuickEditPeerRequest?: (payload: {
      requestId: string;
      studentId: string;
    }) => Promise<void> | void;
    onClearPeerRequest?: (requestId: string) => Promise<void> | void;
    onDeletePeerRequest?: (requestId: string) => Promise<void> | void;
    onDelete: () => void;
    onEditMode: () => void;
    onCancelEdit: () => void;
    /** Bindable — set by the sidebar so the parent can route backdrop/Escape closes through the dirty-check guard. */
    requestCloseHandler?: (() => void) | undefined;
    /** Whether this student is marked inactive at pool level */
    isInactive?: boolean;
    /** Toggle active/inactive status */
    onToggleActive?: () => void;
    /** Suppresses mutation actions while viewing a published or historical arrangement. */
    readOnly?: boolean;
  }

  let {
    student,
    preferences = null,
    students = [],
    groups = [],
    tags = [],
    tagsById = {},
    peerRequestSummary = null,
    groupNameMap = {},
    recentGroupmates = [],
    mode,
    onClose,
    onSave,
    onResolveOrCreateTagIds,
    onAddPeerRequest,
    onQuickEditPeerRequest,
    onClearPeerRequest,
    onDeletePeerRequest,
    onDelete,
    onEditMode,
    onCancelEdit,
    requestCloseHandler = $bindable<(() => void) | undefined>(undefined),
    isInactive = false,
    onToggleActive,
    readOnly = false
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
  let formPreferredName = $state('');
  let formLastName = $state('');
  let formGradeLevel = $state('');
  let formGender = $state('');
  let formTagIds = $state<string[]>([]);
  let tagInput = $state('');
  let isResolvingTags = $state(false);
  let formSourceStudentId = $state('');
  let formLikeGroupIds = $state<string[]>([]);
  let formAvoidGroupIds = $state<string[]>([]);
  let formAvoidStudentIds = $state<string[]>([]);
  let groupToAdd = $state('');
  let formError = $state<string | null>(null);
  let isSaving = $state(false);
  let showUnsavedDialog = $state(false);

  let firstNameInputEl = $state<HTMLInputElement | null>(null);

  const isEditing = $derived(mode === 'edit' || mode === 'create');
  const isDirty = $derived.by(() => {
    if (!isEditing) return false;
    if (mode === 'create') {
      return (
        formFirstName.trim() !== '' ||
        formPreferredName.trim() !== '' ||
        formLastName.trim() !== '' ||
        formSourceStudentId.trim() !== '' ||
        formTagIds.length > 0
      );
    }
    if (!student) return false;
    const savedPrefs = preferences ?? createEmptyStudentPreference(student.id);
    const sortStr = (arr: string[]) => [...arr].sort().join('\x00');
    return (
      formFirstName.trim() !== (student.firstName ?? '') ||
      formPreferredName.trim() !== (student.preferredName ?? '') ||
      formLastName.trim() !== (student.lastName ?? '') ||
      formGradeLevel.trim() !== (student.gradeLevel ?? '') ||
      formGender !== (student.gender ?? '') ||
      formTagIds.join('\x00') !== (student.tagIds ?? []).join('\x00') ||
      formSourceStudentId.trim() !== (getSourceStudentId(student) ?? '') ||
      formLikeGroupIds.join('\x00') !== savedPrefs.likeGroupIds.join('\x00') ||
      sortStr(formAvoidGroupIds) !== sortStr(savedPrefs.avoidGroupIds) ||
      sortStr(formAvoidStudentIds) !== sortStr(savedPrefs.avoidStudentIds)
    );
  });
  const showExperimentalFields = $derived(uiSettings.useExperimentalFeatures);

  const fullName = $derived(student ? getStudentLongName(student) || student.id : '');

  const canonicalId = $derived(student ? getCanonicalId(student) : null);
  const sourceStudentId = $derived(student ? getSourceStudentId(student) : undefined);
  const availablePeers = $derived.by(() =>
    students
      .filter((candidate) => candidate.id !== student?.id)
      .sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b)))
  );
  const studentsById = $derived(
    Object.fromEntries(students.map((candidate) => [candidate.id, candidate]))
  );
  const effectivePeerRequestSummary = $derived(
    student ? (peerRequestSummary ?? createEmptyPeerRequestWorkspaceSummary(student.id)) : null
  );
  const availableGroupsToLike = $derived(
    groups.filter(
      (group) => !formLikeGroupIds.includes(group.id) && !formAvoidGroupIds.includes(group.id)
    )
  );
  const effectiveTagsById = $derived.by(() => {
    if (Object.keys(tagsById).length > 0) return tagsById;
    return Object.fromEntries(tags.map((tag) => [tag.id, tag]));
  });
  const formTags = $derived.by(() =>
    formTagIds
      .map((tagId) => effectiveTagsById[tagId] ?? null)
      .filter((tag): tag is Tag => tag !== null)
  );

  // Populate form when entering edit mode or switching students
  $effect(() => {
    if (mode === 'edit' && student) {
      formFirstName = student.firstName ?? '';
      formPreferredName = student.preferredName ?? '';
      formLastName = student.lastName ?? '';
      formGradeLevel = student.gradeLevel ?? '';
      formGender = student.gender ?? '';
      formTagIds = [...(student.tagIds ?? [])];
      tagInput = '';
      formSourceStudentId = getSourceStudentId(student) ?? '';
      const savedPreferences = preferences ?? createEmptyStudentPreference(student.id);
      formLikeGroupIds = [...savedPreferences.likeGroupIds];
      formAvoidGroupIds = [...savedPreferences.avoidGroupIds];
      formAvoidStudentIds = [...savedPreferences.avoidStudentIds];
      groupToAdd = '';
      formError = null;
    } else if (mode === 'create') {
      formFirstName = '';
      formPreferredName = '';
      formLastName = '';
      formGradeLevel = '';
      formGender = '';
      formTagIds = [];
      tagInput = '';
      formSourceStudentId = '';
      formLikeGroupIds = [];
      formAvoidGroupIds = [];
      formAvoidStudentIds = [];
      groupToAdd = '';
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

  // Expose requestClose to the parent so backdrop/Escape closes go through the dirty-check guard
  $effect(() => {
    requestCloseHandler = requestClose;
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
      preferredName: formPreferredName.trim() || undefined,
      lastName: formLastName.trim() || undefined,
      gradeLevel: formGradeLevel.trim() || undefined,
      gender: formGender.trim() || undefined,
      tagIds: formTagIds,
      sourceStudentId: formSourceStudentId.trim() || undefined,
      preferences:
        mode === 'edit' && student
          ? {
              studentId: student.id,
              avoidStudentIds: formAvoidStudentIds,
              likeGroupIds: formLikeGroupIds,
              avoidGroupIds: formAvoidGroupIds
            }
          : undefined
    });

    isSaving = false;

    if (!success) {
      formError = 'Failed to save. Please try again.';
    }
  }

  function addPreferredGroup() {
    if (!groupToAdd) return;
    formLikeGroupIds = [...formLikeGroupIds, groupToAdd];
    groupToAdd = '';
  }

  function removePreferredGroup(groupId: string) {
    formLikeGroupIds = formLikeGroupIds.filter((id) => id !== groupId);
  }

  function movePreferredGroup(groupId: string, direction: -1 | 1) {
    const index = formLikeGroupIds.indexOf(groupId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= formLikeGroupIds.length) return;
    const next = [...formLikeGroupIds];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    formLikeGroupIds = next;
  }

  function toggleAvoidGroup(groupId: string, checked: boolean) {
    formAvoidGroupIds = checked
      ? [...formAvoidGroupIds, groupId]
      : formAvoidGroupIds.filter((id) => id !== groupId);
    if (checked) removePreferredGroup(groupId);
  }

  function toggleAvoidPeer(studentId: string, checked: boolean) {
    formAvoidStudentIds = checked
      ? [...formAvoidStudentIds, studentId]
      : formAvoidStudentIds.filter((id) => id !== studentId);
  }

  async function addTags(rawTags: string = tagInput): Promise<void> {
    const tagNames = rawTags
      .split(/[,;|]/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (tagNames.length === 0) {
      tagInput = '';
      return;
    }
    if (!onResolveOrCreateTagIds) return;

    isResolvingTags = true;
    try {
      const resolvedTagIds = await onResolveOrCreateTagIds(tagNames);
      const seen = new Set(formTagIds);
      const additions = resolvedTagIds.filter((tagId) => {
        if (seen.has(tagId)) return false;
        seen.add(tagId);
        return true;
      });
      formTagIds = [...formTagIds, ...additions];
    } finally {
      isResolvingTags = false;
    }
    tagInput = '';
  }

  function removeTag(tagId: string): void {
    formTagIds = formTagIds.filter((existing) => existing !== tagId);
  }

  function handleFormKeydown(e: KeyboardEvent) {
    if (
      e.key === 'Enter' &&
      e.target instanceof HTMLInputElement &&
      e.target.id === 'student-tags'
    ) {
      e.preventDefault();
      void addTags();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      requestCancel();
    }
  }

  function requestClose() {
    if (isEditing && isDirty) {
      showUnsavedDialog = true;
    } else {
      onClose();
    }
  }

  function requestCancel() {
    if (isEditing && isDirty) {
      showUnsavedDialog = true;
    } else {
      onCancelEdit();
    }
  }

  async function handleDialogSave() {
    showUnsavedDialog = false;
    await handleSubmit();
  }

  function handleDialogDiscard() {
    showUnsavedDialog = false;
    onCancelEdit();
  }

  function handleDialogKeepEditing() {
    showUnsavedDialog = false;
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
  class="relative flex h-full w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white"
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
        <h2 class="truncate text-sm font-semibold {isInactive ? 'text-gray-400' : 'text-gray-900'}">
          {fullName}
        </h2>
        {#if isInactive}
          <span
            class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
          >
            <svg
              class="h-3 w-3"
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
            Not participating
          </span>
        {:else if student?.gradeLevel}
          <p class="text-xs text-gray-500">Grade {student.gradeLevel}</p>
        {/if}
      {/if}
    </div>
    <div class="flex flex-shrink-0 items-center gap-1">
      {#if mode === 'view' && student && !readOnly}
        <button
          type="button"
          onclick={onEditMode}
          class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Edit student"
          title="Edit student"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </button>
      {/if}
      <button
        type="button"
        onclick={requestClose}
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
        onsubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
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
          <label for="student-preferred-name" class="block text-xs font-medium text-gray-700">
            Preferred Name
          </label>
          <input
            id="student-preferred-name"
            type="text"
            bind:value={formPreferredName}
            placeholder="Name used in class"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
          <p class="mt-1 text-[11px] text-gray-500">
            Optional. Used throughout Groupwheel displays.
          </p>
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
          <label for="student-source-id" class="block text-xs font-medium text-gray-700">
            Student ID
          </label>
          <input
            id="student-source-id"
            type="text"
            bind:value={formSourceStudentId}
            placeholder="ID from your roster or source data"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
          <p class="mt-1 text-[11px] text-gray-500">Editable source-data identifier.</p>
        </div>

        {#if student && showExperimentalFields}
          <div>
            <label class="block text-xs font-medium text-gray-700">Groupwheel ID</label>
            <div
              class="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
            >
              {student.id}
            </div>
            <p class="mt-1 text-[11px] text-gray-500">Internal system identifier. Read-only.</p>
          </div>
        {/if}

        {#if showExperimentalFields}
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
        {/if}

        <div>
          <label for="student-tags" class="block text-xs font-medium text-gray-700">Tags</label>
          <div class="mt-1 flex gap-2">
            <input
              id="student-tags"
              type="text"
              bind:value={tagInput}
              placeholder="e.g. Honors, ELL"
              class="block min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              onblur={() => void addTags()}
            />
            <button
              type="button"
              onclick={() => void addTags()}
              disabled={!tagInput.trim() || isResolvingTags}
              class="rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResolvingTags ? 'Adding…' : 'Add'}
            </button>
          </div>
          <p class="mt-1 text-[11px] text-gray-500">Press Enter or separate tags with commas.</p>
          {#if formTags.length > 0}
            <div class="mt-2 flex flex-wrap gap-1.5" aria-label="Student tags">
              {#each formTags as tag (tag.id)}
                <span
                  class="inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-2 text-xs font-medium {resolveTagBadgeClasses(tag)}"
                >
                  {tag.name}
                  <button
                    type="button"
                    onclick={() => removeTag(tag.id)}
                    aria-label="Remove tag {tag.name}"
                    class="rounded-full p-0.5 hover:bg-black/10"
                  >
                    <svg
                      class="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        {#if mode === 'edit' && student && showExperimentalFields}
          <fieldset class="space-y-3 border-t border-gray-200 pt-4">
            <legend class="text-xs font-semibold tracking-wide text-gray-700 uppercase">
              Group preferences
            </legend>

            <div>
              <label for="preferred-group" class="block text-xs font-medium text-gray-700">
                Preferred groups (in rank order)
              </label>
              <div class="mt-1 flex gap-2">
                <select
                  id="preferred-group"
                  bind:value={groupToAdd}
                  class="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">Choose a group...</option>
                  {#each availableGroupsToLike as group (group.id)}
                    <option value={group.id}>{group.name}</option>
                  {/each}
                </select>
                <button
                  type="button"
                  onclick={addPreferredGroup}
                  disabled={!groupToAdd}
                  class="rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {#if formLikeGroupIds.length > 0}
                <ol class="mt-2 space-y-1">
                  {#each formLikeGroupIds as groupId, index (groupId)}
                    <li
                      class="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
                    >
                      <span class="w-4 font-medium text-gray-500">{index + 1}</span>
                      <span class="min-w-0 flex-1 truncate text-gray-800">
                        {groupNameMap[groupId] ?? groupId}
                      </span>
                      <button
                        type="button"
                        onclick={() => movePreferredGroup(groupId, -1)}
                        disabled={index === 0}
                        aria-label="Move {groupNameMap[groupId] ?? groupId} up"
                        class="text-gray-500 hover:text-gray-800 disabled:opacity-30">↑</button
                      >
                      <button
                        type="button"
                        onclick={() => movePreferredGroup(groupId, 1)}
                        disabled={index === formLikeGroupIds.length - 1}
                        aria-label="Move {groupNameMap[groupId] ?? groupId} down"
                        class="text-gray-500 hover:text-gray-800 disabled:opacity-30">↓</button
                      >
                      <button
                        type="button"
                        onclick={() => removePreferredGroup(groupId)}
                        aria-label="Remove preferred group {groupNameMap[groupId] ?? groupId}"
                        class="text-red-500 hover:text-red-700">Remove</button
                      >
                    </li>
                  {/each}
                </ol>
              {:else}
                <p class="mt-1 text-[11px] text-gray-500">No preferred groups selected.</p>
              {/if}
            </div>

            <div>
              <p class="text-xs font-medium text-gray-700">Groups to avoid</p>
              {#if groups.length > 0}
                <div class="mt-1.5 space-y-1">
                  {#each groups as group (group.id)}
                    <label class="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={formAvoidGroupIds.includes(group.id)}
                        onchange={(event) =>
                          toggleAvoidGroup(
                            group.id,
                            (event.currentTarget as HTMLInputElement).checked
                          )}
                      />
                      {group.name}
                    </label>
                  {/each}
                </div>
              {:else}
                <p class="mt-1 text-[11px] text-gray-500">
                  Create groups before setting group preferences.
                </p>
              {/if}
            </div>
          </fieldset>

          <fieldset class="space-y-2 border-t border-gray-200 pt-4">
            <legend class="text-xs font-semibold tracking-wide text-gray-700 uppercase">
              Peer preferences
            </legend>
            <p class="text-[11px] text-gray-500">Avoid peers are used as grouping constraints.</p>
            {#if availablePeers.length > 0}
              <div class="max-h-36 space-y-1 overflow-y-auto pr-1">
                {#each availablePeers as peer (peer.id)}
                  <label class="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={formAvoidStudentIds.includes(peer.id)}
                      onchange={(event) =>
                        toggleAvoidPeer(peer.id, (event.currentTarget as HTMLInputElement).checked)}
                    />
                    Avoid {getStudentDisplayName(peer)}
                  </label>
                {/each}
              </div>
            {:else}
              <p class="text-[11px] text-gray-500">No other students are in this roster.</p>
            {/if}
          </fieldset>
        {/if}

        {#if mode === 'edit' && student && effectivePeerRequestSummary}
          <PeerRequestQuickEditPanel
            {student}
            {studentsById}
            summary={effectivePeerRequestSummary}
            {onAddPeerRequest}
            {onQuickEditPeerRequest}
            {onClearPeerRequest}
            {onDeletePeerRequest}
            experimentalFeatures={showExperimentalFields}
            embedded
          />
        {/if}
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
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
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
                  <p class="text-sm font-semibold text-gray-900">
                    {profile.summary.totalGroupings}
                  </p>
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
                        {item.activityName}{item.session?.name ? ` · ${item.session.name}` : ''} · {formatDate(
                          item.session?.startDate
                        )}
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

          <div class="grid gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
            <div>
              <p class="text-[10px] font-medium tracking-wide text-gray-500 uppercase">
                Student ID
              </p>
              <p class="mt-1 text-xs break-all text-gray-800">{sourceStudentId ?? 'Not set'}</p>
            </div>
            <div>
              <p class="text-[10px] font-medium tracking-wide text-gray-500 uppercase">
                Groupwheel ID
              </p>
              <p class="mt-1 text-xs break-all text-gray-600">{student.id}</p>
            </div>
          </div>

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
              <svg
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              View history ({profile.summary.totalGroupings} groupings)
            </button>
          {/if}

          <!-- Toggle active/inactive status -->
          {#if onToggleActive && !readOnly}
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p class="text-xs font-medium text-gray-700">
                {isInactive ? 'Reactivate this student' : 'Pause this student'}
              </p>
              <p class="mt-1 text-xs leading-5 text-gray-500">
                {isInactive
                  ? 'They will be included in future groupings again.'
                  : 'They will be excluded from future groupings until you mark them active again.'}
              </p>
              <button
                type="button"
                onclick={onToggleActive}
                class="mt-3 flex items-center gap-1 text-xs font-medium {isInactive
                  ? 'text-teal-600 hover:text-teal-800'
                  : 'text-gray-700 hover:text-gray-900'}"
              >
                {#if isInactive}
                  <svg
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                  Mark active
                {:else}
                  <svg
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                  Mark inactive
                {/if}
              </button>
            </div>
          {/if}

          <!-- Remove from roster -->
          {#if !readOnly}
            <div class="border-t border-gray-100 pt-3">
              <button
                type="button"
                onclick={onDelete}
                class="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              >
                <svg
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                  />
                </svg>
                Remove from roster
              </button>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>

  <!-- Sticky Save/Cancel footer (edit and create modes) -->
  {#if isEditing}
    <div class="border-t border-gray-200 bg-white px-4 py-3">
      {#if formError}
        <div class="mb-2">
          <InlineError
            message={formError}
            size="xs"
            dismissible
            onDismiss={() => (formError = null)}
          />
        </div>
      {/if}
      <div class="flex justify-end gap-2">
        <Button variant="ghost" onclick={requestCancel} disabled={isSaving}>Cancel</Button>
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
    </div>
  {/if}

  <!-- Unsaved changes dialog -->
  {#if showUnsavedDialog}
    <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
      <div class="mx-4 w-full max-w-xs rounded-lg bg-white p-4 shadow-lg">
        <h3 class="text-sm font-semibold text-gray-900">Unsaved changes</h3>
        <p class="mt-1.5 text-xs text-gray-600">
          You have unsaved changes. Save them before leaving?
        </p>
        <div class="mt-4 flex flex-col gap-2">
          <Button variant="primary" onclick={handleDialogSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button variant="ghost" onclick={handleDialogDiscard}>Discard changes</Button>
          <button
            type="button"
            onclick={handleDialogKeepEditing}
            class="text-xs text-gray-500 hover:text-gray-700"
          >
            Keep editing
          </button>
        </div>
      </div>
    </div>
  {/if}
</aside>
