# Phase 1 Implementation Proposals: Class View Core

Two proposals for implementing Phase 1 of the UX redesign described in the GroupWheel UX Research Report. Both target the same objective — delivering the math teacher's complete workflow in a single screen with ≤3 taps and ≤10 seconds — but differ in their migration strategy, risk profile, and approach to the existing codebase.

---

## Proposal A: Parallel Class View with Progressive Migration

### Strategy summary

Build the new Class View (`/classes/[id]`) as a new route alongside the existing `/activities/[id]` flow. The existing screens remain functional throughout development. Once the Class View reaches parity for the math teacher persona, redirect the entry points to the new route and deprecate the old ones. The existing workspace and live view are reused initially, with their entry points adjusted.

This is a **strangler fig** migration: new growth wraps around old, eventually replacing it — but the old system keeps working until the new one is proven.

### Architecture decisions

**Routing.** Introduce a parallel `/classes` route tree. This avoids modifying the existing `/activities` routes during development, eliminating regression risk. The top-level redirect logic in `src/routes/+page.svelte` stays unchanged until the new routes are ready.

```
src/routes/classes/
  +page.svelte          ← Home (Class List) — replaces /activities
  [id]/
    +page.svelte        ← Class View (the core of Phase 1)
    workspace/
      +page.svelte      ← Thin wrapper that reuses existing workspace components
    live/
      +page.svelte      ← Thin wrapper that reuses existing live components
```

**Domain model.** No changes to the domain layer. The existing `Program` entity is the "class" — Phase 1 only renames it in the UI layer. The domain types (`Program`, `Pool`, `Scenario`, `Student`, `Group`, etc.) remain untouched, preserving all existing use cases and repositories.

**Terminology mapping.** A thin presentation layer maps domain terms to teacher terms:

| Domain term | UI label |
|---|---|
| Program | Class |
| Pool | Roster (internal only — never shown) |
| Activity | Class (consolidated) |
| Scenario | Groups (shown as "Current Groups") |

This mapping lives in a single `src/lib/utils/terminology.ts` utility so labels are consistent and easy to audit.

**State management.** The new Class View uses Svelte 5 runes (`$state`, `$derived`, `$effect`) directly in the page component, following the pattern established by the existing `[id]/+page.svelte`. No new stores are introduced in Phase 1 — the existing `appEnvUseCases` facade provides all data access.

### Detailed work breakdown

#### Step 1: Terminology utility and shared infrastructure

Create `src/lib/utils/terminology.ts` with display-name mappings. Create a `SaveStatusIndicator` component (or reuse the existing one from `src/lib/components/editing/SaveStatusIndicator.svelte`) that shows "Saved to this browser" with a device icon.

**Files changed:**
- New: `src/lib/utils/terminology.ts`
- Modified: `src/lib/components/editing/SaveStatusIndicator.svelte` (add "Saved to this browser" variant)

**Acceptance criteria:**
- Terminology utility exports functions: `displayName('program')` → `"Class"`, etc.
- Save indicator shows "Saved to this browser" with a device icon, not just "Saved"

#### Step 2: Home (Class List) screen

Build `src/routes/classes/+page.svelte`. This is a simplified version of the current `/activities` dashboard. Each class appears as a large card showing: class name, student count, last-used date, and a "Make Groups" shortcut button.

For users with exactly one class, auto-redirect to `/classes/[id]` (matching existing behavior in `/activities/+page.svelte` line 126-129).

**Key design differences from current dashboard:**
- "Activities" → "Classes" in all labels and headings
- Quick Start section retained but simplified (group-size-only, opinionated student count placeholder)
- "+ New Class" replaces "+ New Activity" — uses inline creation (name field + create button), not wizard navigation
- Persistent "Saved to this browser" indicator in footer
- No import/analytics buttons in header (progressive disclosure — these appear in Class View)

**Files changed:**
- New: `src/routes/classes/+page.svelte`
- New: `src/routes/classes/+layout.svelte` (minimal — sets page title context)

**Acceptance criteria:**
- Class list loads and displays all existing Programs
- Single-class users auto-redirect to Class View
- "+ New Class" creates a class inline (name → create → redirect to Class View)
- "Make Groups" shortcut on each card navigates to Class View and triggers generation
- No terminology leaks: no "Activity", "Pool", or "Program" visible in UI

