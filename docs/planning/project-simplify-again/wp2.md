# WP2 Observation & Feedback Loop — Engineering Spec

**Date:** February 2026
**Status:** Ready for implementation
**Audience:** Engineering team (coding agent + human reviewer)
**Prerequisite:** WP1 Speed Path (all items verified and shipped)

---

## Strategic Context

GroupWheel's math teacher persona generates groups and projects them daily. WP1 made that flow fast. But group generation is only half the classroom experience — the other half is the 15–30 minutes of group work where the teacher circulates, observes dynamics, and makes mental notes like "Group 2 was off-task" or "the trio at Table 4 nailed it."

Those mental notes evaporate by end of day. WP2 captures them in-app so they accumulate into actionable patterns over time. The design principle is **zero-friction capture**: if recording an observation takes more effort than _not_ recording it, teachers won't do it.

This spec covers three independently shippable work items:

| Item  | What                                            | Primary persona        |
| ----- | ----------------------------------------------- | ---------------------- |
| WP2.1 | Persistent observation UI on live view          | Math teacher (daily)   |
| WP2.3 | Timer integration on live view                  | Math teacher (daily)   |
| WP2.2 | Observation summary & trends on activity detail | Both personas (review) |

**Sequencing note:** WP2.1 and WP2.3 are recommended before WP2.2 because they generate the data that WP2.2 surfaces. Without observations accumulating from WP2.1, the trends view has nothing to show.

---

## Baseline Assumptions

The following are implemented, verified, and available as dependencies:

| Capability                                                        | Location                                                                          | Status |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| `Observation` domain entity + factory                             | `src/lib/domain/observation.ts`                                                   | Done   |
| `ObservationSentiment` type (`POSITIVE` / `NEUTRAL` / `NEGATIVE`) | `src/lib/domain/observation.ts`                                                   | Done   |
| `createObservation` use case                                      | `src/lib/application/useCases/createObservation.ts`                               | Done   |
| `listObservationsBySession` use case                              | `src/lib/application/useCases/listObservations.ts`                                | Done   |
| `listObservationsByProgram` use case                              | `src/lib/application/useCases/listObservations.ts`                                | Done   |
| `listObservationsByGroup` use case                                | `src/lib/application/useCases/listObservations.ts`                                | Done   |
| `getObservationSummary` use case                                  | `src/lib/application/useCases/getObservationSummary.ts`                           | Done   |
| `ObservationRepository` port                                      | `src/lib/application/ports/ObservationRepository.ts`                              | Done   |
| `IndexedDbObservationRepository`                                  | `src/lib/infrastructure/repositories/indexedDb/IndexedDbObservationRepository.ts` | Done   |
| `InMemoryObservationRepository`                                   | `src/lib/infrastructure/repositories/inMemory/InMemoryObservationRepository.ts`   | Done   |
| `ObservationGroupCard` component                                  | `src/lib/components/session/ObservationGroupCard.svelte`                          | Done   |
| `ObservationForm` component                                       | `src/lib/components/session/ObservationForm.svelte`                               | Done   |
| `ObservationList` component                                       | `src/lib/components/session/ObservationList.svelte`                               | Done   |
| `ObservationSummaryCard` component                                | `src/lib/components/analytics/ObservationSummaryCard.svelte`                      | Done   |
| `TeacherView` component                                           | `src/lib/components/live/TeacherView.svelte`                                      | Done   |
| `StudentView` component                                           | `src/lib/components/live/StudentView.svelte`                                      | Done   |
| `/activities/[id]/live` route with tab switching                  | `src/routes/activities/[id]/live/+page.svelte`                                    | Done   |
| Facade wiring for all observation use cases                       | `src/lib/services/appEnvUseCases.ts`                                              | Done   |
| WP1.1 Generate & Show flow                                        | Activity detail → live view                                                       | Done   |
| WP1.5 Classroom Projection Mode                                   | `/live` Student View                                                              | Done   |

### Current Observation Flow (what we're improving)

The `/live` route already has a Teacher View tab with `ObservationGroupCard` components. Current behavior:

1. Teacher taps a sentiment button (+, ~, !) → `createObservation` is called → card flashes briefly (300ms ring)
2. After sentiment tap, a note input appears for ~3 seconds then auto-dismisses
3. No floating quick-note option for cross-group observations
4. No timer — teacher must use a separate app for timing group work
5. Observation summary exists on `/analytics` route but is disconnected from the activity detail page where teachers spend their time
6. No per-session trend data — `ObservationSummaryCard` shows totals but not how sentiment changes across sessions

### Target Experience

```
Teacher taps "Generate & Show" (WP1.1) → lands on live view (Student View tab, projected)
  → switches to Teacher View on their iPad
  → starts a 10-minute timer with one tap
  → circulates, tapping + / ~ / ! on group cards as they observe
  → optionally taps "Quick Note" to add a text observation for any group
  → timer chimes, teacher taps "Done"
  → next day, repeats
  → after a week, activity detail shows "72% positive sentiment, trending up from last week"
```

---

## WP2.1: Persistent Observation UI During Live View

### Problem

The current `ObservationGroupCard` has the right structure — sentiment buttons are present and call `createObservation`. But the interaction design has friction points that discourage habitual use:

1. **Note input auto-dismisses after 3 seconds.** If the teacher is mid-thought and reaches for the input a beat too late, it's gone. They have to tap another sentiment just to get the input back.
2. **No way to add a text-only observation.** The current flow requires a sentiment tap before a note input appears. Sometimes the teacher wants to write "Student X dominated discussion" without categorizing it as positive or negative.
3. **No observation history on the card.** The observation count badge exists, but the teacher can't see _what_ they recorded. After recording 3 observations on Group 2, they can't remember what sentiment they gave without navigating away.
4. **No visual confirmation that persists.** The 300ms flash is easy to miss. The teacher may wonder "did that register?" especially on a crowded iPad screen.

### Solution

Enhance `ObservationGroupCard` and `TeacherView` to make observation recording a persistent, always-available activity rather than a fleeting prompt. Add a floating "Quick Note" mechanism for text observations.

### Implementation

#### 1. Enhance ObservationGroupCard

**File:** `src/lib/components/session/ObservationGroupCard.svelte`

**A. Remove note input auto-dismiss timer.** After a sentiment tap, the note input should appear and stay visible until the teacher either submits a note, dismisses it explicitly, or taps a sentiment on a _different_ group card.

Replace the current timeout-based `showNoteInput` logic:

```typescript
// REMOVE: The 3-second auto-hide timeout chain in handleSentimentTap
// REPLACE WITH:
function handleSentimentTap(sentiment: ObservationSentiment) {
  onSentiment(sentiment);

  // Visual feedback: flash + persistent checkmark
  flashColor = colors[sentiment];
  lastRecordedSentiment = sentiment;
  showCheckmark = true;
  setTimeout(() => {
    flashColor = null;
  }, 300);

  // Show note input — it stays until explicitly dismissed or submitted
  showNoteInput = true;
}
```

**B. Add persistent sentiment indicator.** After recording a sentiment, show a small pill on the card header showing the most recent sentiment and a running count for the session. This replaces the badge-only approach.

New state additions:

```typescript
let lastRecordedSentiment = $state<ObservationSentiment | null>(null);
let showCheckmark = $state(false);
```

After the sentiment flash, replace the count badge with a richer indicator in the card header:

```
┌──────────────────────────────────────────┐
│  Group 2          ✓ +3  (~1  !0)        │  ← persistent count + last-recorded checkmark
│  4 students                              │
├──────────────────────────────────────────┤
│  Alice Chen                              │
│  Bob Park                                │
│  Carol Davis                             │
│  Dan Lee                                 │
├──────────────────────────────────────────┤
│  [ + ]     [ ~ ]     [ ! ]              │  ← sentiment buttons (min 56px height, current)
│                                          │
│  [ Add a note...               ] [Save]  │  ← persistent after first tap, not auto-hidden
└──────────────────────────────────────────┘
```

The checkmark (✓) appears for 2 seconds after a recording, then fades. The counts (+3 ~1 !0) persist.

**C. Accept new `sessionObservations` prop** for rendering the sentiment counts. Currently the card only gets `observationCount: number`. Change to:

```typescript
interface Props {
  groupId: string;
  groupName: string;
  color: string;
  studentNames: string[];
  sessionObservations: Observation[]; // CHANGED: was observationCount: number
  onSentiment: (sentiment: ObservationSentiment) => void;
  onNote: (note: string) => void;
  onDismissNote?: () => void; // NEW: for cross-card dismissal
  showNoteInput?: boolean; // NEW: controlled from parent for cross-card coordination
}
```

Derive counts inside the component:

```typescript
let sentimentCounts = $derived.by(() => {
  const counts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  for (const obs of sessionObservations) {
    if (obs.sentiment && obs.sentiment in counts) {
      counts[obs.sentiment]++;
    }
  }
  return counts;
});

let totalCount = $derived(sessionObservations.length);
```

**D. Note input always has a "dismiss" (X) button** instead of relying on timeout:

```
[ Add a note...                     ] [Save] [✕]
```

Key design decision: The note input's `showNoteInput` state is lifted to the parent (`TeacherView`) so that when a teacher taps sentiment on Group 3, the note input on Group 2 auto-dismisses. Only one card shows the note input at a time.

#### 2. Coordinate note input across cards in TeacherView

**File:** `src/lib/components/live/TeacherView.svelte`

Add state to track which group currently has an active note input:

```typescript
let activeNoteGroupId = $state<string | null>(null);
```

Pass controlled props to each `ObservationGroupCard`:

```svelte
<ObservationGroupCard
  {groupId}
  {groupName}
  color={getGroupColor(groupName)}
  studentNames={members.map((m) => m.studentName)}
  sessionObservations={groupObs}
  showNoteInput={activeNoteGroupId === groupId}
  onSentiment={(sentiment) => {
    activeNoteGroupId = groupId;
    onSentiment(groupId, groupName, sentiment);
  }}
  onNote={(note) => {
    activeNoteGroupId = null;
    onNote(groupId, groupName, note);
  }}
  onDismissNote={() => {
    activeNoteGroupId = null;
  }}
/>
```

This ensures only one card's note input is expanded at a time — tapping sentiment on Group 3 auto-collapses Group 2's note input.

#### 3. Add floating "Quick Note" button

**File:** `src/lib/components/live/TeacherView.svelte`

Add a floating action button (bottom-right corner, above any browser chrome) that opens a bottom sheet for adding a text observation to any group.

```typescript
let showQuickNote = $state(false);
let quickNoteGroupId = $state<string>('');
let quickNoteText = $state('');
```

The bottom sheet contains:

1. A group selector (horizontal scrollable pills showing group names with their colors)
2. A text input (auto-focused when sheet opens)
3. Optional sentiment toggle (defaults to no sentiment — pure text note)
4. "Save" button

