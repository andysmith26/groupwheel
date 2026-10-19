<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import type { Program, Tag } from '$lib/domain';
  import { TAG_COLORS, TAG_COLOR_NAMES, resolveTagColorHex } from '$lib/utils/tagColors';
  import { cardDisplay, type TagColorMode } from '$lib/stores/cardDisplay.svelte';
  import { Button } from '$lib/components/ui';

  interface Props {
    program: Program;
    tags: Tag[];
    onCreateTag: (input: { name: string; colorIndex?: number }) => Promise<boolean>;
    onUpdateTag: (
      tagId: string,
      changes: { name?: string; colorIndex?: number }
    ) => Promise<boolean>;
    onDeleteTag: (tagId: string) => Promise<boolean>;
    onClose: () => void;
  }

  let { program, tags, onCreateTag, onUpdateTag, onDeleteTag, onClose }: Props = $props();

  let newTagName = $state('');
  let error = $state<string | null>(null);
  let savingTagId = $state<string | null>(null);
  let colorPickerTagId = $state<string | null>(null);
  let newTagInput = $state<HTMLInputElement | null>(null);

  function colorNameForIndex(index: number): string {
    const normalized =
      ((index % TAG_COLOR_NAMES.length) + TAG_COLOR_NAMES.length) % TAG_COLOR_NAMES.length;
    return TAG_COLOR_NAMES[normalized] ?? `Color ${normalized + 1}`;
  }

  onMount(() => {
    requestAnimationFrame(() => newTagInput?.focus());
  });

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

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

  const MODE_OPTIONS: { mode: TagColorMode | null; label: string }[] = [
    { mode: null, label: 'None' },
    { mode: 'background', label: 'Background' },
    { mode: 'border', label: 'Border' }
  ];

  function setAllVisible(visible: boolean) {
    for (const tag of tags) cardDisplay.setTagVisible(tag.id, visible);
  }

  function setAllModes(mode: TagColorMode | null) {
    for (const tag of tags) cardDisplay.setTagColorMode(tag.id, mode);
  }

  const allVisible = $derived(
    tags.length > 0 && tags.every((tag) => cardDisplay.isTagVisible(tag.id))
  );

  async function handleSetColorAndClose(tag: Tag, colorIndex: number) {
    colorPickerTagId = null;
    await handleSetColor(tag, colorIndex);
  }

  async function handleDelete(tag: Tag) {
    const colorMode = cardDisplay.tagColorModes[tag.id];
    const confirmationMessage = colorMode
      ? `Tag "${tag.name}" is set to color card ${colorMode === 'background' ? 'backgrounds' : 'borders'}. Deleting it will remove that setting. Delete tag?`
      : `Delete tag "${tag.name}"? This removes it from all students.`;
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;
    savingTagId = tag.id;
    const success = await onDeleteTag(tag.id);
    savingTagId = null;
    if (success) cardDisplay.removeTag(tag.id);
    error = success ? null : 'Could not delete tag.';
  }
</script>

<svelte:window onkeydown={handleDialogKeydown} />

<div
  class="fixed top-10 right-0 bottom-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
  transition:fly={{ x: 320, duration: 150 }}
  role="dialog"
  aria-modal="false"
  aria-label="Manage tags"
