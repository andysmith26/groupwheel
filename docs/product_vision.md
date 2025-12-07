# Friend‑Hat — Product Vision

_Last updated: 2025-12-07_

This document is the canonical product vision for Friend‑Hat. It describes the core problem we solve, the long‑term ambition, and — critically for now — a deliberately reduced MVP that focuses on the smallest useful slice we can ship while preserving upgrade paths to the full vision. This file is aspirational in places; sections are explicitly marked with Status tags so readers know what is expected to exist in code today vs later.

---

## Status legend

- **MVP** — In scope for the current reduced MVP (to be implemented first).
- **Planned** — Intended for the near term (after MVP).
- **Future** — Long‑term aspirations; not scheduled.

---

## 1. Elevator pitch

Friend‑Hat is a privacy‑first, school‑grade social grouping platform that helps teachers and admins create and evaluate groupings across contexts — from a five‑minute in‑class activity to term‑long clubs and year‑long advisories. The reduced MVP prioritizes a small, high‑value set of features delivered through a unified "Create Groups" wizard (roster import, preferences, naming), single scenario generation, basic analytics, and read‑only student view — all while preserving a clear architecture for future modules.

**Status:** MVP (implemented).

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

MVP features (✅ implemented)

- **Unified "Create Groups" Wizard** (`/groups/new`) — A consolidated 4-step flow that:
  - Allows roster reuse (returning users can select from existing rosters)
  - Accepts CSV/TSV paste for student roster data with live preview and validation
  - Accepts preferences paste with warnings for students not in roster
  - Collects activity name and settings
  - Creates both Pool and Program in one seamless workflow
  - See [decision record](decisions/2025-12-01-create-groups-wizard.md) for rationale
