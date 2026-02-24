# GroupWheel UX Improvements — Coding Agent Context

**Date:** February 2026
**Purpose:** Engineering context for implementing UX improvement work packages. Read this entire document before starting any work package. It covers the product, architecture rules, personas, and how all work packages relate to each other.

---

## 1. Product Summary

**GroupWheel** is a privacy-first K-12 web app that helps teachers create student groups. Core mechanics:

- Teachers import a class roster (students)
- Teachers define a **program** (an activity, e.g. "Period 3 Math" or "Spring Club Fair")
- Students optionally submit ranked preferences (e.g. ranked club choices)
- GroupWheel generates **scenarios** (group assignments) using a balanced algorithm
- Teachers refine groups via drag-and-drop in a **workspace**
- Teachers **show groups to class** via a **live view** (projected or student-scanned)
- Teachers record **observations** on groups in real time
- Past sessions are stored for **history and rotation tracking**

**Two primary personas:**

| Persona                                     | Frequency      | Core need                                                                          |
| ------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| Math teacher (Building Thinking Classrooms) | Daily, 180+/yr | Speed: app open → groups projected in < 10 seconds, < 3 taps                       |
| Club administrator                          | 1–3×/semester  | Decision quality: maximize student preference satisfaction, easy manual refinement |

**Tech stack:** SvelteKit 2, Svelte 5 (runes syntax), TypeScript, Tailwind CSS 4, IndexedDB for persistence. No server-side storage — all data is browser-local.

---

## 2. Architecture Rules (Non-Negotiable)

GroupWheel uses **hexagonal architecture** (ports & adapters). Violating layer boundaries will be rejected in review.

### Layer hierarchy (inner → outer; inner layers cannot import from outer)

```
domain/ → application/ → infrastructure/ → UI (routes/, components/)
```

### Layer responsibilities

| Layer          | Location                             | Contains                                              | Must NOT contain                                            |
| -------------- | ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------- |
| Domain         | `src/lib/domain/`                    | Pure types, factories, validators                     | Framework imports, browser APIs, Svelte                     |
| Application    | `src/lib/application/`               | Ports (interfaces) + Use Cases (orchestration)        | Thrown business errors (use Result), infrastructure, Svelte |
| Infrastructure | `src/lib/infrastructure/`            | Implements ports (IndexedDB, algorithms, Google APIs) | UI components, direct route imports                         |
| UI             | `src/routes/`, `src/lib/components/` | Presentation, event handlers, navigation              | Business logic, direct repository calls                     |

### Key conventions

- **Use cases** live in `src/lib/application/useCases/`. They accept a `deps` object of ports plus an input object, and return `Result<Success, Error>` — never throw business errors.
- **Facade** (`src/lib/services/appEnvUseCases.ts`) wires use cases to infrastructure. UI calls the facade, never use cases or repositories directly.
- **IdGenerator port** — use the port, never call `crypto.randomUUID()` directly in domain or application layers.
- **Settings in localStorage** (e.g. `generationSettings`) are per-device UI preferences, not domain data. They don't go through IndexedDB or ports.
- **Algorithm utilities** (`src/lib/algorithms/`) are infrastructure-layer helpers, not domain logic.

### Anti-patterns to avoid

- Business logic in Svelte components → belongs in a use case
- Direct repository calls from UI → use the facade
- `crypto.randomUUID()` called directly → use `IdGenerator` port
- `throw` from a use case → return `Result`
- Infrastructure importing from use cases
- Domain importing from application or infrastructure

### Feature implementation order

1. Domain types (if new entities needed)
2. Port interfaces (`application/ports/`)
3. Use case (`application/useCases/`)
4. Infrastructure implementation
5. Facade wiring (`appEnvUseCases.ts`)
6. UI component / route

---

## 3. Key Existing Capabilities (Available as Dependencies)

These are implemented and stable. Reference them; do not reimplement.