#### Step 3: Class View — Roster panel

Build the left panel of `src/routes/classes/[id]/+page.svelte`. This shows the student roster for the class. It reuses the student display logic from the existing Activity Detail page (`SetupStudentsSection`) but in a persistent (always-visible) panel format rather than a collapsible accordion.

**Layout:**
```
┌──────────────────────────────────────────────┐
│ ← Classes    [Class Name]     14 students    │
│                                              │
│ ┌──────────┐  ┌────────────────────────────┐ │
│ │ Roster   │  │                            │ │
│ │          │  │   (Groups panel — Step 4)  │ │
│ │ • Alice  │  │                            │ │
│ │ • Bob    │  │                            │ │
│ │ • Carol  │  │                            │ │
│ │ • ...    │  │                            │ │
│ │          │  │                            │ │
│ │ [+ Add]  │  │                            │ │
│ └──────────┘  └────────────────────────────┘ │
│                                              │
│ [Saved to this browser 🖥]                    │
└──────────────────────────────────────────────┘
```

**Features:**
- Student list with add/remove capability
- Paste-to-import detection (reuse `pasteDetection.ts`)
- Student count in header
- Scrollable with fixed header

**Files changed:**
- New: `src/routes/classes/[id]/+page.svelte` (initial scaffold with roster panel)
- New: `src/lib/components/classview/RosterPanel.svelte`

**Acceptance criteria:**
- Roster panel shows all students for the class
- Students can be added inline (first name + optional last name)
- Students can be removed with undo toast
- Paste detection triggers CSV/TSV import flow
- Panel scrolls independently of the groups panel

#### Step 4: Class View — Groups panel and "Make Groups" action

Build the right panel showing generated groups and the primary action button. This is the core of Phase 1.

**Layout when no groups exist:**
```
┌────────────────────────────┐
│                            │
│   [Group size: ▼ 3  ]     │
│                            │
│   ┌──────────────────┐     │
│   │   Make Groups    │     │
│   └──────────────────┘     │
│                            │
│   (empty state message)    │
│                            │
└────────────────────────────┘
```

**Layout when groups exist:**
```
┌────────────────────────────┐
│ [Group size: ▼ 3]  [⟳ New]│
│                            │
│ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │Grp 1│ │Grp 2│ │Grp 3│   │
│ │Alice│ │Bob  │ │Eve  │   │
│ │Dave │ │Carol│ │Frank│   │
│ └─────┘ └─────┘ └─────┘   │
│                            │
│ [Edit in Workspace]        │
│ [Project ⛶]                │
└────────────────────────────┘
```

**"Make Groups" button behavior:**
1. Calls `quickGenerateGroups` use case (already exists)
2. Uses opinionated defaults: group size from stepper (default 3), random algorithm, avoid recent groupmates if history exists
3. Groups appear immediately in the panel — no navigation
4. Previous groups saved to history automatically
5. "New Groups" re-generates with one tap (same button, different label once groups exist)

**Group size stepper:**
- Simple +/- stepper inline, not a dropdown or modal
- Default value: 3 (or persisted from last use via `generationSettings` utility)
- Range: 2-20

**Secondary actions:**
- "Edit in Workspace" → navigates to `/classes/[id]/workspace` (wraps existing workspace)
- "Project" → navigates to `/classes/[id]/live` or enters projection mode directly

**Files changed:**
- Modified: `src/routes/classes/[id]/+page.svelte`
- New: `src/lib/components/classview/GroupsPanel.svelte`
- New: `src/lib/components/classview/GroupSizeStepper.svelte`
- New: `src/lib/components/classview/GroupDisplay.svelte`

**Acceptance criteria:**
- "Make Groups" generates groups without navigation
- Groups display in a readable grid/column layout
- Group size stepper persists value across visits
- "New Groups" regenerates with one tap
- Previous groups are automatically saved
- ≤3 taps from Class View load to groups displayed
- "Edit in Workspace" navigates to full workspace
- "Project" enters projection mode or navigates to live view

#### Step 5: Class View — Projection mode

Add projection mode directly within the Class View. Tapping "Project" expands the groups panel to full-screen with large-type, high-contrast display.

