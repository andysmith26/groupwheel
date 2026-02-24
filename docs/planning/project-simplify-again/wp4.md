# WP4 Onboarding & First Value — Engineering Spec

**Date:** February 2026
**Status:** Ready for implementation
**Audience:** Engineering team (coding agent + human reviewer)
**Prerequisite:** None — WP4 is independent of WP1–WP3

---

## Strategic Context

GroupWheel's acquisition funnel has a critical gap: a teacher who hears about the tool at a conference or from a colleague arrives at the app with no student data ready. The current onboarding requires CSV preparation, column mapping, group definition, and a multi-step wizard before they see a single group on screen. That's 5–10 minutes of investment before any value is demonstrated — most visitors will leave before getting there.

WP4 attacks this from three angles, ordered by impact on the math teacher persona:

| Item  | What                        | Target user                        | Impact                                                 |
| ----- | --------------------------- | ---------------------------------- | ------------------------------------------------------ |
| WP4.2 | "Just a Number" Quick Start | Math teacher with a class count    | Removes the biggest onboarding barrier — roster import |
| WP4.3 | One-Per-Line Name Import    | Teacher with a name list (no CSV)  | Removes the second barrier — column mapping            |
| WP4.1 | Interactive Demo Mode       | First-time visitor, no data at all | Removes all barriers — zero data required              |

**Success metric:** New user reaches "groups on screen" within 60 seconds of landing on the app.

---

## Baseline Assumptions

The following are implemented, verified, and available as dependencies:

| Capability                                       | Location                                                 | Status |
| ------------------------------------------------ | -------------------------------------------------------- | ------ |
| `createGroupingActivity` use case                | `src/lib/application/useCases/createGroupingActivity.ts` | Done   |
| `quickGenerateGroups` use case                   | `src/lib/application/useCases/quickGenerateGroups.ts`    | Done   |
| `showToClass` use case                           | `src/lib/application/useCases/showToClass.ts`            | Done   |
| `StepStudentsUnified` wizard component           | `src/lib/components/wizard/StepStudentsUnified.svelte`   | Done   |
| Wizard route `/activities/new`                   | `src/routes/activities/new/+page.svelte`                 | Done   |
| Dashboard with empty state                       | `src/routes/activities/+page.svelte`                     | Done   |
| Activity detail with "Generate & Show" (WP1.1)   | `src/routes/activities/[id]/+page.svelte`                | Done   |
| Demo data generator                              | `src/lib/infrastructure/demo/demoData.ts`                | Done   |
| Demo seeder (programmatic)                       | `src/lib/infrastructure/demo/demoSeeder.ts`              | Done   |
| `shouldActivateDemoMode()`, `isDemoDataLoaded()` | `src/lib/infrastructure/demo/demoData.ts`                | Done   |
| Facade wiring in `appEnvUseCases.ts`             | `src/lib/services/appEnvUseCases.ts`                     | Done   |
| `generationSettings` (localStorage)              | `src/lib/utils/generationSettings.ts`                    | Done   |
| `ParsedStudent` type                             | `src/lib/application/useCases/createGroupingActivity.ts` | Done   |
| Column mapping / CSV paste logic                 | `src/lib/components/wizard/StepStudentsUnified.svelte`   | Done   |

### Current Onboarding Flow (what we're improving)

**First-time math teacher (has 28 students, wants groups of 4):**

```
Landing → Dashboard (empty) → "+ New Activity" → Wizard Step 1 (paste CSV) →
  Column mapping → Step 2 (define groups) → Step 3 (name + review) →
  "Create Groups" → Workspace → "Show to Class" → Live view
```

**8+ taps, 3+ minutes minimum, requires pre-prepared CSV data.**

### Target Flow

**Quick Start (WP4.2):**

```
Dashboard (empty) → "Quick Start: 28 students, groups of 4" →
  Activity detail → "Generate & Show" → Live view
```

**3 taps, < 30 seconds, no data preparation required.**

**Demo Mode (WP4.1):**

```
Dashboard (empty) → "Try It Now" → Live view with demo groups
  → Guided highlights → "Create Your Own"
```

**1 tap to value, < 15 seconds, zero data required.**

---

## WP4.2: "Just a Number" Quick Start

### Problem

The wizard's first step — "Add Your Students" — assumes the teacher has a prepared roster in CSV, spreadsheet, or Google Sheets format. Most teachers hearing about GroupWheel for the first time don't have that ready. They know they have 28 students and want groups of 4. That's all the information needed for the math teacher persona's core use case, but the current wizard won't accept it.

This creates a chicken-and-egg problem: the teacher can't experience the value proposition without preparing data, but they won't prepare data without first experiencing the value proposition.

### Solution

Add a "Quick Start" path that accepts only two numbers — student count and group size — and immediately creates an activity with placeholder students, generates groups, and lands on the activity detail page. The teacher can replace placeholder names with real names later via the Setup page.

The Quick Start bypasses the full wizard entirely. It creates a real activity (not demo data), so all subsequent features (Generate & Show, observations, pairing history) work normally.