| Capability                          | File                                                       | Notes                                                                   |
| ----------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `quickGenerateGroups` use case      | `src/lib/application/useCases/quickGenerateGroups.ts`      | Generates a scenario from a program                                     |
| `showToClass` use case              | `src/lib/application/useCases/showToClass.ts`              | Creates a session + placements from a scenario                          |
| `generationSettings` (localStorage) | `src/lib/utils/generationSettings.ts`                      | Persists groupSize, avoidRecentGroupmates, lookbackSessions per program |
| `InlineGroupGenerator` component    | `src/lib/components/workspace/InlineGroupGenerator.svelte` | In-workspace generation UI                                              |
| `/live` route                       | `src/routes/activities/[id]/live/+page.svelte`             | Student view + teacher view tabs                                        |
| Activity detail page                | `src/routes/activities/[id]/+page.svelte`                  | "New Groups" and "Edit Current Groups" cards                            |
| Dashboard                           | `src/routes/activities/+page.svelte`                       | Activity list                                                           |
| Facade                              | `src/lib/services/appEnvUseCases.ts`                       | Entry point for all use case calls from UI                              |
| `buildRecentGroupmatesMap`          | `src/lib/algorithms/buildConstraints.ts`                   | Builds avoid-recent constraint map                                      |
| `buildGroupingConstraints`          | `src/lib/algorithms/buildConstraints.ts`                   | Combines all constraints for the algorithm                              |
| `BalancedGroupingAlgorithm`         | `src/lib/infrastructure/algorithms/balancedGrouping.ts`    | Core grouping algorithm                                                 |
| `getPairingHistory` use case        | (use case exists, no UI)                                   | Returns pairing frequency data                                          |
| Demo data                           | `src/lib/demoData.ts`                                      | 24 fake students, pre-built for demo mode                               |
| `ObservationGroupCard` component    | (in live view)                                             | Per-group observation recording UI                                      |

---

## 4. UX Principles (Apply to All Work)

These guide every implementation decision.

| Principle                                 | What it means in practice                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P1 – Persona-Aware, Not Persona-Gated** | UI adapts emphasis based on what data exists (many sessions → show rotation stats; preference data → show satisfaction metrics). No explicit mode-switching. |
| **P2 – Time-to-Projection**               | For the math teacher, every added tap or loading spinner is a cost. Target: app open → groups on projector in < 10 seconds.                                  |
| **P3 – Trust Through Transparency**       | Show _why_ the algorithm made choices ("0 students repeated from yesterday"). Preference rank badges during editing make manual swaps informed.              |
| **P4 – Data Resilience**                  | All data is browser-local. Communicate this risk. Provide export. A teacher who loses data never returns.                                                    |
| **P5 – Classroom-Native Design**          | Text readable from 30 feet on a projector. Touch targets ≥ 44×44px. Usable on iPad with one hand.                                                            |

Plus the five existing principles from `UX_STRATEGY.md`: Direct Manipulation, Algorithm as Copilot, Progressive Disclosure, Continuous Autosave, Multiplayer-Ready Architecture.

---

## 5. How the Work Packages Fit Together

The UX improvements are organized into 8 strategic themes. They are **sequenced by dependency and user impact**, not alphabetically.

### The narrative arc

1. **WP4 (Onboarding)** removes barriers to first use — get a teacher to "groups on screen" in 60 seconds with no data prep.
2. **WP1 (Speed Path)** makes the returning math teacher's daily flow as fast as possible — the single most important retention driver for that persona.
3. **WP2 (Observations)** layers on top of the live session WP1 unlocks — teacher records what they notice while groups work.
4. **WP3 (Analytics)** serves the club admin persona — interpret satisfaction metrics and make manual editing informed.
5. **WP5 (Live Experience)** improves the in-classroom projection experience for both personas.
6. **WP6 (Data Trust)** ensures teachers don't lose work and can advocate for the tool with school admins.
7. **WP7 (Workspace Power)** deepens editing capability for the club admin doing large-scale refinement.
8. **WP8 (Accessibility)** ensures the core flows are usable by teachers with disabilities.

### Dependency graph

```
WP4 (Onboarding) ─────────────────────────────────┐
                                                   ▼
WP1 (Speed Path) ──► WP2 (Observations)       WP6 (Data Trust) [independent]

WP3.2 (Pref Badges) ──► WP3.1 (Analytics Interp) ──► WP3.3 (Scenario Compare)

WP1.5 (Projection Mode) ──► WP5 (Live Experience)

WP3.2 (Pref Badges) ──► WP7 (Workspace Power)

WP8 (Accessibility) [independent — weave into all]
```

### Phased implementation plan

| Phase | Weeks | Work packages                                   | Goal                              |
| ----- | ----- | ----------------------------------------------- | --------------------------------- |
| 1     | 1–3   | WP4.2, WP4.3, WP1.1, WP1.2, WP1.3               | Math teacher daily flow fast      |
| 2     | 4–6   | WP1.5, WP5.1, WP5.2, WP2.1, WP2.3               | In-classroom experience excellent |
| 3     | 7–9   | WP3.2, WP3.1, WP3.3, WP1.4                      | Club admin decision support       |
| 4     | 10–11 | WP6.1, WP6.2, WP6.3, WP4.1                      | Data trust + acquisition          |
| 5     | 12+   | WP7.1, WP7.2, WP7.3, WP2.2, WP5.3, WP8.1, WP8.2 | Power features + polish           |