**Projection mode UI:**
- Full-screen overlay (reusing the existing `requestFullscreen` pattern from `live/+page.svelte`)
- Student names at ≥36pt (projected), group names at ≥48pt
- High contrast (7:1+ for projected content)
- Floating toolbar: "New Groups" button + "Exit" button
- No teacher-private information visible (no preferences, no analytics)

**Files changed:**
- New: `src/lib/components/classview/ProjectionOverlay.svelte`
- Modified: `src/routes/classes/[id]/+page.svelte` (add projection toggle)

**Acceptance criteria:**
- Projection mode fills the screen
- Student names readable at 30 feet (≥36pt)
- Teacher can generate new groups without exiting projection mode
- ESC key exits projection mode
- No roster, analytics, or settings visible during projection

#### Step 6: Class View — Autosave and data resilience

Implement continuous autosave with visible status indicator.

**Behavior:**
- Autosave triggers on every meaningful state change (group generation, settings change)
- "Saved to this browser" indicator updates in real-time
- Indicator shows three states: "Saving...", "Saved to this browser", "Save failed — retry"
- Generation settings persist to localStorage (reuse existing `generationSettings.ts`)

**Files changed:**
- Modified: `src/routes/classes/[id]/+page.svelte` (add autosave effect)
- Modified: `src/lib/components/editing/SaveStatusIndicator.svelte`

**Acceptance criteria:**
- Every state change triggers autosave
- Save indicator is visible on every screen
- "Save failed" state shows retry action
- Returning user finds their class, roster, and settings intact

#### Step 7: Route migration and redirects

Wire the new routes into the app. Add redirects from `/activities` to `/classes`. Update the landing page (`src/routes/+page.svelte`) to redirect returning users to `/classes` instead of `/activities`.

**Files changed:**
- Modified: `src/routes/+page.svelte` (redirect to `/classes`)
- New: `src/routes/activities/+page.ts` (redirect to `/classes`)
- Modified: `src/routes/+layout.svelte` (add /classes to nav if nav exists)

**Acceptance criteria:**
- Returning users land on `/classes` (or `/classes/[id]` for single-class users)
- `/activities` redirects to `/classes`
- `/activities/[id]` redirects to `/classes/[id]`
- Old workspace and live view URLs still work (redirect to `/classes/[id]/workspace` and `/classes/[id]/live`)

#### Step 8: Integration testing and rubric verification

Write E2E tests verifying the math teacher's fast path. Measure against the rubric.

**Tests:**
1. **3-tap test:** App launch → Class View → Make Groups → groups visible (≤3 interactions)
2. **10-second test:** Timed E2E test with Playwright: page load + click "Make Groups" + groups rendered < 10s
3. **Projection test:** Groups → Project → student names rendered at ≥36pt
4. **Return visit test:** Close and reopen → class and settings preserved
5. **Terminology test:** No instance of "Activity", "Pool", or "Program" in rendered DOM

**Files changed:**
- New: `e2e/classview-fast-path.spec.ts`
- New: `e2e/classview-projection.spec.ts`
- New: `e2e/classview-terminology.spec.ts`

**Acceptance criteria:**
- All E2E tests pass
- Rubric categories A and C score ≥4.0 for math teacher flow (documented in test comments)

### Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Parallel routes increase maintenance surface temporarily | High | Low | Old routes are frozen — no new features added. Migration timeline capped. |
| Data shared between old and new routes causes conflicts | Low | Medium | Both read from same IndexedDB via same repos. No write conflicts possible — same use cases. |
| Workspace/live wrappers have subtle routing bugs | Medium | Low | Wrappers are thin redirects. E2E tests catch regressions. |
| Terminology mapping misses edge cases (toasts, errors) | Medium | Low | Grep audit for "activity", "pool", "program" in UI layer. |

### What this proposal does NOT include (deferred to Phase 2+)

- Drag-and-drop group editing in Class View (Phase 2)
- Preference import/analytics panels (Phase 2)
- History panel (Phase 2)
- Constraint settings (Phase 2)
- Per-student algorithmic explanations (Phase 2)
- Inline class creation wizard elimination (partially done — wizard still exists for complex setups)
- Removal of old `/activities` routes (after Phase 2 parity)

---

## Proposal B: In-Place Transformation of Existing Routes

### Strategy summary