```
┌──────────────────────────────────────────┐
│  Quick Note                        [✕]  │
│                                          │
│  [Group 1] [Group 2] [Group 3] [Grp 4]  │  ← scrollable group pills
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Type your note...                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Sentiment (optional):  [+]  [~]  [!]   │
│                                          │
│  [ Save Note ]                           │
└──────────────────────────────────────────┘
```

Quick Note button styling:

- Position: `fixed bottom-6 right-6` (avoids iOS safe area)
- Size: `56px × 56px` rounded-full
- Icon: pencil/notepad icon
- Background: `bg-teal text-white shadow-lg`
- z-index above the group cards grid

When submitted, Quick Note calls `onNote(groupId, groupName, noteText)` with the selected group. If a sentiment was also selected, it calls `onSentiment` first, then `onNote`.

#### 4. Update live page to pass session observations to TeacherView

**File:** `src/routes/activities/[id]/live/+page.svelte`

The live page already loads observations and passes them to `TeacherView`. No change needed to the data loading — the `observations` state array is already reactive and updated after each `createObservation` call.

Verify that the `handleSentiment` and `handleNote` callbacks in the live page re-fetch observations after saving (or optimistically append to the local array). The current implementation should already do this — confirm during implementation.

#### 5. Haptic feedback (iPad)

Add navigator.vibrate() call on sentiment tap for tactile confirmation on supported devices:

```typescript
function handleSentimentTap(sentiment: ObservationSentiment) {
  // Haptic feedback if available (iPadOS Safari does not support this,
  // but Android tablets do — progressive enhancement)
  navigator.vibrate?.(10);
  // ... rest of handler
}
```

This is a progressive enhancement — no fallback needed.

### Acceptance Criteria

1. **One-tap sentiment recording** completes in < 2 seconds (tap → flash → count updates).
2. **Note input stays visible** after sentiment tap until teacher submits, dismisses (✕), or taps sentiment on a different group.
3. **Only one card** shows the note input at a time. Tapping sentiment on Group B auto-dismisses the note input on Group A.
4. **Sentiment counts** (+N ~N !N) visible per group card header for the current session.
5. **Checkmark confirmation** (✓) appears for 2 seconds after any recording.
6. **Quick Note button** opens a bottom sheet with group selector + text input + optional sentiment.
7. **Quick Note saves** create an observation linked to the selected group and current session.
8. **One-handed iPad use**: all tap targets are ≥ 44×44px. The Quick Note button is reachable with a right thumb. Sentiment buttons remain at current 56px min-height.
9. **Observations persist** across tab switches (Student View ↔ Teacher View) and page navigations within the session. (Already satisfied by IndexedDB persistence — verify, don't reimplement.)
10. **No regressions**: existing sentiment buttons, note submission, and observation count still work.

### Files Changed

| File                                                     | Action | Scope                                                                                                                                                  |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/components/session/ObservationGroupCard.svelte` | MODIFY | Remove auto-dismiss timer; add `sessionObservations` prop; add persistent sentiment counts; add dismiss button; accept controlled `showNoteInput` prop |
| `src/lib/components/live/TeacherView.svelte`             | MODIFY | Add `activeNoteGroupId` state for cross-card coordination; add floating Quick Note button + bottom sheet; update `ObservationGroupCard` prop passing   |
| `src/routes/activities/[id]/live/+page.svelte`           | MODIFY | Minor — pass observations grouped by session to TeacherView (if not already)                                                                           |

### Do NOT Touch

- `createObservation.ts` (use case layer — already correct)
- `listObservations.ts` (use case layer)
- `Observation` domain entity
- `ObservationRepository` port or implementations
- `StudentView.svelte`
- Any domain, port, or infrastructure code

### Tests

**E2E (Playwright) — `e2e/observation.spec.ts` (new file):**

```
test: "Sentiment tap records observation and shows updated count"
  1. Create activity, generate & show groups
  2. Switch to Teacher View tab
  3. Click "+" on first group card
  4. Assert card header shows "+1"
  5. Click "~" on same card
  6. Assert header shows "+1 ~1"

test: "Note input persists after sentiment tap until dismissed"
  1. Tap "+" on Group 1
  2. Assert note input is visible on Group 1
  3. Wait 5 seconds (exceeds old 3-second timeout)
  4. Assert note input is STILL visible
  5. Click ✕ dismiss button
  6. Assert note input is hidden

test: "Tapping sentiment on Group B dismisses note input on Group A"
  1. Tap "+" on Group 1 → note input visible on Group 1
  2. Tap "~" on Group 2 → note input visible on Group 2, hidden on Group 1

test: "Quick Note button opens sheet and saves observation"
  1. Click floating Quick Note button
  2. Assert bottom sheet is visible with group pills
  3. Select Group 2 pill
  4. Type "Great collaboration today"
  5. Click Save
  6. Assert sheet closes
  7. Assert Group 2 observation count increased by 1

test: "Note submission via inline input"
  1. Tap "+" on Group 1
  2. Type "Needs more structure" in note input
  3. Press Enter (or tap Save)
  4. Assert note input clears and hides
  5. Assert Group 1 observation count increased by 2 (1 sentiment + 1 note)
```

No unit tests needed for WP2.1 — this is UI interaction logic calling existing tested use cases.

---

## WP2.3: Timer Integration

### Problem

Building Thinking Classrooms (BTC) teachers almost universally time their group work sessions. Common durations are 5, 10, 15, or 20 minutes. Without an integrated timer, the teacher switches to a separate app (phone timer, browser tab, Google Timer), which breaks their flow. The context switch is especially costly on iPad where split-screen is awkward.

The timer is not an observation tool per se, but it's the **scaffolding** that defines the observation window. The teacher starts a timer, circulates and records observations, and when the timer chimes, group work ends. Keeping the timer inside GroupWheel keeps the teacher in the app during the entire observation period.

### Solution

Add a lightweight, floating countdown timer widget to the Teacher View that can be started from presets with a single tap.

### Implementation

#### 1. Create Timer component

**Create:** `src/lib/components/live/SessionTimer.svelte`

This is a self-contained component with no domain dependencies — pure UI state.

```typescript
interface Props {
  /** Called when timer reaches zero */
  onExpire?: () => void;
}
```

Internal state:

```typescript
let isRunning = $state(false);
let isPaused = $state(false);
let totalSeconds = $state(0); // Total duration set
let remainingSeconds = $state(0); // Current countdown value
let intervalId = $state<ReturnType<typeof setInterval> | null>(null);
let showPresets = $state(true); // Show presets vs. countdown
let customMinutes = $state(''); // For custom duration entry
let chimeEnabled = $state(true); // Audio chime on/off
```

**Preset durations:** 5, 10, 15, 20 minutes — rendered as large tap targets.

**Layout (compact, collapsed state):**

```
┌─────────────┐
│  ⏱ Timer    │  ← tap to expand presets
└─────────────┘
```

**Layout (preset selection):**

```
┌───────────────────────────────┐
│  ⏱ Timer               [✕]  │
│                               │
│  [ 5 ]  [ 10 ]  [ 15 ]  [20] │  ← minutes, one tap to start
│                               │
│  [ Custom: _____ min ] [Go]   │
│  🔔 Chime  [on/off]          │
└───────────────────────────────┘
```

**Layout (running):**

```
┌───────────────────────────────┐
│        12:34                  │  ← large countdown, text-4xl+
│                               │
│    [ ⏸ Pause ]  [ ■ Stop ]   │
└───────────────────────────────┘
```

**Layout (paused):**

```
┌───────────────────────────────┐
│        12:34                  │  ← static, slightly dimmed
│       (paused)                │
│                               │
│    [ ▶ Resume ]  [ ■ Stop ]  │
└───────────────────────────────┘
```

**Layout (expired):**

```
┌───────────────────────────────┐
│        0:00                   │  ← red text, pulsing
│     Time's up!                │
│                               │
│    [ ↺ Restart ]  [ ✕ Done ] │
└───────────────────────────────┘
```

#### 2. Countdown logic

```typescript
function startTimer(minutes: number) {
  stopTimer();
  totalSeconds = minutes * 60;
  remainingSeconds = totalSeconds;
  isRunning = true;
  isPaused = false;
  showPresets = false;

  intervalId = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      stopInterval();
      isRunning = false;
      handleExpire();
    }
  }, 1000);
}

