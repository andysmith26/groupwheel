<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Alert from '$lib/components/ui/Alert.svelte';
  import {
    exportAllData,
    downloadBackupFile,
    parseBackupFile,
    restoreAllData,
    readFileAsText,
    type BackupSummary
  } from '$lib/utils/backupRestore';

  let exporting = $state(false);
  let importing = $state(false);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);

  // Import flow states
  let pendingSummary = $state<BackupSummary | null>(null);
  let pendingBackupJson = $state<string | null>(null);
  let showConfirm = $state(false);

  let fileInput = $state<HTMLInputElement>();

  async function handleExport() {
    error = null;
    success = null;
    exporting = true;

    try {
      const data = await exportAllData();
      downloadBackupFile(data);

      const totalRecords = Object.values(data.stores).reduce((sum, arr) => sum + arr.length, 0);
      success = `Backup exported successfully (${totalRecords} records).`;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to export backup.';
    } finally {
      exporting = false;
    }
  }

  async function handleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    error = null;
    success = null;
    pendingSummary = null;
    pendingBackupJson = null;
    showConfirm = false;

    try {
      const text = await readFileAsText(file);
      const result = parseBackupFile(text);

      if (!result.valid) {
        error = result.error;
        return;
      }

      pendingSummary = result.summary;
      pendingBackupJson = text;
      showConfirm = true;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to read backup file.';
    } finally {
      // Reset file input so the same file can be selected again
      input.value = '';
    }
  }

  async function confirmRestore() {
    if (!pendingBackupJson) return;

    error = null;
    success = null;
    importing = true;

    try {
      const result = parseBackupFile(pendingBackupJson);
      if (!result.valid) {
        error = result.error;
        return;
      }

      await restoreAllData(result.data);

      const totalRecords = Object.values(result.data.stores).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      success = `Backup restored successfully (${totalRecords} records). Reload the page to see your data.`;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to restore backup.';
    } finally {
      importing = false;
      showConfirm = false;
      pendingSummary = null;
      pendingBackupJson = null;
    }
  }

  function cancelRestore() {
    showConfirm = false;
    pendingSummary = null;
    pendingBackupJson = null;
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }
</script>

<section class="space-y-4">
  <h2 class="text-lg font-semibold text-gray-800">Backup & Restore</h2>
  <p class="text-sm text-gray-600">
    Groupwheel keeps data on this device by default. Backup and import are here so you can move data
    yourself, only when you choose.
  </p>
  <p class="text-sm text-gray-600">
    Why this matters for student privacy: there is no automatic account sync, no always-on cloud
    copy, and no third-party account required. Student information stays in your control unless you
    create a backup file.
  </p>
  <p class="text-sm text-gray-600">
    What this means for you: your class data is private by default, and you can still transfer it to
    a new device with an exported backup file. Keep backup files in trusted school storage and avoid
    sharing them by email or chat.
  </p>

  {#if error}
    <Alert variant="error" dismissible onDismiss={() => (error = null)}>
      {error}
    </Alert>
  {/if}

  {#if success}
    <Alert variant="success" dismissible onDismiss={() => (success = null)}>
      {success}
    </Alert>
  {/if}

  <!-- Export -->
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="text-sm font-medium text-gray-900">Export</h3>
    <p class="mt-1 text-sm text-gray-500">
      Download a backup file containing all your Groupwheel data. Use this when you want to keep
      your own copy or move data to another device.
    </p>
    <div class="mt-3">
      <Button variant="secondary" size="sm" loading={exporting} onclick={handleExport}>
        {exporting ? 'Exporting...' : 'Download Backup'}
      </Button>
    </div>
  </div>

  <!-- Import -->
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="text-sm font-medium text-gray-900">Import</h3>
    <p class="mt-1 text-sm text-gray-500">
      Restore data from a previously exported backup file. This keeps transfer intentional and
      teacher-controlled. Import will replace all existing data on this device.
    </p>

    {#if showConfirm && pendingSummary}
      <div class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
        <p class="text-sm font-medium text-amber-800">
          Ready to restore backup from {formatDate(pendingSummary.exportedAt)}
        </p>
        <ul class="mt-2 space-y-0.5 text-sm text-amber-700">
          {#if pendingSummary.programs > 0}
            <li>{pendingSummary.programs} activit{pendingSummary.programs === 1 ? 'y' : 'ies'}</li>
          {/if}
          {#if pendingSummary.students > 0}
            <li>{pendingSummary.students} student{pendingSummary.students === 1 ? '' : 's'}</li>
          {/if}
          {#if pendingSummary.sessions > 0}
            <li>{pendingSummary.sessions} session{pendingSummary.sessions === 1 ? '' : 's'}</li>
          {/if}
          {#if pendingSummary.observations > 0}
            <li>
              {pendingSummary.observations} observation{pendingSummary.observations === 1
                ? ''
                : 's'}
            </li>
          {/if}
        </ul>
        <p class="mt-2 text-sm font-medium text-amber-800">
          This will replace all existing data. Are you sure?
        </p>
        <div class="mt-3 flex gap-2">
          <Button variant="danger" size="sm" loading={importing} onclick={confirmRestore}>
            {importing ? 'Restoring...' : 'Replace & Restore'}
          </Button>
          <Button variant="ghost" size="sm" disabled={importing} onclick={cancelRestore}>
            Cancel
          </Button>
        </div>
      </div>
    {:else}
      <div class="mt-3">
        <input
          bind:this={fileInput}
          type="file"
          accept=".json"
          class="hidden"
          onchange={handleFileSelected}
        />
        <Button variant="ghost" size="sm" onclick={() => fileInput?.click()}>
          Choose Backup File
        </Button>
      </div>
    {/if}
  </div>
</section>
