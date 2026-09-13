<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import type { Program, Tag } from '$lib/domain';
  import { TAG_COLOR_HEX, resolveTagColorHex } from '$lib/utils/tagColors';
  import { Button } from '$lib/components/ui';

  interface Props {
    program: Program;
    tags: Tag[];
    onCreateTag: (input: { name: string; colorIndex?: number }) => Promise<boolean>;
    onUpdateTag: (tagId: string, changes: { name?: string; colorIndex?: number }) => Promise<boolean>;
    onDeleteTag: (tagId: string) => Promise<boolean>;
    onClose: () => void;
  }

  let { program, tags, onCreateTag, onUpdateTag, onDeleteTag, onClose }: Props = $props();

  let newTagName = $state('');
  let error = $state<string | null>(null);
  let savingTagId = $state<string | null>(null);

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;

    const success = await onCreateTag({ name });
    if (!success) {
      error = 'Could not create tag. Check for duplicate names.';
      return;
    }
    newTagName = '';
    error = null;
  }

  async function handleRename(tag: Tag, value: string) {
    const name = value.trim();
    if (!name || name === tag.name) return;
    savingTagId = tag.id;
    const success = await onUpdateTag(tag.id, { name });
    savingTagId = null;
    error = success ? null : 'Could not rename tag. Check for duplicate names.';
  }

  async function handleSetColor(tag: Tag, colorIndex: number) {
    if (tag.colorIndex === colorIndex) return;
    savingTagId = tag.id;
    const success = await onUpdateTag(tag.id, { colorIndex });
    savingTagId = null;
    error = success ? null : 'Could not update tag color.';
  }

  async function handleDelete(tag: Tag) {
    const confirmed = window.confirm(`Delete tag "${tag.name}"? This removes it from all students.`);
    if (!confirmed) return;
    savingTagId = tag.id;
    const success = await onDeleteTag(tag.id);
    savingTagId = null;
    error = success ? null : 'Could not delete tag.';
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  transition:fade={{ duration: 150 }}
  onclick={onClose}
  role="dialog"
  aria-modal="true"
  aria-label="Manage tags"
>
  <div
    class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
    transition:scale={{ duration: 150, start: 0.95 }}
    onclick={(e) => e.stopPropagation()}
  >
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Manage Tags</h3>
        <p class="text-xs text-gray-500">{program.name}</p>
      </div>
      <Button variant="ghost" onclick={onClose}>Close</Button>
    </div>

    <div class="mb-4 flex gap-2">
      <label for="new-tag-name" class="sr-only">New tag name</label>
      <input
        id="new-tag-name"
        type="text"
        bind:value={newTagName}
        placeholder="New tag name"
        class="block min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
      />
      <Button variant="primary" onclick={handleCreateTag} disabled={!newTagName.trim()}>Add Tag</Button>
    </div>

    {#if error}
      <p class="mb-3 text-sm text-red-600">{error}</p>
    {/if}

    <div class="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
      {#if tags.length === 0}
        <p class="text-sm text-gray-500">No tags yet.</p>
      {:else}
        {#each tags as tag (tag.id)}
          <div class="rounded-md border border-gray-200 p-3">
            <div class="mb-2 flex items-center gap-2">
              <span
                class="h-3 w-3 rounded-full"
                style:background-color={resolveTagColorHex(tag)}
                aria-hidden="true"
              ></span>
              <input
                type="text"
                value={tag.name}
                aria-label="Tag name for {tag.name}"
                onblur={(event) => handleRename(tag, (event.target as HTMLInputElement).value)}
                class="block min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                class="text-sm font-medium text-red-600 hover:text-red-700"
                onclick={() => handleDelete(tag)}
                disabled={savingTagId === tag.id}
              >
                Delete
              </button>
            </div>
            <div class="flex gap-2">
              {#each TAG_COLOR_HEX as hex, i}
                <button
                  type="button"
                  class="h-7 w-7 rounded-full border-2 transition-transform {tag.colorIndex === i
                    ? 'scale-110 border-gray-900'
                    : 'border-transparent hover:scale-105'}"
                  style="background-color: {hex}"
                  onclick={() => handleSetColor(tag, i)}
                  aria-label="Color {i + 1} for {tag.name}"
                  aria-pressed={tag.colorIndex === i}
                  disabled={savingTagId === tag.id}
                ></button>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