function pauseTimer() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  isPaused = true;
}

function resumeTimer() {
  isPaused = false;
  intervalId = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      stopInterval();
      isRunning = false;
      handleExpire();
    }
  }, 1000);
}

function stopTimer() {
  stopInterval();
  isRunning = false;
  isPaused = false;
  remainingSeconds = 0;
  showPresets = true;
}

function stopInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
```

Cleanup on component destroy:

```typescript
import { onDestroy } from 'svelte';
onDestroy(() => stopInterval());
```

#### 3. Audio chime on expiry

```typescript
function handleExpire() {
  onExpire?.();
  if (chimeEnabled) {
    playChime();
  }
}

function playChime() {
  try {
    const audioCtx = new AudioContext();
    // Two-tone chime: gentle but audible from across a classroom
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    playTone(523.25, now, 0.3); // C5
    playTone(659.25, now + 0.15, 0.3); // E5
    playTone(783.99, now + 0.3, 0.5); // G5 (longer)
  } catch {
    // AudioContext not available — silent fallback
  }
}
```

Design decision: Use Web Audio API instead of an `<audio>` element to avoid needing a sound file asset. The synthesized chime is three ascending tones (C-E-G major chord arpeggio) — pleasant, not jarring, audible from across a classroom. Volume is moderate (gain 0.3). Falls back silently if AudioContext is unavailable.

#### 4. Position the timer in TeacherView

**File:** `src/lib/components/live/TeacherView.svelte`

Add `SessionTimer` as a floating widget positioned top-right of the Teacher View content area, above the group card grid.

```svelte
<div class="relative">
  <!-- Timer widget: floats top-right, does not scroll with grid -->
  <div class="fixed top-24 right-6 z-30">
    <SessionTimer />
  </div>

  <!-- Group cards grid (existing) -->
  <div class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3" ...>...</div>

  <!-- Quick Note FAB (from WP2.1) -->
  ...
