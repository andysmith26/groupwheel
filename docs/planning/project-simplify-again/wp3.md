# WP3 Analytics & Decision Support — Engineering Spec

**Date:** February 2026
**Status:** Ready for implementation
**Audience:** Engineering team (coding agent + human reviewer)
**Prerequisite:** WP1 Speed Path + WP2 Observation & Feedback Loop (all items verified and shipped)

---

## Strategic Context

GroupWheel's club administrator persona generates a group arrangement and immediately needs to evaluate it: "Is this good enough, or should I regenerate?" Currently, the analytics panel shows raw numbers — "73% got top choice", "Average rank: 1.4" — with no interpretation. The teacher has no mental model for what these numbers mean. 73% could be excellent or terrible depending on how many groups exist and how many students are competing for popular ones.

The result is anxiety rather than confidence. Teachers either accept mediocre arrangements because they can't tell they're mediocre, or reject good arrangements because the numbers feel low. Manual edits are blind — dragging a student to a different group provides no feedback on whether it improved or degraded satisfaction.

This spec covers three independently shippable work items that together transform analytics from a reporting afterthought into a real-time decision-support tool:

| Item  | What                                       | Primary persona         |
| ----- | ------------------------------------------ | ----------------------- |
| WP3.1 | Contextual analytics interpretation        | Club admin (evaluation) |
| WP3.2 | Per-student preference badges in workspace | Club admin (editing)    |
| WP3.3 | Scenario comparison                        | Club admin (selection)  |

**Sequencing note:** WP3.2 should ship before WP3.3. Preference badges make individual student moves informed; comparison makes arrangement-level selection informed. WP3.1 is independent and can ship in parallel with WP3.2.

---

## Baseline Assumptions

The following are implemented, verified, and available as dependencies:

| Capability                                                       | Location                                                   | Status |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| `ScenarioSatisfaction` domain type                               | `src/lib/domain/analytics.ts`                              | Done   |
| `computeScenarioSatisfaction` (domain)                           | `src/lib/domain/analytics.ts`                              | Done   |
| `computeAnalyticsSync` (use case, sync)                          | `src/lib/application/useCases/computeAnalyticsSync.ts`     | Done   |
| `computeScenarioAnalytics` (use case, async)                     | `src/lib/application/useCases/computeScenarioAnalytics.ts` | Done   |
| `computeGroupsAnalytics` (use case, in-memory)                   | `src/lib/application/useCases/computeGroupsAnalytics.ts`   | Done   |
| `ScenarioEditingStore` with baseline/current/delta tracking      | `src/lib/stores/scenarioEditingStore.ts`                   | Done   |
| `AnalyticsPanel` component (raw numbers + delta arrows)          | `src/lib/components/editing/AnalyticsPanel.svelte`         | Done   |
| `DraggableStudentCard` with preference dot colors                | `src/lib/components/editing/DraggableStudentCard.svelte`   | Done   |
| `EditableGroupColumn` with drag-drop                             | `src/lib/components/editing/EditableGroupColumn.svelte`    | Done   |
| `StudentInfoTooltip` with preference display                     | `src/lib/components/editing/StudentInfoTooltip.svelte`     | Done   |
| `EditingToolbar` with metric summary                             | `src/lib/components/editing/EditingToolbar.svelte`         | Done   |
| Workspace page with `preferenceMap` and `studentPreferenceRanks` | `src/routes/activities/[id]/workspace/+page.svelte`        | Done   |
| `quickGenerateGroups` use case                                   | `src/lib/application/useCases/quickGenerateGroups.ts`      | Done   |
| Facade wiring for all analytics use cases                        | `src/lib/services/appEnvUseCases.ts`                       | Done   |

### Current Analytics Experience (what we're improving)

1. **AnalyticsPanel** shows three raw metrics: top-choice %, top-2 %, average rank. Delta arrows appear when the user makes manual edits (vs. the generation baseline). No interpretation of whether these numbers are good or bad.
2. **EditingToolbar** shows a compact `metricSummary` like "72% top choice" — clickable to expand the `AnalyticsPanel`. No qualitative label.
3. **DraggableStudentCard** shows colored dots: green (1st choice), yellow (2nd), red (3rd+), hollow gray (no preferences). But no explicit rank label ("1st", "2nd", "3rd"). The dot is a 6px circle — easy to miss.
4. **Drag preview** shows the card being dragged but does NOT preview what the student's preference rank would be in the destination group.
5. **No scenario comparison.** The teacher generates an arrangement, reviews it, regenerates, and must remember the first arrangement's metrics. No way to see both side by side.

### Target Experience

```
Teacher generates groups → AnalyticsPanel immediately shows:
  "Strong result — 73% got their first choice (above average for 8 groups)"
  "↑ 8% improvement over last generation"
  "Suggestion: 4 students got their last choice — consider swapping them manually"

Teacher enters workspace → every student card shows "1st", "2nd", "3rd", or "—"
  → dragging a student over a group shows "Would be: 2nd choice"
  → dropping updates analytics in real-time
  → toolbar summary updates: "73% → 75% top choice"

Teacher wants to compare → taps "Compare" → second arrangement generated alongside
  → side-by-side metrics and diff highlighting
  → "Keep Left" / "Keep Right" to select
```

---

## WP3.1: Contextual Analytics Interpretation

### Problem

The `AnalyticsPanel` displays raw numbers without context. "73% got top choice" tells the teacher nothing about whether this is achievable, typical, or poor for their specific configuration. Teachers don't know that with 30 students competing for 4 groups, 73% first-choice is very strong, whereas with 30 students across 12 groups, 73% would be mediocre (you'd expect higher with more groups and less competition).

This gap causes two failure modes:

