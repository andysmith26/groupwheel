# Phase 3: Workspace Inline Generation (Replace Start Page)

## Goal

When the workspace has no scenario (no groups generated yet), show an inline group-size picker and "Generate Groups" button — replacing the separate `/start` route. The workspace becomes the single home for an activity: generate, edit, and show all from one page.

## Prerequisites

- Phase 1 (showToClass use case) — workspace uses new publish flow

## Context Files to Read

1. **`src/routes/activities/[id]/start/+page.svelte`** — Current Start page. Group size picker (2-8), "Avoid recent groupmates" toggle, "Generate" button, previous sessions list. ~280 lines.
2. **`src/routes/activities/[id]/workspace/+page.svelte`** — Current workspace. Has `EmptyWorkspaceState` component for when no scenario exists. Lines ~1550-1551.
3. **`src/lib/components/workspace/EmptyWorkspaceState.svelte`** — Current empty state. Shows student count and preferences count. Minimal.
4. **`src/lib/application/useCases/quickGenerateGroups.ts`** — Use case for size-based generation. Called from Start page.
5. **`src/lib/services/appEnvUseCases.ts`** — Wiring for `quickGenerateGroups`.

## Design

### Workspace Empty State (No Groups Yet)

Replace `EmptyWorkspaceState` with an inline generation UI:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│          Generate Groups                        │
│          24 students                            │
│                                                 │
│          Students per group                     │
│             [-]  4  [+]                         │
│          6 groups (2 with 3 students)           │
│                                                 │
│          ☑ Avoid recent groupmates              │
│             (shown only if prior sessions)      │
│                                                 │
│          [ Generate Groups ]                    │
│                                                 │
│          Activity setup & preferences →         │
│                                                 │
└─────────────────────────────────────────────────┘
```

This is the Start page's UI, inlined into the workspace where `EmptyWorkspaceState` currently renders.

### After Generation

Once groups are generated, the workspace immediately shows the drag-drop editing UI with the new groups. No navigation — the same page transitions from empty state to editing state.

## Implementation Steps

### Step 1: Create InlineGroupGenerator component

**Create:** `src/lib/components/workspace/InlineGroupGenerator.svelte`

This extracts the generation UI from the Start page into a reusable component.

```typescript
// Props
interface Props {
  programId: string;
  programName: string;
  studentCount: number;
  sessions: Session[];
  onGenerated: (scenario: Scenario) => void;
  onError: (error: string) => void;
}
```

**Component contains:**

- Group size selector ([-] number [+]) — range 2 to min(8, floor(studentCount/2))
- Group count display with "smaller group" note
- "Avoid recent groupmates" checkbox (only if sessions with PUBLISHED/ARCHIVED exist)
- "Generate Groups" button
- Link to activity setup page
- Loading spinner during generation

**On generate:**

1. Call `quickGenerateGroups(env, { programId, groupSize, groupNamePrefix: 'Group', avoidRecentGroupmates })`
2. On success: call `onGenerated(scenario)` — parent handles transition to editing
3. On error: display error message inline

### Step 2: Update workspace to use InlineGroupGenerator

**Modify:** `src/routes/activities/[id]/workspace/+page.svelte`

Replace the `EmptyWorkspaceState` rendering block (around lines 1550-1551):

**Current:**

```svelte
{:else if !scenario || !view}
  <EmptyWorkspaceState studentCount={students.length} {preferencesCount} />
```

**New:**

```svelte
{:else if !scenario || !view}
  <div class="mx-auto max-w-lg py-8">
    <InlineGroupGenerator
      programId={program.id}
      programName={program.name}
      studentCount={students.length}
      {sessions}
      onGenerated={handleInlineGenerated}
      onError={(msg) => generationError = msg}
    />
  </div>
```

**Add handler:**

```typescript
function handleInlineGenerated(newScenario: Scenario) {
  scenario = newScenario;
  generationError = null;
  initializeEditingStore(newScenario);
}
```

**Add import:**

```typescript
import InlineGroupGenerator from '$lib/components/workspace/InlineGroupGenerator.svelte';
```

**Remove import** of `EmptyWorkspaceState` (it's no longer needed).

### Step 3: Handle the "no students" case

The Start page has a special empty state when studentCount === 0 ("Add students to get started" with link to activity setup). Include this in `InlineGroupGenerator`:

```svelte
{#if studentCount === 0}
  <div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
    <p class="text-gray-600">Add students to get started.</p>
    <a
      href="/activities/{programId}"
      class="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      Go to activity setup
    </a>
  </div>
{:else}
  <!-- Group size picker + generate button -->
{/if}
```

### Step 4: Redirect /start to workspace

**Modify:** `src/routes/activities/[id]/start/+page.svelte`

Add redirect at the top of `onMount`:

```typescript
onMount(async () => {
  // Redirect to workspace — generation is now inline
  goto(`/activities/${$page.params.id}/workspace`, { replaceState: true });
});
```

This preserves any bookmarks/links to `/start`. Full deletion in Phase 5.

### Step 5: Update activity detail page navigation

**Modify:** `src/routes/activities/[id]/+page.svelte`

If there are any links to `/start` on this page, change them to `/workspace`. Look for:

- The "Generate Groups" / "Start" button in the activity detail page
- Any navigation that goes to `/start`

Change to navigate to `/workspace` instead (the inline generator will handle it).

### Step 6: Remove EmptyWorkspaceState

**Delete:** `src/lib/components/workspace/EmptyWorkspaceState.svelte`

Since it's fully replaced by `InlineGroupGenerator`. Check for any other imports of this component first.

## Files Changed Summary

| File                                                       | Action                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/components/workspace/InlineGroupGenerator.svelte` | CREATE                                                         |
| `src/routes/activities/[id]/workspace/+page.svelte`        | MODIFY (replace EmptyWorkspaceState with InlineGroupGenerator) |
| `src/routes/activities/[id]/start/+page.svelte`            | MODIFY (add redirect to /workspace)                            |
| `src/routes/activities/[id]/+page.svelte`                  | MODIFY (update /start links to /workspace)                     |
| `src/lib/components/workspace/EmptyWorkspaceState.svelte`  | DELETE                                                         |

## Do NOT Touch

- `quickGenerateGroups.ts` — reused as-is
- `/live` route — Phase 2
- `showToClass` use case — Phase 1
- Any repository or domain code
- The workspace's editing UI (groups, drag-drop, etc.)
- The workspace's "Start Over" / "Try Another" regeneration — keep as-is

## Verification

1. Open workspace for an activity with no groups → see inline group size picker
2. Adjust group size → count updates in real-time
3. Click "Generate Groups" → groups appear in workspace (no navigation)
4. "Avoid recent groupmates" toggle appears only when prior sessions exist
5. Navigate to `/start` → redirected to `/workspace`
6. Zero-student activity shows "Add students" message with link to setup
7. After generation, undo/redo/drag-drop all work normally
8. `pnpm test:unit` passes