---

## 6. Work Package Specifications

Each work package below is **independently shippable**. When you receive an instruction to implement a specific WP, read its section carefully and follow the acceptance criteria exactly.

---

### WP1: Speed Path — Math Teacher Daily Flow

**Strategic goal:** Make the daily random-grouping flow so fast that it replaces popsicle sticks and name-generator apps.

**Success metric:** Returning user, app open → groups on projector in < 10 seconds, ≤ 3 taps.

**Current flow (being replaced):**

```
Dashboard → Tap activity → Activity detail → Tap "New Groups"
  → quickGenerateGroups() → navigate to /workspace
  → Tap "Show to Class" → showToClass() → navigate to /live
```

4 taps, 3 page transitions.

**Target flow:**

```
(auto-skip dashboard if 1 activity) → Activity detail → Tap "Generate & Show"
  → quickGenerateGroups() → showToClass() → navigate to /live
```

1–2 taps, 1 page transition.

---

#### WP1.1: One-Tap "Generate & Show" on Activity Detail

**File changed:** `src/routes/activities/[id]/+page.svelte` only.

**What to build:**

Add a `handleGenerateAndShow` function that chains `quickGenerateGroups` → `showToClass` → `goto('/live')`:

```typescript
async function handleGenerateAndShow() {
  if (!env || !program) return;
  isGeneratingNew = true;
  generateAndShowError = null;

  saveGenerationSettings(program.id, generationSettings);

  const genResult = await quickGenerateGroups(env, {
    programId: program.id,
    groupSize: generationSettings.groupSize,
    groupNamePrefix: 'Group',
    avoidRecentGroupmates: generationSettings.avoidRecentGroupmates,
    lookbackSessions: generationSettings.lookbackSessions
  });

  if (isErr(genResult)) {
    generateAndShowError = mapGenerateError(genResult.error);
    isGeneratingNew = false;
    return;
  }

  const newScenario = genResult.value;

  const showResult = await showToClass(env, {
    programId: program.id,
    scenarioId: newScenario.id
  });

  if (isErr(showResult)) {
    // Graceful degradation: groups exist, couldn't publish
    generateAndShowError = `Groups generated but failed to show: ${showResult.error.type}`;
    goto(`/activities/${program.id}/workspace`);
    return;
  }

  isGeneratingNew = false;
  goto(`/activities/${program.id}/live`);
}
```

Replace the single "New Groups" card with a two-action layout:

```
┌──────────────────────────────────────────────────┐
│  ↻  New Groups                                   │
│  Groups of 4 · avoid recent groupmates           │
│                                                  │
│  [ Generate & Show ]  (primary, filled button)   │
│  [ Generate Only → ]  (secondary, text link)     │
│                                          Change  │
└──────────────────────────────────────────────────┘
```

- "Generate & Show": calls `handleGenerateAndShow`. Primary visual weight.
- "Generate Only →": calls existing `handleNewGroups` (→ workspace). Secondary/text style.
- "Change": opens settings popover (existing behavior, unchanged).
- The card itself is NOT a tap target — the buttons disambiguate intent.
- Add state: `let generateAndShowError = $state<string | null>(null)`
- While `isGeneratingNew` is true: both buttons disabled, primary shows spinner + "Generating..."
- Errors show inline on the card (not toast, not modal).

**Do NOT touch:** `quickGenerateGroups.ts`, `showToClass.ts`, `/live` route, workspace page, any domain/port/infrastructure code.

**Why no composite use case:** The UI is the correct orchestrator for page-level navigation workflows. `showToClass` failure fallback (navigate to workspace) is a routing concern, not business logic.

**Acceptance criteria:**

1. "Generate & Show" → new groups → lands on `/live` with student-facing display.
2. Previous group size setting remembered.
3. "Avoid recent groupmates" setting remembered.
4. If generation succeeds but show-to-class fails → workspace with groups visible (graceful degradation).
5. "Generate Only" still navigates to workspace.
6. Loading state visible during entire operation.
7. Error messages inline on card.

**Tests (Playwright, `e2e/activity-detail.spec.ts`):**