1. **False anxiety:** Teacher sees 65% and regenerates repeatedly, not knowing that's near-optimal for their constraints.
2. **False confidence:** Teacher sees 45% and accepts it, not knowing that adding one more group would dramatically improve satisfaction.

### Solution

Add a rule-based interpretation layer that translates raw metrics into plain-English assessments calibrated by group count and student count. No LLM needed — fixed thresholds with contextual adjustment. Show actionable suggestions when metrics indicate room for improvement.

### Implementation

#### 1. Interpretation logic — pure utility function

**File:** `src/lib/utils/analyticsInterpretation.ts` (NEW)

This is a pure function with no dependencies — it takes numbers in and returns strings out. It belongs in `utils/` because it's a presentation concern (formatting domain data for human consumption), not a domain concept or use case.

```typescript
export type MetricQuality = 'excellent' | 'strong' | 'typical' | 'could_improve';

export interface AnalyticsInterpretation {
  topChoiceQuality: MetricQuality;
  topChoiceLabel: string; // e.g., "Strong result"
  topChoiceExplainer: string; // e.g., "73% of students got their first choice, which is above average for 8 groups"
  comparisonNote: string | null; // e.g., "↑ 8% improvement over last generation"
  suggestions: string[]; // actionable items, may be empty
}

export function interpretAnalytics(params: {
  current: {
    percentAssignedTopChoice: number;
    percentAssignedTop2?: number;
    averagePreferenceRankAssigned: number;
    studentsUnassignedToRequest?: number;
    studentsWithNoPreferences?: number;
  };
  baseline: {
    percentAssignedTopChoice: number;
  } | null;
  studentCount: number;
  groupCount: number;
}): AnalyticsInterpretation {
  const { current, baseline, studentCount, groupCount } = params;
  const topPct = current.percentAssignedTopChoice;

  // --- Threshold calibration ---
  // With more groups relative to students, random assignment gives higher
  // satisfaction. Adjust thresholds accordingly.
  // ratio > 0.5 means "lots of groups" (e.g., 12 groups / 30 students)
  // ratio < 0.2 means "few groups" (e.g., 4 groups / 30 students)
  const ratio = groupCount / Math.max(studentCount, 1);
  const offset = ratio > 0.3 ? 10 : ratio < 0.15 ? -10 : 0;

  const thresholds = {
    excellent: 80 + offset,
    strong: 60 + offset,
    typical: 40 + offset
  };

  let quality: MetricQuality;
  let label: string;
  if (topPct >= thresholds.excellent) {
    quality = 'excellent';
    label = 'Excellent result';
  } else if (topPct >= thresholds.strong) {
    quality = 'strong';
    label = 'Strong result';
  } else if (topPct >= thresholds.typical) {
    quality = 'typical';
    label = 'Typical result';
  } else {
    quality = 'could_improve';
    label = 'Room for improvement';
  }

  const explainer =
    `${Math.round(topPct)}% of students got their first choice` +
    (groupCount > 0 ? ` across ${groupCount} groups` : '');

  // --- Comparison note ---
  let comparisonNote: string | null = null;
  if (baseline) {
    const delta = Math.round(topPct - baseline.percentAssignedTopChoice);
    if (delta > 0) {
      comparisonNote = `↑ ${delta}% improvement over last generation`;
    } else if (delta < 0) {
      comparisonNote = `↓ ${Math.abs(delta)}% decrease from last generation`;
    } else {
      comparisonNote = 'Same as last generation';
    }
  }

  // --- Suggestions ---
  const suggestions: string[] = [];

  const unassigned = current.studentsUnassignedToRequest ?? 0;
  if (unassigned > 0 && unassigned <= 5) {
    suggestions.push(
      `${unassigned} student${unassigned > 1 ? 's' : ''} didn't get any of their choices — consider swapping them manually`
    );
  } else if (unassigned > 5) {
    suggestions.push(
      `${unassigned} students didn't get any of their choices — adding another group would likely help`
    );
  }

  if (quality === 'could_improve' && groupCount >= 2 && groupCount <= studentCount / 2) {
    suggestions.push(
      `Adding a ${ordinal(groupCount + 1)} group would give students more options and likely improve satisfaction`
    );
  }

  const noPrefs = current.studentsWithNoPreferences ?? 0;
  if (noPrefs > 0 && noPrefs >= studentCount * 0.2) {
    suggestions.push(
      `${noPrefs} students have no preferences — collecting more responses would make the algorithm more effective`
    );
  }

  return {
    topChoiceQuality: quality,
    topChoiceLabel: label,
    topChoiceExplainer: explainer,
    comparisonNote,
    suggestions
  };
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
```

Key design decisions:

- **Threshold calibration by ratio.** The `offset` shifts thresholds based on how many groups exist relative to students. With 12 groups for 30 students, 80% top-choice is easily achievable (students have many options), so the bar is higher. With 4 groups for 30 students, 60% is strong because competition is intense.
- **Suggestions are specific and actionable.** Not generic "try regenerating" — concrete guidance like "3 students didn't get any choice, swap them manually" or "adding a 5th group would help."
- **Comparison note uses the baseline.** The `ScenarioEditingStore` already tracks `baseline` (captured at generation time). This function compares against it.

#### 2. Enhance AnalyticsPanel

**File:** `src/lib/components/editing/AnalyticsPanel.svelte`

Replace the raw-numbers-only display with interpreted analytics. The panel already receives `baseline`, `current`, and `delta` props. Add:

```typescript
// New props
const {
  open = false,
  baseline = null,
  current = null,
  delta = null,
  studentCount = 0, // NEW
  groupCount = 0 // NEW
} = $props<{
  open?: boolean;
  baseline?: ScenarioSatisfaction | null;
  current?: ScenarioSatisfaction | null;
  delta?: AnalyticsDelta | null;
  studentCount?: number; // NEW
  groupCount?: number; // NEW
}>();
```

Compute interpretation inside the component:

```typescript
import { interpretAnalytics } from '$lib/utils/analyticsInterpretation';

