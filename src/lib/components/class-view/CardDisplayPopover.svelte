<script lang="ts">
  import type { Tag } from '$lib/domain';
  import { cardDisplay } from '$lib/stores/cardDisplay.svelte';
  import { resolveTagBadgeClasses } from '$lib/utils/tagColors';
  import { Z } from '$lib/constants/elevation';

  interface Props {
    tags: Tag[];
    onManageTags: () => void;
    onClose: () => void;
  }

  let { tags, onManageTags, onClose }: Props = $props();
  let popoverEl = $state<HTMLDivElement | null>(null);
  let ready = $state(false);
  const sortedTags = $derived([...tags].sort((a, b) => a.name.localeCompare(b.name)));

  $effect(() => {
    const timer = setTimeout(() => {
      ready = true;
    }, 0);
    return () => {
      clearTimeout(timer);
      ready = false;
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (ready && popoverEl && !popoverEl.contains(event.target as Node)) {
      onClose();
    }
  }

  function setTagMode(tagId: string, mode: 'background' | 'border' | null) {
    cardDisplay.setTagColorMode(tagId, mode);
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div
  bind:this={popoverEl}
  class="absolute top-full right-0 mt-1 w-96 rounded-lg border border-gray-200 bg-white shadow-xl"
  style:z-index={Z.OVERLAY}
  role="dialog"
  aria-label="Card display"
  onclick={(event) => event.stopPropagation()}
>
  <div class="border-b border-gray-200 px-4 py-3">
    <h3 class="text-sm font-semibold text-gray-900">Card display</h3>
  </div>

  <div class="px-4 py-3">
    <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-900">
      <input
        type="checkbox"
        checked={cardDisplay.showTags}
        onchange={(event) => cardDisplay.setShowTags(event.currentTarget.checked)}
        class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      Show tags on cards
    </label>
  </div>

  <div class="border-t border-gray-200 px-4 py-3">
    <h4 class="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">Tag colors</h4>
    {#if sortedTags.length === 0}
      <p class="text-sm text-gray-500">
        No tags yet. Add tags in
        <button
          type="button"
          class="font-medium text-teal-700 underline hover:text-teal-800"
          onclick={() => {
            onClose();
            onManageTags();
          }}
        >Manage Tags</button>.
      </p>
    {:else}
      <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
        {#each sortedTags as tag (tag.id)}
          <div class="flex items-center justify-between gap-3">
            <span
              class="max-w-36 min-w-0 truncate rounded px-1.5 py-0.5 text-xs font-medium {resolveTagBadgeClasses(tag)}"
              title={tag.name}
            >{tag.name}</span>
            <fieldset class="shrink-0">
              <legend class="sr-only">Color for {tag.name}</legend>
              <div
                class="inline-flex rounded-md border border-gray-300"
                role="radiogroup"
                aria-label="Color for {tag.name}"
              >
                {#each [
                  { label: 'None', mode: null },
                  { label: 'Background', mode: 'background' },
                  { label: 'Border', mode: 'border' }
                ] as option, index (option.label)}
                  <label
                    class="cursor-pointer px-2 py-1 text-xs {index > 0
                      ? 'border-l border-gray-300'
                      : ''} {cardDisplay.tagColorModes[tag.id] === option.mode ||
                    (!cardDisplay.tagColorModes[tag.id] && option.mode === null)
                      ? 'bg-teal-50 font-medium text-teal-800'
                      : 'text-gray-600 hover:bg-gray-50'}"
                  >
                    <input
                      class="sr-only"
                      type="radio"
                      name="tag-color-{tag.id}"
                      value={option.label}
                      checked={cardDisplay.tagColorModes[tag.id] === option.mode ||
                        (!cardDisplay.tagColorModes[tag.id] && option.mode === null)}
                      onchange={() => setTagMode(tag.id, option.mode)}
                    />
                    {option.label}
                  </label>
                {/each}
              </div>
            </fieldset>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