- "Generate & Show creates groups and navigates to live view"
- "Generate Only navigates to workspace"

---

#### WP1.2: Single-Activity Auto-Navigation

**Files changed:** `src/routes/activities/+page.svelte`, `src/routes/activities/[id]/+page.svelte`.

**What to build:**

On dashboard mount, if `activities.length === 1` AND no explicit-visit signal, redirect to that activity's detail page using `replaceState: true`.

```typescript
// After activities load in src/routes/activities/+page.svelte:
if (activities.length === 1 && !explicitDashboardVisit) {
  goto(`/activities/${activities[0].program.id}`, { replaceState: true });
  return;
}
```

**Explicit-visit detection (use query parameter — recommended over sessionStorage):**

```typescript
const explicitDashboardVisit = $page.url.searchParams.has('dashboard');
```

Update the "← Activities" breadcrumb on the activity detail page to include the escape hatch:

```svelte
<a href="/activities?dashboard=true">← All Activities</a>
```

**Edge cases:**

| Scenario                            | Expected behavior                                      |
| ----------------------------------- | ------------------------------------------------------ |
| Zero activities                     | No redirect. Show empty state + "Create Activity" CTA. |
| 2+ activities                       | No redirect. Show all cards.                           |
| Activity deleted, leaving one       | Next visit auto-redirects. Correct.                    |
| Direct URL `/activities` (no param) | Single-activity user redirected. Intentional.          |
| `replaceState: true`                | Back button skips the dashboard → no redirect loop.    |

**Do NOT touch:** Activity detail layout/functionality (beyond breadcrumb href), any routes, use cases, or domain code.

**Acceptance criteria:**

1. Single-activity user opens `/activities` → lands on activity detail automatically.
2. 2+ activities → dashboard shows normally.
3. 0 activities → empty state.
4. "← All Activities" link always shows dashboard (no redirect).
5. Browser back from auto-redirected detail page doesn't loop.

**Tests (Playwright, `e2e/dashboard.spec.ts`):**

- "single activity auto-redirects to activity detail"
- "explicit dashboard visit shows dashboard with one activity"
- "multiple activities show dashboard normally"
- "back button from auto-redirected detail page does not loop"

---

#### WP1.3: "Avoid Recent Groupmates" UI Surface & Configurable Lookback

**This item has two parts: UI (Part A) and algorithm (Part B). Implement Part B first — it's the only part touching shared infrastructure.**

**Part B: Algorithm Enhancement**

**Signature change in `src/lib/algorithms/buildConstraints.ts`:**

```typescript
// BEFORE:
export function buildRecentGroupmatesMap(
  placements: Placement[],
  studentIds: string[],
  limitToMostRecent: boolean = true
): Map<string, Set<string>>;

// AFTER:
export function buildRecentGroupmatesMap(
  placements: Placement[],
  studentIds: string[],
  lookbackSessions: number = 1 // 1 = identical behavior to old limitToMostRecent: true
): Map<string, Set<string>>;
```

New logic: sort sessions by most-recent placement date descending, take the top `lookbackSessions`, build groupmates map from those sessions only. When `lookbackSessions <= 0`, return all-empty sets.

```typescript
const sessionsByRecency = [...placementsBySession.entries()]
  .map(([sessionId, sessionPlacements]) => ({
    sessionId,
    latestDate: Math.max(...sessionPlacements.map((p) => p.startDate.getTime()))
  }))
  .sort((a, b) => b.latestDate - a.latestDate);

const sessionsToProcess = sessionsByRecency
  .slice(0, Math.max(0, lookbackSessions))
  .map((s) => s.sessionId);
```

**This is a backward-incompatible signature change. Update all callers in the same PR:**

- `src/lib/algorithms/buildConstraints.ts` → `buildGroupingConstraints`: add `lookbackSessions?: number` to options type, pass through.
- `src/lib/infrastructure/algorithms/balancedGrouping.ts` → `BalancedGroupingConfig`: add `lookbackSessions?: number`, pass to `buildRecentGroupmatesMap`.
- `src/lib/application/useCases/quickGenerateGroups.ts` → `QuickGenerateGroupsInput`: add `lookbackSessions?: number`, default to 3 when passing to algorithm config.

**Add `lookbackSessions` to `src/lib/utils/generationSettings.ts`:**

```typescript
export interface GenerationSettings {
  groupSize: number;
  avoidRecentGroupmates: boolean;
  lookbackSessions: number; // NEW — default: 3, valid range: 1–10
  customShells?: GroupShell[];
}
```