### Implementation

#### 1. New use case: `quickStartActivity`

**File:** `src/lib/application/useCases/quickStartActivity.ts` (CREATE)

This use case encapsulates the "give me a number, get an activity" workflow. It orchestrates several existing operations: creating placeholder students, creating a pool, creating a program with auto-generated groups, and optionally generating an initial scenario.

```typescript
import type { Result } from '$lib/types/result';
import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';

export interface QuickStartActivityInput {
  studentCount: number; // 2–200
  groupSize: number; // 2–20
  activityName?: string; // Optional — default: "My Activity"
  staffId: string;
}

export interface QuickStartActivityResult {
  programId: string;
  poolId: string;
  studentCount: number;
  groupCount: number;
}

export type QuickStartActivityError =
  | { type: 'INVALID_STUDENT_COUNT'; message: string }
  | { type: 'INVALID_GROUP_SIZE'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

export interface QuickStartActivityDeps {
  idGenerator: IdGenerator;
  studentRepository: StudentRepository;
  poolRepository: PoolRepository;
  programRepository: ProgramRepository;
}

export async function quickStartActivity(
  deps: QuickStartActivityDeps,
  input: QuickStartActivityInput
): Promise<Result<QuickStartActivityResult, QuickStartActivityError>> {
  // Validate inputs
  if (input.studentCount < 2 || input.studentCount > 200) {
    return {
      ok: false,
      error: { type: 'INVALID_STUDENT_COUNT', message: 'Student count must be between 2 and 200' }
    };
  }
  if (input.groupSize < 2 || input.groupSize > 20) {
    return {
      ok: false,
      error: { type: 'INVALID_GROUP_SIZE', message: 'Group size must be between 2 and 20' }
    };
  }
  if (input.groupSize > input.studentCount) {
    return {
      ok: false,
      error: { type: 'INVALID_GROUP_SIZE', message: 'Group size cannot exceed student count' }
    };
  }

  // 1. Generate placeholder students: "Student 1", "Student 2", ...
  const students = Array.from({ length: input.studentCount }, (_, i) => ({
    id: deps.idGenerator.generate(),
    name: `Student ${i + 1}`,
    poolId: '' // set below
  }));

  // 2. Create pool
  const poolId = deps.idGenerator.generate();
  // ... (set poolId on students, persist pool + students)

  // 3. Compute group count and create program with groups
  const groupCount = Math.ceil(input.studentCount / input.groupSize);
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    id: deps.idGenerator.generate(),
    name: `Group ${i + 1}`,
    capacity: null // unconstrained for math teacher persona
  }));

  const programId = deps.idGenerator.generate();
  // ... (create program with groups, pool reference, persist)

  // 4. Return result — do NOT generate a scenario here.
  //    The teacher will use "Generate & Show" (WP1.1) from activity detail.
  return {
    ok: true,
    value: { programId, poolId, studentCount: input.studentCount, groupCount }
  };
}
```

**Key design decisions:**

- **Do NOT generate a scenario** inside this use case. The activity detail page's "Generate & Show" (WP1.1) already does this optimally. Generating here would mean the teacher lands on the activity detail and then generates _again_, duplicating work. Instead, the Quick Start creates the activity structure, and the teacher's first tap of "Generate & Show" produces their first groups.
- **Do NOT call `showToClass`** — same reasoning. Let the existing WP1.1 flow handle that.
- **Use the `idGenerator` port** — not `crypto.randomUUID()` directly. This keeps the use case testable with deterministic IDs.
- **Placeholder naming scheme is "Student N"** — not "Placeholder N" or "Anonymous N". "Student" is the most natural token for a teacher, and the numbered suffix makes each unique. When the teacher later imports real names, they'll replace these.

#### 2. Input validation boundaries

| Field                      | Min | Max | Rationale                                                                  |
| -------------------------- | --- | --- | -------------------------------------------------------------------------- |
| `studentCount`             | 2   | 200 | 2 is minimum for grouping. 200 covers the largest reasonable class/cohort. |
| `groupSize`                | 2   | 20  | 2 is a pair. 20 covers large club-style groups.                            |
| `groupSize ≤ studentCount` | —   | —   | Can't make groups larger than the roster.                                  |

#### 3. Wire through facade

**File:** `src/lib/services/appEnvUseCases.ts` (MODIFY)

Add `quickStartActivity` to the facade, following the existing pattern:

```typescript
export async function quickStartActivity(
  env: AppEnvironment,
  input: Omit<QuickStartActivityInput, 'staffId'>
): Promise<Result<QuickStartActivityResult, QuickStartActivityError>> {
  return quickStartActivityUseCase(
    {
      idGenerator: env.idGenerator,
      studentRepository: env.studentRepository,
      poolRepository: env.poolRepository,
      programRepository: env.programRepository
    },
    { ...input, staffId: env.currentStaffId }
  );
}
```

#### 4. Quick Start UI on Dashboard Empty State

