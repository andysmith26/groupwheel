# Phase 1: `showToClass` Use Case

## Goal

Replace the two-step `createSession()` + `publishSession()` with a single `showToClass()` use case. Sessions are created directly as PUBLISHED — no DRAFT intermediate state. The workspace's "Show to Class" button calls one function and gets back a published session.

## Prerequisites

None — this phase can be implemented first.

## Context Files to Read

Before implementing, read these files to understand the current pattern:

1. **`src/lib/application/useCases/createSession.ts`** — Current session creation (requires name, academicYear, startDate, endDate). Creates DRAFT session.
2. **`src/lib/application/useCases/publishSession.ts`** — Current publish logic. Loads scenario+preferences, creates Placements, transitions DRAFT→PUBLISHED.
3. **`src/lib/application/useCases/endSession.ts`** — Archives PUBLISHED sessions. The new use case must call this first.
4. **`src/lib/domain/session.ts`** — Session entity factory. Currently enforces `status: 'DRAFT'` on creation.
5. **`src/lib/domain/placement.ts`** — Placement entity factory. Must preserve this creation logic.
6. **`src/lib/services/appEnvUseCases.ts`** — Service wrapper that wires deps to use cases. Must add `showToClass` here.
7. **`src/lib/application/useCases/index.ts`** — Barrel exports. Must add new export.
8. **`src/lib/application/ports/index.ts`** — Port types for dependency injection.

## Implementation Steps

### Step 1: Create the `showToClass` use case

**Create:** `src/lib/application/useCases/showToClass.ts`

This use case combines the logic from `createSession` + `publishSession` + `endSession` into one atomic operation:

```typescript
// Input — minimal. No session name/dates from user.
export interface ShowToClassInput {
  programId: string;
  scenarioId: string;
}

// Error union — simplified from the three use cases
export type ShowToClassError =
  | { type: 'PROGRAM_NOT_FOUND'; programId: string }
  | { type: 'SCENARIO_NOT_FOUND'; scenarioId: string }
  | { type: 'INTERNAL_ERROR'; message: string };

// Dependencies — union of what createSession + publishSession + endSession need
export async function showToClass(
  deps: {
    programRepo: ProgramRepository;
    sessionRepo: SessionRepository;
    scenarioRepo: ScenarioRepository;
    preferenceRepo: PreferenceRepository;
    placementRepo: PlacementRepository;
    idGenerator: IdGenerator;
    clock: Clock;
  },
  input: ShowToClassInput
): Promise<Result<Session, ShowToClassError>>
```

**Logic (in order):**

1. Load program by `input.programId` — return `PROGRAM_NOT_FOUND` if missing
2. Load scenario by `input.scenarioId` — return `SCENARIO_NOT_FOUND` if missing
3. **Archive any existing active sessions** — reuse endSession logic: list sessions for program, filter PUBLISHED, set each to ARCHIVED
4. **Create session** — auto-generate metadata:
   - `name`: `${program.name} - ${now.toLocaleDateString()}`
   - `academicYear`: `${now.getFullYear()}-${now.getFullYear() + 1}`
   - `startDate`: now
   - `endDate`: 6 months from now
   - `status`: `'PUBLISHED'` (skip DRAFT entirely)
   - `scenarioId`: `input.scenarioId`
   - `publishedAt`: now
5. **Create Placements** — copy the placement creation logic from `publishSession`:
   - Load preferences for program
   - Build preference map
   - For each student in each group, create a Placement with preference rank + snapshot
   - Batch save via `placementRepo.saveBatch()`
6. **Save session** via `sessionRepo.save()`
7. Return the published session

### Step 2: Update the domain factory

**Modify:** `src/lib/domain/session.ts`

The current `createSession()` factory always sets `status: 'DRAFT'`. We need a way to create a session that's born PUBLISHED.

**Option A (preferred):** Add a `createPublishedSession()` factory function:

```typescript
export interface CreatePublishedSessionParams {
  id: string;
  programId: string;
  name: string;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  scenarioId: string;
  publishedAt: Date;
  publishedByStaffId?: string;
  userId?: string;
}

export function createPublishedSession(params: CreatePublishedSessionParams): Session {
  const name = params.name.trim();
  if (!name) throw new Error('Session name must not be empty');
  if (params.endDate < params.startDate) {
    throw new Error('Session endDate must be after startDate');
  }
  return {
    id: params.id,
    programId: params.programId,
    name,
    academicYear: params.academicYear,
    startDate: params.startDate,
    endDate: params.endDate,
    status: 'PUBLISHED',
    scenarioId: params.scenarioId,
    publishedAt: params.publishedAt,
    createdAt: params.createdAt,
    publishedByStaffId: params.publishedByStaffId,
    userId: params.userId
  };
}
```

