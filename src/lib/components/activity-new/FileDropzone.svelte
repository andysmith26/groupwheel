<script lang="ts">
  let {
    id,
    label,
    accept = '.csv,.tsv,.txt',
    fileName = null,
    hasContent = false,
    onFile,
    onClear
  }: {
    id: string;
    label: string;
    accept?: string;
    fileName?: string | null;
    hasContent?: boolean;
    onFile: (file: File) => void;
    onClear?: () => void;
  } = $props();

  let dragging = $state(false);
  let input = $state<HTMLInputElement>();

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) onFile(file);
  }

  function handleChange(event: Event) {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    if (file) onFile(file);
    el.value = '';
  }
</script>

<div>
  <input
    {id}
    bind:this={input}
    type="file"
    {accept}
    class="sr-only"
    aria-label={label}
    onchange={handleChange}
  />
  <div
    role="presentation"
    class="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed px-4 py-4 text-sm transition-colors {dragging
      ? 'border-teal-600 bg-teal-50'
      : 'border-gray-300 bg-gray-50'}"
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={handleDrop}
  >
    <div class="min-w-0 text-gray-600">
      {#if fileName}
        <span class="block truncate font-medium text-gray-900">{fileName}</span>
      {:else}
        <span>Drag a CSV or TSV file here, or</span>
      {/if}
    </div>
    <div class="flex shrink-0 items-center gap-2">
      {#if (fileName || hasContent) && onClear}
        <button type="button" class="text-xs text-gray-500 underline" onclick={onClear}>
          Remove
        </button>
      {/if}
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
        onclick={() => input?.click()}
      >
        {fileName ? 'Replace file' : 'Browse files'}
      </button>
    </div>
  </div>
</div>