const interpretation = $derived(
  current && groupCount > 0
    ? interpretAnalytics({ current, baseline, studentCount, groupCount })
    : null
);
```

Render layout:

```
┌──────────────────────────────────────────┐
│  Analytics                               │
│                                          │
│  ● Strong result                         │  ← quality label (color-coded pill)
│  73% of students got their first choice  │  ← explainer text
│  across 8 groups                         │
│                                          │
│  ↑ 8% improvement over last generation   │  ← comparison note (green/red)
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  Top choice    73%   ↑5%                 │  ← existing metrics row (kept)
│  Top 2         91%   ↑3%                 │
│  Avg rank      1.4   ↓0.2               │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  💡 3 students didn't get any choice —   │  ← suggestions (if any)
│     consider swapping them manually      │
│                                          │
│  Baseline from latest generation.        │
└──────────────────────────────────────────┘
```

The quality pill uses color to reinforce the label:

- `excellent`: green background
- `strong`: teal background
- `typical`: yellow background
- `could_improve`: orange background

The existing metric rows (top choice %, top 2 %, avg rank with deltas) remain below the interpretation — they serve the power user who wants specifics. The interpretation is the lead, the numbers are supporting detail.

#### 3. Enhance toolbar metric summary

**File:** `src/lib/components/editing/EditingToolbar.svelte`

Currently shows: `"72% top choice"`. Enhance to include the quality label:

```
Before: "72% top choice"
After:  "Strong · 72% top choice"
```

The quality word is color-coded with the same palette as the panel pill. This gives the teacher a one-glance "is this good?" answer without opening the panel.

The toolbar already receives analytics data via the workspace page. Thread the `interpretation.topChoiceLabel` or compute it inline using the same utility.

#### 4. Wire new props from workspace page

**File:** `src/routes/activities/[id]/workspace/+page.svelte`

The workspace page already has `students`, `view.groups`, and `view.currentAnalytics`. Pass the counts:

```typescript
// Already derived
let groupCount = $derived(view?.groups.length ?? 0);
let participantCount = $derived(students.length);
```

Pass to `AnalyticsPanel`:

```svelte
<AnalyticsPanel
  open={showAnalytics}
  baseline={view?.baseline}
  current={view?.currentAnalytics}
  delta={view?.analyticsDelta}
  studentCount={participantCount}
  {groupCount}
/>
```

### Acceptance Criteria

1. When the analytics panel is open, the first thing visible is a plain-English interpretation (quality label + explainer), not raw numbers.
2. Quality label adjusts based on group count and student count — the same top-choice % produces different labels for 4-group vs. 12-group activities.
3. Comparison note appears when baseline exists (i.e., after generation or regeneration), showing improvement/decrease.
4. Suggestions appear only when actionable (unassigned students, low satisfaction with fixable cause, missing preferences).
5. Existing raw metrics and delta arrows remain visible below the interpretation.
6. Toolbar summary includes the quality label (e.g., "Strong · 72% top choice").
7. Interpretation updates in real-time as students are dragged between groups.
8. When no preferences exist, the interpretation section is hidden (only group balance metrics remain relevant).

### Files Changed

| File                                                | Action | Scope                                                               |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `src/lib/utils/analyticsInterpretation.ts`          | CREATE | Pure interpretation function + types                                |
| `src/lib/components/editing/AnalyticsPanel.svelte`  | MODIFY | Add interpretation section above existing metrics, accept new props |
| `src/lib/components/editing/EditingToolbar.svelte`  | MODIFY | Add quality label to metric summary                                 |
| `src/routes/activities/[id]/workspace/+page.svelte` | MODIFY | Pass `studentCount` and `groupCount` to AnalyticsPanel              |

### Do NOT Touch

- `computeScenarioSatisfaction` (domain — interpretation is a presentation concern, not a domain change)
- `computeAnalyticsSync.ts` or `computeGroupsAnalytics.ts`
- `ScenarioEditingStore` (already provides all data needed via `baseline`, `currentAnalytics`, `analyticsDelta`)
- Domain entities or ports
- `/live` route

### Tests

**Unit tests (Vitest) — `src/lib/utils/analyticsInterpretation.spec.ts`:**

```
test: "classifies excellent when top-choice >= threshold"
  4 groups, 30 students, 85% top choice.
  Thresholds: excellent = 80 - 10 = 70 (ratio 4/30 = 0.13, offset -10).
  Actually 85 > 70, so excellent.

test: "adjusts thresholds for high group-to-student ratio"
  12 groups, 30 students, 75% top choice.
  ratio = 0.4, offset = +10, excellent threshold = 90.
  75% < 90 but >= 70 (strong threshold), so "strong".

test: "adjusts thresholds for low group-to-student ratio"
  3 groups, 30 students, 55% top choice.
  ratio = 0.1, offset = -10, strong threshold = 50.
  55% >= 50, so "strong" (not "typical").

test: "suggests swapping when few students unassigned"
  3 studentsUnassignedToRequest.
  Expect suggestion containing "3 students didn't get any of their choices".

test: "suggests adding group when many students unassigned"
  8 studentsUnassignedToRequest.
  Expect suggestion containing "adding another group".

test: "suggests collecting preferences when many are missing"
  studentCount=30, studentsWithNoPreferences=10.
  Expect suggestion containing "10 students have no preferences".

test: "no suggestions when metrics are good"
  85% top choice, 0 unassigned, 0 missing prefs.
  Expect suggestions array is empty.

