<script lang="ts">
  /**
   * ShareDropdown — Dropdown menu for export actions and output modes.
   *
   * Follows Google Docs "Share" convention. Items above the divider are
   * export actions (get data out), ordered by usage frequency. Items below
   * are output modes (show data to others).
   */

  interface Props {
    onCopyForSpreadsheet?: () => void;
    onSave?: () => void;
    onPrint?: () => void;
    onDisplay?: () => void;
    onPublish?: () => void;
    onClose: () => void;
  }

  let { onCopyForSpreadsheet, onSave, onPrint, onDisplay, onPublish, onClose }: Props = $props();

  let ready = $state(false);
  let menuEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    const timer = setTimeout(() => {
      ready = true;
    }, 0);
    return () => clearTimeout(timer);
  });

  function handleClickOutside(e: MouseEvent) {
    if (ready && menuEl && !menuEl.contains(e.target as Node)) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleAction(action: (() => void) | undefined) {
    onClose();
    action?.();
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div
  bind:this={menuEl}
  class="absolute top-full right-0 z-40 mt-2 w-60 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
  role="menu"
>
  <!-- Export actions -->
  <button
    type="button"
    class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    role="menuitem"
    onclick={() => handleAction(onCopyForSpreadsheet)}
  >
    <svg
      class="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M12 16.875c0-.621.504-1.125 1.125-1.125"
      />
    </svg>
    Copy for Spreadsheet
  </button>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    role="menuitem"
    onclick={() => handleAction(onSave)}
  >
    <svg
      class="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z"
      />
    </svg>
    Save / Back Up
  </button>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    role="menuitem"
    onclick={() => handleAction(onPrint)}
  >
    <svg
      class="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 7.234V3.375"
      />
    </svg>
    Print
  </button>

  <!-- Divider -->
  <div class="my-1 border-t border-gray-100"></div>

  <!-- Output modes -->
  <button
    type="button"
    class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    role="menuitem"
    onclick={() => handleAction(onDisplay)}
  >
    <svg
      class="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.125c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125Z"
      />
    </svg>
    Display
  </button>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    role="menuitem"
    onclick={() => handleAction(onPublish)}
  >
    <svg
      class="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
      />
    </svg>
    Publish
  </button>
</div>