>
  <header class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
    <div>
      <h3 class="text-base font-semibold text-gray-900">Manage Tags</h3>
      <p class="text-xs text-gray-500">{program.name}</p>
    </div>
    <Button variant="ghost" onclick={onClose}>Close</Button>
  </header>

  <div class="border-b border-gray-200 px-4 py-3">
    <div class="flex gap-2">
      <label for="new-tag-name" class="sr-only">New tag name</label>
      <input
        id="new-tag-name"
        bind:this={newTagInput}
        type="text"
        bind:value={newTagName}
        onkeydown={(event) => {
          if (event.key === 'Enter') handleCreateTag();
        }}
        placeholder="New tag name"
        class="block min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
      />
      <Button variant="primary" onclick={handleCreateTag} disabled={!newTagName.trim()}>Add</Button>
    </div>
    {#if error}
      <p class="mt-2 text-sm text-red-600" role="alert">{error}</p>
    {/if}
  </div>

  {#if tags.length > 0}
    <div
      class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600"
    >
      <span class="font-medium text-gray-700">All tags:</span>
      <button
        type="button"
        class="rounded px-1.5 py-0.5 font-medium text-teal-700 hover:bg-teal-50"
        onclick={() => setAllVisible(!allVisible)}
      >
        {allVisible ? 'Hide all' : 'Show all'}
      </button>
      <span class="text-gray-300" aria-hidden="true">|</span>
      <span>Color:</span>
      {#each MODE_OPTIONS as option (option.label)}
        <button
          type="button"
          class="rounded px-1.5 py-0.5 font-medium text-teal-700 hover:bg-teal-50"
          onclick={() => setAllModes(option.mode)}
          aria-label={`Set color mode to ${option.label} for all tags`}
        >
          {option.label}
        </button>
      {/each}
    </div>
    <div
      class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-4 pt-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
    >
      <span>Tag</span>
      <span class="w-9 text-center">Show</span>
      <span class="w-44 text-center">Color on card</span>
      <span class="w-5"></span>
    </div>
  {/if}

  <div class="flex-1 overflow-y-auto px-4 py-2">
    {#if tags.length === 0}
      <p class="py-4 text-sm text-gray-500">No tags yet.</p>
    {:else}
      <ul class="divide-y divide-gray-100">
        {#each tags as tag (tag.id)}
          {@const currentMode = cardDisplay.tagColorModes[tag.id] ?? null}
          <li class="py-2">
            <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3">
              <div class="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  class="h-5 w-5 shrink-0 rounded-full border-2 border-white ring-1 ring-gray-300 hover:ring-gray-500"
                  style:background-color={resolveTagColorHex(tag)}
                  onclick={() => (colorPickerTagId = colorPickerTagId === tag.id ? null : tag.id)}
                  aria-label={`Change color for ${tag.name}`}
                  aria-expanded={colorPickerTagId === tag.id}
                  title={`Color: ${tag.colorIndex != null ? colorNameForIndex(tag.colorIndex) : 'Auto'}`}
                ></button>
                <input
                  type="text"
                  value={tag.name}
                  aria-label={`Tag name for ${tag.name}`}
                  onblur={(event) => handleRename(tag, (event.target as HTMLInputElement).value)}
                  onkeydown={(event) => {
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                  }}
                  class="block min-w-0 flex-1 rounded border border-transparent px-1.5 py-1 text-sm hover:border-gray-300 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <label class="flex w-9 justify-center">
                <input
                  type="checkbox"
                  checked={cardDisplay.isTagVisible(tag.id)}
                  onchange={(event) =>
                    cardDisplay.setTagVisible(tag.id, event.currentTarget.checked)}
                  aria-label={`Show ${tag.name} on cards`}
                  class="h-4 w-4 rounded border-gray-300 text-teal-600"
                />
              </label>
              <div
                class="flex w-44 overflow-hidden rounded-md border border-gray-300 text-xs"
                role="radiogroup"
                aria-label={`Color mode for ${tag.name}`}
              >
                {#each MODE_OPTIONS as option (option.label)}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={currentMode === option.mode}
                    onclick={() => cardDisplay.setTagColorMode(tag.id, option.mode)}
                    class="flex-1 px-1.5 py-1 font-medium transition-colors {currentMode ===
                    option.mode
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'}"
                  >
                    {option.label}
                  </button>
                {/each}
              </div>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-red-600"
                onclick={() => handleDelete(tag)}
                disabled={savingTagId === tag.id}
                aria-label={`Delete tag ${tag.name}`}
                title="Delete tag"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {#if colorPickerTagId === tag.id}
              <div class="mt-2 grid grid-cols-8 gap-1.5 rounded-md bg-gray-50 p-2">
                {#each TAG_COLORS as color, i (color.hex)}
                  <button
                    type="button"
                    class="h-6 w-6 rounded-full border-2 transition-transform {tag.colorIndex === i
                      ? 'scale-110 border-gray-900'
                      : 'border-transparent hover:scale-105'}"
                    style="background-color: {color.hex}"
                    onclick={() => handleSetColorAndClose(tag, i)}
                    aria-label={`${color.name} for ${tag.name}`}
                    aria-pressed={tag.colorIndex === i}
                    title={color.name}
                    disabled={savingTagId === tag.id}
                  ></button>
                {/each}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