Parse missing/invalid values as default 3; clamp to 1–10.

**Unit tests (Vitest, `src/lib/algorithms/buildConstraints.spec.ts`):**

- `lookbackSessions=1` considers only most recent session (regression test for old behavior)
- `lookbackSessions=2` with 3 sessions: oldest session's groupmates NOT in map; sessions 2 and 3 ARE
- `lookbackSessions=10` with 3 sessions: all 3 sessions considered (graceful overflow)
- `lookbackSessions=0` returns empty groupmate sets (feature off)

---

**Part A: UI Surface**

**Files changed:** `src/routes/activities/[id]/+page.svelte`, `src/lib/components/workspace/InlineGroupGenerator.svelte`.

Surface the toggle prominently on the "New Groups" card. It should be directly visible, not hidden behind the "Change" popover:

```
┌──────────────────────────────────────────────────┐
│  ↻  New Groups                                   │
│  Groups of 4                             Change  │
│                                                  │
│  [✓] Avoid recent groupmates                     │
│      Students won't repeat from last 3 groups    │
│                                   last 3 ▾       │
│                                                  │
│  [ Generate & Show ]    Generate Only →           │
└──────────────────────────────────────────────────┘
```

- Toggle visible only when `publishedSessions.length >= 1`. Hidden when 0 sessions.
- Explainer: "Students won't repeat from last {N} groups" — N is dynamic.
- "last {N}" is a small inline `<select>` (options 1–10), styled minimally.
- Toggling off hides the dropdown and explainer.
- Apply same toggle + explainer + dropdown to `InlineGroupGenerator.svelte`.

**Contextual hint (one-time, dismissable):**
Show when `publishedSessions.length >= 2 && !avoidRecentGroupmates && !hintDismissed`:

```
💡 Turn on "Avoid Recent Groupmates" so students work with new people each time.  [Got it]
```

- Track dismissal in localStorage key: `gw-avoid-hint-dismissed-{programId}` = `"true"`.
- Renders as a subtle banner, not a modal or toast.

**Acceptance criteria:**

1. Toggle visible on generation UI after first generation.
2. Toggle hidden when no prior sessions.
3. Lookback dropdown (1–10) visible next to toggle when toggle is on.
4. Explainer text reads "Students won't repeat from last {N} groups" and updates dynamically.
5. Contextual hint appears on second generation if toggle is off. Dismissable. One-time per activity.
6. Lookback setting persists per activity in localStorage.
7. Algorithm correctly avoids groupmates from the last N sessions.
8. `lookbackSessions: 1` produces identical behavior to old `limitToMostRecent: true`.
9. `lookbackSessions` exceeding available session count considers all available sessions.

**E2E tests (Playwright, `e2e/activity-detail.spec.ts`):**

- "avoid recent groupmates toggle visible after first generation"
- "lookback dropdown changes persisted setting" (navigate away and back, assert setting preserved)

---

#### WP1.4: Pairing History Visualization

**Strategic goal:** Build algorithm trust by showing how well rotation is working.

**Depends on:** `getPairingHistory` use case (already implemented, no UI).

**What to build:**

- Add a "Grouping History" section to the activity detail page, collapsed by default, visible after 2+ sessions.
- Show at minimum: a coverage percentage ("Your students have experienced X% of possible unique pairings").
- Show per-student pairing counts: "Student X has worked with Y unique partners out of Z classmates."
- Show a timeline of past sessions (date, group count) with ability to view that day's groups (read-only).

**Acceptance criteria:**

1. Coverage percentage visible after 3+ sessions.
2. Past session groups viewable in read-only mode.
3. Section collapsed by default, expands on click.

---

#### WP1.5: Classroom Projection Mode

**Strategic goal:** Make groups readable from the back row of a classroom on a projector.

**What to build:**

- "Full Screen" button on the live student view.
- Projection mode: hide all navigation chrome, maximize group card size, ≥ 48px group names, ≥ 24px student names.
- High-contrast color scheme (dark bg + white text, or white bg + bold text).
- Auto-scale: fewer groups = larger cards.
- ESC exits projection mode.

**Acceptance criteria:**

1. Group names readable from 30 feet on a standard classroom projector.
2. Zero navigation chrome in projection mode.
3. ESC returns to normal view.

---

### WP2: Observation & Feedback Loop

**Strategic goal:** Recording observations during live group work should take < 2 seconds and feel natural on an iPad.

