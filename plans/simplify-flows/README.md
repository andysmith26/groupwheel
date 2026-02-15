# Simplify Flows — Implementation Plan

## Goal

Reduce cognitive load for both the math teacher (daily quick grouping) and the clubs admin (semester-long preference-based setup). The teacher's mental model becomes:

```
Generate → Edit → Show to Class → Done
```

No "sessions." No "publishing." No "archiving." Those are invisible plumbing.

## Personas

| | Math Teacher (daily) | Clubs Admin (semester) |
|---|---|---|
| Frequency | Daily | Once/semester |
| Generation | Random by size, FAST | Preference-balanced, deliberate |
| Editing | 1-2 swaps | Extensive drag-drop |
| Observations | Yes, every class | Maybe once |
| Speed priority | Sub-60-sec to "showing" | Doesn't matter |

## Route Changes

| Current Route | Action | Replacement |
|---------------|--------|-------------|
| `/activities/[id]/start` | DELETE | Workspace empty state + Activity entry point |
| `/activities/[id]/workspace` | KEEP (enhanced) | Inline generation when no groups exist |
| `/activities/[id]/present` | DELETE | Merged into `/live` |
| `/activities/[id]/observe` | DELETE | Merged into `/live` |
| `/activities/[id]/live` | CREATE | Student View + Teacher View tabs |

## Terminology (user-facing)

| Old (confusing) | New (clear) |
|-----------------|-------------|
| Start Session | Generate Groups |
| Publish | *(automatic, invisible)* |
| Present | Show to Class → Student View |
| Observe | Show to Class → Teacher View |
| End Session / Archive | Done |
| Session | *(never shown to user)* |

## Phase Order

Each phase is self-contained and can be implemented independently. Phases 1-2 have no dependencies. Phases 3-4 build on 1-2.

| Phase | File | What It Does | Depends On |
|-------|------|-------------|------------|
| 1 | `phase-1-show-to-class-use-case.md` | New `showToClass` use case (merge create+publish) | Nothing |
| 2 | `phase-2-live-route.md` | Create `/live` route (merge Present+Observe) | Nothing |
| 3 | `phase-3-workspace-inline-generation.md` | Fold Start page into workspace empty state | Phase 1 |
| 4 | `phase-4-activity-entry-point.md` | Smart activity detail page ("New Groups" / "Edit") | Phases 1-3 |
| 5 | `phase-5-cleanup.md` | Delete old routes, dead code, update tests | Phases 1-4 |

## Architecture Invariants (Do NOT Change)

- Hexagonal architecture (domain → application → infrastructure)
- Placement snapshots (needed for analytics/history)
- Observation data model (linked to sessions)
- ScenarioEditingStore (undo/redo, auto-save)
- All algorithms (balanced, random)
- IndexedDB persistence layer
- Result<T, E> error handling pattern