Transform the existing `/activities` routes in place, renaming and restructuring them to match the new information architecture. The Activity Detail page (`/activities/[id]/+page.svelte`) becomes the Class View directly. Routes are renamed from `/activities` to `/classes` via SvelteKit route aliases and redirects at the start, then the old route directories are removed once migration is stable.

This is a **direct rewrite** of the existing screens — fewer files, less duplication, but higher regression risk during the transition.

### Architecture decisions

**Routing.** Rename the route directory from `src/routes/activities` to `src/routes/classes`. Add redirect aliases for all old `/activities/*` URLs. The workspace and live view remain as sub-routes of `/classes/[id]/`.

```
src/routes/classes/              ← renamed from activities/
  +page.svelte                   ← modified dashboard (now "Class List")
  [id]/
    +page.svelte                 ← heavily modified (now "Class View")
    workspace/+page.svelte       ← existing, unchanged
    live/+page.svelte            ← existing, unchanged
    setup/+page.svelte           ← deprecated, redirect to [id]
    analytics/+page.svelte       ← existing, unchanged
    print/+page.svelte           ← existing, unchanged
```

**Domain model.** Same as Proposal A — no domain layer changes. UI-only terminology remapping.

**Component reuse.** Rather than creating new components, this proposal modifies existing components in place. The `GroupCard` component is refactored into the groups panel. The `SetupStudentsSection` is refactored from a collapsible accordion into a persistent sidebar panel.

**State management.** Reuse the existing page-level state from `activities/[id]/+page.svelte`. The current file already has most of the data loading, generation, and show-to-class logic needed. The refactoring focuses on layout changes and removing unnecessary complexity.

### Detailed work breakdown

#### Step 1: Route rename and redirects

Rename the `src/routes/activities` directory to `src/routes/classes`. Create redirect stubs at the old paths.

**Files changed:**
- Rename: `src/routes/activities/` → `src/routes/classes/`
- New: `src/routes/activities/+page.ts` (redirect to `/classes`)
- New: `src/routes/activities/[id]/+page.ts` (redirect to `/classes/[id]`)
- New: `src/routes/activities/[id]/workspace/+page.ts` (redirect)
- New: `src/routes/activities/[id]/live/+page.ts` (redirect)
- Modified: `src/routes/+page.svelte` (update redirect from `/activities` to `/classes`)
- Modified: All internal links referencing `/activities` (global find-and-replace)

**Acceptance criteria:**
- All existing functionality works at new `/classes/*` URLs
- All old `/activities/*` URLs redirect to corresponding `/classes/*` URLs
- No broken internal links

#### Step 2: Terminology sweep

Replace all user-facing instances of "Activity/Activities" with "Class/Classes" across the renamed route files and shared components.

**Scope of changes:**
- Page titles (`<svelte:head>`)
- Headings and labels
- Button text
- Error messages
- Modal titles and descriptions
- Toast messages
- ARIA labels

**NOT changed (internal/domain terms stay):**
- Variable names in code
- Function names in use cases
- Domain types and interfaces
- File names of use cases (e.g., `listActivities.ts` stays — it returns the right data)

**Files changed:**
- Modified: `src/routes/classes/+page.svelte`
- Modified: `src/routes/classes/[id]/+page.svelte`
- Modified: `src/routes/classes/[id]/workspace/+page.svelte`
- Modified: `src/routes/classes/[id]/live/+page.svelte`
- Modified: `src/lib/components/activity/GroupCard.svelte` (rename file to `src/lib/components/classview/GroupCard.svelte`)
- Modified: Various shared components that display "Activity" text

**Acceptance criteria:**
- No user-visible instance of "Activity", "Pool", or "Program"
- All internal code references remain functional
- Automated grep finds zero matches for `/Activity|Activities/` in rendered component templates (excluding code comments and variable names)

#### Step 3: Class List simplification

Modify the dashboard (`/classes/+page.svelte`) to match the new design.

**Changes from current dashboard:**
- Header: "Your Classes" instead of "Your Activities"
- Remove Analytics and Import buttons from header (moved to per-class context)
- Add "Make Groups" shortcut button to each class card (one-tap fast path)
- Simplify Quick Start: just student count + group size, create inline
- Rename "+ New Activity" to "+ New Class"
- Update the data storage banner: "Saved to this browser" with device icon
- Remove wizard link — class creation is inline

**Files changed:**
- Modified: `src/routes/classes/+page.svelte`