**Depends on:** WP1 (math teacher live session flow).

---

#### WP2.1: Persistent Observation UI During Live View

**What to build:**

- Enhance existing `ObservationGroupCard` components on the teacher view:
  - Large tap targets for 👍/👎/😐 sentiment (minimum 44×44px).
  - One-tap sentiment recording (no confirmation dialog).
  - Swipe or long-press for text note entry.
  - Visual confirmation: brief flash or checkmark after recording.
- Add a floating "Quick Note" button: opens a sheet with group selector + text input.
- Observation count badge per group card.

**Acceptance criteria:**

1. Record sentiment with one tap in < 2 seconds.
2. Add text note with 2 taps + typing.
3. Works reliably on iPad with one hand.
4. Observations persist across page navigations within the session.

---

#### WP2.2: Observation Summary & Trends

**What to build:**

- Observation summary below history section on activity detail page.
- Show: total observations, sentiment breakdown (% positive/neutral/negative), per-session trend.
- Link from individual observations back to their session.
- Visible only after 3+ sessions with observations.

---

#### WP2.3: Timer Integration

**What to build:**

- Floating timer widget in corner of teacher view.
- Presets: 5, 10, 15, 20 minutes.
- Large visual countdown, audible chime on expiry (toggleable).
- Timer state persists if teacher switches between student/teacher tabs.
- Does not interfere with observation recording.

**Acceptance criteria:**

1. Timer starts with one tap from preset.
2. Visible at a glance from across the room.
3. Chime audible but not startling.

---

### WP3: Analytics & Decision Support

**Strategic goal:** Help teachers answer "is this arrangement good?" within 5 seconds of generation, without interpreting raw numbers.

**Depends on:** Existing analytics infrastructure (mostly complete).

---

#### WP3.1: Contextual Analytics Interpretation

**What to build:**

Replace raw metric display with interpreted, actionable statements. Rule-based (no LLM):

- Top-choice %: "excellent" (>80%), "strong" (60–80%), "typical" (40–60%), "could improve" (<40%).
- Contextualize by group count and student count (more groups = higher expected satisfaction).
- Compare to previous generation if available: "↑ 8% improvement over last arrangement."
- Show specific suggestions when metrics are low: "Adding a 5th group would likely improve satisfaction" / "3 students got their last choice — consider swapping them manually."

**Acceptance criteria:**

1. Every metric shows plain-English interpretation alongside the number.
2. Interpretation adjusts based on group/student count.
3. Improvement suggestions appear when actionable.

---

#### WP3.2: Per-Student Preference Badges in Workspace

**What to build:**

- Add preference rank badge to `DraggableStudentCard` component.
- Color-code: green (1st choice), yellow (2nd), orange (3rd), red (4th+), gray (no preference / unassigned).
- When dragging a student over a group, show preview of what their rank _would be_ in that destination group.
- Analytics summary updates in real time as students are moved.

**Acceptance criteria:**

1. Every student card shows preference rank for current group (when preferences exist).
2. Drag preview shows destination rank.
3. Analytics update live during editing.

---

#### WP3.3: Scenario Comparison

**What to build:**

- "Compare" button in workspace generates a second candidate alongside the current one.
- Side-by-side view: both arrangements with key metrics (top-choice %, avg rank, constraint violations).
- Highlight differences: students in different groups between the two arrangements.
- "Keep Left" / "Keep Right" one-click selection.

**Acceptance criteria:**

1. Two arrangements visible simultaneously with metrics.
2. Differences highlighted visually.
3. One-click selection of preferred arrangement.

---

### WP4: Onboarding & First Value

**Strategic goal:** New user reaches "groups on screen" within 60 seconds of opening the app, with no data preparation required.

---

#### WP4.1: Interactive Demo Mode

**What to build:**

- "Try GroupWheel" button on landing page / dashboard empty state.
- Creates a demo activity with 24 fake students (from existing `demoData.ts`), 6 groups of 4.
- 3–4 step guided overlay: "These are your groups" → "Drag to rearrange" → "Show to your class" → "Create your own."
- Demo activity clearly labeled as demo, easily deletable.
- Completing demo prompts "Create Your Own Activity."

**Acceptance criteria:**

1. Landing page → seeing groups: < 15 seconds, 1 tap.
2. Guided tour covers: viewing groups, drag-drop, show-to-class.
3. Demo activity clearly marked and deletable.

---

#### WP4.2: "Just a Number" Quick Start

**What to build:**