**File:** `src/routes/activities/+page.svelte` (MODIFY)

Add a Quick Start card to the existing empty state, positioned above or alongside the existing "+ New Activity" button:

```
┌─────────────────────────────────────────────────────────────────┐
│  Your Activities                                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │   Quick Start                                             │  │
│  │                                                           │  │
│  │   How many students?   [ 28  ]                            │  │
│  │   Students per group?  [  4  ]                            │  │
│  │                                                           │  │
│  │   → 7 groups of 4                                         │  │
│  │                                                           │  │
│  │   [ Create & Start Grouping ]    (primary, teal button)   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Want more control?  [ + New Activity ]  (full wizard)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**UI behavior:**

- Two number inputs with stepper buttons (mobile-friendly).
- Dynamic preview line: "→ 7 groups of 4" updates as the teacher types. Include remainder handling: "→ 7 groups (5 groups of 4, 2 groups of 3)" when student count isn't evenly divisible.
- "Create & Start Grouping" button calls `quickStartActivity` via facade, then navigates to `/activities/[programId]`.
- Validation errors shown inline below inputs (e.g., "Needs at least 2 students").
- Both inputs default to empty (no pre-filled values) — teacher must enter their own numbers.
- After activity creation, the teacher lands on the activity detail page where "Generate & Show" is the primary action (WP1.1).

**Quick Start should also appear as an option inside the wizard** for users who navigate there directly:

#### 5. Quick Start option in wizard

**File:** `src/routes/activities/new/+page.svelte` (MODIFY)

Add a "Quick Start" card at the top of Step 1, before the paste/roster/sheets sections:

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1 of 3: Add Your Students                                 │
│                                                                 │
│  ┌ Quick Start ─────────────────────────────────────────────┐   │
│  │ Just need numbers? Enter a count and skip straight to    │   │
│  │ grouping. You can add real names later.                  │   │
│  │                                                          │   │
│  │ Students: [ 28 ]   Per group: [ 4 ]   [ Go → ]          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── or add your roster ──                                       │
│                                                                 │
│  ▸ Paste from spreadsheet                                       │
│  ▸ Use existing roster                                          │
│  ▸ Import from Google Sheets                                    │
└─────────────────────────────────────────────────────────────────┘
```

The "Go →" button calls `quickStartActivity`, navigates to the activity detail page, and skips the rest of the wizard entirely. This is intentionally different from the normal wizard flow — the Quick Start is an escape hatch from the wizard, not a step within it.

#### 6. "Replace Placeholder Names" prompt on activity detail

**File:** `src/routes/activities/[id]/+page.svelte` (MODIFY)

When an activity has placeholder students (detected by checking if all student names match the pattern `/^Student \d+$/`), show a persistent but dismissible info banner:

```
┌─────────────────────────────────────────────────────────────┐
│  ℹ Using placeholder names. Paste your roster anytime       │
│    from Setup to add real student names.   [Setup →] [✕]    │
└─────────────────────────────────────────────────────────────┘
```

- "Setup →" navigates to `/activities/[id]/setup` (students section).
- "✕" dismisses the banner. Dismissal persists in `localStorage` keyed by activity ID.
- Banner does NOT block the "Generate & Show" flow — teacher can generate groups with placeholder names immediately.

#### 7. Replacing placeholder students with real names

This is the upgrade path: the teacher uses Quick Start to experience the tool, then later pastes real names to replace placeholders. This happens on the Setup page, which already supports roster editing.

**No new implementation needed for v1.** The existing Setup page's "Students" section allows adding/editing students. The teacher can re-import a roster which replaces the existing pool students. The important thing is that group assignments from prior sessions (pairing history) survive, because those are linked by student ID. When the teacher re-imports, new student IDs are generated and old assignments are orphaned — this is acceptable for v1 because the teacher is replacing placeholder data anyway.

**Out of scope for this work item:** A "smart replace" that maps "Student 1" → "Alice Chen" while preserving pairing history. This is a future enhancement if teachers report needing it.

### Acceptance Criteria

1. From dashboard empty state, teacher enters student count and group size → activity created with placeholder students → lands on activity detail page. **< 10 seconds, 3 interactions (two number inputs + one button).**
2. Quick Start is also available as an option on wizard Step 1.
3. Dynamic preview shows computed group count and handles remainders.
4. Validation prevents invalid inputs (too few students, group size > student count, etc.) with inline error messages.
5. Activity detail page shows a dismissible banner prompting roster import when placeholder students are detected.
6. "Generate & Show" (WP1.1) works normally with placeholder students — groups display "Student 1", "Student 2", etc. on the live view.
7. Placeholder activity is a real activity — all features (observations, pairing history, avoid-recent-groupmates) work.

### Files Changed