**Acceptance criteria:**
- Dashboard shows classes with "Make Groups" shortcut
- "+ New Class" creates a class inline
- Quick Start still works
- Data storage banner updated

#### Step 4: Class View layout transformation

This is the largest step. Transform the existing Activity Detail page into the two-panel Class View layout.

**Current structure of `activities/[id]/+page.svelte`:**
```
Header (back link, activity name, student count)
↓
Placeholder banner (if applicable)
↓
GroupCard (generation settings + actions)
↓
Rotation coverage (collapsible)
↓
Observation trends (collapsible)
↓
Divider
↓
Setup sections (collapsible: Students, History)
```

**New structure:**
```
Header (back link, class name, student count, save indicator)
↓
┌─────────────────┬──────────────────────────────┐
│ Roster Panel    │ Groups Panel                 │
│ (always visible)│ (Make Groups + display)      │
│                 │                              │
│ • Student list  │ • Group size stepper         │
│ • Add student   │ • Make Groups / New Groups   │
│ • Paste import  │ • Group grid display         │
│                 │ • Edit in Workspace          │
│                 │ • Project                    │
└─────────────────┴──────────────────────────────┘
```

**What's removed from this view:**
- Collapsible accordion pattern for students → students are always visible in the roster panel
- Rotation coverage section → deferred to Phase 2 (progressive disclosure panel)
- Observation trends section → deferred to Phase 2
- History section → deferred to Phase 2 (accessible via workspace)
- GroupCard as a standalone component → decomposed into GroupsPanel elements

**What's preserved and refactored:**
- Generation logic (`handleGenerate`, `handleGenerateAndShow`) → consolidated into a single "Make Groups" action
- Group size stepper → extracted from `GroupCard` into standalone stepper component
- Student add/remove logic → moved from `SetupStudentsSection` integration into persistent roster panel
- Generation settings persistence → reuse `generationSettings.ts`

**Implementation approach:**
1. Extract the student list from `SetupStudentsSection` into a new `RosterPanel.svelte`
2. Extract group display and generation trigger from `GroupCard` into a new `GroupsPanel.svelte`
3. Rewrite the page layout as a flex two-column layout
4. Move collapsible sections (rotation, observations, history) behind feature flags initially, removing them from the default view
5. Wire "Edit in Workspace" to `/classes/[id]/workspace`
6. Wire "Project" to enter projection mode

**Files changed:**
- Major rewrite: `src/routes/classes/[id]/+page.svelte`
- New: `src/lib/components/classview/RosterPanel.svelte`
- New: `src/lib/components/classview/GroupsPanel.svelte`
- New: `src/lib/components/classview/GroupSizeStepper.svelte`
- Modified or deprecated: `src/lib/components/activity/GroupCard.svelte`
- Modified: `src/lib/components/setup/SetupStudentsSection.svelte` (extract reusable parts)

**Acceptance criteria:**
- Two-panel layout renders correctly on desktop and iPad landscape
- Roster panel shows all students with add/remove capability
- Groups panel shows "Make Groups" when no groups exist
- Groups appear in panel after generation (no navigation)
- "Edit in Workspace" navigates to workspace
- "Project" enters projection mode
- ≤3 taps from app launch to groups displayed
- All existing generation settings and preferences logic still works

#### Step 5: Projection mode

Add projection mode to the Class View, similar to Proposal A.

**Implementation:** Extract the projection overlay from `live/+page.svelte` into a shared `ProjectionOverlay.svelte` component. Use it in both the Class View and the live page.

**Files changed:**
- New: `src/lib/components/classview/ProjectionOverlay.svelte`
- Modified: `src/routes/classes/[id]/+page.svelte` (add projection toggle and overlay)
- Modified: `src/routes/classes/[id]/live/+page.svelte` (use shared projection component)

**Acceptance criteria:**
- Same as Proposal A Step 5

#### Step 6: Autosave indicator

Add persistent "Saved to this browser" indicator to the Class View header area.

**Implementation:** The existing `SaveStatusIndicator.svelte` is enhanced with a "Saved to this browser" mode. The autosave mechanism from the workspace (500ms debounce to IndexedDB) already covers scenario persistence. The indicator reflects this state.

**Files changed:**
- Modified: `src/lib/components/editing/SaveStatusIndicator.svelte`
- Modified: `src/routes/classes/[id]/+page.svelte` (add indicator to header)