</div>
```

Position `fixed top-24 right-6` keeps the timer visible while scrolling through group cards. `top-24` (6rem) avoids overlapping the header/tab bar. `z-30` keeps it above cards but below modals.

#### 5. Timer state persistence across tab switches

The timer runs in `TeacherView`, which is conditionally rendered based on the active tab. When the teacher switches to Student View and back, the component unmounts and remounts, losing the interval.

**Solution:** Lift timer state to the `/live` page level and pass it as props to `SessionTimer`.

**File:** `src/routes/activities/[id]/live/+page.svelte`

```typescript
// Timer state (persists across tab switches)
let timerState = $state<{
  isRunning: boolean;
  isPaused: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  chimeEnabled: boolean;
  startedAt: number | null; // Date.now() when started
  pausedAt: number | null; // Date.now() when paused
} | null>(null);
```

`SessionTimer` accepts optional `externalState` and `onStateChange` props for controlled mode:

```typescript
interface Props {
  onExpire?: () => void;
  externalState?: TimerState | null;
  onStateChange?: (state: TimerState) => void;
}
```

When `externalState` is provided, the component operates in controlled mode — it reads state from props and reports changes via callback instead of managing its own state. The `setInterval` for ticking runs in the `/live` page's `onMount`, not inside the conditionally-rendered `SessionTimer`.

**Alternative (simpler):** Render `SessionTimer` outside the tab content area (in the page header or as a fixed overlay) so it never unmounts. This avoids the controlled-state complexity entirely.

**Recommended approach:** Render the timer outside the tab switch. Place it in the live page's header area, visible in both Student View and Teacher View tabs. A running timer is useful context regardless of which tab is active — the teacher might glance at the projected Student View while the timer counts down.

```svelte
<!-- In live page, above the tab content -->
{#if activeSession}
  <div class="fixed top-24 right-6 z-30">
    <SessionTimer />
  </div>
{/if}

<!-- Tab content below -->
{#if activeTab === 'student'}
  <StudentView ... />
{:else}
  <TeacherView ... />
{/if}
```

The timer is only shown when an active session exists (no timer in preview mode).

### Acceptance Criteria

1. **One-tap start** from presets: tap "10" → timer immediately counts down from 10:00.
2. **Custom duration** entry: type a number, tap "Go" → timer starts.
3. **Pause/resume** works correctly — pausing stops countdown, resuming continues from where it left off.
4. **Stop** resets to preset selection.
5. **Audio chime** plays when timer reaches 0:00 — three ascending tones, moderate volume.
6. **Chime toggle** allows teacher to disable audio (e.g., if they don't want sound).
7. **Timer visible at a glance** from across the classroom — countdown text is `text-4xl` or larger.
8. **Timer persists** across Student View ↔ Teacher View tab switches.
9. **Timer cleans up** on component destroy (no orphaned `setInterval`).
10. **Timer does not interfere** with observation recording — both can be used simultaneously.
11. **No active session = no timer** — timer only renders when `activeSession` is present.
12. **"Restart" on expiry** restarts with the same duration (no need to re-select preset).

### Files Changed

| File                                           | Action | Scope                                                                                      |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `src/lib/components/live/SessionTimer.svelte`  | CREATE | Countdown timer component with presets, pause/resume, audio chime                          |
| `src/routes/activities/[id]/live/+page.svelte` | MODIFY | Render `SessionTimer` in fixed position outside tab content, conditional on active session |

### Do NOT Touch

- `TeacherView.svelte` (timer lives outside it, at the page level)
- Any domain, use case, port, or infrastructure code
- `StudentView.svelte`
- Observation recording flow

### Tests

**E2E (Playwright) — `e2e/timer.spec.ts` (new file):**

```
test: "Timer starts from preset and counts down"
  1. Create activity, generate & show
  2. Assert timer component is visible
  3. Click "5" preset
  4. Assert countdown shows "5:00" (or "4:59" within 1 second)
  5. Wait 2 seconds
  6. Assert countdown shows approximately "4:58" (±1 second tolerance)

test: "Timer pause and resume"
  1. Start 5-minute timer
  2. Wait 2 seconds
  3. Click Pause
  4. Record displayed time
  5. Wait 3 seconds
  6. Assert displayed time has NOT changed
  7. Click Resume
  8. Wait 2 seconds
  9. Assert displayed time has decreased

test: "Timer stop resets to presets"
  1. Start 10-minute timer
  2. Click Stop
  3. Assert preset buttons are visible again
  4. Assert no countdown is displayed

test: "Timer persists across tab switches"
  1. Start 5-minute timer from Teacher View
  2. Switch to Student View tab
  3. Assert timer is still visible and counting
  4. Switch back to Teacher View
  5. Assert timer shows expected remaining time (less than when started)

test: "Timer not visible without active session"
  1. Navigate directly to /live without generating/showing groups
  2. Assert timer component is NOT present
```

**Unit tests (Vitest) — `src/lib/components/live/SessionTimer.spec.ts`:**

```
test: "playChime creates AudioContext and plays tones"
  Mock AudioContext. Call playChime(). Assert oscillator created with expected frequencies.
  (This test mainly ensures the function doesn't throw.)

test: "formatTime displays minutes and seconds correctly"
  Assert formatTime(600) === "10:00"
  Assert formatTime(61) === "1:01"
  Assert formatTime(0) === "0:00"
  Assert formatTime(3599) === "59:59"
```

---

## WP2.2: Observation Summary & Trends

### Problem

Individual observations are useful in the moment. But after two weeks of daily observations, the teacher has 50+ data points scattered across sessions with no way to see patterns. The existing `getObservationSummary` use case computes totals and the `ObservationSummaryCard` renders them, but:

1. **Not integrated into the activity detail page.** The summary lives on `/analytics`, which the math teacher will never visit. It needs to be on the activity detail page where they land daily.
2. **No per-session trend.** The summary shows aggregate counts but not whether sentiment is improving or declining over time.
3. **No drill-through.** The teacher can't click a session to see that session's observations.
4. **Threshold for visibility is wrong.** `ObservationSummaryCard` shows after any observations exist. For trends to be meaningful, there should be a minimum of 3 sessions with observations.

### Solution

Add an "Observations" section to the activity detail page that shows aggregate sentiment, session-over-session trend, and drill-through to individual session observations. Requires a new use case for per-session aggregation that the current `getObservationSummary` doesn't provide.

### Implementation

#### 1. New use case: `getObservationTrends`

**Create:** `src/lib/application/useCases/getObservationTrends.ts`

The existing `getObservationSummary` computes program-wide totals. We need per-session sentiment counts to render a trend.

```typescript
import type { ObservationRepository, SessionRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

export interface GetObservationTrendsInput {
  programId: string;
  /** Max sessions to include. Default: 10 */
  sessionLimit?: number;
}

export interface SessionSentimentSummary {
  sessionId: string;
  sessionDate: Date; // From session.startedAt or session.createdAt
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  /** Ratio of positive to total (0-1), for trend line */
  positiveRatio: number;
}

export interface ObservationTrendsResult {
  programId: string;
  /** Per-session summaries, sorted chronologically (oldest first) */
  sessionSummaries: SessionSentimentSummary[];
  /** Overall totals across all sessions */
  totals: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  /** Sessions with observations / total sessions */
  coverageRatio: {
    sessionsWithObservations: number;
    totalSessions: number;
  };
}

export async function getObservationTrends(
  deps: {
    observationRepo: ObservationRepository;
    sessionRepo: SessionRepository;
  },
  input: GetObservationTrendsInput
): Promise<Result<ObservationTrendsResult, never>> {
  const sessionLimit = input.sessionLimit ?? 10;

  // Load all sessions for the program (most recent first)
  const sessions = await deps.sessionRepo.listByProgramId(input.programId);
  sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const recentSessions = sessions.slice(0, sessionLimit);

  // Load all observations for the program
  const observations = await deps.observationRepo.listByProgramId(input.programId);

  // Group observations by sessionId
  const obsBySession = new Map<string, typeof observations>();
  for (const obs of observations) {
    if (!obs.sessionId) continue;
    const existing = obsBySession.get(obs.sessionId) ?? [];
    existing.push(obs);
    obsBySession.set(obs.sessionId, existing);
  }

  // Build per-session summaries
  const sessionSummaries: SessionSentimentSummary[] = [];
  let totalPositive = 0,
    totalNeutral = 0,
    totalNegative = 0;
  let sessionsWithObs = 0;

  for (const session of recentSessions) {
    const sessionObs = obsBySession.get(session.id) ?? [];
    if (sessionObs.length === 0) continue;

    sessionsWithObs++;
    let pos = 0,
      neu = 0,
      neg = 0;
    for (const obs of sessionObs) {
      switch (obs.sentiment) {
        case 'POSITIVE':
          pos++;
          break;
        case 'NEUTRAL':
          neu++;
          break;
        case 'NEGATIVE':
          neg++;
          break;
      }
    }

    const total = pos + neu + neg;
    totalPositive += pos;
    totalNeutral += neu;
    totalNegative += neg;

    sessionSummaries.push({
      sessionId: session.id,
      sessionDate: session.createdAt,
      positive: pos,
      neutral: neu,
      negative: neg,
      total,
      positiveRatio: total > 0 ? pos / total : 0
    });
  }

  // Sort chronologically for trend display (oldest first)
  sessionSummaries.sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime());

  return ok({
    programId: input.programId,
    sessionSummaries,
    totals: {
      positive: totalPositive,
      neutral: totalNeutral,
      negative: totalNegative,
      total: totalPositive + totalNeutral + totalNegative
    },
    coverageRatio: {
      sessionsWithObservations: sessionsWithObs,
      totalSessions: sessions.length
    }
  });
}
```

**Why a new use case instead of extending `getObservationSummary`?** Different responsibilities. `getObservationSummary` answers "what does the aggregate look like?" — totals, top tags, recent items. `getObservationTrends` answers "how is sentiment changing over time?" — per-session breakdown with chronological ordering. Merging them would create a use case that does too much and returns a result type that's awkward for either consumer. Better to compose them at the UI layer when needed.

#### 2. Wire into facade

**File:** `src/lib/services/appEnvUseCases.ts`

```typescript
import {
  getObservationTrends as getObservationTrendsUseCase,
  type GetObservationTrendsInput,
  type ObservationTrendsResult
} from '$lib/application/useCases/getObservationTrends';

export async function getObservationTrends(
  env: InMemoryEnvironment,
  input: GetObservationTrendsInput
): Promise<Result<ObservationTrendsResult, never>> {
  return getObservationTrendsUseCase(
    {
      observationRepo: env.observationRepo,
      sessionRepo: env.sessionRepo
    },
    input
  );
}

export type { GetObservationTrendsInput, ObservationTrendsResult };
```

#### 3. Create ObservationTrendsSection component

**Create:** `src/lib/components/analytics/ObservationTrendsSection.svelte`

This component renders on the activity detail page. It has three visual elements:

**A. Headline stat** — a single sentence summarizing the current state:

- "72% positive sentiment across 8 sessions" (when data exists)
- "No observations recorded yet" (when empty)
- "Record observations during live sessions to see trends" (when < 3 sessions with data)

**B. Session trend** — a compact horizontal bar chart showing sentiment breakdown per session:

```
            +    ~    !
Session 1   ████░░▓▓         3 obs
Session 2   ██████░░░▓       5 obs
Session 3   ████████░▓▓      6 obs
Session 4   ██████████░      4 obs
```

Each row is a stacked bar: green (positive), amber (neutral), red (negative). Date labels on the left, total count on the right. Clicking a row expands to show that session's observations inline (drill-through).

**C. Drill-through** — when a session row is clicked, expand it to show the individual observations using the existing `ObservationList` component:

```
Session 3 — Feb 14        ████████░▓▓    6 obs  [▼]
  ┌──────────────────────────────────────────┐
  │  + Group 1 · "Great collaboration"       │
  │  + Group 3 · Positive                    │
  │  ~ Group 2 · Neutral                     │
  │  ! Group 4 · "Off-task, needed redirect" │
  │  + Group 1 · Positive                    │
  │  + Group 3 · Positive                    │
  └──────────────────────────────────────────┘
```

Props:

```typescript
interface Props {
  trends: ObservationTrendsResult;
  /** Callback to load observations for a specific session (lazy-loaded on expand) */
  onLoadSessionObservations: (sessionId: string) => Promise<Observation[]>;
  isLoading?: boolean;
}
```

The component does NOT load data itself — the activity detail page passes the `trends` result and a callback for lazy-loading session observations on expand. This keeps the component a pure presentation component.

**Visibility threshold:** The section is only shown on the activity detail page when `trends.coverageRatio.totalSessions >= 1` (at least one session exists). The trend chart is only shown when `trends.sessionSummaries.length >= 3` (meaningful trend requires 3+ data points). Below that threshold, show the headline stat + a prompt to record observations.

#### 4. Add to activity detail page

**File:** `src/routes/activities/[id]/+page.svelte`

Add an "Observations" section below the existing session history section (and below WP1.4's pairing history section if present). Load trends data on mount.

```typescript
import { getObservationTrends, listObservationsBySession } from '$lib/services/appEnvUseCases';
import ObservationTrendsSection from '$lib/components/analytics/ObservationTrendsSection.svelte';
import type { ObservationTrendsResult } from '$lib/application/useCases/getObservationTrends';

let observationTrends = $state<ObservationTrendsResult | null>(null);
let trendsLoading = $state(false);
```

In the data loading function (called on mount):

```typescript
// Load observation trends (non-blocking — don't delay page render)
trendsLoading = true;
getObservationTrends(env, { programId: program.id }).then((result) => {
  if (isOk(result)) {
    observationTrends = result.value;
  }
  trendsLoading = false;
});
```

Lazy-load session observations on drill-through:

```typescript
async function loadSessionObservations(sessionId: string): Promise<Observation[]> {
  if (!env) return [];
  const result = await listObservationsBySession(env, { sessionId });
  if (isOk(result)) {
    return result.value.observations;
  }
  return [];
}
```

Template addition (after session history section):

```svelte
{#if observationTrends && observationTrends.totals.total > 0}
  <ObservationTrendsSection
    trends={observationTrends}
    onLoadSessionObservations={loadSessionObservations}
    isLoading={trendsLoading}
  />
{/if}
```

The section collapses by default and expands on click (same pattern as WP1.4's pairing history). This keeps the activity detail page scannable for the daily-use teacher who just wants to generate and go.

### Acceptance Criteria

1. **Observation section visible** on activity detail page after 1+ sessions with observations.
2. **Headline stat** shows overall positive sentiment percentage and session count.
3. **Trend chart** renders after 3+ sessions with observations, showing per-session sentiment breakdown as stacked bars.
4. **Drill-through** on session row shows that session's individual observations inline.
5. **Observations lazy-load** — session observations are only fetched when the teacher expands a session row.
6. **Loading state** — the section shows a loading indicator while `getObservationTrends` is in flight.
7. **Empty state** — when no observations exist, the section is hidden (no empty card cluttering the page).
8. **Prompt** — when 1-2 sessions have observations (below trend threshold), show headline + "Keep recording observations to see trends over time."
9. **Section is collapsed by default** — teacher must click to expand (keeps daily flow fast).
10. **Chronological order** — sessions in trend chart are ordered oldest → newest (left → right / top → bottom).

### Files Changed

| File                                                           | Action | Scope                                                   |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| `src/lib/application/useCases/getObservationTrends.ts`         | CREATE | New use case for per-session sentiment aggregation      |
| `src/lib/application/useCases/index.ts`                        | MODIFY | Add export for `getObservationTrends`                   |
| `src/lib/services/appEnvUseCases.ts`                           | MODIFY | Wire `getObservationTrends` through facade              |
| `src/lib/components/analytics/ObservationTrendsSection.svelte` | CREATE | Trend chart + drill-through component                   |
| `src/routes/activities/[id]/+page.svelte`                      | MODIFY | Load trends on mount; render `ObservationTrendsSection` |

### Do NOT Touch

- `getObservationSummary.ts` (separate concern, still used by `/analytics`)
- `ObservationSummaryCard.svelte` (used elsewhere, not replaced)
- `createObservation.ts`
- `ObservationRepository` port or implementations
- `/live` route
- Any domain entities

### Tests

**Unit tests (Vitest) — `src/lib/application/useCases/getObservationTrends.spec.ts`:**

```
test: "returns empty summaries when no observations exist"
  Create program with 3 sessions, 0 observations.
  Assert sessionSummaries is empty.
  Assert totals are all 0.
  Assert coverageRatio is { sessionsWithObservations: 0, totalSessions: 3 }.

test: "computes per-session sentiment counts correctly"
  Create 2 sessions with observations:
    Session 1: 2 POSITIVE, 1 NEGATIVE
    Session 2: 1 POSITIVE, 2 NEUTRAL
  Assert sessionSummaries[0].positive === 2, negative === 1
  Assert sessionSummaries[1].positive === 1, neutral === 2

test: "sessions sorted chronologically (oldest first)"
  Create 3 sessions with different dates.
  Assert sessionSummaries[0].sessionDate < sessionSummaries[1].sessionDate < sessionSummaries[2].sessionDate

test: "positiveRatio computed correctly"
  Session with 3 POSITIVE, 1 NEGATIVE.
  Assert positiveRatio === 0.75

test: "sessionLimit caps results to most recent N sessions"
  Create 5 sessions. Call with sessionLimit: 3.
  Assert only 3 most recent sessions included.

test: "observations without sessionId are excluded from per-session counts"
  Create observation with no sessionId.
  Assert it does not appear in any sessionSummary.

test: "coverageRatio counts correctly"
  5 total sessions, 3 have observations.
  Assert coverageRatio === { sessionsWithObservations: 3, totalSessions: 5 }.
```

**E2E (Playwright) — `e2e/observation-trends.spec.ts`:**

```
test: "Observation section appears on activity detail after recording observations"
  1. Create activity
  2. Generate & show 3 times, recording observations each time
  3. Navigate to activity detail
  4. Assert "Observations" section is visible

test: "Drill-through shows session observations"
  1. Setup: 3 sessions with observations
  2. Navigate to activity detail
  3. Click on Session 2 row in trend chart
  4. Assert individual observations for Session 2 are visible
```

---

## Implementation Order

These three items have a dependency structure:

```
WP2.1 (observation UI)  ──┐
                           ├──→  WP2.2 (trends — needs accumulated data)
WP2.3 (timer)  ───────────┘
```

**Recommended sequence:**

1. **WP2.1** (observation UI enhancements) — this is the data generation mechanism. Without frictionless recording, WP2.2 has nothing to display.
2. **WP2.3** (timer) — independent of WP2.1 technically, but best shipped alongside it because the timer scaffolds the observation period. Can be developed in parallel with WP2.1.
3. **WP2.2** (trends) — requires new use case + new component + page integration. Ship last because it benefits from having accumulated observation data from WP2.1 usage.

Each step is independently shippable and testable.

---

## Architecture Notes

### Layer boundaries

All three items respect hexagonal architecture:

- **WP2.1** is pure UI. Modifies two components and the live page. Calls existing `createObservation` facade function. No domain/port/infrastructure changes.
- **WP2.3** is pure UI. Creates one new presentation component (`SessionTimer`). Zero domain layer involvement — the timer is local UI state, not a business concept.
- **WP2.2** adds one new use case (`getObservationTrends`) in the application layer, wires it through the facade, and adds one new presentation component. The use case depends on existing ports (`ObservationRepository`, `SessionRepository`) — no new ports needed.

### No domain changes needed

The `Observation` entity, `ObservationSentiment` type, and `createObservation` factory are sufficient for all WP2 items. The timer is explicitly not a domain concept — it's a UI affordance.

### Use case design decision (WP2.2)

`getObservationTrends` was created as a _new_ use case rather than extending `getObservationSummary` because:

1. **Different consumers.** `getObservationSummary` serves the `/analytics` page and `ObservationSummaryCard` with program-wide aggregates. `getObservationTrends` serves the activity detail page with per-session breakdowns. Merging them creates a "god result" where every consumer ignores half the fields.
2. **Different query patterns.** Trends need session data joined with observations. Summary doesn't need sessions at all. Different `deps` requirements = different use cases.
3. **Single Responsibility.** Each use case answers one question well.

### Settings storage (WP2.3)

Timer presets and chime preference are ephemeral UI state — they reset between sessions. If teachers report wanting persistent timer settings, they can be added to `localStorage` later (same pattern as `generationSettings`). Not worth the complexity for v1.

---

## Verification Checklist (post-implementation)

### WP2.1 — "Can I record observations effortlessly?"

1. Generate & Show → switch to Teacher View on iPad.
2. Tap "+" on Group 1. Assert: card flashes, count shows "+1", note input appears.
3. Wait 10 seconds. Assert: note input is still there (no auto-dismiss).
4. Tap "~" on Group 2. Assert: Group 1 note input dismisses, Group 2 note input appears.
5. Tap Quick Note button. Assert: bottom sheet opens with group pills.
6. Select Group 3, type "needs more structure", tap Save. Assert: sheet closes.
7. Check Group 3 card. Assert: observation count increased.

**Target: sentiment recording < 2 seconds per group. Note recording < 5 seconds per group.**

### WP2.3 — "Can I time group work without leaving the app?"

1. From Teacher View, tap "10" on timer widget.
2. Assert: countdown starts at 10:00 and ticks down.
3. Switch to Student View tab. Assert: timer still visible and counting.
4. Switch back to Teacher View. Record observations while timer runs.
5. When timer expires, assert: chime plays, "Time's up!" displayed.
6. Tap "Restart". Assert: timer starts at 10:00 again.

**Target: timer start < 1 tap. Timer visible at all times during session.**

### WP2.2 — "Can I see patterns in my observations?"

1. After 3+ sessions with observations, navigate to activity detail.
2. Assert: "Observations" section visible (collapsed).
3. Expand it. Assert: headline stat with positive percentage, session count.
4. Assert: trend chart shows per-session bars for each session.
5. Click a session row. Assert: that session's observations load and display inline.
6. Collapse the section. Navigate away and back. Assert: section is collapsed again (not sticky-expanded).

**Target: pattern recognition within 5 seconds of expanding the section.**
