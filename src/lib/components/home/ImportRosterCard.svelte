<script lang="ts">
  /**
   * ImportRosterCard — File-based import for the home empty state.
   *
   * Accepts two file types:
   * 1. JSON — a previously exported Groupwheel activity file
   * 2. CSV/TSV — a roster with student names and group preference columns
   *
   * For CSV/TSV, headers are fuzzy-matched to detect first name, last name,
   * and 1st–4th choice columns. Groups are created from the unique choice
   * values found in the file.
   */

  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { InlineError } from '$lib/components/ui';
  import {
    confirmPeerRequestMatches,
    createGroupingActivity,
    importActivity,
    importPeerRequestsFromMapping,
    matchPeerRequests,
    resolveOrCreateTags,
    savePeerRequests
  } from '$lib/services/appEnvUseCases';
  import type { SeedingStrategy } from '$lib/services/appEnvUseCases';
  import type { ColumnMapping, MappedField, RawSheetData } from '$lib/domain/import';
  import {
    generateStudentId,
    hasRequiredMappings,
    isPeerRequestField,
    validateMappedData
  } from '$lib/domain/import';
  import type { Student } from '$lib/domain';
  import { getStudentLongName } from '$lib/domain/student';
  import { parseActivityFile, readFileAsText } from '$lib/utils/activityFile';
  import { looksLikeCsv } from '$lib/utils/csvRosterParser';
  import { parseCsvToSheetData } from '$lib/services/googleSheets';
  import { createImportColumnMappings } from '$lib/services/importFieldMatching';
  import { isErr } from '$lib/types/result';
  import SheetPreview from '$lib/components/import/SheetPreview.svelte';
  import PeerRequestMatchingReview from '$lib/components/import/PeerRequestMatchingReview.svelte';
@@
   <input
     bind:this={fileInput}
-    type="file"
-    accept=".csv,.tsv,.txt,.json"
+    type="file"
+    accept=".csv,.tsv,.txt,.json,.grp"
     class="hidden"
     onchange={handleFileSelect}
   />
@@
     </button>
     <p class="{compact ? 'mt-1' : 'mt-2'} text-center text-xs text-gray-400">
-      Accepts .csv, .tsv, or .json
+      Accepts .csv, .tsv, .json, or .grp
     </p>
*** End Patch
