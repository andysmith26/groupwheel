# Friend‑Hat — Product Vision

_Last updated: 2025-11-21_

This document is the canonical product vision for Friend‑Hat. It describes the core problem we solve, the long‑term ambition, and — critically for now — a deliberately reduced MVP that focuses on the smallest useful slice we can ship while preserving upgrade paths to the full vision. This file is aspirational in places; sections are explicitly marked with Status tags so readers know what is expected to exist in code today vs later.

---

## Status legend

- **MVP** — In scope for the current reduced MVP (to be implemented first).  
- **Planned** — Intended for the near term (after MVP).  
- **Future** — Long‑term aspirations; not scheduled.

---

## 1. Elevator pitch

Friend‑Hat is a privacy‑first, school‑grade social grouping platform that helps teachers and admins create and evaluate groupings across contexts — from a five‑minute in‑class activity to term‑long clubs and year‑long advisories. The reduced MVP prioritizes a small, high‑value set of features (CSV pool import, single scenario generation, basic analytics, read‑only student view) while preserving a clear architecture for future modules.

**Status:** MVP (this overall framing).

---

## 2. Problem we solve

- Teachers and admins currently perform complex grouping work by memory and manually-managed spreadsheets. That work is:
  - Time consuming and error prone.
  - Hard to share across teachers and staff.
  - Not reproducible (we lose the "who was assigned at what time" context).
- Schools lack a lightweight way to:
  - Import canonical rosters (pools).
  - Run one reproducible grouping scenario and evaluate how well it meets student-supplied preferences.
  - Share results with students in a safe, readable way.

**Status:** MVP (problem framing).

---

## 3. Who we serve (primary personas)

- Classroom Teachers — need fast, low‑friction grouping for class activities and clear results they can present.
- Club / Program Coordinators — need a simple way to run an allocation and see “how well did we satisfy student requests”.
- Students — need a simple, read‑only way to see rosters they are part of (no auth in MVP; read‑only display modes).
- School Admin / IT — cares about roster import and future SIS integration.

**Status:** MVP.

---

## 4. Product principles

- Privacy‑first: avoid unnecessary persistence of sensitive signals in MVP; defer broader survey/insights rollouts until privacy design is clear.  
- Teacher time respected: every flow must be fast and low‑friction.  
- Reproducible: every created Scenario must include a participant snapshot so results can be reconstructed.  
- Modular & incremental: build MVP modules that can be swapped or extended without a big refactor.

**Status:** MVP (principles).

---

## 5. Reduced MVP (explicit)

The following features constitute the intentionally reduced scope we will implement first.

MVP features (implement now)
- Pool import from CSV/TSV — create named Pools (rosters) by uploading a CSV.
- Program creation UI — create a Program and associate one Pool (primaryPoolId).
- Single Scenario generation — run the existing grouping algorithm to produce one Scenario per Program and write `participantSnapshot` at creation time.
- Basic analytics for a Scenario:
  - PercentAssignedTopChoice (percentage assigned to their #1 preference).
  - AveragePreferenceRankAssigned (mean rank assigned; lower is better).
  - Optional: PercentAssignedTop2 (configurable, easy extra).
- Read‑only student view for a Scenario:
  - Teacher can present or share (teacher‑presented student view mode).
  - No authentication in MVP; student view is read‑only and intended for teacher-managed sharing.
- Minimal `leaderStaffId?: string` on Group (optional attribute to record a leader; no leader workflows).
- Clear Status tags in docs and an internal note that the codebase is not yet refactored to this model.

Out of scope for MVP (deferred)
- ActiveGrouping edits and AdjustmentEvent logging (no live, post‑adopt edits in MVP).
- ConflictRules / do‑not‑group constraints.
- EnrollmentRecords (detailed temporal membership history).
- SIS sync automation (manual CSV import only).
- Authentication / student accounts / per‑user permissions.
- Observation micro‑workflow, surveys, advanced fairness algorithms, multi‑school admin features beyond basic schoolId metadata.

**Status:** MVP / Planned / Future as annotated.

---

## 6. Modular architecture (what exists conceptually; MVP subset implemented)

We describe the product as a set of modules so future work can be componentized. Only a subset is in MVP.

Core modules (MVP subset first)
- Pool Module (MVP): roster import/management via CSV; Pools are named rosters that Programs reference.
- Grouping Module (MVP): the grouping engine + UI to generate a single Scenario per Program and present groups.
- Insights / Analytics Module (MVP): scenario satisfaction metrics and basic reports.
- Workspace Shell (MVP): single‑page teacher workspace that composes Pool + Grouping + Insights.

Planned modules (near‑term)
- ActiveGrouping Module (Planned): adopt a scenario into live assignments and track adjustments.
- Conflict Module (Planned): define and apply scoped ConflictRules.
- SIS Sync Module (Planned): safe automated roster syncs.
- Multi‑teacher Collaboration (Planned): shared Program visibility across staff.

Future modules (aspirational)
- Observations & Surveys Module (Future): teacher micro‑observations and student surveys for social graph signals.
- Student Portal & Authentication (Future): secure student views, consent flows.
- Advanced Insights & Fairness Engine (Future): cross‑term fairness and scheduling helpers.

**Status:** Mixed (modules intentionally staged).

---

## 7. Success metrics for this reduced MVP

- Usability: a teacher can import a CSV, create a Program, generate a Scenario, and view analytics in under 15 minutes end‑to‑end.
- Value: percent of pilot teachers who say the analytics helped identify allocation problems (qualitative pilot feedback).
- Student visibility: teacher can present a read‑only student view for at least one Program scenario.
- Reproducibility: every Scenario contains a participant snapshot so results are auditable.

**Status:** MVP.

---

## 8. Risks & mitigations

- Risk: No authentication in MVP could raise privacy concerns.  
  - Mitigation: Student view is teacher‑presented only (no public links for general distribution) and the MVP will include clear operating guidance for pilots. Authentication added in Planned stage.

- Risk: CSV import inconsistencies.  
  - Mitigation: Strict import validation, helpful error messages, and a preview step.

- Risk: Scope creep.  
  - Mitigation: The roadmap and this document lock MVP scope; other features must be explicit Planned/Future items.

**Status:** MVP / Planned.

---

## 9. Roadmap (short)

- Phase 0: Finalize vision, domain model, and reduced MVP docs (this step).  
- Phase 1 (MVP): Pools via CSV import, single Scenario generation with participant snapshot, basic analytics, teacher workspace, read‑only student view.  
- Phase 2 (Planned): EnrollmentRecords, ActiveGrouping + AdjustmentEvent logging, ConflictRules, SIS sync, improved mobile teacher observation UX.  
- Phase 3 (Future): Student portal + auth, surveys, advanced analytics and fairness logic, multi‑school admin workflows.

---

## 10. Public blurb (for blog/landing)

Friend‑Hat helps schools turn everyday grouping decisions into reproducible, data‑informed practice. Start small: import your class roster, generate one grouping scenario, and see how well assignments match student preferences.

**Status:** MVP.

---

## 11. Document status

This file describes the reduced MVP and the long‑term architecture. The current codebase implements an early, single‑module grouping experience; this document maps the short path from that codebase to the target state. Everything here is the product team's single source of truth for scope and priorities.

**Status:** Aspirational (reduced MVP clearly annotated).