**Acceptance criteria:**
- Same as Proposal A Step 6

#### Step 7: Clean up deprecated routes and components

Remove the `/classes/[id]/setup` route (functionality now in Class View roster panel). Remove or mark deprecated components that are no longer used.

**Files changed:**
- Remove: `src/routes/classes/[id]/setup/+page.svelte` (redirect to `/classes/[id]`)
- Mark deprecated: `src/lib/components/setup/CollapsibleSection.svelte` (still used by workspace — do not remove)
- Remove unused imports from modified files

**Acceptance criteria:**
- No dead routes
- No unused component imports
- All redirects work

#### Step 8: Integration testing and rubric verification

Same as Proposal A — write E2E tests for the math teacher fast path, projection mode, terminology compliance, and return visits.

**Files changed:**
- New: `e2e/classview-fast-path.spec.ts`
- New: `e2e/classview-projection.spec.ts`
- New: `e2e/classview-terminology.spec.ts`

**Acceptance criteria:**
- Same as Proposal A Step 8

### Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| In-place refactoring breaks existing functionality during development | High | High | Feature-flag the layout change. Run existing E2E tests after every step. |
| Global find-and-replace for route paths misses dynamic references | Medium | Medium | Grep for `/activities` across entire codebase including test files. |
| Removing collapsible sections loses functionality users depend on | Medium | Medium | Sections are hidden, not deleted. Feature flag or "Advanced" link provides access. |
| Large diff in `[id]/+page.svelte` makes code review difficult | High | Low | Break the rewrite into sub-PRs: layout change, then feature additions, then cleanup. |

### What this proposal does NOT include (deferred to Phase 2+)

Same as Proposal A — no drag-and-drop in Class View, no preference panels, no history panel, no constraint settings.

---

## Comparison Matrix

| Dimension | Proposal A: Parallel Migration | Proposal B: In-Place Transformation |
|---|---|---|
| **Regression risk** | Low — old routes untouched | Higher — modifying live routes |
| **Code duplication** | More initially (parallel routes) | Less (direct modification) |
| **Migration complexity** | Deferred (redirect swap later) | Upfront (route rename first) |
| **Review-ability** | Easier — new code is additive | Harder — large diffs in existing files |
| **Rollback** | Easy — delete new routes | Harder — must revert modifications |
| **Time to first demo** | Slightly longer (building from scratch) | Shorter (modifying existing working code) |
| **Phase 2 readiness** | Clean slate for Class View evolution | Must refactor around existing patterns |
| **File count** | More new files created | Fewer new files, more modifications |
| **Testing during development** | Both old and new routes testable simultaneously | Only one set of routes, must pass all tests throughout |
| **Domain layer changes** | None | None |
| **Hexagonal architecture compliance** | Full — new UI layer only | Full — UI layer modifications only |

### Recommendation factors

**Choose Proposal A if:**
- Risk aversion is high (the existing app must remain fully functional for current users at all times)
- The team prefers additive development over rewriting
- Phase 2 will involve significant Class View changes that benefit from a clean component tree
- There may be a period where both old and new UI need to coexist (e.g., A/B testing)

**Choose Proposal B if:**
- Speed of delivery is prioritized
- The team is comfortable with in-place refactoring and has good test coverage
- Minimizing long-term code duplication is important
- There is no need for the old `/activities` flow to remain functional once work begins

---

## Shared Exit Criteria (Both Proposals)

These exit criteria map directly to the UX research report's Phase 1 definition:

1. **Math teacher fast path:** App launch → groups on projector in ≤3 taps and ≤10 seconds
2. **Rubric compliance:** Categories A (Information Architecture) and C (Interaction Cost) score ≥4.0 for the math teacher flow
3. **Terminology compliance:** Zero instances of "Activity", "Pool", or "Program" in user-facing UI
4. **Data resilience:** "Saved to this browser" indicator visible on all screens; returning user finds their data intact
5. **Projection readability:** Student names at ≥36pt, group names at ≥48pt, contrast ≥7:1 in projection mode
6. **No regressions:** All existing E2E tests pass (with updated routes/selectors as needed)
7. **Red-line compliance:** No red-line failures from rubric categories A, B, C, D, E, F, G for the math teacher flow
