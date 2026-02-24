# Phase 5: Cleanup — Delete Old Routes, Dead Code, Update Tests

## Goal

Remove all deprecated routes, dead components, and unused code paths. Update tests to match the new flow. This is the final phase — do it only after Phases 1-4 are verified working.

## Prerequisites

- All of Phases 1-4 completed and verified

## Context Files to Read

1. **`src/routes/activities/[id]/start/+page.svelte`** — Should be a redirect by now (Phase 3). Delete entirely.
2. **`src/routes/activities/[id]/present/+page.svelte`** — Should be a redirect by now (Phase 2). Delete entirely.
3. **`src/routes/activities/[id]/observe/+page.svelte`** — Should be a redirect by now (Phase 2). Delete entirely.
4. **`src/lib/components/workspace/EmptyWorkspaceState.svelte`** — Should be deleted already (Phase 3). Verify.
5. **`src/lib/components/editing/PublishSessionModal.svelte`** — No longer used. Delete.
6. **`src/lib/components/workspace/ShowToClassPrompt.svelte`** — No longer used. Delete.
7. **`src/lib/components/workspace/PostPublishPrompt.svelte`** — No longer used. Delete.
8. **`e2e/` directory** — Tests that reference old routes need updating.
9. **`src/lib/application/useCases/createSession.ts`** — Check if still referenced anywhere. If not, can be deleted.
10. **`src/lib/application/useCases/publishSession.ts`** — Check if still referenced anywhere. If not, can be deleted.

## Implementation Steps

### Step 1: Delete old route directories

**Delete these directories entirely** (each contains +page.svelte and possibly +page.ts):

```
src/routes/activities/[id]/start/
src/routes/activities/[id]/present/
src/routes/activities/[id]/observe/
```

### Step 2: Delete unused workspace components

**Search for imports** of each component before deleting. Use `grep -r "ComponentName"` to verify no remaining references.

**Delete if unused:**

- `src/lib/components/editing/PublishSessionModal.svelte`
- `src/lib/components/workspace/ShowToClassPrompt.svelte`
- `src/lib/components/workspace/PostPublishPrompt.svelte`
- `src/lib/components/workspace/EmptyWorkspaceState.svelte` (if not already deleted in Phase 3)

### Step 3: Clean up workspace imports

**Modify:** `src/routes/activities/[id]/workspace/+page.svelte`

Remove imports and state for deleted components:

```typescript
// Remove these imports:
import PublishSessionModal from '$lib/components/editing/PublishSessionModal.svelte';
import ShowToClassPrompt from '$lib/components/workspace/ShowToClassPrompt.svelte';
import PostPublishPrompt from '$lib/components/workspace/PostPublishPrompt.svelte';

// Remove these state variables:
let showPublishModal = $state(false);
let isPublishing = $state(false);
let publishError = $state<string | null>(null);
let showShowToClassPrompt = $state(false);
let showToClassPublishing = $state(false);
let showToClassError = $state<string | null>(null);
let showPostPublishPrompt = $state(false);

// Remove these handlers:
function handlePublish(data) { ... }  // the PublishSessionModal handler
function handleJustPreview() { ... }
function handlePostPublishShowToClass() { ... }
function handlePostPublishRecordObservations() { ... }
function handlePostPublishOpenBoth() { ... }

// Remove template blocks:
<PublishSessionModal ... />
<ShowToClassPrompt ... />
<PostPublishPrompt ... />
```

Also remove the import of `createSession` and `publishSession` from `'$lib/services/appEnvUseCases'` if they're no longer called directly (replaced by `showToClass` in Phase 1).

### Step 4: Audit old use case references

**Check if `createSession` use case is still referenced:**

```bash
grep -r "createSession" src/ --include="*.ts" --include="*.svelte" -l
```

If only referenced from:

- `src/lib/application/useCases/createSession.ts` (itself)
- `src/lib/application/useCases/index.ts` (barrel export)
- `src/lib/services/appEnvUseCases.ts` (wrapper)

Then it's safe to remove. But **keep it if** any other code still uses it.

**Same check for `publishSession`:**

```bash
grep -r "publishSession" src/ --include="*.ts" --include="*.svelte" -l
```

If unused, remove from:

- `src/lib/application/useCases/publishSession.ts`
- The barrel export in `src/lib/application/useCases/index.ts`
- The wrapper in `src/lib/services/appEnvUseCases.ts`

**Important:** Do NOT delete these if they're still imported somewhere. The search must confirm zero remaining consumers.

### Step 5: Clean up session domain