test: "comparison note shows improvement"
  baseline: 65%, current: 73%.
  Expect "↑ 8% improvement".

test: "comparison note shows decrease"
  baseline: 73%, current: 65%.
  Expect "↓ 8% decrease".

test: "no comparison note when no baseline"
  baseline: null.
  Expect comparisonNote is null.

test: "handles zero students gracefully"
  studentCount=0, groupCount=0.
  No crash. Returns "could_improve" with generic explainer.

test: "ordinal formatting"
  ordinal(1)="1st", ordinal(2)="2nd", ordinal(3)="3rd",
  ordinal(4)="4th", ordinal(11)="11th", ordinal(21)="21st".
```

**E2E (Playwright) — `e2e/analytics-interpretation.spec.ts`:**

```
test: "Analytics panel shows interpretation when preferences exist"
  1. Create activity with students and preferences via wizard
  2. Generate groups
  3. Navigate to workspace
  4. Open analytics panel
  5. Assert quality label text is visible (contains one of: "Excellent", "Strong", "Typical", "Room for improvement")
  6. Assert explainer text contains "got their first choice"
  7. Assert raw metrics still visible below

test: "Toolbar shows quality label"
  1. Create activity with preferences, generate groups
  2. Navigate to workspace
  3. Assert toolbar metric summary contains quality word

test: "Interpretation updates when student is moved"
  1. Setup: activity with preferences, generate groups
  2. Note initial quality label
  3. Move a student (drag to different group)
  4. Assert metric summary in toolbar updates (percentage may change)