- "Quick Start" option in the activity creation wizard: number of students + students per group.
- Generate placeholder students: "Student 1", "Student 2", … "Student N".
- Create activity + generate groups + land in workspace in one step.
- Show prompt: "Want to add real names? Paste your roster anytime from Setup."
- Placeholder students clearly labeled as editable.
- Teacher can replace placeholder names without losing group assignments.

**Acceptance criteria:**

1. Two number inputs → groups generated in < 10 seconds.
2. Placeholder students labeled as editable.
3. Real names replaceable without losing group assignments.

---

#### WP4.3: One-Per-Line Name Import

**What to build:**

- Detect when pasted roster text has no delimiters (no commas, no tabs) → treat as one-name-per-line.
- Skip column mapping step entirely for this format.
- Auto-generate student IDs.
- Show preview: "28 students detected from your list."

**Acceptance criteria:**

1. Paste names list → preview shows correct count → no column mapping required.
2. Works with or without blank lines.
3. Names with spaces handled correctly ("Mary Jane Watson" = one student).

---

### WP5: Live Experience & Classroom Realities

**Strategic goal:** Every student finds their group within 15 seconds of the projection going live.

**Depends on:** WP1.5 (projection mode).

---

#### WP5.1: QR Code for Student Self-Lookup

**What to build:**

- QR code on the live student view encoding the live page URL.
- Student scans → opens live view on phone → types name → sees their group.
- Live URL must be accessible without authentication (read-only).
- QR code displayed prominently, dismissed with a tap.
- No student PII in the URL (activity ID only).

**Acceptance criteria:**

1. QR code scannable from 10 feet on projection.
2. Student flow: scan → search name → see group in < 10 seconds.
3. Works on student phones without app install.

---

#### WP5.2: Dual-Screen Support

**What to build:**

- "Open Student View in New Window" button on teacher view.
- New window opens at `/activities/[id]/live?view=student&chrome=none` (no nav, no tabs).
- Teacher's original window stays on teacher view.
- Both windows share same IndexedDB data (same browser session).

**Acceptance criteria:**

1. Two windows: student-facing on projector, teacher-facing on device.
2. Student window: zero chrome, full-screen groups only.
3. Teacher window: full observation capabilities.
4. Closing one window doesn't affect the other.

---

#### WP5.3: Animated Group Reveal

**What to build:**

- "Reveal Mode" toggle on student view.
- Groups appear one at a time with fade/slide animation.
- Auto-advance (5-second intervals) OR click-to-advance.
- "Show All" button to skip ahead.
- Use CSS transitions, not JS animation.

**Acceptance criteria:**

1. Reveal mode shows groups sequentially with animation.
2. Teacher controls pacing (auto or manual).
3. Can exit to full view at any time.
4. Animation smooth (CSS transitions).

---

### WP6: Data Trust & Portability

**Strategic goal:** Teachers never lose work and can move activities between devices.

**No dependencies — can start immediately.**

---

#### WP6.1: Persistent Data Warning & Export Prompts

**What to build:**

- On first use: non-blocking notice — "Your data is stored in this browser only. We recommend exporting regularly."
- After creating activity with 10+ students: subtle prompt — "Want to save a backup? Export to CSV."
- Settings/about page: clear explanation of data storage with export buttons.
- "Export All" button: downloads JSON with all activities, rosters, preferences, observations.

**Acceptance criteria:**

1. New users see data storage explanation within first session.
2. Export prompt appears after meaningful data entry.
3. Full export produces file that could be re-imported (even if re-import not yet built).

---

#### WP6.2: Activity Export/Import as File

**What to build:**

- "Export Activity" in overflow menu → downloads a `.groupwheel` (JSON) file.
- "Import Activity" on dashboard → upload file → activity restored with all data.
- File format: versioned JSON with all domain entities (students, groups, preferences, scenarios, observations).
- Conflict handling: imported activity gets a new ID to avoid collisions.
- Warn if file > 5MB.

**Acceptance criteria:**

1. Export → Import round-trip preserves all data.
2. Imported activity is fully functional (editable, regeneratable).
3. Works across different browsers.
4. File format versioned for forward compatibility.

---

#### WP6.3: FERPA/Privacy Assurance Page

**What to build:**

- Static page at `/privacy` or `/about/privacy`.
- Content for school administrators: what data is collected (none server-side), where stored (browser only), what leaves device (nothing, unless Google Sheets — then only sheet ID), FERPA compliance statement, COPPA considerations.
- "Delete All Data" button with double confirmation.
- Printable/downloadable format.
- Linked from footer and settings.