**Modify:** `src/lib/domain/session.ts`

The `DRAFT` status is no longer used for new sessions. However:

- **Keep the type** `SessionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'` for backward compatibility with existing data in IndexedDB
- **Keep `createSession()`** factory if any code still creates DRAFT sessions
- Add a comment noting DRAFT is legacy:

```typescript
// Note: DRAFT status is retained for backward compatibility with existing data.
// New sessions are created directly as PUBLISHED via createPublishedSession().
export type SessionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
```

### Step 6: Update E2E tests

**Review and update these test files:**

- `e2e/present-flow.spec.ts` — Update to test `/live` route instead of `/present`
- `e2e/wizard-flow.spec.ts` — Update any references to Start page
- `e2e/setup-page.spec.ts` — Update any navigation that goes to `/start`
- `e2e/dashboard.spec.ts` — Update any navigation links

**For each test file:**

1. Replace `/present` URLs with `/live`
2. Replace `/observe` URLs with `/live`
3. Replace `/start` URLs with `/workspace`
4. Update any assertions about "Publish" buttons or session modals
5. Add new tests for:
   - Live view Student tab
   - Live view Teacher tab
   - "Done" flow (archive + navigate)
   - Workspace inline generation (replaces Start page tests)

### Step 7: Search for any remaining references to old routes

**Run comprehensive search:**

```bash
grep -r "/start" src/ e2e/ --include="*.ts" --include="*.svelte" --include="*.spec.ts" | grep -v node_modules | grep -v ".svelte-kit"
grep -r "/present" src/ e2e/ --include="*.ts" --include="*.svelte" --include="*.spec.ts" | grep -v node_modules | grep -v ".svelte-kit"
grep -r "/observe" src/ e2e/ --include="*.ts" --include="*.svelte" --include="*.spec.ts" | grep -v node_modules | grep -v ".svelte-kit"
```

Fix any remaining references.

### Step 8: Update documentation

**Modify:** `docs/reference/STATUS.md` — Update route descriptions
**Modify:** `docs/reference/ARCHITECTURE.md` — Update flow descriptions if applicable
**Modify:** `CLAUDE.md` — Update the "Core workflow" section if it references old routes

### Step 9: Run full test suite

```bash
pnpm check        # TypeScript — no import errors
pnpm test:unit    # Unit tests pass
pnpm test:e2e     # E2E tests pass
pnpm build        # Production build succeeds
```

## Files Changed Summary

| File                                                      | Action                                               |
| --------------------------------------------------------- | ---------------------------------------------------- |
| `src/routes/activities/[id]/start/`                       | DELETE directory                                     |
| `src/routes/activities/[id]/present/`                     | DELETE directory                                     |
| `src/routes/activities/[id]/observe/`                     | DELETE directory                                     |
| `src/lib/components/editing/PublishSessionModal.svelte`   | DELETE                                               |
| `src/lib/components/workspace/ShowToClassPrompt.svelte`   | DELETE                                               |
| `src/lib/components/workspace/PostPublishPrompt.svelte`   | DELETE                                               |
| `src/lib/components/workspace/EmptyWorkspaceState.svelte` | DELETE (if not already)                              |
| `src/lib/application/useCases/createSession.ts`           | DELETE (if unused)                                   |
| `src/lib/application/useCases/publishSession.ts`          | DELETE (if unused)                                   |
| `src/lib/application/useCases/index.ts`                   | MODIFY (remove deleted exports)                      |
| `src/lib/services/appEnvUseCases.ts`                      | MODIFY (remove deleted wrappers)                     |
| `src/routes/activities/[id]/workspace/+page.svelte`       | MODIFY (remove dead imports/state/handlers/template) |
| `src/lib/domain/session.ts`                               | MODIFY (add legacy comment on DRAFT)                 |
| `e2e/present-flow.spec.ts`                                | MODIFY (update routes)                               |
| `e2e/wizard-flow.spec.ts`                                 | MODIFY (update routes)                               |
| `e2e/setup-page.spec.ts`                                  | MODIFY (update routes)                               |
| Various docs                                              | MODIFY (update references)                           |

## Verification

1. `pnpm check` — zero TypeScript errors
2. `pnpm test:unit` — all pass
3. `pnpm test:e2e` — all pass
4. `pnpm build` — succeeds
5. No references to `/start`, `/present`, `/observe` in source code
6. No imports of deleted components
7. Navigating to old URLs returns 404 (routes fully removed)
8. Full user flow works: Activity list → detail page → New Groups → workspace → Show to Class → live → Done → workspace
