# Plan: Contextual Workflow Discovery

## Problem Statement

Teachers use Groupwheel for two distinct workflows:

1. **Repeated random-ish groupings with tracking**: Daily/weekly groups that vary, tracking who's been paired before
2. **Preference-based groupings**: Club selections, project teams—students rank choices, algorithm optimizes

Rather than forcing teachers to declare their intent upfront, the app should **observe what they're doing and surface relevant features at the right moment**.

---

## Design Philosophy

**Progressive disclosure over upfront decisions:**
- Let teachers start naturally without quizzes or workflow selection
- Notice patterns in their usage
- Surface features contextually when they'd be useful
- Same teacher can use both workflows across different activities

**Aligned with existing UX principles** (from `docs/UX_STRATEGY.md`):
- "Workspace, not wizard" — the app is a living tool
- "Algorithm as copilot" — suggest, don't prescribe
- "Progressive disclosure of complexity" — show minimum UI, reveal on demand

---

## Step 1: Research Findings

### Features That Need Contextual Surfacing

| Feature | Current State | When to Surface |
|---------|---------------|-----------------|
| "Avoid recent groupmates" toggle | Exists in algorithm config, no UI | After 2nd+ generation on same activity |
| Preference import | Exists in wizard | When data looks like preferences (ranked columns) |
| Pairing history stats | Use case exists, no UI | When viewing student details after multiple sessions |
| Satisfaction analytics | Shows when preferences exist | Automatically when preferences imported |
| Observations | Repository exists, no UI | After publishing/presenting groups |

### User Patterns to Detect

| Pattern | Indicates | Response |
|---------|-----------|----------|
| Multiple generations on same activity | Repeated grouping workflow | Show rotation/tracking features |
| Imported preference data | Choice-based workflow | Show satisfaction analytics prominently |
| Single generation, then done | One-time setup | Keep UI simple, don't push tracking |
| Returning user with 3+ activities | Power user | Show cross-activity analytics hints |

### Existing Infrastructure

- `Scenario` tracks each generation (can count generations per program)
- `PreferenceRepository` knows if preferences exist
- `getPairingHistory` use case ready
- `ObservationRepository` ready
- localStorage available for hint dismissal tracking

---

## Step 2: Architecture Constraints

### Layers Affected

| Layer | Changes |
|-------|---------|
| Domain | None |
| Application | Minor: add `getActivityStats` helper to count scenarios |
| Infrastructure | None |
| UI | New hint components, extend workspace/present pages |

### Design Rules

1. **Hints are dismissible** — once dismissed, don't show again (localStorage)
2. **No blocking modals** — hints are inline, non-intrusive
3. **Features always accessible** — hints are shortcuts, not gates
4. **No tracking without consent** — we're tracking UI patterns, not analytics

---

## Step 3: Contextual Trigger Map

### Trigger 1: Second Generation (Repeated Grouping Detected)

**When**: User clicks "Try another" or regenerates groups on an activity that already has a published scenario

**What appears**: Inline hint above generate button

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Running groups again?                                    │
│                                                             │
│ ☐ Avoid pairing students who were together last time        │
│                                                             │
│ [Dismiss]                                        [Learn more]│
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Checkbox directly toggles `avoidRecentGroupmates` in algorithm config
- "Dismiss" hides hint permanently for this activity
- "Learn more" links to help or expands explanation

**Files**:
- `src/routes/activities/[id]/workspace/+page.svelte`
- `src/lib/components/workspace/RepeatedGroupingHint.svelte` (NEW)

---

### Trigger 2: Preference Data Detected

**When**: During import (wizard or activity page), columns look like ranked preferences (e.g., "Choice 1", "Choice 2", "Choice 3")

**What appears**: Inline confirmation with preview

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Looks like student preferences!                          │
│                                                             │
│ We found ranked choices. When you generate groups,          │
│ we'll optimize so more students get their top picks.        │
│                                                             │
│ Preview: 24 students ranked 6 groups                        │
│                                                             │
│                                               [Got it]      │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Auto-detected, no action needed from teacher
- Sets up satisfaction analytics to appear after generation
- "Got it" dismisses (one-time educational moment)

**Files**:
- `src/lib/components/wizard/StepStudentsUnified.svelte` (extend detection logic)
- `src/lib/components/common/PreferenceDetectedHint.svelte` (NEW)

---

### Trigger 3: Post-Generation with Preferences

**When**: Groups generated and preferences exist for this activity

**What appears**: Satisfaction summary in workspace header

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 78% got a top-3 choice · 45% got their #1               │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Always visible when preferences exist (not a hint, a feature)
- Clicking expands to detailed breakdown
- Updates live as teacher drags students between groups