**Do NOT remove** the existing `createSession()` factory — it's still used by the old code and will be cleaned up in Phase 5.

### Step 3: Wire into appEnvUseCases

**Modify:** `src/lib/services/appEnvUseCases.ts`

Add a new exported function:

```typescript
import { showToClass as showToClassUseCase, type ShowToClassInput, type ShowToClassError } from '$lib/application/useCases/showToClass';

export async function showToClass(
  env: InMemoryEnvironment,
  input: ShowToClassInput
): Promise<Result<Session, ShowToClassError>> {
  return showToClassUseCase(
    {
      programRepo: env.programRepo,
      sessionRepo: env.sessionRepo,
      scenarioRepo: env.scenarioRepo,
      preferenceRepo: env.preferenceRepo,
      placementRepo: env.placementRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    input
  );
}
```

Also re-export the types:
```typescript
export type { ShowToClassInput, ShowToClassError } from '$lib/application/useCases/showToClass';
```

### Step 4: Add barrel export

**Modify:** `src/lib/application/useCases/index.ts`

Add:
```typescript
export * from './showToClass';
```

### Step 5: Update workspace to use `showToClass`

**Modify:** `src/routes/activities/[id]/workspace/+page.svelte`

Replace the `handlePublishAndPresent()` function. Currently it calls `endSession()` + `createSession()` + `publishSession()` in sequence. Replace with a single `showToClass()` call.

**Current code to replace** (lines ~1228-1277 `handlePublishAndPresent`):

```typescript
async function handlePublishAndPresent() {
  if (!env || !program || !scenario) return;
  showToClassPublishing = true;
  showToClassError = null;

  const result = await showToClass(env, {
    programId: program.id,
    scenarioId: scenario.id
  });

  if (isErr(result)) {
    showToClassError = result.error.message ?? `Failed: ${result.error.type}`;
    showToClassPublishing = false;
    return;
  }

  latestPublishedSession = result.value;
  sessions = [...sessions, result.value];
  showShowToClassPrompt = false;
  showToClassPublishing = false;

  // Navigate to live view (Phase 2 will change this to /live)
  // For now, keep navigating to /present
  goto(`/activities/${program.id}/present`);
}
```

Update the import at the top to include `showToClass` from `'$lib/services/appEnvUseCases'`.

**Also update `handleShowToClassClick()`** to skip the prompt and just call `handlePublishAndPresent()` directly:

```typescript
function handleShowToClassClick() {
  handlePublishAndPresent();
}
```

This eliminates `ShowToClassPrompt` — the button just works.

### Step 6: Write tests

**Create:** `src/lib/application/useCases/showToClass.spec.ts`

Test cases:
- Returns PROGRAM_NOT_FOUND when program doesn't exist
- Returns SCENARIO_NOT_FOUND when scenario doesn't exist
- Creates a PUBLISHED session (not DRAFT)
- Archives existing PUBLISHED sessions before creating new one
- Creates Placements for all students in all groups
- Placements have correct preference ranks
- Session has auto-generated name, dates, academicYear
- Session has scenarioId and publishedAt set

Use the in-memory repository pattern from existing test files.

Also update `src/lib/domain/session.spec.ts` to add tests for `createPublishedSession()`.

## Files Changed Summary

| File | Action |
|------|--------|
| `src/lib/application/useCases/showToClass.ts` | CREATE |
| `src/lib/application/useCases/showToClass.spec.ts` | CREATE |
| `src/lib/domain/session.ts` | MODIFY (add `createPublishedSession`) |
| `src/lib/domain/session.spec.ts` | MODIFY (add tests for `createPublishedSession`) |
| `src/lib/application/useCases/index.ts` | MODIFY (add export) |
| `src/lib/services/appEnvUseCases.ts` | MODIFY (add `showToClass` wrapper) |
| `src/routes/activities/[id]/workspace/+page.svelte` | MODIFY (use `showToClass`, simplify publish flow) |

## Do NOT Touch

- `createSession.ts` / `publishSession.ts` — still used by other code, removed in Phase 5
- `/present` or `/observe` routes — changed in Phase 2
- `/start` route — changed in Phase 3
- Activity detail page — changed in Phase 4
- Any repository or infrastructure code

## Verification

1. `pnpm test:unit` — all existing tests pass + new tests pass
2. Open workspace → click "Show to Class" → session is created (check IndexedDB) with status PUBLISHED
3. Placements are created with correct preference ranks
4. Any previously active session is archived
5. Navigation goes to `/present` (will change to `/live` in Phase 2)