- **Pool import from CSV/TSV** — Create named Pools (rosters) via paste interface with field mapping support (name, id, grade).
- **Program creation** — Associate one Pool via `primaryPoolId`, set program type and timeSpan.
- **Single Scenario generation** — Run balanced grouping algorithm to produce one Scenario per Program and write `participantSnapshot` at creation time (preserves reproducibility).
- **Basic analytics for a Scenario**:
  - ✅ PercentAssignedTopChoice (percentage assigned to their #1 preference)
  - ✅ AveragePreferenceRankAssigned (mean rank assigned; lower is better)
  - ✅ PercentAssignedTop2 (percentage assigned to top 2 choices)
  - Displayed as badges on activity detail page
- **Read‑only student view** (`/scenarios/[id]/student-view`):
  - Teacher can present or share (teacher‑presented student view mode)
  - No authentication in MVP; student view is read‑only and intended for teacher-managed sharing
  - Print-friendly layout with clear group organization
- **Teacher-friendly URL structure** (`/groups/*` instead of `/programs/*`):
  - Uses language teachers understand ("groups" vs "programs")
  - Pool/Program architectural distinction is internal; teachers see "activities" and "rosters"
- **Balanced grouping algorithm** with preference-based optimization:
  - Targets 4-6 students per group
  - Uses happiness scoring and iterative swap optimization
  - Integrates student preference data

Out of scope for MVP (deferred)

- ActiveGrouping edits and AdjustmentEvent logging (no live, post‑adopt edits in MVP).
- ConflictRules / do‑not‑group constraints.
- EnrollmentRecords (detailed temporal membership history).
- `leaderStaffId` on Group (minimal tracking; no leader assignment workflows).
- SIS sync automation (manual CSV import only).
- Authentication / student accounts / per‑user permissions.
- Observation micro‑workflow, surveys, advanced fairness algorithms, multi‑school admin features beyond basic schoolId metadata.
- Pool manual edit UI (basic CRUD exists in domain/use cases but no UI).
- Analytics dashboard/hub (route exists as placeholder).

**Status:** MVP features fully implemented; Planned and Future features deferred.

---

## 6. Modular architecture (what exists conceptually; MVP subset implemented)

We describe the product as a set of modules so future work can be componentized. Only a subset is in MVP.

Core modules (✅ MVP implemented)

- **Pool Module** (✅ implemented): Roster import/management via CSV paste; Pools are named rosters that Programs reference. Integrated into unified wizard for first-time users; reusable for returning users.
- **Grouping Module** (✅ implemented): The grouping engine + UI to generate a single Scenario per Program and present groups. Includes balanced algorithm with preference optimization.
- **Insights / Analytics Module** (✅ implemented): Scenario satisfaction metrics (top choice %, top 2 %, average rank). Displayed on activity detail pages.
- **Workspace Shell** (✅ implemented): Teacher workspace at `/groups` that lists all grouping activities with student counts, preference coverage, and scenario status.
- **Create Groups Wizard** (✅ implemented): Unified flow at `/groups/new` that consolidates roster selection/import + preference upload + activity naming into single workflow. See [wizard decision](decisions/2025-12-01-create-groups-wizard.md).

Planned modules (near‑term)

- **ActiveGrouping Module** (Planned): Adopt a scenario into live assignments and track adjustments via AdjustmentEvents.
- **Conflict Module** (Planned): Define and apply scoped ConflictRules (e.g., "never group these students").
- **SIS Sync Module** (Planned): Safe automated roster syncs from student information systems.
- **Multi‑teacher Collaboration** (Planned): Shared Program visibility across staff with role-based access.
- **Analytics Dashboard** (Planned): Dedicated analytics hub beyond per-scenario metrics.

Future modules (aspirational)

- **Observations & Surveys Module** (Future): Teacher micro‑observations and student surveys for social graph signals.
- **Student Portal & Authentication** (Future): Secure student views, consent flows, student-submitted preferences.
- **Advanced Insights & Fairness Engine** (Future): Cross‑term fairness tracking, scheduling helpers, historical analysis.

**Status:** MVP modules fully implemented; Planned and Future modules staged for later releases.

---

## 7. Success metrics for this reduced MVP

- **Usability**: A teacher can complete the full workflow (paste roster, paste preferences, name activity, generate groups, view analytics) in under 15 minutes end‑to‑end via the unified wizard. ✅ _Implemented and testable._
- **Value**: Percent of pilot teachers who say the analytics helped identify allocation problems (qualitative pilot feedback). _To be measured in pilot phase._
- **Student visibility**: Teacher can present a read‑only student view for at least one Program scenario. ✅ _Implemented at `/scenarios/[id]/student-view`._
- **Reproducibility**: Every Scenario contains a participant snapshot so results are auditable. ✅ _Implemented via `participantSnapshot` field._
- **Reduced friction**: Teachers don't need to understand Pool/Program distinction upfront; they discover roster reuse organically on second use. ✅ _Implemented via wizard's roster selection step._

**Status:** MVP implemented; pilot feedback collection pending.

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

- ✅ **Phase 0** (Complete): Finalized vision, domain model, and reduced MVP docs. Established hexagonal architecture with domain/application/infrastructure layers.
- ✅ **Phase 1** (MVP - Complete):
  - Unified "Create Groups" wizard with roster reuse support
  - Pools via CSV/TSV paste import with live preview and validation
  - Single Scenario generation with participant snapshot for reproducibility
  - Basic analytics (top choice %, top 2 %, average rank)
  - Teacher workspace at `/groups` with activity listing
  - Read‑only student view at `/scenarios/[id]/student-view`
  - Balanced grouping algorithm with preference optimization
- **Phase 2** (Planned - Next):
  - EnrollmentRecords for temporal membership tracking
  - ActiveGrouping + AdjustmentEvent logging for post-generation edits
  - ConflictRules for "never group" constraints
  - SIS sync for automated roster updates
  - Analytics dashboard/hub
  - Pool manual edit UI
  - Improved mobile teacher observation UX
- **Phase 3** (Future):
  - Student portal + authentication
  - Student-submitted preferences with consent flows
  - Surveys and micro-observations
  - Advanced analytics and cross-term fairness logic
  - Multi‑school admin workflows

---

## 10. Public blurb (for blog/landing)

Friend‑Hat helps schools turn everyday grouping decisions into reproducible, data‑informed practice. Paste your class roster and student preferences, generate grouping scenarios in seconds, and see exactly how well assignments match what students requested. No accounts, no friction — just better groups.

**Status:** MVP implemented.

---

## 11. Document status

This file describes the reduced MVP and the long‑term architecture. As of December 2025, the **MVP is fully implemented** and ready for pilot testing. The codebase follows a clean hexagonal architecture (domain/application/infrastructure layers) with all core features operational:

- ✅ Unified "Create Groups" wizard
- ✅ CSV/TSV roster and preference import
- ✅ Single scenario generation with reproducibility
- ✅ Analytics (satisfaction metrics)
- ✅ Read-only student view

Everything here is the product team's single source of truth for scope and priorities. The vision now reflects **implemented reality** for MVP features, with clear markers for Planned and Future work.

**Status:** MVP implemented and documented; vision aligned with codebase as of 2025-12-07.
