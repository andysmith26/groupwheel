# GroupWheel Consolidated UX Design Document

**Status:** Approved decisions, ready for specification
**Date:** February 2026
**Source:** Reconciliation of two independent UX research reports, resolved through 12 structured design decisions.

---

## Part 1: Foundation — The 12 Design Decisions

These decisions were made sequentially, with each building on the ones before it. They are the authoritative source for any downstream design or implementation question. When a decision below conflicts with either source report, the decision below wins.

### Decision 1: Adopt Cooper's Posture Framework

GroupWheel serves two fundamentally different interaction styles. Rather than treating this as a practical constraint to manage ad hoc, we adopt Alan Cooper's sovereign/transient posture framework (_About Face_) as the organizing theory for the entire product.

**What this means:** The math teacher needs a transient-posture tool — open, generate, project, done in 10 seconds. The club administrator needs a sovereign-posture workspace — persistent, analytical, iterative over hours. These are not two ends of a spectrum; they are two different interaction modes that require different interface surfaces sharing the same data.

**What this does not mean:** Two separate apps. The domain layer, use cases, ports, data model, and infrastructure are shared. The divergence happens at the UI layer. GroupWheel's hexagonal architecture makes this natural — ports and use cases don't care which surface is calling them.

**Precedent:** Figma (design workspace vs Dev Mode), Arc browser (full browser vs Little Arc), Pear Deck (Projector View vs Teacher Dashboard vs Student View).

**Test:** "Does this screen's density and interaction cost match the posture of the user who's looking at it?"

### Decision 2: Two-Screen Architecture (Home → Class View)

The current four-screen flow (Dashboard → Activity Detail → Workspace → Live View) is replaced by a two-screen adaptive architecture. Since GroupWheel has no current users, there is no incremental migration — build the target architecture directly.

**Screen 1: Home (Class List).** Shows all activities as large, tappable cards. Each card shows activity name, student count, last-used date, and a one-tap "Make Groups" shortcut button. Includes a "Quick Start" option (see Decision 5). For a user with one activity, this screen is a brief waypoint. Activity creation is a single inline action ("+ New Activity" → name it → done).

**Screen 2: Class View (Adaptive Workspace).** Replaces Activity Detail, Workspace, and Live View. This is the product. It holds the roster, the generate button, the groups display, projection mode, and — when data warrants it — analytics panels, drag-and-drop editing, history, and constraint settings. The Class View adapts its information density based on what data exists (see Decision 4), satisfying both postures from a single screen.

**What is eliminated:**

- The Activity Detail screen (hub page) — its functions are distributed to Class View
- Any activity creation wizard — replaced by inline creation and zero-data quick start
- Any screen that exists solely as a navigation waypoint with no unique function
- Group size controls in more than one location — consolidated to one inline stepper

**What is consolidated:**

- Group editing + generation settings + history → all live in Class View's panels
- Roster management + preference import + student data → all live in Class View's Roster panel
- Live View + Workspace → merged into Class View with Projection mode toggle

**Banked note:** "No users" is a temporary asset. Build the right structure now precisely because there are no migration constraints. Every architectural change gets harder once users exist.

### Decision 3: Full Session Lifecycle (Build Core First, Extend to Observation)

GroupWheel's destination covers the entire class session lifecycle: generate → project → observe → time → end. This means observation mode (one-tap sentiment recording, text notes, floating countdown timer) and a feedback loop where observations from Session N inform Session N+1's groupings.

**However, the implementation path is sequential:**

**Phase 1 (ship first):** Generate → Project → Done. The complete core grouping product. Home → Class View. Both persona flows fully functional. This is a complete, shippable product.

**Phase 2 (extend):** Add observation mode, timer, sentiment persistence, and trend aggregation into the Class View that Phase 1 validated.

**The critical discipline:** During Phase 1, make architectural decisions that leave room for observation without implementing it. The Class View's state model should account for a "live session" state even if the only thing that state does in Phase 1 is enable projection. In Phase 2, that same state gains observation capabilities.

**Banked principle:** "Design for the full vision, build in deliverable slices." Each slice ships as a complete product, not a scaffold waiting for the next phase to become useful.

### Decision 4: Data-State Adaptation (No Toggles)

When preference data exists, preference-related features (satisfaction metrics, per-student rank badges, analytics panels) appear automatically. When preference data does not exist, those features are invisible. There is no "Preference mode" toggle. The interface reads the data, not the user's intent.

This directly implements Decision 1: the Class View reshapes itself based on data state and task context. A math teacher with no preference data sees a sparse transient surface. A club admin with preference data sees a rich sovereign surface. Neither encounters a mode switch.

**Precedent:** GitHub pull requests (review UI appears when reviews exist), Gmail (reply UI appears when you click reply, not via a mode toggle).

**Banked note:** Define clear data thresholds for when features appear during Class View specification. "Preference data exists" is insufficient — specify what quantity and completeness of preference data triggers each UI element. Does one student with one preference trigger the analytics panel? Resolve this when speccing the Class View.

### Decision 5: Zero-Data Quick Start

A brand new user can generate groups immediately without entering any student data. The Home screen offers a Quick Start option: enter a number of students and a group size, receive groups instantly with placeholder names (Student 1, Student 2, ...). After experiencing the result, a gentle prompt: "Want to add real names? Paste your roster anytime."

This eliminates the cold-start barrier entirely. A new teacher sees GroupWheel's value in under 15 seconds, before committing any real data.

**Precedent:** Canva (start with a template, swap in your own content when ready).

**Consistency check:** A quick-start activity has no preference data, so the Class View automatically presents the sparse transient surface (Decision 4). The system is self-consistent.

**Banked note:** Define what happens when a teacher pastes a real roster into a quick-start activity. Does it replace placeholders in-place (preserving group assignments) or create a fresh state? The answer should feel like "upgrading" not "starting over." Resolve during Class View specification.

### Decision 6: Rotation Avoidance — On by Default, in Settings, with One-Time Hint

"Avoid Recent Groupmates" is the feature that prevents students from being grouped with the same people they worked with recently. It is:

1. **On by default** — a new activity with session history automatically avoids recent groupmates with a lookback window of 3 sessions.
2. **Configurable in Settings** — the toggle and lookback window (1–10 sessions) live in Settings, not on the generation UI.
3. **Surfaced via one-time hint** — after the teacher's second session, a dismissable inline hint appears: "Groups now avoid recent groupmates. Change this in Settings." This hint appears once and never returns.

**Rationale:** Rotation avoidance is the primary reason a math teacher uses GroupWheel instead of popsicle sticks. It must work without configuration. But it doesn't need permanent screen real estate — it should be invisible when it's working correctly, and discoverable when someone wants to adjust it.

**Banked pattern:** "On by default + one-time education" is reusable. Anytime a feature is important enough that users should know it exists but not important enough to earn permanent screen real estate, apply this pattern.

### Decision 7: Terminology — Kill the Worst, Keep "Activity"

**Rename now (eliminated from all user-facing labels):**

- "Pool" — opaque data model term, no user would guess its meaning
- "Program" — opaque data model term, no user would guess its meaning

**Keep:**

- "Activity" — generic but correct across all use cases (math class, club signup, carnival session). Renaming to "Class" would serve the math teacher but would be wrong for club administrators and other use cases.

**Keep as-is (generic but not confusing):**

- "Session," "roster," "preferences," "scenario," "groups," "students"

**Enforcement:** No red-line rule. Code review heuristic: "Would a user understand this label without explanation?" If the answer is "probably not," it's a defect. If the answer is "it's not their word but they'd get it," it ships.

**Banked note:** Terminology decisions must survive all personas, not just the primary one.

