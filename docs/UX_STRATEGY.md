# Turntable — UX Strategy

**From Wizard to Workspace: Redesigning Group Management**

**Last updated:** December 2025
**Status:** Approved — Phase 1 complete, Phase 2 in planning

---

## Executive Summary

Turntable's original UX treated group creation as a discrete task with a clear endpoint. User research revealed a fundamentally different reality: **group management is a continuous, semester-long activity** involving repeated refinement, conflict resolution, and structural changes.

This document proposes transitioning from a **wizard-to-results paradigm** to a **living workspace paradigm**—where the Activity Detail page becomes an always-editable canvas that teachers inhabit throughout a program's lifecycle.

---

## Problem Reframe

### Original Mental Model (Wizard Paradigm)

```
Import Roster → Collect Preferences → Generate Groups → Done ✓
                                                        ↓
                                            (Optional: Edit, View)
```

### Actual Teacher Workflow (Workspace Paradigm)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEMESTER-LONG CYCLE                          │
│                                                                 │
│  Import → Preferences → Browse Candidates → Select → Edit ──┐  │
│                                                ↑             │  │
│                              Student requests ─┤             │  │
│                              Conflicts arise ──┤             │  │
│                              Clubs merge ──────┘             │  │
│                                                              │  │
│  ←───────────────────── Publish ←────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Core UX Failures Identified

| Failure                 | Symptom                                  | Root Cause                              |
| ----------------------- | ---------------------------------------- | --------------------------------------- |
| **Orientation loss**    | Users don't know what to do after wizard | Page presents summary, not workspace    |
| **Mode separation**     | "Edit Groups" feels like a detour        | Editing lived at different route        |
| **False completion**    | Wizard ending signals "done"             | No visual continuity into editing phase |
| **Hierarchy inversion** | Analytics prominent, groups minimized    | Results page, not working surface       |

---

## Design Principles

### 1. Direct Manipulation Over Modal Workflows

**Source:** Shneiderman's Direct Manipulation principles (1983); Figma, Linear, Notion

Objects of interest (students, groups) should be visible and directly manipulable. Avoid modal dialogs, separate "edit modes," or navigation to perform core tasks.

**Implication:** Groups and students should be draggable on the main Activity page, not behind an "Edit" button.

### 2. Algorithm as Copilot, Human as Decider

**Source:** Human-AI Interaction Guidelines (Microsoft Research, 2019); GitHub Copilot patterns

Present algorithmic outputs as **suggestions to choose from**, not decisions made. Multiple candidates, easy comparison, one-click selection, full override capability.

**Implication:** "Generate Groups" becomes "Show me options." Teacher browses 3-5 candidate distributions.

### 3. Progressive Disclosure of Complexity

**Source:** Nielsen Norman Group; Stripe Dashboard patterns

Show the minimum UI needed for the current task. Reveal advanced features (analytics deep-dive, algorithm tuning, bulk operations) on demand.

**Implication:** Default view shows groups + students. Analytics, history, and advanced tools are collapsible panels.

### 4. Continuous Autosave with Explicit Publishing

**Source:** Google Docs, Figma, Notion

Eliminate "save" anxiety. All changes persist immediately. "Publish" is a deliberate act that pushes changes to students.

**Implication:** No save button. Draft state always preserved. "Publish to Students" is prominent, intentional.

### 5. Multiplayer-Ready Architecture

**Source:** Figma, Miro, Coda

Even before implementing real-time collaboration, design data models and UI patterns that won't break when multiplayer is added.

**Implication:** State management supports future operational transforms. UI has affordances for "last edited by."

---

## Phased Evolution

### Phase 1: Inline Editing ✅ Complete

**Goal:** Eliminate navigation discontinuity

- Embed drag-drop editing directly into Activity Detail page
- Remove separate "Edit Groups" route
- "Generate" becomes "Regenerate" (destructive with confirmation)
- Analytics panel collapses to summary bar

**Result:** Users stay on one page throughout editing.

### Phase 2: Candidate Gallery (Next)

**Goal:** Present algorithm as options, not decisions

- Generate 3-5 candidate distributions with varied algorithms/seeds
- Thumbnail/card view with key metrics per candidate
- Click to preview; "Use This" to select as working copy
- "Start Over" returns to gallery

**Timeline:** 4-6 weeks estimated

### Phase 3: Split-Pane Workspace (Future)

**Goal:** Support semester-long management with context

- Left pane: contextual content (candidates → history → incoming requests)
- Right pane: always-editable group layout
- Left pane collapses to maximize editing space
- Foundation for multi-teacher presence

**Timeline:** 3-4 months estimated

---

## Evaluation Matrix

| Criterion                      | Phase 1   | Phase 2  | Phase 3     |
| ------------------------------ | --------- | -------- | ----------- |
| Implementation effort          | Quick win | Moderate | Moderate    |
| Solves orientation problem     | ✅        | ✅       | ✅          |
| Supports candidate browsing    | ❌        | ✅       | ✅          |
| Supports semester-long editing | Basic     | Basic    | Good        |
| Foundation for collaboration   | Weak      | Okay     | Strong      |
| Mobile-friendly                | ✅        | ✅       | Challenging |
| Teacher learning curve         | Low       | Low      | Medium      |

---

## Resolved Design Questions

| #   | Question                             | Resolution                                         |
| --- | ------------------------------------ | -------------------------------------------------- |
| 1   | Club requests vs. friend preferences | Mutually exclusive per activity                    |
| 2   | Regeneration behavior                | Algorithm is starting point; teacher always tweaks |
| 3   | Publishing granularity               | Only affected students notified                    |
| 4   | Undo scope                           | Session-only; no persistent command history        |
| 5   | Algorithm portfolio                  | Balanced + random now; more planned                |
| 6   | Conflict resolution                  | Single-owner assumption for Phase 1-2              |
| 7   | Offline capability                   | Not required                                       |
| 9   | Empty state                          | "No groups yet" is valid                           |
| 10  | Capacity enforcement                 | Soft limit with visual warning                     |
| 11  | Student request workflow             | Manual for now                                     |
| 12  | Print/export                         | Required: Print, Google Classroom, Sheets, Canvas  |

## Open Questions

| #   | Question       | Notes                                           |
| --- | -------------- | ----------------------------------------------- |
| 8   | Data retention | How long keep history? Compliance implications. |

---

## References

- Shneiderman, B. (1983). _Direct Manipulation: A Step Beyond Programming Languages._ IEEE Computer.
- Nielsen Norman Group. _Progressive Disclosure._ nngroup.com
- Amershi, S., et al. (2019). _Guidelines for Human-AI Interaction._ Microsoft Research / CHI 2019.
- Figma. _Multiplayer Editing Architecture._ figma.com/blog
- Kleppmann, M. (2017). _Designing Data-Intensive Applications._ O'Reilly.
- Linear. _Opinionated Project Management UX._ linear.app/method
