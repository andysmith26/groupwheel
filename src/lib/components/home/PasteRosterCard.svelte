<script lang="ts">
  /**
   * PasteRosterCard — Create an activity by typing or pasting student names.
   *
   * A lightweight "start from scratch" option. Teacher types/pastes names,
   * one per line, and an activity is created with those students.
   */

  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { getSourceStudentId } from '$lib/domain/student';
  import type { ColumnMapping, MappedField, RawSheetData } from '$lib/domain/import';
  import { InlineError } from '$lib/components/ui';
  import { parseRosterFromMappedData, parseRosterFromPaste } from '$lib/services/rosterImport';
  import { parseCsvToSheetData } from '$lib/services/googleSheets';
  import { createImportColumnMappings } from '$lib/services/importFieldMatching';
  import {
    createActivityInline,
    addStudentToPool,
    resolveOrCreateTags
  } from '$lib/services/appEnvUseCases';
  import { detectSimpleNameList } from '$lib/utils/pasteDetection';
  import { isErr } from '$lib/types/result';
  import SheetPreview from '$lib/components/import/SheetPreview.svelte';

  let {
    onCreated
  }: {
    onCreated?: (programId: string) => void;
  } = $props();

  const env = getAppEnvContext();

  let activityName = $state('');
  let pasteText = $state('');
  let pastedRosterData = $state<RawSheetData | null>(null);
  let columnMappings = $state<ColumnMapping[]>([]);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  let lineCount = $derived(
    pasteText.split(/\r?\n/).filter((line) => line.trim().length > 0).length
  );

  function parseName(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return { firstName: '', lastName: '' };
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map((part) => part.trim());
      return { firstName: parts[1] ?? '', lastName: parts[0] ?? '' };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  }

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

  async function handleSubmit() {
    if (isSubmitting) return;

    const name = activityName.trim();
    if (!name) {
      error = 'Enter a name for your activity.';
      return;
    }

    isSubmitting = true;
    error = null;

    const trimmedPaste = pasteText.trim();
    let parsedStudents: Array<{
      firstName: string;
      preferredName?: string;
      lastName: string;
      rawTags?: string[];
      sourceStudentId?: string;
    }> = [];

    if (trimmedPaste) {
      try {
        const rosterData = pastedRosterData
          ? parseRosterFromMappedData(pastedRosterData, columnMappings)
          : parseRosterFromPaste(trimmedPaste);
        parsedStudents = rosterData.studentOrder.map((id) => {
          const student = rosterData.studentsById[id];
          return {
            firstName: student?.firstName ?? '',
            preferredName: student?.preferredName,
            lastName: student?.lastName ?? '',
            rawTags: rosterData.rawTagsByStudentId[id],
            sourceStudentId: student ? getSourceStudentId(student) : undefined
          };
        });
      } catch (parseError) {
        const detection = detectSimpleNameList(trimmedPaste);
        if (detection.isSimpleNameList) {
          parsedStudents = detection.names.map((studentName) => parseName(studentName));
        } else {
          error = parseError instanceof Error ? parseError.message : 'Could not parse the roster.';
          isSubmitting = false;
          return;
        }
      }
    }

    // Create the activity
    const createResult = await createActivityInline(env, { name });
    if (isErr(createResult)) {
      error = createResult.error.message;
      isSubmitting = false;
      return;
    }

    const { program, pool } = createResult.value;

    for (const { firstName, preferredName, lastName, rawTags, sourceStudentId } of parsedStudents) {
      const resolvedTags = await resolveOrCreateTags(env, {
        programId: program.id,
        rawTagNames: rawTags
      });
      if (isErr(resolvedTags)) {
        error = `Failed to resolve tags for "${firstName} ${lastName}": ${resolvedTags.error.message}`;
        isSubmitting = false;
        return;
      }
      await addStudentToPool(env, {
        poolId: pool.id,
        firstName,
        preferredName,
        lastName,
        tagIds: resolvedTags.value,
        sourceStudentId
      });
    }

    onCreated?.(program.id);
    goto(`/activity/${program.id}`);
    isSubmitting = false;
  }
</script>

<div class="space-y-3">
  <div>
    <label for="ps-name" class="block text-xs font-medium text-gray-700">Activity name</label>
    <input
      id="ps-name"
      type="text"
      class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
      placeholder="e.g. 3rd Period Science"
      bind:value={activityName}
      onkeydown={(e) => {
        if (e.key === 'Enter' && !pasteText.trim()) handleSubmit();
      }}
      disabled={isSubmitting}
    />
  </div>

  <div>
    <label for="ps-paste" class="block text-xs font-medium text-gray-700">
      Student roster <span class="font-normal text-gray-400">(optional)</span>
    </label>
    <textarea
      id="ps-paste"
      class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
      rows="3"
      placeholder={'Alex Johnson\nJamie Smith\nAlex\tJohnson\talex-1'}
      value={pasteText}
      oninput={handlePasteInput}
      disabled={isSubmitting}
    ></textarea>
    {#if pastedRosterData}
      <div class="mt-3 flex items-center justify-between gap-3">
        <p class="text-xs text-gray-500">
          Review the detected columns before creating the activity.
        </p>
        <button
          type="button"
          class="text-xs text-gray-500 underline hover:text-gray-700"
          onclick={clearPastedRoster}
          disabled={isSubmitting}
        >
          Clear
        </button>
      </div>
      <div class="mt-3 max-h-72 overflow-auto">
        <SheetPreview
          data={pastedRosterData}
          mappings={columnMappings}
          maxPreviewRows={6}
          onMappingChange={handleMappingChange}
        />
      </div>
    {:else}
      <p class="mt-1 text-xs text-gray-500">
        Paste one student per line, or a table with a header row to match its fields.
      </p>
    {/if}
    {#if lineCount > 0}
      <p class="mt-1 text-xs text-gray-500">
        {lineCount}
        {lineCount === 1 ? 'student' : 'students'} detected
      </p>
    {/if}
  </div>

  <button
    type="button"
    class="w-full rounded-md bg-teal px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-dark focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none disabled:opacity-50"
    onclick={handleSubmit}
    disabled={!activityName.trim() || isSubmitting}
  >
    {isSubmitting ? 'Creating...' : 'Create Activity'}
  </button>

  {#if error}
    <InlineError message={error} dismissible onDismiss={() => (error = null)} />
  {/if}
</div>