| File                                                 | Action | Scope                                                                       |
| ---------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `src/lib/application/useCases/quickStartActivity.ts` | CREATE | New use case: validate inputs, create placeholder students + pool + program |
| `src/lib/services/appEnvUseCases.ts`                 | MODIFY | Wire `quickStartActivity` through facade                                    |
| `src/routes/activities/+page.svelte`                 | MODIFY | Add Quick Start card to empty state                                         |
| `src/routes/activities/new/+page.svelte`             | MODIFY | Add Quick Start option at top of Step 1                                     |
| `src/routes/activities/[id]/+page.svelte`            | MODIFY | Add placeholder-names info banner                                           |

### Do NOT Touch

- `createGroupingActivity.ts` (wizard's use case — separate flow, not replaced)
- `quickGenerateGroups.ts` (called later from activity detail, not from Quick Start)
- `showToClass.ts`
- `StepStudentsUnified.svelte` (paste/import logic unchanged)
- Any domain entities
- Any repository implementations

### Tests

**Unit tests (Vitest) — `src/lib/application/useCases/quickStartActivity.spec.ts`:**

```
test: "creates activity with correct number of placeholder students"
  Input: studentCount=28, groupSize=4.
  Assert: 28 students created with names "Student 1" through "Student 28".
  Assert: program has 7 groups named "Group 1" through "Group 7".

test: "handles uneven division (remainder students)"
  Input: studentCount=30, groupSize=4.
  Assert: program has 8 groups (ceiling of 30/4).
  Group capacities are null (unconstrained).

test: "rejects studentCount < 2"
  Input: studentCount=1.
  Assert: returns INVALID_STUDENT_COUNT error.

test: "rejects groupSize > studentCount"
  Input: studentCount=5, groupSize=10.
  Assert: returns INVALID_GROUP_SIZE error.

test: "rejects groupSize < 2"
  Input: groupSize=1.
  Assert: returns INVALID_GROUP_SIZE error.

test: "uses default activity name when none provided"
  Input: no activityName.
  Assert: program name is "My Activity".

test: "uses provided activity name"
  Input: activityName="Period 3 Math".
  Assert: program name is "Period 3 Math".

test: "uses IdGenerator for all IDs (no crypto.randomUUID)"
  Use a counting IdGenerator.
  Assert all generated IDs came from the port.
```

**E2E (Playwright) — `e2e/quick-start.spec.ts`:**

```
test: "Quick Start from empty dashboard creates activity"
  1. Navigate to /activities (empty state)
  2. Enter 28 in student count input
  3. Enter 4 in group size input
  4. Assert preview shows "7 groups"
  5. Click "Create & Start Grouping"
  6. Assert URL matches /activities/[id]
  7. Assert activity detail page shows "28 students"

test: "Quick Start from wizard creates activity and skips wizard"
  1. Navigate to /activities/new
  2. Enter 20 in Quick Start student count
  3. Enter 5 in Quick Start group size
  4. Click "Go"
  5. Assert URL matches /activities/[id] (not wizard Step 2)

test: "Generate & Show works with placeholder students"
  1. Quick Start with 16 students, groups of 4
  2. From activity detail, click "Generate & Show"
  3. Assert URL matches /activities/[id]/live
  4. Assert "Student 1" visible on live page

test: "Placeholder banner appears and is dismissible"
  1. Quick Start with 10 students, groups of 5
  2. Assert banner with "placeholder names" text is visible
  3. Click dismiss (✕)
  4. Navigate away and back
  5. Assert banner is no longer visible

test: "Validation prevents invalid inputs"
  1. Navigate to /activities (empty state)
  2. Enter 1 in student count
  3. Assert error message visible
  4. Enter 28 in student count, 30 in group size
  5. Assert error message about group size
```

---

## WP4.3: One-Per-Line Name Import

### Problem

The existing paste import in `StepStudentsUnified.svelte` is optimized for structured data: CSV with headers, tab-separated columns, multiple fields per student. When the teacher pastes structured data, the column mapping UI appears so they can assign columns to Name, ID, Grade, etc.

But many teachers don't have structured data. They have a plain list of names copied from a class roster email, a Word document, or an attendance sheet:

```
Alice Chen
Bob Park
Carol Davis
Dan Lee
...
```

When this is pasted today, the parser detects a single column with no delimiters and shows the column mapping UI anyway — requiring the teacher to confirm that the single column is "Name". This is unnecessary friction for the most common simple case.

### Solution

Detect when pasted text contains no delimiters (no commas, no tabs) and treat each line as a student name. Skip column mapping entirely. Show an immediate preview with count.

### Implementation

#### 1. Enhance paste detection in `StepStudentsUnified`

**File:** `src/lib/components/wizard/StepStudentsUnified.svelte` (MODIFY)

The existing paste handler parses text into rows and columns. Add an early-exit path that detects "simple name list" format and bypasses column mapping:

```typescript
function handlePaste(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // NEW: Detect simple name list (no commas, no tabs in any line)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const hasDelimiters = lines.some((line) => line.includes(',') || line.includes('\t'));

  if (!hasDelimiters && lines.length >= 2) {
    // Simple name list — skip column mapping
    const students: ParsedStudent[] = lines.map((name) => ({
      name: name
      // No id, firstName, lastName, grade — just the full name
    }));

    onStudentsParsed(students);
    simpleListDetected = true; // NEW state: controls whether to show mapping UI
    return;
  }

  // Existing CSV/TSV parsing path continues below...
}
```

**Detection heuristic:**

A paste is treated as a "simple name list" when:

1. No line contains a comma or tab character.
2. At least 2 non-empty lines exist (a single line could be anything).
3. No line exceeds 100 characters (names shouldn't be that long — a long line suggests it's a paragraph, not a name).

If any of these conditions fail, fall through to the existing CSV parsing path.

#### 2. Simplified preview for name lists

When `simpleListDetected` is true, show a simplified preview instead of the column mapping table:

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ 28 students detected                                    │
│                                                             │
│  Alice Chen                                                 │
│  Bob Park                                                   │
│  Carol Davis                                                │
│  Dan Lee                                                    │
│  ... and 24 more                                            │
│                                                             │
│  Not what you expected? [Switch to column mapping →]        │
└─────────────────────────────────────────────────────────────┘
```

- Shows the first 4 names and a count of remaining.
- "Switch to column mapping" link re-parses the paste through the CSV path, showing the full mapping UI. This escape hatch handles edge cases where the heuristic misfires.
- The "Continue" button is immediately enabled — no mapping step required.

#### 3. Blank line handling

Teachers may paste with inconsistent spacing:

```
Alice Chen

Bob Park

Carol Davis
```

The filter `filter(l => l.length > 0)` already handles this. Blank lines between names are silently stripped.

#### 4. Name-with-spaces handling

Each non-empty line becomes a full name. "Mary Jane Watson" is one student, not three. This is the correct default for name lists — each line is one person.

### Acceptance Criteria

1. Pasting a plain list of names (one per line, no commas/tabs) skips column mapping and shows a simplified preview with student count.
2. Works with or without blank lines between names.
3. Names with spaces handled correctly ("Mary Jane Watson" = one student).
4. "Switch to column mapping" escape hatch works for edge cases.
5. Pasting CSV/TSV data (with commas or tabs) still triggers the existing column mapping flow — no regression.
6. Minimum 2 lines required to trigger simple-list detection (single line falls through to existing parser).

### Files Changed

| File                                                   | Action | Scope                                                                                                   |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| `src/lib/components/wizard/StepStudentsUnified.svelte` | MODIFY | Add simple-list detection in paste handler, add simplified preview mode, add `simpleListDetected` state |

### Do NOT Touch

- CSV parsing logic (existing path preserved as-is)
- Column mapping UI (still available via escape hatch and for CSV/TSV data)
- `createGroupingActivity.ts`
- Any domain, port, or infrastructure code

### Tests

**Unit tests (Vitest):**

If the paste detection logic is extracted to a utility function (recommended), add to a new test file:

`src/lib/utils/pasteDetection.spec.ts`:

```
test: "detects simple name list (no delimiters)"
  Input: "Alice Chen\nBob Park\nCarol Davis"
  Assert: isSimpleNameList === true, names === ["Alice Chen", "Bob Park", "Carol Davis"]

test: "rejects text with commas as not a simple list"
  Input: "Chen, Alice\nPark, Bob"
  Assert: isSimpleNameList === false

test: "rejects text with tabs as not a simple list"
  Input: "Alice Chen\t12\nBob Park\t11"
  Assert: isSimpleNameList === false

test: "handles blank lines between names"
  Input: "Alice Chen\n\nBob Park\n\nCarol Davis"
  Assert: names === ["Alice Chen", "Bob Park", "Carol Davis"]

test: "requires minimum 2 non-empty lines"
  Input: "Alice Chen"
  Assert: isSimpleNameList === false

test: "rejects lines over 100 characters"
  Input: "Alice Chen\n" + "x".repeat(101) + "\nBob Park"
  Assert: isSimpleNameList === false

test: "trims whitespace from names"
  Input: "  Alice Chen  \n  Bob Park  "
  Assert: names === ["Alice Chen", "Bob Park"]

test: "handles Windows-style line endings"
  Input: "Alice Chen\r\nBob Park\r\nCarol Davis"
  Assert: names === ["Alice Chen", "Bob Park", "Carol Davis"]
```

**E2E (Playwright) — `e2e/name-import.spec.ts`:**

```
test: "simple name list skips column mapping"
  1. Navigate to /activities/new
  2. Paste "Alice Chen\nBob Park\nCarol Davis\nDan Lee" into text area
  3. Assert "4 students detected" text is visible
  4. Assert column mapping UI is NOT visible
  5. Click "Continue"
  6. Assert wizard advances to Step 2

test: "CSV paste still shows column mapping"
  1. Navigate to /activities/new
  2. Paste "Name,Grade\nAlice Chen,10\nBob Park,11"
  3. Assert column mapping UI IS visible

test: "escape hatch switches to column mapping"
  1. Paste simple name list
  2. Click "Switch to column mapping"
  3. Assert column mapping UI appears
```

---

## WP4.1: Interactive Demo Mode

### Problem

Some visitors arrive with zero context and zero data. They want to understand what GroupWheel does before investing any effort. The Quick Start (WP4.2) requires two numbers; the wizard requires a roster. For the truly zero-commitment visitor, neither is low enough friction.

The demo data infrastructure exists — `demoData.ts` generates a complete dataset with students, programs, scenarios, sessions, and placements. But it's currently only accessible via a `?demo=true` URL parameter intended for developer use. There's no user-facing trigger.

### Solution

Add a "Try GroupWheel" button to the dashboard empty state that seeds a single demo activity, generates groups, and drops the user directly into the live view with a brief guided overlay highlighting key features. The demo activity is clearly marked and easily deletable.

### Implementation

#### 1. New use case: `createDemoActivity`

**File:** `src/lib/application/useCases/createDemoActivity.ts` (CREATE)

This is distinct from the full demo seeder (which creates 8 programs with complex data). For onboarding, we need **one activity** with a manageable class size that demonstrates the core value quickly.

```typescript
export interface CreateDemoActivityInput {
  staffId: string;
}

export interface CreateDemoActivityResult {
  programId: string;
  scenarioId: string;
  sessionId: string;
}

export type CreateDemoActivityError = { type: 'PERSISTENCE_ERROR'; message: string };
```

**What the use case creates:**

- **1 pool** with 24 students (realistic class size), using plausible fake names.
- **1 program** named "Demo: Ms. Johnson's Math Class" with 6 groups of 4.
- **1 scenario** with pre-generated balanced groups.
- **1 session** (published) so the live view works immediately.
- **Placements** linking students to groups.

The demo activity is identified by a `isDemo: true` flag on the program metadata (or a naming convention — see design decision below).

**Design decision — demo identification:**

Option A: Add `isDemo: boolean` to the Program domain entity.
Option B: Use a naming convention prefix: "Demo: " in the program name.

**Recommendation: Option B (naming convention).** Adding a boolean to the domain entity for a UI concern violates layer separation — "is this a demo?" is a presentation-layer concept. The "Demo: " prefix is visible to the user (which is a feature — it communicates that this is sample data), easily detectable in the UI layer, and requires zero domain changes.

If the prefix approach proves insufficient (e.g., teacher renames the activity), revisit with a lightweight metadata tag stored in localStorage keyed by program ID.

#### 2. Simplified demo data

**File:** `src/lib/infrastructure/demo/demoOnboarding.ts` (CREATE)

A lightweight demo data generator that creates just enough for one activity. This is NOT the full `demoData.ts` generator (which creates 8 programs, 3 class pools, and complex preference data). The onboarding demo is intentionally minimal:

```typescript
export function generateOnboardingDemoData(staffId: string): {
  students: Student[];
  pool: Pool;
  program: Program;
  scenario: Scenario;
  session: Session;
  placements: Placement[];
} {
  // 24 students with diverse, realistic fake names
  const studentNames = [
    'Aisha Patel',
    'Ben Rodriguez',
    'Carmen Li',
    'David Kim',
    'Elena Okafor',
    'Felix Johansson',
    'Grace Tanaka',
    'Hassan Ali',
    'Iris Nguyen',
    "James O'Brien",
    'Keiko Yamamoto',
    'Liam Chen',
    'Maya Gupta',
    'Noah Larsen',
    'Olivia Santos',
    'Pablo Martinez',
    'Quinn Davis',
    'Rosa Kowalski',
    'Sam Thompson',
    'Tara Bhat',
    'Uma Washington',
    'Victor Petrov',
    'Wendy Huang',
    'Xavier Dubois'
  ];

  // 6 groups of 4 — pre-assigned, not algorithmically generated
  // (No need to run the algorithm — this is display data)
  // ...
}
```

Using a hardcoded list (not the algorithmic generator) ensures the demo is deterministic and instant — no async algorithm execution, no randomness.

#### 3. Wire through facade

**File:** `src/lib/services/appEnvUseCases.ts` (MODIFY)

```typescript
export async function createDemoActivity(
  env: AppEnvironment
): Promise<Result<CreateDemoActivityResult, CreateDemoActivityError>> {
  return createDemoActivityUseCase(
    {
      /* deps */
    },
    { staffId: env.currentStaffId }
  );
}
```

#### 4. "Try GroupWheel" button on Dashboard empty state

**File:** `src/routes/activities/+page.svelte` (MODIFY)

Add below the Quick Start card (WP4.2) in the empty state:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Quick Start card from WP4.2]                              │
│                                                             │
│  ── or ──                                                   │
│                                                             │
│  [ ▶ Try GroupWheel ]  See it in action with sample data    │
│                                                             │
│  [ + New Activity ]    Full setup with your roster          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flow when "Try GroupWheel" is tapped:**

1. Call `createDemoActivity()` via facade.
2. Navigate to `/activities/[demoActivityId]/live`.
3. On the live page, if `isFirstDemoVisit` (checked via localStorage), show a guided overlay.

#### 5. Guided overlay on live view

**File:** `src/lib/components/onboarding/DemoGuidedOverlay.svelte` (CREATE)

A lightweight 3–4 step overlay that highlights key features. NOT a heavy tour library — just a sequence of positioned tooltip cards with a "Next" button.

**Steps:**

1. **"These are your groups"** — highlights the group cards. "GroupWheel splits students into balanced groups. Each group card shows the assigned students."
2. **"Drag to rearrange"** — highlights a student card. "Don't like the arrangement? Drag students between groups."
3. **"Show to your class"** — highlights the teacher view tab. "Switch to Teacher View to record observations while students work."
4. **"Ready to try with your own students?"** — CTA: "Create Your Activity" → navigates to dashboard. "Delete Demo" → deletes demo activity and returns to empty dashboard.

**Implementation approach:** Use absolute-positioned card with a semi-transparent backdrop that highlights the target element (cut-out effect). Each step stores the target element selector and tooltip position.

State management:

- `currentStep: number` tracks overlay progress.
- `localStorage` key `demo-overlay-completed-[programId]` prevents re-showing on subsequent visits.
- ESC or clicking outside dismisses the overlay (teacher can explore freely).

#### 6. Demo activity badge and cleanup

**File:** `src/routes/activities/+page.svelte` (MODIFY — dashboard card)
**File:** `src/routes/activities/[id]/+page.svelte` (MODIFY — activity detail)

On the dashboard card and activity detail page, demo activities show a "Demo" badge:

```
┌─────────────────────┐
│  Demo  Ms. Johnson's │
│  Math Class          │
│  24 students         │
│  [Delete Demo]       │
└─────────────────────┘
```

The "Delete Demo" action removes all demo data (pool, students, program, scenario, session, placements) and returns to the empty dashboard. This uses a standard cascade delete — no special infrastructure needed, just delete the program and its dependencies.

**Demo detection in UI:** Check if `program.name.startsWith('Demo: ')`.

### Acceptance Criteria

1. From dashboard empty state, tapping "Try GroupWheel" creates a demo activity and navigates to the live view with groups visible. **< 15 seconds, 1 tap.**
2. Guided overlay appears on first demo visit, covering 3–4 features.
3. Guided overlay is dismissible (ESC, click outside, "Skip") and doesn't re-appear once completed or dismissed.
4. Demo activity is clearly labeled with "Demo" badge on dashboard and activity detail.
5. "Delete Demo" removes all demo data cleanly.
6. Demo activity supports all features: Generate & Show, observations, pairing history.
7. Completing the guided overlay presents a "Create Your Activity" CTA.

### Files Changed

| File                                                     | Action | Scope                                                                |
| -------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `src/lib/application/useCases/createDemoActivity.ts`     | CREATE | New use case: create minimal demo activity with pre-generated groups |
| `src/lib/infrastructure/demo/demoOnboarding.ts`          | CREATE | Lightweight demo data generator (24 students, 6 groups)              |
| `src/lib/services/appEnvUseCases.ts`                     | MODIFY | Wire `createDemoActivity` through facade                             |
| `src/routes/activities/+page.svelte`                     | MODIFY | Add "Try GroupWheel" button to empty state                           |
| `src/lib/components/onboarding/DemoGuidedOverlay.svelte` | CREATE | 3–4 step guided overlay component                                    |
| `src/routes/activities/[id]/live/+page.svelte`           | MODIFY | Render `DemoGuidedOverlay` on first demo visit                       |
| `src/routes/activities/[id]/+page.svelte`                | MODIFY | Add "Demo" badge, "Delete Demo" action                               |

### Do NOT Touch

- `demoData.ts` (full developer demo — separate concern)
- `demoSeeder.ts` (developer tooling — separate concern)
- `quickGenerateGroups.ts`
- `showToClass.ts`
- `StepStudentsUnified.svelte`
- Any domain entities, ports, or repository implementations

### Tests

**Unit tests (Vitest) — `src/lib/application/useCases/createDemoActivity.spec.ts`:**

```
test: "creates demo activity with 24 students and 6 groups"
  Assert: 24 students created with real-sounding names.
  Assert: program created with name starting with "Demo: ".
  Assert: 6 groups in the scenario, each with 4 students.
  Assert: 1 session created and published.

test: "placements link all students to groups"
  Assert: 24 placements total, one per student.
  Assert: every student assigned to exactly one group.

test: "returns programId, scenarioId, sessionId"
  Assert all three IDs present in result.
```

**E2E (Playwright) — `e2e/demo-mode.spec.ts`:**

```
test: "Try GroupWheel creates demo and shows live view"
  1. Navigate to /activities (empty state)
  2. Click "Try GroupWheel"
  3. Assert URL matches /activities/[id]/live
  4. Assert student names visible on live page

test: "Guided overlay appears on first demo visit"
  1. Create demo activity
  2. Assert overlay step 1 text is visible
  3. Click "Next" 3 times
  4. Assert "Create Your Activity" CTA visible

test: "Demo badge visible on dashboard"
  1. Create demo activity
  2. Navigate to /activities
  3. Assert "Demo" badge visible on activity card

test: "Delete Demo removes activity"
  1. Create demo activity
  2. Navigate to activity detail
  3. Click "Delete Demo"
  4. Assert navigated to /activities
  5. Assert empty state visible (no activity cards)

test: "Guided overlay does not reappear after dismissal"
  1. Create demo activity, dismiss overlay
  2. Navigate away from live view
  3. Navigate back to /activities/[id]/live
  4. Assert overlay is NOT visible
```

---

## Implementation Order

These three items have a dependency structure:

```
WP4.2 (Quick Start)  ─────────────┐
                                   ├──→  WP4.1 (Demo Mode — uses same empty-state UI)
WP4.3 (Name Import — independent) ┘
```

**Recommended sequence:**

1. **WP4.2** (Quick Start) — Highest impact for the math teacher persona. Adds new use case + facade wiring + dashboard UI. Ship first because it's the most common onboarding path.
2. **WP4.3** (One-Per-Line Import) — Independent of WP4.2, pure UI enhancement in an existing component. Can be developed in parallel. Ship early because it's low effort and removes real friction.
3. **WP4.1** (Demo Mode) — Depends on the dashboard empty state layout established by WP4.2. Adds a second use case + guided overlay component. Ship last because it's the most complex and targets a smaller (but important) audience: the zero-commitment visitor.

Each step is independently shippable and testable.

---

## Architecture Notes

### Layer boundaries

All three items respect hexagonal architecture:

- **WP4.2** adds one new use case (`quickStartActivity`) in the application layer that depends on existing ports (`IdGenerator`, `StudentRepository`, `PoolRepository`, `ProgramRepository`). No new ports needed. No domain changes. UI changes are confined to the dashboard page and wizard.
- **WP4.3** is pure UI. Modifies one component's paste handler. No application, domain, or infrastructure changes. The detection heuristic is presentation logic — it decides how to render the import UI, not how to process data.
- **WP4.1** adds one new use case (`createDemoActivity`) and one new infrastructure module (`demoOnboarding.ts`). The use case depends on existing ports. The infrastructure module generates static data (no algorithm execution). UI changes span the dashboard, live page, and activity detail page.

### Use case justification

**Why `quickStartActivity` is a use case (not UI orchestration):**

Unlike WP1.1's "Generate & Show" (which chains two existing use cases at the UI layer), Quick Start creates three new domain entities (students, pool, program) in a single atomic operation. This is business logic — the rules about how placeholder students are structured, how groups are computed from student count and group size, and input validation are all domain concerns. Putting this in a UI component would create a "fat component" anti-pattern.

**Why `createDemoActivity` is a use case (not just calling the existing seeder):**

The existing `seedDemoData` in `demoSeeder.ts` creates 8 programs with complex interrelationships. It's developer tooling, not a user-facing feature. The onboarding demo needs exactly 1 activity with 24 students — a fundamentally different scope. Creating a new use case keeps concerns separate and avoids coupling user-facing behavior to developer tooling that may change independently.

### Settings storage

- Quick Start does not introduce any new settings. The created activity uses default `generationSettings` when the teacher later taps "Generate & Show".
- Demo overlay dismissal uses `localStorage` — same pattern as `generationSettings`. This is ephemeral UI state, not domain data.
- Placeholder-banner dismissal uses `localStorage` keyed by activity ID.

---

## Verification Checklist (post-implementation)

### WP4.2 — "Can I get groups without preparing any data?"

1. Open app with no activities (fresh browser or cleared data).
2. Assert Quick Start card visible with two number inputs.
3. Enter 28 students, groups of 4.
4. Assert preview shows "7 groups of 4".
5. Tap "Create & Start Grouping".
6. Assert activity detail page loads with "28 students".
7. Tap "Generate & Show".
8. Assert live view shows 7 groups with "Student 1" through "Student 28" distributed.

**Target: first groups on screen in < 30 seconds from cold start.**

### WP4.3 — "Can I paste a name list without fighting column mapping?"

1. Navigate to wizard (/activities/new).
2. Paste a simple list: "Alice\nBob\nCarol\nDan".
3. Assert "4 students detected" — no column mapping UI.
4. Click "Continue".
5. Assert wizard advances to Step 2 with 4 students.

**Target: name import in < 10 seconds, zero column mapping interactions.**

### WP4.1 — "Can I see the value without any commitment?"

1. Open app with no activities (fresh browser).
2. Tap "Try GroupWheel".
3. Assert live view loads with 24 students in 6 groups.
4. Assert guided overlay Step 1 visible.
5. Complete overlay (3–4 "Next" taps).
6. Assert "Create Your Activity" CTA visible.
7. Navigate to dashboard. Assert "Demo" badge on activity card.
8. Delete demo. Assert empty state restored.

**Target: value demonstrated in < 15 seconds, 1 tap.**