**Acceptance criteria:**

1. Page exists, linked from footer and settings.
2. Content accurate, written for school administrators.
3. "Delete All Data" works completely and irreversibly.
4. Printable as clean document.

---

### WP7: Workspace Power Features

**Strategic goal:** Club admin can refine a 150-student, 12-group arrangement without scrolling or losing context.

**Depends on:** WP3.2 (preference badges).

---

#### WP7.1: Visual Density Controls

**What to build:**

- Three density levels in workspace toolbar (like Gmail): Compact / Comfortable / Spacious.
- Compact: small cards, names only, maximum groups visible without scrolling.
- Comfortable: current default sizing.
- Spacious: large cards, preference badges visible, extra info.
- Setting persisted per activity in localStorage.

**Acceptance criteria:**

1. All three densities render correctly for 4–12 groups.
2. Compact shows 12 groups without scrolling on standard laptop.
3. Spacious shows preference rank and observation indicators.
4. Setting persists across sessions.

---

#### WP7.2: Multi-Select and Bulk Move

**What to build:**

- Shift+click to add students to selection.
- Selected students highlighted with selection ring.
- Drag any selected student to move all selected students together.
- Right-click → "Move to..." dropdown listing all groups.
- ESC or click empty space to deselect.
- Undo/redo treats bulk move as a single operation.

**Acceptance criteria:**

1. Multi-select with shift+click works.
2. Bulk drag moves all selected students.
3. Single undo reverses entire bulk move.
4. Selection state visually clear.

---

#### WP7.3: Constraint Visualization

**What to build:**

- Warning icon on student cards that violate a constraint (e.g., avoid-pair students in same group).
- Subtle connector line or highlight showing recent-groupmate pairs within a group.
- Constraint summary in toolbar: "2 constraint violations" (clickable to scroll to first violation).
- While dragging: destination group shows green/red indicator based on whether move creates or resolves violations.

**Acceptance criteria:**

1. Constraint violations visible at a glance.
2. Dragging shows whether move improves or worsens constraint satisfaction.
3. Constraint count in toolbar is accurate and clickable.

---

### WP8: Accessibility & Inclusivity

**Strategic goal:** Core flows completable via keyboard only; color is never the sole differentiator.

**No dependencies — weave into all work packages.**

---

#### WP8.1: Keyboard-Driven Group Editing

**What to build:**

- Tab/arrow keys to focus student cards.
- Enter or Space to "pick up" a student.
- Arrow keys or number keys to select destination group.
- Enter to confirm move, Escape to cancel.
- Announce moves via ARIA live regions.
- All existing keyboard shortcuts (Ctrl+Z, Ctrl+Y) continue to work.

**Acceptance criteria:**

1. Complete a student move using only keyboard.
2. Screen reader announces move and destination.
3. Focus management is logical and predictable.

---

#### WP8.2: Color-Blind Safe Palette

**What to build:**

- Audit existing `GROUP_COLORS` palette against deuteranopia, protanopia, tritanopia simulators (use Chrome's built-in vision deficiency simulator).
- Add pattern fills or icon badges as secondary differentiators (stripe, dots, crosshatch, etc.) OR add a letter/number label to each group color block.

**Acceptance criteria:**

1. All groups distinguishable under simulated deuteranopia and protanopia.
2. At least one non-color differentiator per group (icon, pattern, or label).

---

## 7. Explicitly Out of Scope

Do not implement or design toward any of the following:

- Server-side persistence / accounts
- Real-time collaboration
- SIS/LMS integration
- Internationalization / localization
- Mobile-native app (PWA/responsive web is sufficient)
- LLM-powered analytics interpretation (rule-based thresholds are sufficient for v1)
- Advanced fairness algorithms beyond current balanced assignment
- Candidate gallery / bulk pre-generation for browsing

---

## 8. Testing Standards

All implementations must include tests at the appropriate level:

- **Pure functions / algorithms:** Vitest unit tests, table-driven where multiple cases apply.
- **Use cases:** Vitest unit tests with in-memory repository implementations.
- **UI behavior / user flows:** Playwright e2e tests covering the acceptance criteria scenarios.
- **What to pin:** The public contract (inputs → outputs, or user action → observable result). Don't test implementation details.
- **Failure cases:** Always include at least one test for the primary failure path (e.g., graceful degradation when a use case returns an error).

---

_End of context document._
