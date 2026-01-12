# Activity Export/Import Feature Plan

## Summary

Enable teachers to export an activity (grouping configuration) as a JSON file that can be shared with colleagues, and allow any user (including unauthenticated) to import such files to recreate the activity.

---

## Research Findings

### What is an "Activity"?

An "activity" is a composite concept combining multiple domain entities:
- **Program** (`src/lib/domain/program.ts`) - The activity metadata (name, type, timeSpan)
- **Pool** (`src/lib/domain/pool.ts`) - The student roster
- **Students** (`src/lib/domain/student.ts`) - Individual student records
- **Preferences** (`src/lib/domain/preference.ts`) - Student group preferences
- **Scenario** (`src/lib/domain/scenario.ts`) - The current grouping state (groups + assignments)

### Existing Patterns

1. **CSV Export** (`src/lib/utils/csvExport.ts:85-124`) - Exports student assignments to CSV format, called from workspace page
2. **Clipboard Adapter** (`src/lib/infrastructure/clipboard/`) - Abstracted browser clipboard access via `ClipboardPort`
3. **Activity Loading** (`src/lib/application/useCases/getActivityData.ts`) - Loads complete activity data for workspace
4. **Activity Creation** (`src/lib/application/useCases/createGroupingActivity.ts`) - Composite use case that creates Pool + Program + Preferences

### Architecture Constraints (from `docs/ARCHITECTURE.md`)

- Domain layer must be pure (no browser APIs)
- Use cases in `src/lib/application/useCases/` must accept deps via `deps` object
- UI must call use cases via facade (`src/lib/services/appEnvUseCases.ts`)
- Browser APIs should be abstracted via ports (like `ClipboardPort`)

---

## Files to Modify/Create

### New Files
1. `src/lib/application/useCases/exportActivity.ts` - Use case to serialize activity data
2. `src/lib/application/useCases/importActivity.ts` - Use case to import activity from JSON
3. `src/lib/utils/activityFile.ts` - JSON serialization/validation utilities (pure functions)
4. `src/lib/application/ports/FileDownloadPort.ts` - Port for file download abstraction
5. `src/lib/infrastructure/file/BrowserFileDownloadAdapter.ts` - Browser file download implementation
6. `src/routes/activities/import/+page.svelte` - Import page UI (accessible without auth)

### Modified Files
1. `src/lib/components/editing/EditingToolbar.svelte` - Add "Export Activity" button
2. `src/lib/services/appEnvUseCases.ts` - Wire up new use cases to facade
3. `src/lib/infrastructure/inMemoryEnvironment.ts` - Add file download adapter to env
4. `src/routes/activities/+page.svelte` - Add "Import Activity" link to empty state/header

---

## Approaches

### Approach A: Minimal - Direct Browser Download (Recommended)

**What it does differently**: Uses direct browser APIs (`URL.createObjectURL`, `<a download>`) for file operations without creating new ports.

**Implementation**:
- Export: Utility function in `src/lib/utils/activityFile.ts` creates JSON blob, triggers download via temporary anchor element
- Import: File input on import page, `FileReader` to parse JSON, then call existing `createGroupingActivity` use case

**Files created/modified**:
- `src/lib/utils/activityFile.ts` (new) - ~100 lines
- `src/lib/application/useCases/importActivity.ts` (new) - ~80 lines
- `src/lib/components/editing/EditingToolbar.svelte` (modify) - add button
- `src/routes/activities/import/+page.svelte` (new) - ~150 lines
- `src/lib/services/appEnvUseCases.ts` (modify) - wire import use case

**Trade-offs**:
- Implementation effort: **Quick win** (~2 hours)
- Best-practice alignment: **Acceptable** - Browser APIs in utils is slightly impure but pragmatic for file I/O
- Maintenance burden: **Simple** - Minimal new abstractions

### Approach B: Port-Based - Full Abstraction

**What it does differently**: Creates `FileDownloadPort` and `FileUploadPort` abstractions in the application layer.

