<script lang="ts">
  /**
   * EditGroupModal — Modal dialog for editing a single group's name,
   * color, max enrollment, and deleting the group.
   *
   * Opened from the pencil icon in the Settings dropdown group list.
   */

  import { fade, scale } from 'svelte/transition';
  import { Button } from '$lib/components/ui';
  import { GROUP_COLOR_HEX } from '$lib/utils/groupColors';
  import type { Group } from '$lib/domain';
  import DeleteGroupConfirmDialog from '$lib/components/editing/DeleteGroupConfirmDialog.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';

  interface Props {
    group: Group;
    siblingGroupNames: string[];
    onSave: (changes: Partial<Pick<Group, 'name' | 'capacity' | 'colorIndex'>>) => void;
    onDelete: (groupId: string) => void;
    onClose: () => void;
  }

  let { group, siblingGroupNames, onSave, onDelete, onClose }: Props = $props();

  let name = $state(group.name);
  let colorIndex = $state(group.colorIndex ?? 0);
  let maxStudents = $state(group.capacity != null ? String(group.capacity) : '');
  let showDeleteConfirm = $state(false);

  let nameError = $derived.by(() => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Name cannot be empty';
    if (siblingGroupNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return 'Another group already has this name';
    }
    return null;
  });

  let parsedCapacity = $derived.by(() => {
    const trimmed = maxStudents.trim();
    if (trimmed === '') return null;
    const n = parseInt(trimmed, 10);
    if (isNaN(n) || n < 1) return undefined; // invalid
    return n;
  });

  let capacityError = $derived(
    parsedCapacity === undefined ? 'Must be a positive number or blank' : null
  );

  let canSave = $derived(nameError === null && capacityError === null);

  function handleSave() {
    if (!canSave) return;

    const changes: Partial<Pick<Group, 'name' | 'capacity' | 'colorIndex'>> = {};
    const trimmedName = name.trim();

    if (trimmedName !== group.name) changes.name = trimmedName;
    if (parsedCapacity !== group.capacity) changes.capacity = parsedCapacity!;
    if (colorIndex !== (group.colorIndex ?? 0)) changes.colorIndex = colorIndex;

    if (Object.keys(changes).length > 0) {
      onSave(changes);
    }
    onClose();
  }

  function handleDelete() {
    if (uiSettings.skipDeleteGroupConfirm) {
      onDelete(group.id);
      onClose();
    } else {
      showDeleteConfirm = true;
    }
  }

  function handleDeleteConfirm(dontAskAgain: boolean) {
    if (dontAskAgain) {
      uiSettings.setSkipDeleteGroupConfirm(true);
    }
    showDeleteConfirm = false;
    onDelete(group.id);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (showDeleteConfirm) {
        showDeleteConfirm = false;
      } else {
        onClose();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-modal="true"
  aria-label="Edit group"
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
    transition:scale={{ duration: 150, start: 0.95 }}
    onclick={(e) => e.stopPropagation()}
  >
    <h3 class="text-lg font-semibold text-gray-900">Edit Group</h3>

    <!-- Name -->
    <div class="mt-4">
      <label for="group-name" class="block text-sm font-medium text-gray-700">Name</label>
      <input
        id="group-name"
        type="text"
        bind:value={name}
        class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none {nameError
          ? 'border-red-300'
          : ''}"
      />
      {#if nameError}
        <p class="mt-1 text-xs text-red-600">{nameError}</p>
      {/if}
    </div>

    <!-- Color -->
    <div class="mt-4">
      <label class="block text-sm font-medium text-gray-700">Color</label>
      <div class="mt-2 flex gap-2">
        {#each GROUP_COLOR_HEX as hex, i}
          <button
            type="button"
            class="h-8 w-8 rounded-full border-2 transition-transform {colorIndex === i
              ? 'scale-110 border-gray-900'
              : 'border-transparent hover:scale-105'}"
            style="background-color: {hex}"
            onclick={() => (colorIndex = i)}
            aria-label="Color {i + 1}"
            aria-pressed={colorIndex === i}
          ></button>
        {/each}
      </div>
    </div>

    <!-- Max students -->
    <div class="mt-4">
      <label for="group-max" class="block text-sm font-medium text-gray-700">Max students</label>
      <input
        id="group-max"
        type="text"
        inputmode="numeric"
        placeholder="No limit"
        bind:value={maxStudents}
        class="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none {capacityError
          ? 'border-red-300'
          : ''}"
      />
      {#if capacityError}
        <p class="mt-1 text-xs text-red-600">{capacityError}</p>
      {/if}
    </div>

    <!-- Divider -->
    <div class="mt-5 border-t border-gray-200"></div>

    <!-- Actions -->
    <div class="mt-4 flex items-center justify-between">
      <button
        type="button"
        class="text-sm font-medium text-red-600 hover:text-red-700"
        onclick={handleDelete}
      >
        Delete Group
      </button>
      <div class="flex gap-3">
        <Button variant="ghost" onclick={onClose}>Cancel</Button>
        <Button variant="primary" onclick={handleSave} disabled={!canSave}>Save</Button>
      </div>
    </div>
  </div>
</div>

{#if showDeleteConfirm}
  <DeleteGroupConfirmDialog
    groupName={group.name}
    memberCount={group.memberIds.length}
    onConfirm={handleDeleteConfirm}
    onCancel={() => (showDeleteConfirm = false)}
  />
{/if}