**Files**:
- `src/routes/activities/[id]/workspace/+page.svelte`
- `src/lib/components/workspace/SatisfactionSummary.svelte` (NEW)

---

### Trigger 4: After Publishing/Presenting

**When**: Teacher visits present page or publishes groups

**What appears**: Observation prompt (collapsed by default)

```
┌─────────────────────────────────────────────────────────────┐
│ 📝 How did it go?                              [Add a note] │
└─────────────────────────────────────────────────────────────┘

[Expanded state:]
┌─────────────────────────────────────────────────────────────┐
│ 📝 How did it go?                                           │
│                                                             │
│ [😊] [😐] [😟]     Quick sentiment                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Optional notes...                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Skip] [Save observation]│
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Non-blocking, easy to skip
- Quick sentiment (3 buttons) or detailed note
- Saves via `createObservation` use case
- After first use, remembers teacher engages with observations

**Files**:
- `src/routes/activities/[id]/present/+page.svelte`
- `src/lib/components/session/ObservationPrompt.svelte` (NEW)

---

### Trigger 5: Viewing Student (After Multiple Sessions)

**When**: Teacher clicks/hovers on student in workspace AND this activity has 2+ published scenarios

**What appears**: Pairing history in student tooltip/popover

```
┌─────────────────────────────────────────────────────────────┐
│ Alex Chen                                                   │
│                                                             │
│ Current group: Table 3                                      │
│                                                             │
│ Recent groupmates:                                          │
│ · With Jordan: 3 times                                      │
│ · With Sam: 2 times                                         │
│ · With Riley: 1 time                                        │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Only shows if meaningful history exists
- Helps teacher make informed manual adjustments
- Uses `getPairingHistory` use case

**Files**:
- `src/lib/components/editing/StudentInfoTooltip.svelte` (extend)

---

### Trigger 6: Power User Dashboard Hint

**When**: User has 3+ activities AND returns to dashboard

**What appears**: One-time hint about cross-activity features

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 You've created several activities!                       │
│                                                             │
│ Check out Analytics to see pairing patterns across all      │
│ your groups.                                    [Show me →] │
│                                                             │
│                                               [Dismiss]     │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- One-time hint, dismissible
- Links to analytics page
- Only shows once ever

**Files**:
- `src/routes/activities/+page.svelte`
- `src/lib/components/dashboard/AnalyticsHint.svelte` (NEW)

---

## Step 4: Hint State Management

### Storage Schema

```ts
// localStorage key: 'groupwheel-hints'
interface HintState {
  dismissed: {
    repeatedGrouping?: Record<string, boolean>; // per activity
    preferenceDetected?: boolean;               // global, one-time
    observationPrompt?: boolean;                // global, after first use
    analyticsHint?: boolean;                    // global, one-time
  };
  patterns: {
    hasUsedObservations?: boolean;
    hasImportedPreferences?: boolean;
  };
}
```

### Store Implementation

```ts
// src/lib/stores/hintState.svelte.ts
export const hintState = createHintStore();

// Methods:
hintState.isDismissed(hintId: string, activityId?: string): boolean
hintState.dismiss(hintId: string, activityId?: string): void
hintState.recordPattern(pattern: string): void
hintState.hasPattern(pattern: string): boolean
```

---

## Step 5: Implementation Plan

### Phase 1: Hint Infrastructure (~0.5 day)

1. **Create `hintState.svelte.ts`** store
   - localStorage-backed
   - Methods for dismiss/check/record patterns

2. **Create `ContextualHint.svelte`** base component
   - Consistent styling for all hints
   - Built-in dismiss button
   - Slots for content and actions

### Phase 2: Repeated Grouping Hint (~0.5 day)

1. **Add scenario count check** to workspace page
   - Query: does this activity have 1+ published scenarios?

2. **Create `RepeatedGroupingHint.svelte`**
   - Shows "avoid recent" toggle
   - Dismissible per-activity

3. **Wire toggle to algorithm config**
   - Pass `avoidRecentGroupmates` to `generateScenario`

### Phase 3: Satisfaction Summary (~0.5 day)

1. **Create `SatisfactionSummary.svelte`**
   - Compact bar showing % satisfied
   - Expandable for details

2. **Integrate into workspace**
   - Shows only when preferences exist
   - Updates on drag-drop

### Phase 4: Observation Prompt (~0.5 day)

1. **Create `ObservationPrompt.svelte`**
   - Collapsed by default
   - Sentiment buttons + optional textarea
   - Calls `createObservation` use case

2. **Add to present page**
   - Appears after groups shown
   - Non-blocking

3. **Add facade methods** to `appEnvUseCases.ts`
   - `createObservation(env, input)`
   - `listObservationsForScenario(env, input)`

### Phase 5: Student Pairing History (~0.5 day)