### Decision 8: Multiplayer-Ready Data Model, Single-User Everything Else

GroupWheel is single-user, single-device, local-storage today. But the data model should not assume this permanently.

**Do now (cheap, good engineering regardless):**

- Every entity gets a `createdBy` / `ownerId` field (even if it's always the same value)
- Every mutation gets `createdAt` / `updatedAt` timestamps
- IDs remain UUIDs via the IdGenerator port
- Export format is self-contained (a single export file has everything needed to reconstruct state on another device)

**Defer (speculative, expensive, no current user need):**

- Conflict resolution strategies (CRDTs, last-write-wins, etc.)
- Permission models (viewer/editor/owner roles)
- Real-time presence or cursor sharing
- Sync protocols or server infrastructure
- UI for sharing, inviting, or managing collaborators

**Banked boundary:** "Multiplayer-ready" means the data model doesn't assume single-user. It does not mean the application layer, infrastructure, or UI accounts for multiple users.

### Decision 9: No Bottom Navigation

With two screens (Home → Class View) and the Class View being where users spend 95%+ of their time, a persistent bottom navigation bar is unnecessary overhead. Two screens need a back button, not a navigation framework.

**Banked note:** The thumb-zone concern is real but is solved as a Class View layout decision (positioning Make Groups, Project, and other primary actions in reachable areas), not as a navigation architecture decision. Resolve during Class View layout specification.

### Decision 10: Hybrid Rubric — Red-Lines Plus Lightweight Criteria

**Layer 1: 14 Red-Line Criteria (binary pass/fail, blocks shipping)**

These are automatic failures that make a screen a mandatory fix regardless of other scores.

_Information architecture:_

- A-R1: Primary persona's primary action requires more than 3 taps from app launch
- A-R2: Any technical term visible to user that a teacher/admin would not understand without explanation (e.g., "Pool," "Program")

_Visual hierarchy:_

- B-R1: Any screen intended for projection has text smaller than 36pt or contrast ratio below 4.5:1

_Interaction cost:_

- C-R1: Math teacher's daily flow (generate new groups for existing activity) requires text entry
- C-R2: Any primary action button is smaller than 44×44px

_Progressive disclosure:_

- D-R1: A feature irrelevant to the current user's data state (e.g., preference analytics when no preference data exists) is visible in primary navigation

_Consistency:_

- E-R1: The same action appears in different positions on the screen across different flows

_Error and trust:_

- F-R1: Any action that destroys user data has no undo path and no confirmation step
- F-R2: Any algorithmic conflict or failure (e.g., student cannot be matched to any preference) is not surfaced to the user
- F-R3: Any composite action where partial failure results in silent loss of the successful steps' results

_Accessibility:_

- G-R1: Any WCAG 2.1 Level A criterion is not met
- G-R2: Group assignments are distinguishable only by color

_In-session workflow (Phase 2+):_

- H-R1: Observation recording during a live session requires leaving the session view
- H-R2: A live-session timer is not accessible from the observation/teacher view

**Banked note:** Write these 14 red-lines on a single page you can scan in under 2 minutes. If you can't check them that fast, you won't check them.

**Layer 2: Lightweight Scoring Criteria (~13 criteria, 1-5 scale)**

Used for holistic screen evaluation, not on every commit. Score during design review or at phase gates.

1. **Group generation speed:** Time from app open to groups displayed. Target: <10 seconds, ≤3 taps for math teacher. (5 = immediate/one tap; 3 = <10s/2-3 taps; 1 = >10s or >3 taps)
2. **Navigation simplicity:** Key functions accessible directly from main screens, no deep nesting. (5 = all tasks in ≤2 screens; 1 = disjoint flows requiring many clicks)
3. **Cognitive load:** Each screen shows only current task information; ≤5-7 distinct UI elements at any decision point. (5 = minimal, focused; 1 = cluttered and overwhelming)
4. **Direct manipulation & feedback:** All edits apply instantly with undo. Visual feedback confirms actions. (5 = real-time with "Saved" indicator; 1 = requires manual save or confirmation dialogs)
5. **Algorithm transparency:** Outcomes and constraints displayed clearly. Preference rank badges, satisfaction metrics, natural-language explanations. (5 = comprehensive metrics + explanations; 1 = no algorithm info visible)
6. **Progressive disclosure:** Advanced options hidden by default, revealed by data state or user request. Two-level maximum. (5 = clean separation; 1 = everything dumped on one screen)
7. **Data resilience:** Clear local-storage communication, export/import accessible within 2 taps, autosave with visible confirmation. (5 = explicit export/import + clear offline notice; 1 = no backup strategy)
8. **Touch target size:** All targets ≥44×44px; primary actions ≥48px with generous spacing. (5 = all meet guideline; 1 = multiple small targets)
9. **Readability:** Projected text ≥60pt, normal text appropriately sized, contrast ≥4.5:1 (≥7:1 for projection). (5 = legible at 30 feet; 1 = too small or poor contrast)
10. **One-handed usability:** Primary actions in thumb-reachable zones on iPad. (5 = all frequent buttons reachable one-handed; 1 = critical buttons in unreachable spots)
11. **Autosave & user control:** Edits auto-save with visible confirmation. Revert/undo always available. Start-over path clear. (5 = seamless with feedback; 1 = "did that save?" confusion)
12. **Accessibility:** ARIA labels, color independence, screen reader compatibility, keyboard operability for all functions. (5 = passes WCAG AA checks; 1 = fails standards)
13. **Posture match:** Interface density and interaction cost match the user's current task posture. (5 = perfectly adapted; 1 = sovereign complexity for transient task or vice versa)

### Decision 11: Structured Phases with Lightweight Gates

Work is sequenced in explicit phases. Each phase has entry criteria, defined scope, and exit criteria. A phase cannot begin until the previous phase's exit criteria are met.

**Gate structure:** Each phase gate consists of the 14 red-line criteria (binary pass/fail) plus 2-3 scenario-specific acceptance tests defined per phase. Phase gate criteria must be verifiable in an afternoon.

Phase definitions are in Part 4 of this document.

**Banked note:** Phase gates are verifiable in an afternoon, not a week. "Math teacher flow is ≤3 taps and ≤10 seconds — time it with a stopwatch" is a good gate. "All rubric categories score ≥4.0" is too heavy for a solo developer.

### Decision 12: No Tutorial — Quick Start and Empty States Are the Onboarding

The first-run experience is the zero-data quick start (Decision 5) and well-designed empty states with clear CTAs. There is no tutorial overlay, no guided tour, no tooltip walkthrough.

If a screen needs a tutorial to explain it, the screen needs redesign, not a tutorial.

**Banked principle:** "If you need a tutorial to explain it, the design isn't done yet."

---

## Part 2: UX Guiding Principles

These principles are retained from the source reports, filtered and refined through the 12 decisions above. Each principle has a research basis, a test question, and a shorthand for rubric reference.

### P1 — Posture-Adaptive, Not Mode-Gated

_Basis:_ Cooper's sovereign/transient posture framework; Decision 1; Decision 4.

The mechanism is posture adaptation based on data state and task context. When no preference data exists, the interface presents a transient-posture grouping tool. When preference data exists, it reveals sovereign-posture workspace features. No toggles, no mode switches, no persona selection.

_Test:_ "If a user has never entered preference data, does this screen show any preference-related UI elements? If yes, it fails P1."

### P2 — Time-to-Projection Under 10 Seconds

_Basis:_ Nielsen's three response-time limits; Hick's Law; Fitts's Law; Decision 2.

The 10-second budget accounts for the full sequence: open app → select activity → generate groups → project. This budget allows roughly 3 taps plus cognitive decision time. Each decision point presents no more than 3-5 clearly distinct options. Primary action targets are oversized (≥56pt on iPad) and positioned in the thumb zone.

_Test:_ "Can a returning user go from app launch to projected groups in ≤3 taps and ≤10 seconds? Time it with a stopwatch."

### P3 — Trust Through Algorithmic Transparency

_Basis:_ Microsoft Copilot UX guidance; Kizilcec's research on partial transparency; Nielsen's Heuristics #1 and #9.

Transparency means showing _why_ each student is in their group via simple natural language ("Alex got their 2nd choice because their 1st choice was full"), surfacing unmatched preferences prominently, and showing satisfaction metrics at group and individual level. The output is always a starting point, never a final answer — enable inline editing of every algorithmic decision.

_Test:_ "For any algorithmically generated assignment, can the user see in plain language why a specific student was placed in a specific group within one tap? Are all unresolvable conflicts surfaced without the user having to search for them?"

### P4 — Data Resilience and Explicit Risk Communication

_Basis:_ Norman's conceptual models; NNGroup's autosave research; Decision 8.

Show a persistent, subtle indicator of data storage location ("Saved to this browser" with a device icon). Provide export prompts at natural workflow endpoints. Warn before clearing browser data. Use "saved to this device" language consistently — never use cloud-suggestive language.

_Test:_ "Does every screen show where data is stored? Is there a clear export path reachable within 2 taps from any screen?"

### P5 — Classroom-Native: Projectable, Touchable, Glanceable

_Basis:_ Projection readability research (60-84pt minimum at 20-30 feet); Apple HIG (44pt minimum touch targets); Kahoot and Pear Deck precedents.

Classroom-native means: (1) a dedicated projection view with dramatically larger type, higher contrast (7:1+), and no teacher-private information visible; (2) touch targets at 48px minimum with generous spacing for one-handed iPad use; (3) glanceable status — the teacher can glance at the screen and understand the state in under 2 seconds. Student names in projected view should be at least 36pt with high-contrast backgrounds.

_Test:_ "Can a student sitting 30 feet from the projector read their name and group assignment? Can the teacher operate this screen one-handed on an iPad without looking for more than 2 seconds?"

### P6 — Direct Manipulation Over Abstract Configuration

_Basis:_ Shneiderman's direct manipulation principles; NNGroup's drag-and-drop research; Norman's natural mapping.

Every group assignment is editable by dragging a student name between groups. No modal dialogs or settings pages required for common adjustments. Drag-and-drop includes grab handles, ghost images, live reflow, and immediate feedback. Per WCAG 2.5.7, a keyboard alternative (Select → Move to → Choose group) exists for every drag action.

_Test:_ "Can the user move a student between groups without opening any dialog, menu, or settings page?"

### P7 — Progressive Disclosure with a Two-Level Maximum

_Basis:_ NNGroup's foundational article on progressive disclosure (Nielsen, 2006).

Level 1 is what every user sees on every visit (activity list, generate button, group display). Level 2 is what appears on request or when data state warrants it (preference analytics, rotation history, constraint settings, export tools). There is no Level 3. If a feature cannot fit into Level 1 or Level 2, it either doesn't belong in the product or needs restructuring.

_Test:_ "Starting from any feature, how many disclosure steps are required to reach it? If more than 2, it fails P7."

### P8 — Continuous Workspace, Not Wizard Steps

_Basis:_ NNGroup's wizard pattern guidance; ClassDojo's one-tap daily use model; Decision 2.

Wizards are appropriate only for first-time onboarding (initial activity creation, first roster import). Daily use is workspace-based: the teacher returns to a persistent state that remembers their roster, settings, and history. The returning math teacher's daily flow: open app → see last activity → tap "New Groups" → see groups. No intermediate screens.

_Test:_ "On a returning user's second visit, do they encounter any wizard-style sequential steps before reaching their primary action? If yes, it fails P8."

### P9 — Consistency Through Vocabulary and Layout

_Basis:_ Nielsen's Heuristic #4; Jakob's Law; Decision 7.

Every concept uses vocabulary users already understand. "Pool" and "Program" are eliminated. "Activity" is the organizing concept (not "Class," which is wrong for club admins). Group size controls exist in exactly one place. Interaction patterns are identical for identical tasks across all screens.

_Test:_ "Would a user with zero training understand every label on this screen? Does this setting/control appear in exactly one location?"

### P10 — Error Prevention Over Error Recovery

_Basis:_ Nielsen's Heuristic #5; Norman's two error types (slips and mistakes).

Prevent empty groups by auto-redistributing when students are removed. Prevent data loss by continuous autosave with visible indicator. Prevent "start over" anxiety by providing undo for every action and soft-delete for activities (recoverable from trash). Prevent "I lost my work" with automatic export reminders at semester boundaries.

_Test:_ "Is there any action in this flow that, once taken, cannot be undone? What is the recovery path and how many seconds does it add?"

### P11 — Accessibility as Foundation, Not Afterthought

_Basis:_ ADA Title II (April 2024); WCAG 2.1 Level AA; Decision 10 red-lines.

Color-blind safe palettes are critical — 8% of male students have some form of color vision deficiency. Group differentiation uses color + icon/pattern + label (never color alone). All drag-and-drop has keyboard alternatives. All projected content meets AAA contrast (7:1) because projectors wash out color.

_Test:_ "Can a color-blind user distinguish all groups? Can a keyboard-only user complete every task? Does projected content meet 7:1 contrast?"

### P12 — Opinionated Defaults, Optional Depth

_Basis:_ Linear's design philosophy; Tesler's Law; Decision 5; Decision 6.

The app should never ask a question it can answer itself. Groups of 3, random assignment, avoid recent groupmates — these are opinionated defaults that work for 80% of cases. The zero-data quick start lets a new user see generated groups without providing any real data. The teacher experiences value before committing data.

_Test:_ "If the user taps the primary action button without changing any settings, does the result work well for 80% of cases? Can a new user see generated groups without providing any real student data?"

### P13 — In-Session Workflow: Observe, Don't Just Display

_Basis:_ Liljedahl's _Building Thinking Classrooms_; formative assessment research (Black & Wiliam); Apple HIG for iPad multitasking; Decision 3.

**Note: This principle guides Phase 2 implementation. Phase 1 ships without observation features but the architecture accommodates them.**

GroupWheel covers the complete session lifecycle: generate → project → observe → time → end. Observation tools respect the constraint that the teacher's primary attention is on students, not a screen: one-tap sentiment recording (≥56px targets), zero confirmation dialogs, immediate visual feedback, under 2 seconds per observation. A floating countdown timer eliminates device-switching. Observations from Session N inform Session N+1's grouping decisions.

_Test:_ "Can the teacher record a sentiment observation on a specific group in under 2 seconds without looking at the screen for more than a glance?"

### P14 — Graceful Degradation Over Atomic Success

_Basis:_ Postel's Law ("Be conservative in what you send, be liberal in what you accept"); Stripe's payment UX.

When a composite action partially succeeds, preserve the successful portion rather than rolling back everything. The user should always end up in a state where they can see what happened and decide what to do next.

**Specified failure modes for critical paths:**

_Generate & Show (generate groups → create session → navigate to projection):_

- Generation succeeds, show fails → Navigate to Class View; groups are visible and editable. Inline error: "Groups ready — couldn't start the live session. You can show them from here."
- Generation fails → Remain on current screen. Inline error with specific cause.

_Import & Validate (parse roster → validate names → create students):_

- Parse succeeds, some rows invalid → Import valid rows. Surface invalid rows in dismissible summary.
- Parse fails entirely → Remain on import screen. Error with format guidance.

_Export (gather data → serialize → download):_

- Serialization succeeds, download fails → Offer retry and clipboard alternative. Never silently swallow failure.

_Observation Recording (Phase 2) (capture sentiment → persist to IndexedDB):_

- Capture succeeds, persist fails → Show observation as recorded (optimistic update). Retry silently. After 3 failed retries, subtle warning.

_Test:_ "For every composite action, what happens when step N succeeds but step N+1 fails? Does the user retain the results of step N?"

---

## Part 3: Information Architecture

### Screen Structure

**Home (Screen 1)**

Purpose: Activity hub and entry point.

Contents:

- Activity cards (name, student count, last-used date, one-tap "Make Groups" shortcut)
- "+ New Activity" inline action (name it → done, no wizard)
- "Quick Start" option (enter student count + group size → groups with placeholder names)
- Settings icon (gear) → minimal: data management, export all, about/privacy

Behavior:

- Single-activity users pass through quickly
- Multi-activity users (club admins managing several groups) use this as their organizational hub

**Class View (Screen 2)**

Purpose: The product. Everything happens here.

_Minimal state (transient posture, math teacher):_

- Roster panel (left): student names, import/paste action
- Groups panel (right): generated groups, "Make Groups" button at top, group size stepper inline
- "Project" button: expands groups to full-screen projection mode
- After first session: rotation avoidance active by default (invisible unless user goes to Settings)
- After second session: one-time dismissable hint about rotation avoidance

_Enriched state (sovereign posture, club admin — appears automatically via Decision 4):_

- Roster panel gains: preference status indicators per student, import tools
- Groups panel gains: drag handles on student names, per-student preference rank badges (color-coded green through red)
- Expandable Analytics panel (bottom): satisfaction metrics with contextual interpretation ("Strong: 72% got their first choice"), improvement suggestions when actionable
- Expandable History panel (sidebar): generation history, session history, observation trends (Phase 2+)
- Expandable Settings panel (sidebar): constraint configuration, export tools
- Inline conflict alerts within Groups panel for unresolvable preference conflicts
- "Compare" action: generates a second arrangement alongside current one, side-by-side with metrics and student-level diff highlighting, one-click selection

_Projection mode (from either state):_

- Full-screen, high-contrast, large-type group display
- Teacher controls collapse to floating minimal toolbar (re-generate, exit projection)
- No teacher-private information visible
- Student names ≥36pt, body text ≥60pt, contrast ≥7:1

_Observation mode (Phase 2, from live session state):_

- All groups visible with large sentiment buttons (👍/👎/😐, ≥56px) per group card
- One-tap recording with immediate visual confirmation
- Swipe or long-press for text note entry
- Observation count badge per group card
- Floating countdown timer: presets (5, 10, 15, 20 min), one-tap start, glanceable from across room, optional chime, persists across view switches
- Can operate simultaneously with projected student view on separate display

### Feature Mapping: Current → New Architecture

| Current Location         | Feature                           | New Location                                         | Notes                                               |
| ------------------------ | --------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Dashboard                | Activity list                     | Home                                                 | Terminology unchanged                               |
| Activity creation wizard | Activity creation + roster import | Home → "+ New Activity" inline + Class View → Import | Wizard eliminated                                   |
| — (new)                  | Zero-data quick start             | Home → "Quick Start"                                 | Placeholder names, value before commitment          |
| Activity Detail          | Generation settings               | Class View → inline near "Make Groups"               | Settings co-located with the action they configure  |
| Activity Detail          | Generation history                | Class View → expandable History panel                | Collapses when not needed                           |
| — (new)                  | Avoid Recent Groupmates           | On by default; configurable in Settings              | One-time hint after session 2                       |
| Workspace                | Drag-drop group editing           | Class View → Groups panel                            | Always visible when groups exist                    |
| Workspace                | Preference analytics              | Class View → expandable Analytics panel              | Only visible when preference data exists (P1)       |
| — (new)                  | Scenario comparison               | Class View → "Compare" action                        | Side-by-side with diff; club admin workflow         |
| — (new)                  | Per-student preference badges     | Class View → Groups panel → student cards            | Color-coded rank; green through red                 |
| Live View                | Projected student view            | Class View → Projection mode                         | Same screen, different mode                         |
| Live View                | Teacher tab                       | Class View → Observation mode (Phase 2)              | Dedicated in-session view                           |
| — (new)                  | Floating countdown timer          | Class View → Observation mode (Phase 2)              | One-tap presets; visible from across room           |
| — (new)                  | Observation trends                | Class View → History panel (Phase 2)                 | After 3+ sessions with observations                 |
| Settings                 | CSV/paste import                  | Class View → Roster panel → Import action            | Contextual, not a separate settings area            |
| Settings                 | Global app settings               | Home → Settings icon                                 | Minimal: data management, export all, about/privacy |

### Handling "Start Over"

Three-tier reset model:

**Re-generating groups (most common):** Single tap on "Make Groups" generates new groups. Previous arrangement automatically saved to history, recoverable via undo or history. No confirmation needed.

**Clearing preferences/configuration:** "Clear preferences" action in Settings with confirmation dialog explicitly stating what will be removed and what will be kept.

**Deleting an activity entirely:** Soft-delete to "Recently Deleted," recoverable for 30 days.

---

## Part 4: Phased Redesign Sequence

### Phase 1: Foundation — Core Grouping Product (4-6 weeks)

**Objective:** Deliver both personas' complete grouping workflows in a two-screen architecture.

**Scope:**

- Build Home screen with activity cards, inline creation, quick start
- Build Class View with minimal state: roster panel + groups panel + "Make Groups" button + group size stepper + basic projection mode
- Build Class View enriched state: preference import, analytics panel with contextual interpretation, drag-and-drop with preference badges, history panel, constraint settings, scenario comparison
- Implement rotation avoidance: on by default, configurable in Settings, one-time hint after session 2
- Implement continuous autosave with visible "Saved to this browser" indicator
- Implement zero-data quick start with post-creation prompt
- Implement P14 graceful degradation for all composite actions (generate & show, import & validate, export)
- Eliminate "Pool" and "Program" from all user-facing labels
- Implement multi-step undo/redo for drag-and-drop actions
- Implement data model multiplayer-readiness (ownerId, createdBy, createdAt, updatedAt on all entities)

**Architecture note:** The Class View's state model must include a "live session" concept that, in Phase 1, only enables projection mode. This is the seam for Phase 2's observation mode.

**Exit criteria (verifiable in an afternoon):**

- Red-line checklist: all 12 applicable red-lines pass (H-R1 and H-R2 are Phase 2)
- Math teacher scenario: app launch → groups on projector in ≤3 taps and ≤10 seconds (stopwatch test)
- Club admin scenario: import preferences → generate → view analytics → drag-and-drop refine → compare two scenarios → export (complete flow, no dead ends)
- Quick start scenario: new user sees generated groups in under 15 seconds with no real data
- Rotation avoidance: on by default after first session; hint appears after second session; configurable in Settings
- No user-facing label uses "Pool" or "Program"

### Phase 2: In-Session — Observation and Facilitation Tools (4-6 weeks)

**Objective:** Extend the Class View to cover the complete session lifecycle for BTC teachers.

**Scope:**

- Build Observation mode within Class View's live session state: all groups visible with sentiment buttons (≥56px), one-tap recording, immediate visual confirmation, swipe/long-press for text notes, observation count badges
- Build floating countdown timer: presets, one-tap start, large countdown, optional chime, persists across view switches
- Build Quick Note: sheet with group selector + text input
- Implement observation persistence to IndexedDB with P14 graceful degradation
- Build observation trends in History panel: per-class aggregates after 3+ sessions (total observations, sentiment breakdown, per-session trend)
- Implement dual-screen support: teacher sees observation view on iPad while students see groups on projector

**Exit criteria:**

- All 14 red-lines pass (including H-R1 and H-R2)
- Observation recording: <2 seconds per sentiment with immediate feedback (stopwatch test)
- Timer: operates independently of observation recording, visible from across room
- Teacher can complete full session lifecycle without leaving GroupWheel: generate → project → observe → time → end

### Phase 3: Polish — Projection, Accessibility, and Trust (3-4 weeks)

**Objective:** Production-quality projection mode, full accessibility compliance, and algorithmic transparency.

**Scope:**

- Enhanced projection mode: animated group reveal, QR code display, dual-screen refinement
- Color-blind safe palette with icon/pattern differentiation (viridis-based)
- Full keyboard navigation with visible focus indicators
- Screen reader compatibility with ARIA live regions for dynamic updates
- Per-student algorithmic explanations with natural language
- Export/import functionality refinement
- Privacy page
- WCAG 2.1 AA compliance verification (Lighthouse, axe, manual VoiceOver testing)
- Projection readability verification at 30 feet (physical test)

**Exit criteria:**

- WCAG 2.1 AA compliance verified
- Projection mode readable at 30 feet
- All red-lines pass
- Lightweight rubric criteria all score ≥3

### Phase 4: Power Features and Refinement (3-4 weeks)

**Objective:** Raise the ceiling without raising the floor.

**Scope:**

- Density controls in Groups panel
- Multi-select with batch operations
- Constraint visualization (subtle indicators on student cards, green/red feedback during drag)
- Keyboard shortcuts (Cmd+K command palette)
- Rotation tracking visualization for BTC teachers (coverage percentage, per-student partner counts)
- Interactive demo mode: "Try GroupWheel" on empty Home creates demo activity with sample students and guided overlay
- Semester-end export reminders and data management tools
- Performance optimization targeting <100ms for all actions, <1 second for generation

**Exit criteria:**

- All red-lines pass
- Lightweight rubric criteria all score ≥4
- Power features discoverable but invisible to users who don't need them (P7, P12 compliance)

---

## Part 5: Banked Notes — Open Specification Questions

These items were identified during decision-making and must be resolved during detailed specification for their respective phases. Each is tagged with the decision that generated it.

### Resolve During Class View Specification (Phase 1)

1. **Data thresholds for progressive disclosure (Decision 4):** Define the exact data conditions that trigger each UI element. Does one student with one preference trigger the analytics panel? What about 50% of students? Define thresholds per feature: analytics panel, preference badges, improvement suggestions, scenario comparison.

2. **Quick-start upgrade path (Decision 5):** Define what happens when a teacher pastes a real roster into a quick-start activity. Does it replace placeholders in-place (preserving group assignments) or create a fresh state? The answer should feel like "upgrading" not "starting over."

3. **Thumb-zone layout for primary actions (Decision 9):** Position Make Groups, Project, and other primary actions in thumb-reachable zones on iPad. This is a layout decision within the Class View, informed by thumb-zone research but not requiring a bottom navigation bar.

4. **"Live session" state model (Decision 3):** The Class View needs a state concept for "session in progress" that, in Phase 1, only enables projection. Design the state transitions so that Phase 2's observation mode plugs in without restructuring.

### Resolve During Phase 2 Specification

5. **Observation-to-grouping feedback loop (Decision 3):** Define how observation data from Session N concretely influences Session N+1's grouping. Is it advisory (teacher sees trends and decides)? Algorithmic (negative-sentiment groups are avoided)? Both? This has domain model implications.

### Carry Forward as Ongoing Heuristics

6. **Terminology check (Decision 7):** On every PR that adds user-facing text: "Would a user understand this label without explanation?"

7. **Tutorial temptation check (Decision 12):** If you feel the urge to add a tooltip or tutorial for a feature, treat it as a signal that the UI needs simplification.

8. **Posture check (Decision 1):** On every screen design: "Does this screen's density and interaction cost match the posture of the user who's looking at it?"

9. **Two-level check (P7):** On every new feature: "How many disclosure steps to reach this? If more than 2, restructure."

---

## Part 6: Architecture Mapping — Current → New

This section maps every piece of the existing codebase to its fate in the Blizzard architecture. Every route, component, store, and domain entity is classified as **KEEP** (use as-is), **ADAPT** (modify for new architecture), **MOVE** (relocate to different surface), **REPLACE** (rebuild from scratch), or **DELETE** (remove entirely).

### 6.1 Routes

| Current Route                           | Fate        | New Location                                   | Notes                                                                                                                 |
| --------------------------------------- | ----------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/`                                     | **ADAPT**   | `/` (Home)                                     | Currently auto-redirects to `/activities`. Becomes the Home screen with activity cards, Quick Start, inline creation. |
| `/activities`                           | **REPLACE** | `/` (Home)                                     | Current card grid becomes the Home screen. Merge into `/`.                                                            |
| `/activities/new`                       | **DELETE**  | —                                              | 3-step wizard eliminated. Activity creation becomes inline on Home ("+ New Activity" → name → done).                  |
| `/activities/import`                    | **DELETE**  | —                                              | Import flow moves into Class View roster panel.                                                                       |
| `/activities/[id]`                      | **DELETE**  | —                                              | Activity Detail "hub" page eliminated. Its functions are distributed to Class View.                                   |
| `/activities/[id]/setup`                | **DELETE**  | —                                              | Already a dead-end redirect.                                                                                          |
| `/activities/[id]/workspace`            | **ADAPT**   | `/activity/[id]` (Class View)                  | Core workspace becomes the Class View. Route simplified.                                                              |
| `/activities/[id]/live`                 | **MOVE**    | `/activity/[id]` (Class View, Projection mode) | Live view merged into Class View as a mode toggle, not a separate route.                                              |
| `/activities/[id]/analytics`            | **MOVE**    | `/activity/[id]` (Class View, Analytics panel) | Per-activity analytics become an expandable panel in Class View.                                                      |
| `/activities/[id]/print`                | **KEEP**    | `/activity/[id]/print`                         | Print layout stays as a separate route (browser print requires it).                                                   |
| `/activities/[id]/students/[studentId]` | **MOVE**    | Class View sidebar                             | Student profile becomes a slide-in sidebar in Class View.                                                             |
| `/analytics`                            | **DELETE**  | —                                              | Cross-activity analytics overview. Not in Phase 1 scope. Consider as Phase 4 Home-level feature.                      |
| `/students/[id]`                        | **DELETE**  | —                                              | Student placement history. Moves into Class View student sidebar.                                                     |
| `/track-responses`                      | **KEEP**    | `/track-responses`                             | Standalone tool, outside Blizzard scope. Keep as-is.                                                                  |
| `/settings`                             | **ADAPT**   | Home → Settings                                | Minimal settings accessible from Home.                                                                                |
| `/help`                                 | **KEEP**    | `/help`                                        | Keep as-is.                                                                                                           |
| `/auth/*`                               | **KEEP**    | `/auth/*`                                      | Auth routes unchanged.                                                                                                |
| `/api/sync`                             | **KEEP**    | `/api/sync`                                    | Sync endpoint unchanged.                                                                                              |

**New route structure after Blizzard:**

```
/                          Home (activity cards + Quick Start + inline creation + settings)
/activity/[id]             Class View (the product — roster, groups, generate, project, analytics)
/activity/[id]/print       Print layout
/track-responses           Standalone response tracker
/settings                  App settings (reachable from Home)
/help                      Help page
/auth/*                    Auth routes (unchanged)
/api/sync                  Sync endpoint (unchanged)
```

### 6.2 Components

#### KEEP (use as-is or minor adjustments)

| Component                                              | Location   | Notes                                                               |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------------- |
| `Button`, `Alert`, `Spinner`, `Skeleton`               | `ui/`      | Shared primitives. No changes.                                      |
| `LoginButton`                                          | `auth/`    | Google sign-in unchanged.                                           |
| `OfflineBanner`                                        | `ui/`      | Keep for network state.                                             |
| `ConfirmDialog`                                        | `editing/` | Reusable confirmation modal.                                        |
| `ContextualHint`                                       | `common/`  | Used for one-time rotation avoidance hint.                          |
| `SaveStatusIndicator`                                  | `editing/` | "Saved to this browser" indicator — gains prominence in new design. |
| `SessionTimer`                                         | `live/`    | Floating timer. Phase 2, but keep code.                             |
| `DropIndicator`                                        | `editing/` | Drag-drop visual.                                                   |
| `HorizontalScrollContainer`, `ScrollProgressIndicator` | `ui/`      | Utility components.                                                 |

#### ADAPT (modify for new architecture)

| Component                                       | Current      | Changes Needed                                                                                                           |
| ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `GroupEditingLayout`                            | `editing/`   | Becomes the core of Class View's Groups panel. Needs to handle both minimal (transient) and enriched (sovereign) states. |
| `EditableGroupColumn`                           | `editing/`   | Adapt for new Class View. Add preference rank badges per Decision 4.                                                     |
| `DraggableStudentCard`                          | `editing/`   | Add preference rank color coding (green→red). Ensure 44px+ touch targets.                                                |
| `UnassignedArea`                                | `editing/`   | Becomes left roster panel in Class View. Gains import/paste action.                                                      |
| `StudentView` (live)                            | `live/`      | Becomes Projection mode within Class View. Needs ≥36pt names, ≥7:1 contrast.                                             |
| `TeacherView` (live)                            | `live/`      | Becomes Observation mode (Phase 2). Keep code, wire later.                                                               |
| `ScenarioComparison`                            | `editing/`   | Moves into Class View as "Compare" action.                                                                               |
| `WorkspaceActionBar`                            | `workspace/` | Simplifies: "Make Groups" + "Project" as primary actions.                                                                |
| `SatisfactionSummary`                           | `workspace/` | Moves into expandable Analytics panel.                                                                                   |
| `StudentDetailSidebar`                          | `workspace/` | Becomes the student profile sidebar in Class View.                                                                       |
| `StudentInfoTooltip`                            | `editing/`   | Keep for hover info on student cards.                                                                                    |
| `HistorySelector`                               | `editing/`   | Moves into expandable History panel.                                                                                     |
| `DataSourcePicker`                              | `import/`    | Used within Class View roster panel's import action.                                                                     |
| `GoogleSheetImport`                             | `import/`    | Used within Class View roster panel's import action.                                                                     |
| `SheetConnector`, `SheetPreview`, `TabSelector` | `import/`    | Sub-components of Google Sheets import flow. Keep.                                                                       |
| `ObservationGroupCard`, `ObservationForm`       | `session/`   | Phase 2 components. Keep code.                                                                                           |

#### REPLACE (rebuild from scratch for new architecture)

| Component                           | Current                                | Replacement                                                                                                              |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GroupCard` (activity/)             | Generation control on Activity Detail  | **Inline generation controls** in Class View — group size stepper + "Make Groups" button, co-located with groups panel.  |
| `InlineGroupGenerator` (workspace/) | Empty-state generation prompt          | Merge with above into single Class View generation surface.                                                              |
| `WorkspaceHeader` (workspace/)      | Header with undo/redo/analytics/export | **Class View header** — simpler, activity name + back button + minimal actions. Undo/redo move to Class View toolbar.    |
| `GuidedStepper` (workspace/)        | Post-creation guidance stepper         | **Empty state design** — Class View with no data should be self-explanatory per Decision 12 (no tutorials).              |
| Wizard components (`wizard/`)       | 3-step creation flow                   | **Inline creation** on Home screen ("+ New Activity" → name → done). Roster import happens in Class View after creation. |

#### DELETE (remove entirely)

| Component                                           | Reason                                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `AnalyticsPanel` (editing/)                         | Superseded by Class View Analytics panel.                                              |
| `EditingToolbar` (editing/)                         | Superseded by Class View controls.                                                     |
| `WizardProgress` (wizard/)                          | Wizard eliminated.                                                                     |
| `StepStudentsUnified` (wizard/)                     | Wizard eliminated. Import moves to Class View.                                         |
| `StepGroupsUnified` (wizard/)                       | Wizard eliminated. Group setup is inline in Class View.                                |
| `StepReviewGenerate` (wizard/)                      | Wizard eliminated.                                                                     |
| `ShellBuilder` (wizard/)                            | Wizard eliminated. Named groups created inline in Class View.                          |
| `StepGroups`, `StepPreferences` (wizard/)           | Wizard eliminated.                                                                     |
| `PreferencesPromptBanner` (workspace/)              | Replace with data-state-adaptive UI per Decision 4.                                    |
| `PreferencesImportModal` (workspace/)               | Import preferences via roster panel import action.                                     |
| `CandidateGallery` (gallery/)                       | Not in Blizzard scope. Dead code — was never wired.                                    |
| `CandidateCard`, `CandidateProgressCard` (gallery/) | Same — dead gallery code.                                                              |
| `AlgorithmTutorialContent` (gallery/)               | Same — dead gallery code.                                                              |
| `DemoGuidedOverlay` (onboarding/)                   | Replaced by Quick Start (Decision 5, Decision 12).                                     |
| `ActivityAnalyticsCard` (analytics/)                | Cross-activity analytics page deleted.                                                 |
| `CardSizeToggle` (workspace/)                       | Density controls deferred to Phase 4.                                                  |
| `GroupLayoutToggle` (workspace/)                    | Layout is designer's decision, not user toggle. Revisit Phase 4.                       |
| `RepeatedGroupingHint` (workspace/)                 | Rotation avoidance moves to Settings (Decision 6). One-time hint via `ContextualHint`. |

#### NEW (components to build)

| Component                 | Location                 | Purpose                                                                             |
| ------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| **HomeScreen**            | `components/home/`       | Activity cards, Quick Start, inline creation, settings access.                      |
| **ActivityCard**          | `components/home/`       | Activity card with name, student count, last-used date, "Make Groups" shortcut.     |
| **QuickStartCard**        | `components/home/`       | Enter student count + group size → instant groups with placeholders.                |
| **InlineActivityCreator** | `components/home/`       | "+ New Activity" → name field → create. One action, no wizard.                      |
| **ClassView**             | `components/class-view/` | The main Class View layout — orchestrates all panels.                               |
| **RosterPanel**           | `components/class-view/` | Left panel: student list, import/paste action, preference status indicators.        |
| **GroupsPanel**           | `components/class-view/` | Right panel: generated groups, "Make Groups" button, group size stepper.            |
| **GenerationControls**    | `components/class-view/` | Inline group size stepper + algorithm settings, co-located with Make Groups button. |
| **ProjectionMode**        | `components/class-view/` | Full-screen high-contrast group display with floating teacher toolbar.              |
| **AnalyticsPanel**        | `components/class-view/` | Expandable bottom panel: satisfaction metrics, contextual interpretation.           |
| **HistoryPanel**          | `components/class-view/` | Expandable sidebar: generation history, session history.                            |
| **SettingsPanel**         | `components/class-view/` | Expandable sidebar: constraint config, export, rotation avoidance settings.         |
| **ClassViewToolbar**      | `components/class-view/` | Undo/redo, projection toggle, export, compare.                                      |
| **SavedIndicator**        | `components/class-view/` | Persistent "Saved to this browser" with device icon (P4).                           |

### 6.3 Stores

| Current Store                             | Fate       | Notes                                                                                        |
| ----------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `workspace-page-vm.svelte.ts`             | **ADAPT**  | Becomes `class-view-vm.svelte.ts`. Core VM for Class View. Gains live-session state concept. |
| `scenarioEditingStore.ts`                 | **KEEP**   | Command pattern + undo/redo + auto-save. Exactly what Class View needs.                      |
| `workspace-command-runner.svelte.ts`      | **ADAPT**  | Rename to `class-view-command-runner.svelte.ts`. Minor adjustments.                          |
| `workspace-export-handlers.ts`            | **KEEP**   | Export functions work as-is.                                                                 |
| `workspace-keyboard-controller.svelte.ts` | **KEEP**   | Keyboard nav for accessibility (P11).                                                        |
| `workspace-keyboard-move.svelte.ts`       | **KEEP**   | Arrow-key movement.                                                                          |
| `workspace-tooltip-controller.svelte.ts`  | **KEEP**   | Hover tooltips.                                                                              |
| `workspace-sidebar-controller.svelte.ts`  | **KEEP**   | Student detail sidebar.                                                                      |
| `workspace-student-analytics.svelte.ts`   | **KEEP**   | Per-student analytics derivation.                                                            |
| `workspace-student-lookup.svelte.ts`      | **KEEP**   | Student data resolution.                                                                     |
| `activityHeader.svelte.ts`                | **DELETE** | Class View owns its own header. No cross-layout store needed.                                |
| `workspaceHeader.svelte.ts`               | **DELETE** | Same — header state moves into Class View VM.                                                |
| `uiSettings.svelte.ts`                    | **ADAPT**  | Remove card-size and layout toggles (Phase 4). Keep other preferences.                       |
| `syncSettings.svelte.ts`                  | **KEEP**   | Google Sheets sync preference.                                                               |
| `hintState.svelte.ts`                     | **ADAPT**  | Add rotation-avoidance hint tracking (Decision 6).                                           |
| `candidateConfigStore.ts`                 | **DELETE** | Gallery code removed.                                                                        |
| `trackResponsesSession.svelte.ts`         | **KEEP**   | Standalone tool, unchanged.                                                                  |
| `devTools.svelte.ts`                      | **KEEP**   | Dev tools flag.                                                                              |

**New store:** `class-view-vm.svelte.ts` — central VM for Class View, incorporating live-session state concept per Decision 3.

### 6.4 Domain Layer

**The domain layer is almost entirely KEEP.** This is the payoff of hexagonal architecture — the UI overhaul doesn't touch domain logic.

| Entity          | Fate      | Notes                                                                                                                                                    |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student         | **KEEP**  | No changes.                                                                                                                                              |
| Group           | **KEEP**  | No changes.                                                                                                                                              |
| Pool            | **KEEP**  | Internal term. Eliminated from UI labels per Decision 7, but domain entity unchanged.                                                                    |
| Program         | **KEEP**  | Internal term. UI shows "Activity" but domain uses Program. No rename needed.                                                                            |
| Scenario        | **KEEP**  | No changes.                                                                                                                                              |
| Preference      | **KEEP**  | No changes.                                                                                                                                              |
| Session         | **ADAPT** | Add live-session state concept (Decision 3). Session needs a "LIVE" status for Phase 2 observation. Phase 1: just ensure status enum can accommodate it. |
| Placement       | **KEEP**  | No changes.                                                                                                                                              |
| GroupTemplate   | **KEEP**  | No changes.                                                                                                                                              |
| Observation     | **KEEP**  | Phase 2 entity. Already implemented.                                                                                                                     |
| SheetConnection | **KEEP**  | No changes.                                                                                                                                              |
| Staff           | **KEEP**  | No changes.                                                                                                                                              |
| StudentIdentity | **KEEP**  | No changes.                                                                                                                                              |

### 6.5 Application Layer (Use Cases & Ports)

All existing use cases are **KEEP**. The new architecture calls them from different UI surfaces but the use cases themselves don't change. This is the hexagonal architecture working as designed.

New use cases needed for Phase 1:

- `quickStart` — generate groups from student count + group size (placeholder names)
- `createActivityInline` — simplified activity creation (name only, no wizard data)
- `upgradeQuickStart` — replace placeholder students with real roster (Banked Note #2)

### 6.6 Algorithms

All algorithms are **KEEP**. The `balanced-assignment` algorithm is the production algorithm. `first-choice-only` stays as a diagnostic tool. No algorithm changes needed for Blizzard.

### 6.7 Infrastructure

All infrastructure (repositories, auth, storage, sync, http) is **KEEP**. The UI overhaul doesn't touch infrastructure.

---

## Part 7: Phase 1 Work Packages

Phase 1 is broken into work packages (WPs) that can be completed in order. Each WP is independently testable and mergeable. Dependencies are explicit.

### WP0: Branch & Scaffold (0.5 day)

**Goal:** Create the Blizzard branch and new directory structure.

**Tasks:**

- Create `project-blizzard` branch from main
- Create new directories: `src/lib/components/home/`, `src/lib/components/class-view/`
- Create new route stubs: `src/routes/(blizzard)/+page.svelte` (Home), `src/routes/(blizzard)/activity/[id]/+page.svelte` (Class View)
- Use SvelteKit route groups so Blizzard routes coexist with current routes during development
- Create `class-view-vm.svelte.ts` stub

**Exit test:** `pnpm dev` serves both old and new routes without conflict.

### WP1: Home Screen — Activity Cards (1-2 days)

**Goal:** Home screen showing existing activities as cards.
**Depends on:** WP0

**Tasks:**

- Build `HomeScreen.svelte` — full-width layout, activity card grid
- Build `ActivityCard.svelte` — name, student count, last-used date, "Make Groups" shortcut button
- Wire `listActivities` use case to populate cards
- "Make Groups" shortcut on card → navigate to `/activity/[id]` and trigger generation
- Settings gear icon → navigate to `/settings`
- Handle empty state (no activities yet → show Quick Start prominently)

**Exit test:** Home screen loads, shows existing activities, cards are tappable.

### WP2: Home Screen — Inline Activity Creation (1 day)

**Goal:** Create activities without a wizard.
**Depends on:** WP1

**Tasks:**

- Build `InlineActivityCreator.svelte` — "+ New Activity" button → expands to name input → create
- Wire `createActivityInline` use case (creates Program with empty Pool)
- On create → navigate to `/activity/[id]` (Class View)
- No roster import at creation time — that happens in Class View

**Exit test:** User can create a named activity in one action from Home, lands in Class View.

### WP3: Home Screen — Quick Start (1 day)

**Goal:** Zero-data grouping for new users.
**Depends on:** WP1

**Tasks:**

- Build `QuickStartCard.svelte` — student count input + group size input + "Go" button
- Build `quickStart` use case — creates Program + Pool with placeholder students (Student 1, Student 2, ...) + generates groups
- On submit → navigate to `/activity/[id]` (Class View with groups already generated)
- Quick Start card appears prominently when user has no activities

**Exit test:** New user enters "24 students, groups of 4" → sees 6 groups of placeholder students in under 15 seconds.

### WP4: Class View — Core Layout & Roster Panel (2-3 days)

**Goal:** Class View with roster panel showing students.
**Depends on:** WP0

**Tasks:**

- Build `ClassView.svelte` — two-panel layout (left roster, right groups)
- Build `RosterPanel.svelte` — scrollable student list, student count, "Import" button
- Build `ClassViewToolbar.svelte` — activity name, back button (→ Home), undo/redo buttons
- Wire `class-view-vm.svelte.ts` — loads program, pool, students, scenario on mount
- Integrate `SavedIndicator.svelte` — persistent "Saved to this browser" indicator
- Import action opens roster import flow (reuse adapted `DataSourcePicker` + `GoogleSheetImport`)

**Exit test:** Navigate to `/activity/[id]`, see roster panel with student names, "Saved to this browser" visible.

### WP5: Class View — Groups Panel & Generation (2-3 days)

**Goal:** Generate and display groups in Class View.
**Depends on:** WP4

**Tasks:**

- Build `GroupsPanel.svelte` — group columns layout, "Make Groups" button at top
- Build `GenerationControls.svelte` — inline group size stepper, positioned near Make Groups button
- Wire `generateScenario` use case to Make Groups button
- Display generated groups using adapted `GroupEditingLayout` + `EditableGroupColumn`
- Empty state: when no groups generated, show Make Groups prominently
- "Make Groups" auto-saves previous arrangement to history

**Exit test:** Click "Make Groups" → groups appear. Click again → new groups appear, previous saved to history.

### WP6: Class View — Drag-Drop Editing (1-2 days)

**Goal:** Full drag-drop group editing in Class View.
**Depends on:** WP5

**Tasks:**

- Wire `scenarioEditingStore` to Class View groups panel
- Adapt `DraggableStudentCard` for Class View (ensure 44px+ touch targets)
- Wire undo/redo to `ClassViewToolbar`
- Connect auto-save (500ms debounce to IndexedDB)
- Keyboard alternative for drag-drop (Select → Move to → Choose group) per P6/P11

**Exit test:** Drag student between groups → auto-saves → undo works → redo works.

### WP7: Class View — Projection Mode (2-3 days)

**Goal:** Full-screen projection from within Class View.
**Depends on:** WP5

**Tasks:**

- Build `ProjectionMode.svelte` — full-screen, high-contrast group display
- Student names ≥36pt, body text ≥60pt, contrast ≥7:1
- No teacher-private information visible
- Floating minimal teacher toolbar: re-generate, exit projection
- "Project" button in Class View toolbar enters projection mode
- ESC or toolbar button exits projection mode
- No separate route — projection is a mode within Class View

**Exit test:** Click "Project" → full-screen high-contrast groups → student at 30 feet can read names → ESC exits.

### WP8: Class View — Preference-Adaptive UI (2-3 days)

**Goal:** Class View automatically enriches when preference data exists (Decision 4).
**Depends on:** WP6

**Tasks:**

- Detect preference data presence and completeness in `class-view-vm`
- When preferences exist: show preference rank badges on student cards (color-coded green→red)
- When preferences exist: show preference status indicators in roster panel
- Build `AnalyticsPanel.svelte` — expandable bottom panel with satisfaction metrics
- Contextual interpretation text ("Strong: 72% got their first choice")
- When no preferences: analytics panel and badges are invisible (not hidden, absent)
- Define data thresholds (resolve Banked Note #1): analytics panel appears when ≥3 students have preferences

**Exit test:** Activity with no preferences → clean transient UI. Import preferences → badges appear, analytics panel available.

### WP9: Class View — History & Comparison (1-2 days)

**Goal:** Generation history and scenario comparison.
**Depends on:** WP5

**Tasks:**

- Build `HistoryPanel.svelte` — expandable sidebar showing generation history + session history
- Adapt `HistorySelector` for history navigation
- Adapt `ScenarioComparison` for "Compare" action in Class View
- "Compare" generates alternative → side-by-side with metrics diff → one-click selection

**Exit test:** Generate → Compare → see two side-by-side → pick one → history shows both.

### WP10: Class View — Settings & Rotation Avoidance (1 day)

**Goal:** Rotation avoidance on by default, configurable in settings (Decision 6).
**Depends on:** WP5

**Tasks:**

- Rotation avoidance on by default (lookback: 3 sessions) — no user action needed
- Build rotation avoidance settings in Settings panel (toggle + lookback window 1-10)
- One-time hint after second session: "Groups now avoid recent groupmates. Change this in Settings."
- Wire `hintState` to track hint dismissal

**Exit test:** First session → rotation active but invisible. Second session → hint appears once → dismiss → never returns.

### WP11: Quick Start Upgrade Path (1 day)

**Goal:** Replace placeholder students with real roster (Banked Note #2).
**Depends on:** WP4, WP3

**Tasks:**

- Build `upgradeQuickStart` use case — replaces placeholder students with imported roster
- When teacher imports roster into a Quick Start activity, replace placeholders in-place
- If imported count differs from placeholder count: keep group structure, redistribute
- User experience should feel like "upgrading" not "starting over"
- Gentle prompt in Class View: "Want to add real names? Import your roster."

**Exit test:** Quick Start → 24 placeholders in 6 groups → paste 24 real names → same 6 groups, real names.

### WP12: Route Migration & Cleanup (1-2 days)

**Goal:** Remove old routes, make Blizzard routes primary.
**Depends on:** WP1-WP11 all complete

**Tasks:**

- Move Blizzard routes from `(blizzard)/` group to top-level
- Delete old routes: `/activities`, `/activities/new`, `/activities/import`, `/activities/[id]`, `/activities/[id]/setup`, `/activities/[id]/workspace`, `/activities/[id]/live`, `/activities/[id]/analytics`, `/analytics`, `/students/[id]`
- Update all internal navigation to new route structure
- Delete wizard components, gallery components, dead code (per §6.2 DELETE list)
- Delete orphaned stores (`activityHeader`, `workspaceHeader`, `candidateConfigStore`)
- Eliminate "Pool" and "Program" from all user-facing labels
- Update `+layout.svelte` — remove workspace-specific header logic

**Exit test:** All old routes return 404 or redirect. All new routes work. No user-facing label says "Pool" or "Program". `pnpm check` passes. `pnpm test:unit` passes.

### WP13: Red-Line Verification & Phase Gate (0.5 day)

**Goal:** Verify all Phase 1 exit criteria.
**Depends on:** WP12

**Tasks:**

- Run all 12 applicable red-line criteria (checklist from Decision 10)
- Math teacher scenario: app launch → groups on projector in ≤3 taps and ≤10 seconds (stopwatch)
- Club admin scenario: import → generate → analytics → drag-drop → compare → export (no dead ends)
- Quick start scenario: new user → groups in under 15 seconds with no real data
- Rotation avoidance: on by default, hint after session 2, configurable in Settings
- No "Pool" or "Program" in any user-facing label
- WCAG 2.1 Level A spot check (touch targets, contrast, keyboard nav)

**Exit test:** All checks pass. Phase 1 is shippable.

### Dependency Graph

```
WP0 ──→ WP1 ──→ WP2
    │        └──→ WP3 ──→ WP11
    │
    └──→ WP4 ──→ WP5 ──→ WP6 ──→ WP8
              │        └──→ WP7
              │        └──→ WP9
              │        └──→ WP10
              └──→ WP11

WP1-WP11 all ──→ WP12 ──→ WP13
```

**Parallelization opportunities:**

- WP1 (Home) and WP4 (Class View core) can be built in parallel after WP0
- WP7 (Projection), WP8 (Preferences), WP9 (History), WP10 (Settings) can all be built in parallel after WP5
- WP2 (Inline creation) and WP3 (Quick Start) can be built in parallel after WP1

### Estimated Phase 1 Total: 4-6 weeks (as specified in Part 4)

Critical path: WP0 → WP4 → WP5 → WP8 → WP12 → WP13 (approximately 9-12 working days on the critical path, with other WPs filling parallel time)