**Implementation**:
- New ports: `FileDownloadPort`, `FileUploadPort`
- New adapters: `BrowserFileDownloadAdapter`, `BrowserFileUploadAdapter`
- In-memory adapters for testing
- Use cases call ports for file operations

**Files created/modified**:
- `src/lib/application/ports/FileDownloadPort.ts` (new)
- `src/lib/application/ports/FileUploadPort.ts` (new)
- `src/lib/infrastructure/file/BrowserFileDownloadAdapter.ts` (new)
- `src/lib/infrastructure/file/BrowserFileUploadAdapter.ts` (new)
- `src/lib/infrastructure/file/InMemoryFileAdapter.ts` (new)
- `src/lib/application/useCases/exportActivity.ts` (new)
- `src/lib/application/useCases/importActivity.ts` (new)
- `src/lib/utils/activityFile.ts` (new)
- `src/lib/infrastructure/inMemoryEnvironment.ts` (modify)
- `src/lib/services/appEnvUseCases.ts` (modify)
- `src/lib/components/editing/EditingToolbar.svelte` (modify)
- `src/routes/activities/import/+page.svelte` (new)

**Trade-offs**:
- Implementation effort: **Moderate** (~4 hours)
- Best-practice alignment: **Canonical** - Fully testable, follows hexagonal architecture strictly
- Maintenance burden: **Manageable** - More files but cleaner separation

### Approach C: Server-Assisted Export

**What it does differently**: Generates shareable URLs instead of files (requires backend)

**Why not recommended**:
- Violates core principle "All data stays in the browser"
- Requires server infrastructure
- Out of scope for current architecture

---

## Recommendation

**Approach A (Minimal - Direct Browser Download)** is recommended because:

1. **Pragmatic**: File download/upload is a one-way operation that doesn't need mocking in tests (the data serialization can be tested separately)
2. **Follows existing patterns**: Similar to how CSV export currently works (utility function in `src/lib/utils/`)
3. **Fast delivery**: Minimal abstraction overhead, can be implemented quickly

**What would flip the choice**: If we needed to test file operations in automated e2e tests without actual file system access, Approach B would be worth the investment.

---

## Implementation Plan

### Export Feature

1. Create `src/lib/utils/activityFile.ts`:
   - `serializeActivityToJson(data: ActivityExportData): string`
   - `downloadActivityFile(data: ActivityExportData, filename: string): void`
   - `ActivityExportData` type definition

2. Add "Export Activity" button to `EditingToolbar.svelte`:
   - Button in export dropdown (next to CSV options)
   - On click: gather current activity data, call `downloadActivityFile`

### Import Feature

1. Create `src/lib/application/useCases/importActivity.ts`:
   - Validates imported JSON structure
   - Checks version compatibility
   - Creates Program, Pool, Students, Preferences, and optionally Scenario
   - Returns new program ID on success

2. Create `src/routes/activities/import/+page.svelte`:
   - File drop zone / file input
   - Parse and validate JSON
   - Preview import data (activity name, student count, group count)
   - "Import" button → call use case → redirect to workspace

3. Add "Import Activity" link to `/activities` page header

### Export Data Schema

```typescript
interface ActivityExportData {
  version: 1;
  exportedAt: string; // ISO date
  activity: {
    name: string;
    type: ProgramType;
  };
  roster: {
    students: Array<{
      id: string;
      firstName: string;
      lastName?: string;
      gradeLevel?: string;
    }>;
  };
  preferences: Array<{
    studentId: string;
    likeGroupIds: string[];
    avoidStudentIds: string[];
  }>;
  scenario?: {
    groups: Array<{
      name: string;
      capacity?: number;
      memberIds: string[];
    }>;
    algorithmConfig?: unknown;
  };
}
```

---

## Questions for Approval

1. Should the import create a new scenario with the same groups, or start fresh with just the roster/preferences?
   - **Recommendation**: Include scenario (groups) so the import is a full copy

2. Should we support importing without groups (roster-only)?
   - **Recommendation**: Yes, make scenario optional in the export

3. Filename convention?
   - **Recommendation**: `{activity-name}-{date}.groupwheel.json`
