<script lang="ts">
  /**
   * RosterImportModal — Paste-based roster import for the Class View.
   *
   * Supports pasting a list of student names (one per line, or CSV/TSV).
   * Reuses parseRosterFromPaste for parsing and addStudentToPool for persistence.
   *
   * See: project definition.md — WP4, Part 3 (Class View roster panel)
   */

  import { fade, scale } from 'svelte/transition';
  import { Button, InlineError } from '$lib/components/ui';
  import type { ColumnMapping, MappedField, RawSheetData } from '$lib/domain/import';
  import SheetPreview from '$lib/components/import/SheetPreview.svelte';
  import { parseCsvToSheetData } from '$lib/services/googleSheets';
  import { createImportColumnMappings } from '$lib/services/importFieldMatching';
  import { detectSimpleNameList } from '$lib/utils/pasteDetection';

  interface Props {
    open: boolean;
    replaceRoster?: boolean;
    onClose: () => void;
    onImport: (
      pastedText: string,
      rawData?: RawSheetData,
      columnMappings?: ColumnMapping[]
    ) => Promise<void>;
  }

  let { open, replaceRoster = false, onClose, onImport }: Props = $props();

  let pasteText = $state('');
  let pastedRosterData = $state<RawSheetData | null>(null);
  let columnMappings = $state<ColumnMapping[]>([]);
  let importing = $state(false);
  let error = $state<string | null>(null);

  let lineCount = $derived(
    pasteText.split(/\r?\n/).filter((line) => line.trim().length > 0).length
  );

  function handlePasteInput(event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    pasteText = text;

    if (!text.trim() || detectSimpleNameList(text).isSimpleNameList) {
      pastedRosterData = null;
      columnMappings = [];
      return;
    }

    const parsed = parseCsvToSheetData(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      pastedRosterData = null;
      columnMappings = [];
      return;
    }

    const headersChanged =
      !pastedRosterData ||
      parsed.headers.length !== pastedRosterData.headers.length ||
      parsed.headers.some((header, index) => header !== pastedRosterData!.headers[index]);

    pastedRosterData = parsed;
    if (headersChanged) {
      columnMappings = createImportColumnMappings(parsed);
    }
  }

  function handleMappingChange(columnIndex: number, field: MappedField | null): void {
    columnMappings = columnMappings.map((mapping) =>
      mapping.columnIndex === columnIndex ? { ...mapping, mappedTo: field } : mapping
    );
  }

  function clearPastedRoster(): void {
    pasteText = '';
    pastedRosterData = null;
    columnMappings = [];
  }

  async function handleImport() {
    if (!pasteText.trim()) {
      error = 'Paste your student names first';
      return;
    }

    importing = true;
    error = null;

    try {
      await onImport(pasteText, pastedRosterData ?? undefined, columnMappings);
      clearPastedRoster();
      onClose();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Import failed';
    } finally {
      importing = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-label="Import roster"
    onkeydown={handleKeydown}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="mx-4 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      transition:scale={{ duration: 150, start: 0.95 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <h3 class="text-lg font-medium text-gray-900">Import Roster</h3>
        <p class="mt-1 text-sm text-gray-500">
          {replaceRoster
            ? 'Paste the new roster. It will replace the current list of students.'
            : 'Paste one student per line, or a table with a header row to match its fields.'}
        </p>

        <div class="mt-4">
          <textarea
            value={pasteText}
            oninput={handlePasteInput}
            class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            rows="8"
            placeholder={'Alex Johnson\nJamie Smith\nAlex\tJohnson\talex-1\n...'}
            autofocus
          ></textarea>

          {#if pastedRosterData}
            <div class="mt-3 flex items-center justify-between gap-3">
              <p class="text-xs text-gray-500">Review the detected columns before importing.</p>
              <button
                type="button"
                class="text-xs text-gray-500 underline hover:text-gray-700"
                onclick={clearPastedRoster}
                disabled={importing}
              >
                Clear
              </button>
            </div>
            <div class="mt-3 max-h-[24rem] overflow-auto pr-1">
              <SheetPreview
                data={pastedRosterData}
                mappings={columnMappings}
                maxPreviewRows={10}
                onMappingChange={handleMappingChange}
              />
            </div>
          {/if}

          {#if lineCount > 0}
            <p class="mt-1 text-xs text-gray-500">
              {lineCount}
              {lineCount === 1 ? 'student' : 'students'} detected
            </p>
          {/if}

          {#if error}
            <div class="mt-2">
              <InlineError message={error} dismissible onDismiss={() => (error = null)} />
            </div>
          {/if}
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <Button variant="ghost" onclick={onClose} disabled={importing}>Cancel</Button>
        <Button
          variant="secondary"
          onclick={handleImport}
          disabled={importing || !pasteText.trim()}
          loading={importing}
        >
          {importing ? 'Importing...' : replaceRoster ? 'Replace Roster' : 'Import'}
        </Button>
      </div>
    </div>
  </div>
{/if}