1. **Extend `StudentInfoTooltip.svelte`**
   - Add "Recent groupmates" section
   - Only shows if 2+ scenarios exist

2. **Add facade method**
   - `getStudentPairingHistory(env, { studentId, programId })`

### Phase 6: Dashboard Analytics Hint (~0.25 day)

1. **Create `AnalyticsHint.svelte`**
   - One-time hint for power users
   - Links to analytics page

2. **Add to dashboard**
   - Check: 3+ activities AND hint not dismissed

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/stores/hintState.svelte.ts` | Hint dismissal + pattern tracking |
| `src/lib/components/common/ContextualHint.svelte` | Base hint component |
| `src/lib/components/workspace/RepeatedGroupingHint.svelte` | "Avoid recent" prompt |
| `src/lib/components/workspace/SatisfactionSummary.svelte` | Preference satisfaction display |
| `src/lib/components/session/ObservationPrompt.svelte` | Post-session feedback |
| `src/lib/components/dashboard/AnalyticsHint.svelte` | Power user nudge |

## Files to Modify

| File | Changes |
|------|---------|
| `src/routes/activities/[id]/workspace/+page.svelte` | Add hints, satisfaction summary |
| `src/routes/activities/[id]/present/+page.svelte` | Add observation prompt |
| `src/lib/components/editing/StudentInfoTooltip.svelte` | Add pairing history |
| `src/routes/activities/+page.svelte` | Add analytics hint |
| `src/lib/services/appEnvUseCases.ts` | Add observation + pairing facades |

---

## Example User Journeys

### Journey A: Daily Reading Groups Teacher

1. Creates activity, pastes roster, auto-splits into 5 groups → **No hints, clean experience**
2. Next day, regenerates → **Sees "Avoid recent pairings?" hint**
3. Enables toggle, generates → Groups avoid yesterday's pairs
4. Presents to class → **Sees "How did it go?" prompt**, adds quick note
5. Week later, clicks on student → **Sees pairing history** in tooltip

### Journey B: Club Assignment Teacher

1. Creates activity, imports Google Form responses with ranked choices
2. → **Sees "Looks like preferences!" confirmation**
3. Generates groups → **Sees "78% got top-3 choice" summary**
4. Adjusts one student manually → Summary updates live
5. Done (single use), never sees repeated-grouping hints

### Journey C: Power User

1. Has used app for 3 activities over semester
2. Returns to dashboard → **Sees "Check out Analytics" hint**
3. Clicks through, explores pairing patterns
4. Hint never appears again

---

## Testing Strategy

1. **Unit tests**: `hintState` store logic (dismiss, patterns, localStorage)
2. **Component tests**: Each hint renders correctly, dismiss works
3. **E2E test**: Create activity → regenerate → verify hint appears → dismiss → verify stays dismissed
4. **E2E test**: Import preferences → verify satisfaction summary appears

---

## Design Decisions

1. **Hint timing**: "Avoid recent" hint appears **immediately** on 2nd generation — no delay

2. **Observation prompt**: Appears as a **post-publish toast**, not embedded in present page

3. **Analytics hint**: **Deferred** until analytics page is actually built

---

## Revised Trigger 4: Post-Publish Toast

**When**: Teacher publishes/finalizes groups (not just visits present page)

**What appears**: Toast notification in corner

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Groups published                                          │
│                                                             │
│ How did it go?  [😊] [😐] [😟]           [Add note] [Skip] │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Toast appears after publish action completes
- Quick sentiment click saves immediately
- "Add note" expands to textarea
- Auto-dismisses after 10s if no interaction, or on "Skip"
- Non-blocking, doesn't interrupt flow

**Files**:
- `src/lib/components/common/Toast.svelte` (if not exists)
- `src/lib/components/session/ObservationToast.svelte` (NEW)
- `src/routes/activities/[id]/workspace/+page.svelte` (trigger on publish)

---

## Adjusted Implementation Plan

### Phase 1: Hint Infrastructure (~0.5 day)
- `hintState.svelte.ts` store
- `ContextualHint.svelte` base component

### Phase 2: Repeated Grouping Hint (~0.5 day)
- Appears immediately on 2nd generation
- "Avoid recent" toggle wired to algorithm

### Phase 3: Satisfaction Summary (~0.5 day)
- Shows when preferences exist
- Updates live on drag-drop

### Phase 4: Observation Toast (~0.5 day)
- Post-publish toast with sentiment buttons
- Facade methods for `createObservation`

### Phase 5: Student Pairing History (~0.5 day)
- Extend `StudentInfoTooltip` with history

### ~~Phase 6: Dashboard Analytics Hint~~ (DEFERRED)
- Will implement when analytics page is built

---

## Ready for Implementation

Scope: Phases 1-5 (analytics hint deferred)

Shall I proceed?
