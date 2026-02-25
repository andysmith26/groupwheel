# Groupwheel — Constructionist Principles Evaluation

**Date:** February 2026
**Reference:** [PRINCIPLES_LEARNING.md](PRINCIPLES_LEARNING.md)

---

## Context

Groupwheel is a teacher tool, not a student-facing learning environment, so the constructionist principles from PRINCIPLES_LEARNING.md don't all apply literally. But the document's framing is clear: tools that *support teachers* should help them "observe, curate challenges, and ask good questions — not monitor compliance or pace delivery" (Principle 8). The practical test — **who is doing the thinking?** — applies to the teacher's cognitive work, not just the student's.

This evaluation identifies where the app currently falls short and recommends changes to better align with those principles.

---

## Recommendations

### 1. Candidate Gallery — Let the Teacher Choose, Not Accept

**Violates:** Principle 2 (user is the agent), Principle 6 (accessible, not easy)

Right now "Make Groups" produces one result. The teacher can regenerate or use the Compare modal, but the dominant interaction is accept-or-tweak the algorithm's single answer. The interesting cognitive work — evaluating tradeoffs between arrangements — is compressed into a binary accept/reject.

**Change:** Build the Candidate Gallery (already planned as Phase 2). Generate 3–5 arrangements with visible tradeoff dimensions (preference satisfaction vs. even sizing vs. rotation avoidance). Let the teacher *choose* a starting point rather than being handed one.

---

### 2. Narrative Feedback Instead of Scores

**Violates:** Principle 9 (never reduce a child to a number), Principle 15 (reject measurement-as-proof)

The analytics panel foregrounds "% top choice," "average rank," and quality labels like "Excellent" or "Could Improve." These metrics treat preference satisfaction as a score to optimize. A teacher looking at "72% top choice — Could Improve" is being told their professional judgment produced a bad result, by a metric that doesn't know about Marcus and Devon's fight last week.

**Change:** Replace quality labels and scalar scores with narrative, descriptive feedback. Instead of "Could Improve (62% top choice)," show "4 students didn't get any of their top 3 choices — here's who they are." Surface the names and situations, not the percentages. Let the teacher decide what "good" means.

---

### 3. Surface the Observation System

**Violates:** Principle 8 (adults are environment designers who observe), Principle 10 (tool should reward knowing the child)

The domain model has `Observation` entities with sentiment and tags. Components exist (ObservationForm, ObservationList). But none of this is wired into the UI. Teachers can't record "this group worked well" or "these two students clashed" — the very observations that should inform future grouping decisions.

**Change:** Wire up the observation system. After a session is published and used in class, prompt teachers to annotate what they noticed — which groups thrived, which struggled, which students surprised them. Feed these observations back into future grouping as soft constraints or visible context.

---

### 4. Student Voice in the Tool

