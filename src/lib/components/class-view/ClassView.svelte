<script lang="ts">
  /**
   * ClassView — The product. Everything happens here.
   *
   * Two-panel layout: left roster, right groups (empty state for WP4).
   * Orchestrates the Class View VM, toolbar, roster panel, and import flow.
   *
   * See: project definition.md — Decision 2, Part 3 (Class View), WP4
   */

  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { createClassViewVm } from '$lib/stores/class-view-vm.svelte';
  import { addStudentToPool, resolveOrCreateTags } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';
  import { exportGroupsToColumnsTSV } from '$lib/utils/csvExport';
  import type { SortBy } from '$lib/utils/csvExport';
  import { downloadActivityFile, generateExportFilename } from '$lib/utils/activityFile';
  import { toPng } from 'html-to-image';
  import { prepareWorkspaceExport } from '$lib/services/appEnvUseCases';
  import { Alert, OverlaySheet } from '$lib/components/ui';
  import { parseRosterFromMappedData, parseRosterFromPaste } from '$lib/services/rosterImport';
  import { getSourceStudentId, getStudentGivenName, getStudentLongName } from '$lib/domain/student';
  import { detectSimpleNameList } from '$lib/utils/pasteDetection';
  import { parseActivityFile, readFileAsText } from '$lib/utils/activityFile';
  import ClassViewToolbar from './ClassViewToolbar.svelte';
  import FloatingMiniToolbar from './FloatingMiniToolbar.svelte';
  import RosterPanel from './RosterPanel.svelte';
  import RosterImportModal from './RosterImportModal.svelte';
  import GroupsPanel from './GroupsPanel.svelte';
  import AnalyticsPanel from '$lib/components/editing/AnalyticsPanel.svelte';
  import ScenarioComparison from '$lib/components/editing/ScenarioComparison.svelte';
  import ContextualHint from '$lib/components/common/ContextualHint.svelte';
  import StudentDetailSidebar from '$lib/components/workspace/StudentDetailSidebar.svelte';
  import HistoryPopover from '$lib/components/workspace/HistoryPopover.svelte';
  import EditGroupModal from './EditGroupModal.svelte';
  import ManageTagsPanel from './ManageTagsPanel.svelte';
  import RemoveStudentConfirmDialog from './RemoveStudentConfirmDialog.svelte';
  import DeleteSessionConfirmDialog from './DeleteSessionConfirmDialog.svelte';
  import NewSessionConfirmDialog from './NewSessionConfirmDialog.svelte';
  import SortOrderDialog from './SortOrderDialog.svelte';
  import { hintState } from '$lib/stores/hintState.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { setLastActiveClubId } from '$lib/utils/lastActiveClub';
  import { Button, InlineError } from '$lib/components/ui';

  interface Props {
    activityId: string;
  }

  let { activityId }: Props = $props();

  let env = getAppEnvContext();
  let vm = createClassViewVm(env);

  let importModalOpen = $state(false);
  let replaceRosterOnImport = $derived($page.url.searchParams.get('replaceRoster') === 'true');
+  let preferenceImportOpen = $state(false);
+  let preferenceImportError = $state<string | null>(null);
+  let preferenceImportText = $state('');
+  let preferenceImportBusy = $state(false);
+  let preferenceImportFile = $state<File | null>(null);
+
+  async function handlePreferenceImportFileSelect(event: Event) {
+    const input = event.target as HTMLInputElement;
+    const file = input.files?.[0];
+    if (!file) return;
+
+    preferenceImportError = null;
+    preferenceImportBusy = true;
+    preferenceImportFile = file;
+
+    try {
+      const text = await readFileAsText(file);
+      const validation = parseActivityFile(text);
+
+      if (!validation.valid) {
+        preferenceImportError = validation.error;
+        return;
+      }
+
+      const preferences = validation.data.preferences ?? [];
+      if (preferences.length === 0) {
+        preferenceImportError = 'No preferences found in this file.';
+        return;
+      }
+
+      // This implementation intentionally only surfaces the import payload in the UI.
+      // Wiring it into the preference editor should happen where the preferences are edited.
+      preferenceImportText = JSON.stringify(preferences, null, 2);
+    } catch (error) {
+      preferenceImportError = error instanceof Error ? error.message : 'Could not read file.';
+    } finally {
+      preferenceImportBusy = false;
+      input.value = '';
+    }
+  }
+
+  function openPreferenceImport() {
+    preferenceImportOpen = true;
+  }
+
+  function closePreferenceImport() {
+    preferenceImportOpen = false;
+    preferenceImportError = null;
+    preferenceImportText = '';
+    preferenceImportFile = null;
+  }
 
   // Roster drawer: persist open/closed state per activity in localStorage
   const rosterStorageKey = `groupwheel:roster:${activityId}`;
   let rosterDrawerOpen = $state(
@@
   async function initializeActivity() {
     await vm.actions.init(activityId);
     if ($page.url.searchParams.get('action') === 'import' && vm.state.pool) {
       importModalOpen = true;
     }
   }
+
+  function handleRerouteToImportPreferences() {
+    openPreferenceImport();
+  }
@@
   async function handleImport(
     pastedText: string,
     rawData?: import('$lib/domain/import').RawSheetData,
     columnMappings?: import('$lib/domain/import').ColumnMapping[]
   ) {
@@
     if (errors.length > 0 && addedStudents.length === 0) {
       throw new Error(errors.join('\n'));
     }
   }
 </script>
@@
     <div class="flex flex-1 overflow-hidden">
       <!-- Center: Groups canvas (always full remaining width) -->
@@
       </div>
     </div>
+
+    {#if preferenceImportOpen}
+      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
+        <div class="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
+          <div class="flex items-start justify-between gap-4">
+            <div>
+              <h2 class="text-lg font-semibold text-gray-900">Import preferences</h2>
+              <p class="mt-1 text-sm text-gray-500">
+                Optional: import an activity export file to pull in preferences for this roster.
+              </p>
+            </div>
+            <button type="button" class="text-sm text-gray-500 hover:text-gray-700" onclick={closePreferenceImport}>
+              Close
+            </button>
+          </div>
+
+          <div class="mt-4 space-y-3">
+            <input
+              type="file"
+              accept=".json,.grp"
+              on:change={handlePreferenceImportFileSelect}
+              class="block w-full text-sm text-gray-600"
+            />
+
+            {#if preferenceImportError}
+              <InlineError message={preferenceImportError} dismissible onDismiss={() => (preferenceImportError = null)} />
+            {/if}
+
+            {#if preferenceImportText}
+              <textarea
+                readonly
+                class="min-h-48 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
+                value={preferenceImportText}
+              ></textarea>
+            {/if}
+
+            <div class="flex justify-end gap-2 pt-2">
+              <Button variant="ghost" onclick={closePreferenceImport}>Skip</Button>
+              <Button variant="secondary" disabled={preferenceImportBusy}>Import preferences</Button>
+            </div>
+          </div>
+        </div>
+      </div>
+    {/if}
   {/if}
 </div>
 </script>