```

---

## WP3.2: Per-Student Preference Badges in Workspace

### Problem

`DraggableStudentCard` already shows colored dots indicating preference rank — green for 1st choice, yellow for 2nd, red for 3rd+, hollow gray for no preferences. But dots have two problems:

1. **Dots are ambiguous.** A 6px colored circle doesn't communicate "2nd choice" — it communicates "some status." The teacher must hover for the tooltip to understand what yellow means. During rapid editing with 30+ students visible, this mental overhead accumulates.
2. **Drag operations are blind.** When dragging a student to a different group, there's no preview of what their preference rank _would be_ in the destination. The teacher drops, watches the dot change, and only then knows if the move helped.

### Solution

Replace the 6px dots with explicit rank labels ("1st", "2nd", "3rd", "—") on each student card, and add a destination rank preview during drag hover.

### Implementation

#### 1. Replace dot with rank label on DraggableStudentCard

**File:** `src/lib/components/editing/DraggableStudentCard.svelte`

Currently the card renders a small colored dot in the top-right corner using `dotClass`. Replace with a rank badge that shows the actual rank text:

Current dot element:

```svelte
{#if dotClass()}
  <span
    style="width: var(--dot-size, 6px); height: var(--dot-size, 6px);"
    class={`absolute top-0.5 right-0.5 rounded-full ${dotClass()}`}
    aria-hidden="true"
  ></span>
{/if}
```

Replace with:

```svelte
{#if hasPreferences}
  <span
    class={`absolute -top-1 -right-0.5 rounded px-0.5 text-[9px] leading-tight font-bold ${badgeClass()}`}
    aria-label={badgeAriaLabel}
  >
    {badgeText}
  </span>
{/if}
```

New derived state:

```typescript
const badgeText = $derived.by(() => {
  if (!hasPreferences) return '';
  if (container === 'unassigned') return '—';
  if (preferenceRank === null) return '—';
  if (preferenceRank === 1) return '1st';
  if (preferenceRank === 2) return '2nd';
  if (preferenceRank === 3) return '3rd';
  return `${preferenceRank}th`;
});

const badgeClass = $derived.by(() => {
  if (!hasPreferences || container === 'unassigned') return 'bg-gray-200 text-gray-500';
  if (preferenceRank === 1) return 'bg-green-100 text-green-700';
  if (preferenceRank === 2) return 'bg-yellow-100 text-yellow-700';
  if (preferenceRank === 3) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
});

const badgeAriaLabel = $derived(
  preferenceRank !== null
    ? `${ordinal(preferenceRank)} choice`
    : hasPreferences
      ? 'Not a preferred group'
      : 'No preferences'
);
```

This gives explicit semantic information at a glance. "2nd" is universally understandable; a yellow dot is not.

**Size considerations:** The badge is small (`text-[9px]`) and positioned to overlap the card edge slightly. On cards using the compact `--card-width: 112px` setting, the badge must not overflow into the adjacent card. Use `overflow-visible` on the card container and ensure the badge is absolutely positioned within the card bounds, with a `z-10` to sit above neighboring cards.

#### 2. Drag destination rank preview

**File:** `src/lib/components/editing/EditableGroupColumn.svelte`

When a student is being dragged over a group column, show a temporary preview label indicating what their rank would be if dropped here. This requires:

A. **New prop on EditableGroupColumn:** `draggedStudentPreferences: string[] | null` — the ordered list of group IDs that the dragged student prefers. Already computed in workspace page as `activeStudentPreferences`.

B. **Derived preview rank in EditableGroupColumn:**

```typescript
const previewRank = $derived.by(() => {
  if (!draggingId || !draggedStudentPreferences) return null;
  const rank = draggedStudentPreferences.indexOf(group.id);
  return rank >= 0 ? rank + 1 : null;
});
```

C. **Visual preview:** When `previewRank` is non-null and a drag is active over this column, show a small badge on the group header:

```
┌──────────────────────────────────┐
│  Drama Club          Would be 1st│  ← preview badge (green)
│  8 / 10 students                 │
├──────────────────────────────────┤
│  [students...]                   │
```

When `previewRank` is null (the student has no preference for this group), show "Not preferred" in gray.

The preview badge appears only when a drag is active (`draggingId` is set) — it replaces or overlays the capacity label on the right side of the header.

#### 3. Real-time analytics update during editing

This already works. `ScenarioEditingStore` recomputes `currentAnalytics` after every `MOVE_STUDENT` command via a debounced call to `computeAnalyticsSync`. The `AnalyticsDelta` (comparison to baseline) updates automatically. No changes needed for this functionality — confirming it as a baseline assumption.

#### 4. Thread draggedStudentPreferences to group columns

**File:** `src/routes/activities/[id]/workspace/+page.svelte`

The workspace page already computes `activeStudentPreferences` (an ordered array of group IDs the currently dragged/hovered student prefers). Pass it through to `EditableGroupColumn`:

```svelte
<EditableGroupColumn ...existing props... draggedStudentPreferences={activeStudentPreferences} />
```

### Acceptance Criteria

1. Every student card in the workspace shows an explicit rank label ("1st", "2nd", "3rd", "4th", or "—") when preferences exist for that student.
2. Rank labels are color-coded: green (1st), yellow (2nd), orange (3rd), red (4th+), gray (unassigned or no preference).
3. Students with no preferences show no badge (hollow/no badge — same as current behavior for no-preference students).
4. When dragging a student over a group column, the column header shows "Would be 1st" / "Would be 2nd" / "Not preferred" as a preview.
5. Preview badge disappears when drag ends or when the student is not hovering over that column.
6. Rank labels update immediately when a student is dropped into a new group.
7. Analytics in the toolbar and panel update after each drop (existing behavior, no change).
8. The badge is legible at all card size settings (`--card-width` from compact to spacious).
9. Keyboard accessibility: the rank label is readable by screen readers via `aria-label`.

### Files Changed

| File                                                     | Action | Scope                                                                                         |
| -------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `src/lib/components/editing/DraggableStudentCard.svelte` | MODIFY | Replace dot with rank badge, add badge text/class/aria derivations                            |
| `src/lib/components/editing/EditableGroupColumn.svelte`  | MODIFY | Accept `draggedStudentPreferences` prop, compute preview rank, render preview badge in header |
| `src/routes/activities/[id]/workspace/+page.svelte`      | MODIFY | Pass `activeStudentPreferences` to each `EditableGroupColumn`                                 |

### Do NOT Touch

- `ScenarioEditingStore` (analytics recomputation already works)
- `computeAnalyticsSync.ts` or any domain/application layer
- `AnalyticsPanel.svelte` (covered by WP3.1)
- `StudentInfoTooltip.svelte` (existing tooltip continues to work alongside badges)
- Drag-and-drop infrastructure (`pragmatic-dnd.ts`)

### Tests

**Unit tests (Vitest):**

No unit tests needed — this is pure UI rendering logic. The underlying preference rank computation is already tested in `analytics.spec.ts` and `scenarioEditingStore.spec.ts`.

**E2E (Playwright) — `e2e/preference-badges.spec.ts`:**

```
test: "Student cards show preference rank badges"
  1. Create activity with students and preferences (student A prefers Group 1 first, Group 2 second)
  2. Generate groups placing student A in Group 1
  3. Navigate to workspace
  4. Find student A's card via [data-student-id]
  5. Assert card contains text "1st" (badge)
  6. Assert badge has green styling (bg-green class)

test: "Badge updates after drag"
  1. Setup: student A is in Group 1 (1st choice), Group 2 is 2nd choice
  2. Drag student A from Group 1 to Group 2
  3. Assert student A's card now shows "2nd"
  4. Assert badge color changed from green to yellow

test: "Students without preferences show no badge"
  1. Create activity with some students having preferences, some not
  2. Generate groups
  3. Navigate to workspace
  4. Find a student without preferences
  5. Assert no rank badge visible on their card

test: "Drag preview shows destination rank on group header"
  1. Setup: student A prefers Group 2 as 1st choice
  2. Start dragging student A
  3. Hover over Group 2 column header
  4. Assert text "Would be 1st" appears in Group 2 header
```

---

## WP3.3: Scenario Comparison

### Problem

The club administrator generates an arrangement, reviews metrics, regenerates to try for something better, and has to remember (or write down) the first arrangement's metrics. With 150 students across 12 groups, there's no way to hold both arrangements in your head. The teacher needs to see both simultaneously to make an informed choice.

### Solution

Add a "Compare" flow that generates a second candidate arrangement and presents both side-by-side with metrics and student-level diffs. The teacher selects the preferred one with a single click.

### Implementation

#### 1. New use case: `generateComparisonScenario`

**File:** `src/lib/application/useCases/generateComparisonScenario.ts` (NEW)

This use case generates a _second_ scenario for the same program without affecting the currently active one. It uses the same algorithm and constraints but a different random seed.

```typescript
import type { Scenario } from '$lib/domain';
import type { ScenarioSatisfaction } from '$lib/domain/analytics';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';
import { computeAnalyticsSync } from './computeAnalyticsSync';

export interface GenerateComparisonInput {
  programId: string;
  groupSize?: number;
  groups?: Array<{ name: string; capacity: number | null }>;
  avoidRecentGroupmates?: boolean;
  lookbackSessions?: number;
}

export interface ComparisonCandidate {
  scenario: Scenario;
  analytics: ScenarioSatisfaction;
}

export type GenerateComparisonError =
  | { type: 'PROGRAM_NOT_FOUND'; programId: string }
  | { type: 'GENERATION_FAILED'; message: string };

export async function generateComparisonScenario(
  deps: {
    programRepo: ProgramRepository;
    studentRepo: StudentRepository;
    preferenceRepo: PreferenceRepository;
    scenarioRepo: ScenarioRepository;
    sessionRepo: SessionRepository;
    placementRepo: PlacementRepository;
    idGenerator: IdGenerator;
    groupingAlgorithm: GroupingAlgorithm;
  },
  input: GenerateComparisonInput
): Promise<Result<ComparisonCandidate, GenerateComparisonError>> {
  // ... (follows same pattern as quickGenerateGroups)
  // Key difference: does NOT persist the scenario to the repository.
  // Returns the scenario in-memory with computed analytics.
  // Only the selected candidate will be persisted later.
}
```

Key design decisions:

- **Does NOT persist.** The comparison candidate lives in memory only. If the teacher selects it, a separate action persists it. If they discard it, nothing was written.
- **Reuses `quickGenerateGroups` internals.** The algorithm invocation, constraint building, and group creation logic are identical. The only difference is: don't call `scenarioRepo.save()`. Extract the shared logic into a helper function that both `quickGenerateGroups` and `generateComparisonScenario` can call.
- **Returns analytics alongside the scenario.** The caller doesn't need a second round trip — they get everything needed to render the comparison view.

**Alternative considered:** Using `quickGenerateGroups` directly and immediately deleting the scenario if not selected. Rejected because it creates an unnecessary write-then-delete cycle in IndexedDB and risks orphaned scenarios if the user navigates away.

#### 2. Shared generation helper (refactor)

**File:** `src/lib/application/useCases/quickGenerateGroups.ts` (MODIFY)

Extract the core generation logic (load students, load preferences, build constraints, invoke algorithm, create groups) into an internal helper:

```typescript
// Internal — not exported as a public use case
export async function buildScenarioFromAlgorithm(
  deps: { ... },
  input: { ... }
): Promise<Result<Scenario, GenerationError>> {
  // Existing logic from quickGenerateGroups, minus the save step
}
```

Then `quickGenerateGroups` becomes:

```typescript
export async function quickGenerateGroups(deps, input) {
  const result = await buildScenarioFromAlgorithm(deps, input);
  if (isErr(result)) return result;
  await deps.scenarioRepo.save(result.value);
  return result;
}
```

And `generateComparisonScenario` uses:

```typescript
export async function generateComparisonScenario(deps, input) {
  const result = await buildScenarioFromAlgorithm(deps, input);
  if (isErr(result)) return result;
  const analytics = computeAnalyticsSync({
    groups: result.value.groups,
    preferences: await deps.preferenceRepo.listByProgramId(input.programId),
    participantSnapshot: result.value.participantSnapshot
  });
  return ok({ scenario: result.value, analytics });
}
```

This avoids code duplication while keeping the two use cases' persistence behaviors distinct.

#### 3. Comparison view component

**File:** `src/lib/components/editing/ScenarioComparison.svelte` (NEW)

A modal or panel that displays two arrangements side-by-side:

```
┌─────────────────────────────────────────────────────────────┐
│  Compare Arrangements                               ✕ Close│
│                                                             │
│  ┌───────────────────────┐   ┌───────────────────────┐     │
│  │  Current              │   │  Alternative           │     │
│  │                       │   │                        │     │
│  │  ● Strong result      │   │  ● Excellent result    │     │
│  │  73% top choice       │   │  81% top choice        │     │
│  │  91% top 2            │   │  94% top 2             │     │
│  │  Avg rank: 1.4        │   │  Avg rank: 1.2         │     │
│  │  3 unassigned         │   │  1 unassigned          │     │
│  │                       │   │                        │     │
│  │  Group 1 (8)          │   │  Group 1 (9)           │     │
│  │    Alice S.           │   │    Alice S.            │     │
│  │    Bob J.  ←          │   │    Carol W.            │     │
│  │    ...                │   │    ...                  │     │
│  │                       │   │                        │     │
│  │  Group 2 (7)          │   │  Group 2 (8)           │     │
│  │    Carol W.  ←        │   │    Bob J.   ←          │     │
│  │    ...                │   │    ...                  │     │
│  │                       │   │                        │     │
│  │  [ Keep Current ]     │   │  [ Use This One ]      │     │
│  └───────────────────────┘   └───────────────────────┘     │
│                                                             │
│  8 students in different groups (highlighted with ←)        │
└─────────────────────────────────────────────────────────────┘
```

Props:

```typescript
const {
  currentScenario,
  currentAnalytics,
  alternativeScenario,
  alternativeAnalytics,
  studentCount,
  groupCount,
  studentsById,
  onKeepCurrent,
  onUseAlternative,
  onClose
} = $props<{
  currentScenario: Scenario;
  currentAnalytics: ScenarioSatisfaction;
  alternativeScenario: Scenario;
  alternativeAnalytics: ScenarioSatisfaction;
  studentCount: number;
  groupCount: number;
  studentsById: Record<string, Student>;
  onKeepCurrent: () => void;
  onUseAlternative: () => void;
  onClose: () => void;
}>();
```

Derived diff computation:

```typescript
const studentDiffs = $derived.by(() => {
  // Build a map of studentId → groupId for each scenario
  const leftMap = new Map<string, string>();
  for (const group of currentScenario.groups) {
    for (const id of group.memberIds) leftMap.set(id, group.id);
  }

  const rightMap = new Map<string, string>();
  for (const group of alternativeScenario.groups) {
    for (const id of group.memberIds) rightMap.set(id, group.id);
  }

  const diffs = new Set<string>();
  for (const [id, leftGroup] of leftMap) {
    if (rightMap.get(id) !== leftGroup) diffs.add(id);
  }
  return diffs;
});
```

Students in the `diffs` set get a visual indicator (← arrow or highlight background) in both columns, making it easy to scan which students moved between the two arrangements.

The component uses `interpretAnalytics` (from WP3.1) to show quality labels above each column's metrics. If WP3.1 ships first (recommended), the labels are available. If not, fall back to raw numbers only.

#### 4. "Compare" button in workspace toolbar

**File:** `src/lib/components/editing/EditingToolbar.svelte` (MODIFY)

Add a "Compare" button next to the existing regenerate controls. The button is only enabled when preferences exist (comparison is meaningless without preference data to measure).

```svelte
<button
  onclick={onCompare}
  disabled={!hasPreferences || isComparing}
  class="rounded-md border px-3 py-1.5 text-sm ..."
>
  {isComparing ? 'Generating...' : 'Compare'}
</button>
```

New props: `onCompare: () => void`, `hasPreferences: boolean`, `isComparing: boolean`.

#### 5. Workspace page orchestration

**File:** `src/routes/activities/[id]/workspace/+page.svelte`

Add comparison state and handlers:

```typescript
let isComparing = $state(false);
let comparisonCandidate = $state<ComparisonCandidate | null>(null);

async function handleCompare() {
  if (!env || !program || !scenario) return;
  isComparing = true;

  const result = await generateComparisonScenario(env, {
    programId: program.id,
    groups: scenario.groups.map((g) => ({ name: g.name, capacity: g.capacity }))
    // Use same constraints as current scenario
  });

  isComparing = false;

  if (isOk(result)) {
    comparisonCandidate = result.value;
  } else {
    showToast('Failed to generate comparison');
  }
}

function handleKeepCurrent() {
  comparisonCandidate = null; // Discard alternative
}

async function handleUseAlternative() {
  if (!comparisonCandidate || !editingStore) return;
  // Replace current scenario groups with the alternative's groups
  await editingStore.regenerate(comparisonCandidate.scenario.groups);
  comparisonCandidate = null;
}
```

Render the comparison view when a candidate exists:

```svelte
{#if comparisonCandidate && scenario && view}
  <ScenarioComparison
    currentScenario={scenario}
    currentAnalytics={view.currentAnalytics}
    alternativeScenario={comparisonCandidate.scenario}
    alternativeAnalytics={comparisonCandidate.analytics}
    studentCount={students.length}
    groupCount={view.groups.length}
    {studentsById}
    onKeepCurrent={handleKeepCurrent}
    onUseAlternative={handleUseAlternative}
    onClose={handleKeepCurrent}
  />
{/if}
```

#### 6. Wire use case through facade

**File:** `src/lib/services/appEnvUseCases.ts` (MODIFY)

Add `generateComparisonScenario` to the facade, following the existing pattern for `quickGenerateGroups`.

### Acceptance Criteria

1. "Compare" button appears in the workspace toolbar when preferences exist.
2. "Compare" button is disabled when no preferences exist (comparison is meaningless).
3. Clicking "Compare" generates a second arrangement and displays the comparison view.
4. Comparison view shows both arrangements side-by-side with:
   - Quality label and interpretation (if WP3.1 shipped) or raw metrics
   - Per-group student lists
   - Student diff count
   - Students in different groups highlighted in both columns
5. "Keep Current" closes the comparison and preserves the original arrangement.
6. "Use This One" replaces the current arrangement with the alternative, clears undo history (same as regenerate behavior), and closes the comparison.
7. Loading state visible during generation ("Generating..." on button).
8. The comparison candidate is never persisted to IndexedDB — only the selected arrangement is saved.
9. Closing the comparison (X button) is equivalent to "Keep Current."

### Files Changed

| File                                                         | Action | Scope                                                                        |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| `src/lib/application/useCases/generateComparisonScenario.ts` | CREATE | New use case — generates non-persisted candidate with analytics              |
| `src/lib/application/useCases/quickGenerateGroups.ts`        | MODIFY | Extract `buildScenarioFromAlgorithm` helper, reuse in both use cases         |
| `src/lib/components/editing/ScenarioComparison.svelte`       | CREATE | Side-by-side comparison view with diff highlighting                          |
| `src/lib/components/editing/EditingToolbar.svelte`           | MODIFY | Add "Compare" button with `onCompare`, `hasPreferences`, `isComparing` props |
| `src/routes/activities/[id]/workspace/+page.svelte`          | MODIFY | Add comparison state, handlers, render `ScenarioComparison`                  |
| `src/lib/services/appEnvUseCases.ts`                         | MODIFY | Wire `generateComparisonScenario` to facade                                  |

### Do NOT Touch

- `ScenarioEditingStore` — the "Use This One" action calls `editingStore.regenerate()` which already handles replacing groups and resetting history.
- Domain entities — no new domain types needed.
- Repository ports or implementations — the comparison candidate is in-memory only.
- `/live` route.
- Algorithm implementation (`balancedGrouping.ts`) — reused via existing infrastructure.

### Tests

**Unit tests (Vitest) — `src/lib/application/useCases/generateComparisonScenario.spec.ts`:**

```
test: "generates a comparison scenario without persisting"
  Create program with students and preferences (in-memory repos).
  Call generateComparisonScenario.
  Assert result is Ok with scenario and analytics.
  Assert scenarioRepo.getAll() still has same count (nothing added).

test: "returns analytics alongside scenario"
  Generate comparison.
  Assert result.value.analytics has percentAssignedTopChoice defined.
  Assert result.value.analytics.percentAssignedTopChoice is a number in 0-100.

test: "returns PROGRAM_NOT_FOUND for invalid program"
  Call with non-existent programId.
  Assert result is Err with type 'PROGRAM_NOT_FOUND'.

test: "produces different arrangement than deterministic seed"
  Generate two comparisons.
  Assert at least one student is in a different group between the two results.
  (This is probabilistic — use a scenario with enough students that identical
  results are astronomically unlikely.)
```

**E2E (Playwright) — `e2e/scenario-comparison.spec.ts`:**

```
test: "Compare button generates and shows comparison view"
  1. Create activity with students and preferences
  2. Generate groups
  3. Navigate to workspace
  4. Click "Compare"
  5. Assert comparison view is visible
  6. Assert two columns with metrics visible
  7. Assert "Keep Current" and "Use This One" buttons visible

test: "Keep Current closes comparison without changes"
  1. Open comparison view
  2. Note current analytics
  3. Click "Keep Current"
  4. Assert comparison view closed
  5. Assert analytics unchanged

test: "Use This One replaces current arrangement"
  1. Open comparison view
  2. Note alternative metrics
  3. Click "Use This One"
  4. Assert comparison view closed
  5. Assert workspace now shows groups from the alternative
  6. Assert undo history cleared (undo button disabled)

test: "Compare button disabled when no preferences"
  1. Create activity without preferences
  2. Generate groups
  3. Navigate to workspace
  4. Assert "Compare" button is disabled
```

---

## Implementation Order

These three items have a dependency structure:

```
WP3.1 (interpretation) ─────────────────┐
                                         ├──→  WP3.3 (comparison — uses interpretation if available)
WP3.2 (preference badges) ──────────────┘
```

**Recommended sequence:**

1. **WP3.1** (analytics interpretation) — no dependencies on other WP3 items. Pure utility creation + component enhancement. The interpretation logic will be consumed by WP3.3's comparison view.
2. **WP3.2** (preference badges) — independent of WP3.1. Can be developed in parallel. Changes are confined to two editing components + the workspace page.
3. **WP3.3** (scenario comparison) — depends on WP3.1 being available for quality labels in the comparison view (degrades gracefully to raw numbers if WP3.1 hasn't shipped). Also benefits from WP3.2 because preference badges make the comparison view's per-student lists more informative. Ships last because it's the largest item and touches the most layers (new use case, refactored helper, new component, facade wiring).

Each step is independently shippable and testable.

---

## Architecture Notes

### Layer boundaries

All three items respect hexagonal architecture:

- **WP3.1** is pure UI + utility. The interpretation function is a presentation helper in `utils/`, not a domain concept. It takes `ScenarioSatisfaction` (already returned by existing use cases) and produces display strings. No domain, port, or infrastructure changes.
- **WP3.2** is pure UI. Modifies two components and threads an existing derived value (`activeStudentPreferences`) one level deeper. No application or domain layer changes.
- **WP3.3** adds one new use case in the application layer, refactors an existing use case to extract a shared helper, and creates one new component. The use case depends on existing ports — no new ports needed. The "don't persist" behavior is a deliberate use-case-level decision (the comparison candidate exists only in memory).

### Why `interpretAnalytics` isn't a use case

You could argue interpretation belongs in the application layer as a use case. I'd push back: it's a pure function that transforms already-computed data into display strings. It has no dependencies on ports, no side effects, no async behavior. Making it a use case would add ceremony (deps object, Result wrapper) without value. It belongs in `utils/` — same rationale as `generationSettings.ts`. If interpretation ever needs to query external data (e.g., benchmarks from a database), promote it then.

### Why comparison doesn't persist the candidate

The alternative scenario exists in memory only. Reasons:

1. **Avoids orphaned data.** If the teacher navigates away, there's nothing to clean up.
2. **Simpler state management.** No need for a "pending comparison" status in the domain model.
3. **Performance.** IndexedDB writes are measurably slower than in-memory operations. The comparison flow should feel instant.

When the teacher selects "Use This One," the existing `editingStore.regenerate()` method handles persistence — it replaces the current scenario's groups and triggers a save. The comparison use case's job is generation only.

### Refactoring `quickGenerateGroups`

Extracting `buildScenarioFromAlgorithm` is a low-risk refactor: the logic and tests don't change, only the function boundaries. The existing test suite for `quickGenerateGroups` continues to pass because its behavior is unchanged — it calls the helper then saves. New tests for `generateComparisonScenario` verify the no-persist behavior.

---

## Verification Checklist (post-implementation)

### WP3.1 — "Can the teacher tell if this arrangement is good?"

1. Generate groups for an activity with preferences.
2. Open the workspace. Look at toolbar. Assert: quality label visible (e.g., "Strong · 73% top choice").
3. Open analytics panel. Assert: interpreted label and explainer appear above the raw metrics.
4. Regenerate groups. Assert: comparison note shows improvement or decrease vs. previous.
5. Move a student to a worse group. Assert: quality label updates. If a suggestion threshold is crossed, a suggestion appears.
6. Activity with no preferences: Assert interpretation section is hidden.

**Target: "Is this good?" answered within 5 seconds of generation, without interpreting raw numbers.**

### WP3.2 — "Can the teacher see what happens when they move a student?"

1. Open workspace for an activity with preferences.
2. Assert: every student card shows a rank badge ("1st", "2nd", "3rd", "—").
3. Drag a student. Assert: destination group header shows "Would be 2nd" (or appropriate rank).
4. Drop the student. Assert: badge on card updates to reflect new rank.
5. Verify with a student who has no preferences. Assert: no badge visible.

**Target: preference impact visible at every point in the editing flow — before, during, and after a move.**

### WP3.3 — "Can the teacher pick the better arrangement?"

1. Open workspace with preferences. Tap "Compare."
2. Assert: comparison view appears with two columns.
3. Scan for difference highlighting. Assert: students in different groups are marked.
4. Compare metrics. Assert: quality labels and raw numbers visible for both.
5. Tap "Use This One" on the better arrangement. Assert: workspace updates, undo cleared.
6. Try "Compare" again, then "Keep Current." Assert: original arrangement preserved.

**Target: arrangement selection completed in < 30 seconds, with full confidence in the choice.**