**Violates:** Principle 2 (the learner is the agent), Principle 13 (sequence is the learner's job)

Students have zero interaction with Groupwheel. Their preferences arrive via Google Sheets, pre-processed by the teacher. The student's only moment of agency — expressing which group they want — is mediated through an external form the teacher controls entirely.

**Change:** Build a lightweight student preference submission view — a simple, no-login page where students rank their choices directly. This doesn't mean students control outcomes, but it gives them genuine voice in the process rather than having their preferences filtered through teacher data entry.

---

### 5. Placement Explanations — Make the Algorithm Transparent

**Violates:** Principle 7 (debugging is the pedagogy), Principle 6 (make powerful ideas accessible)

When a student doesn't get their top choice, the teacher has no way to understand *why*. Was it capacity? A conflict rule? Rotation avoidance? The algorithm is a black box. Teachers can't reason about the constraints, so they can't learn to set better ones.

**Change:** Add per-student placement explanations showing why each student landed where they did. "Placed in Group B (2nd choice) because Group A was full" or "Avoided Group C due to recent groupmates." Make the algorithm's reasoning transparent so the teacher can debug it.

---

### 6. Visible Rotation History

**Violates:** Principle 6 (accessible, not easy), Principle 3 (knowledge isn't transferable as a unit)

The "Avoid Recent Groupmates" toggle and lookback slider are powerful features, but they hide the *why*. A teacher toggling a switch doesn't build understanding of how rotation affects group dynamics or which students are being separated by the constraint.

**Change:** Show rotation context visually — when a teacher hovers or selects a student, show which other students they've been grouped with recently (and how many times). Make the rotation history a visible, explorable artifact rather than an invisible algorithm input.

---

### 7. Student Notes and Tags

**Violates:** Principle 10 (the tool should reward knowing the child)

Groupwheel treats every student as interchangeable except for their preference rankings. A teacher who deeply knows her students — that Mia is shy, that Jordan is a natural leader, that Kai and Sam are siblings — has no way to encode or leverage that knowledge within the tool.

**Change:** Add lightweight student notes/tags that teachers can attach to students (e.g., "strong leader," "needs quiet partner," "ELL," or custom tags). These don't need to feed into the algorithm automatically — just making them visible during drag-drop editing means the teacher's knowledge of individuals becomes part of the workspace.

---

### 8. Session Lifecycle — Publish Flow

**Violates:** Principle 11 (require sufficient time for immersion), Principle 4 (tools must produce artifacts)

Despite the "workspace paradigm" aspiration in UX_STRATEGY.md, the current flow still feels like generate, tweak, project, done. There's no "Publish Session" button wired up, no way to formally close one round and start the next. The semester-long cycle described in the UX strategy isn't yet real.

**Change:** Implement the session lifecycle — a clear publish action that marks a grouping as "used in class," timestamps it, and sets the stage for the next round. Make the history panel show the evolution of groups over time, so the teacher can see patterns in how their groupings change across a semester.

---

### 9. Teacher-Defined Grouping Priorities

**Violates:** Principle 15 (reject imposed measurement), Principle 8 (adults design the environment)

The quality labels ("Excellent," "Strong," "Could Improve") are the tool's judgment, not the teacher's. There's no way for a teacher to say "I care more about mixing grade levels than preference satisfaction" or "for this activity, balanced sizes matter more than top choices."

**Change:** Let teachers set their own grouping priorities before generating. A simple ordering — "I care most about: preferences > rotation > even sizes" — gives the teacher authorship over what "good" means, rather than having the tool impose its definition.

---

### 10. Interactive Projection — Student Artifacts

**Violates:** Principle 4 (tools must produce artifacts), Principle 14 (justify the computer)

Projection mode shows groups on a screen. Students look, find their name, go to their group. This is the digital equivalent of taping a list to the wall — the computer adds no power the paper didn't have.

**Change:** Make the student-facing moment interactive or generative. Options: let students see who is in their group and collaboratively name their group; let groups set a goal or theme; or generate a printable "group card" students take with them. The projection should produce something students own, not just something they read.

---

### 11. Cross-Session Pattern Analysis

**Violates:** Principle 7 (debugging is the pedagogy — for the teacher), Principle 8 (observe and curate)

Teachers have no cross-session view. They can't see "I've never grouped Maria and James together" or "Group 3 has had the same core members three weeks running." The history panel lists past sessions but doesn't surface patterns.

**Change:** Add a grouping patterns view that shows cross-session insights: pair frequency matrices, students who've never been grouped together, groups that tend to be stable vs. volatile. This helps teachers debug their own grouping habits.

---

## Summary

| # | Change | Primary Principle |
|---|--------|-------------------|
| 1 | Candidate Gallery (multiple options) | 2 — User is the agent |
| 2 | Narrative feedback instead of scores | 9 — Don't reduce to numbers |
| 3 | Surface observation system | 8 — Adults observe, not monitor |
| 4 | Student preference submission | 2 — Learner agency |
| 5 | Placement explanations | 7 — Debugging is pedagogy |
| 6 | Visible rotation history | 6 — Accessible, not easy |
| 7 | Student notes/tags | 10 — Reward knowing the child |
| 8 | Session lifecycle (publish flow) | 11 — Immersion over time |
| 9 | Teacher-defined grouping priorities | 15 — Reject imposed measurement |
| 10 | Interactive projection/student artifacts | 4 — Produce artifacts |
| 11 | Cross-session pattern analysis | 7 — Debugging for the teacher |

## Common Thread

Groupwheel currently does the thinking *for* the teacher in too many places — scoring quality, choosing a single arrangement, hiding algorithm reasoning. The constructionist principles say the cognitive work *is* the valuable work. The tool should make that work possible and visible, not skip it.
