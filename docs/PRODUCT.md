# Groupwheel — Product Vision

**Last updated:** December 2025

---

## Mission

Help K-12 teachers make better grouping decisions through data-informed, reproducible practice—without compromising student privacy.

---

## Problem

Teachers constantly form student groups: lab partners, reading circles, clubs, advisories, cabin assignments. Current approaches are:

- **Manual spreadsheets** — Time-consuming, error-prone, no optimization
- **Random generators** — Ignore student requests and capacity constraints
- **Gut instinct** — Unreproducible, vulnerable to bias

Teachers lack tools to balance student group requests, avoid conflicts, and evaluate whether groupings are working.

---

## Solution

Groupwheel provides:

1. **Request-aware grouping** — Students rank which groups they want to join; algorithm optimizes satisfaction
2. **Instant analytics** — See what percentage got their top choice before committing
3. **Workspace, not wizard** — Groups are living documents refined throughout the semester
4. **Privacy-first** — All processing happens in-browser; no student data stored on servers

---

## Target Users

### Primary: K-12 Teachers

- **Elementary** (grades K-5): Class activities, reading groups, field trip buddies
- **Middle school** (grades 6-8): Clubs, advisory groups, project teams
- **High school** (grades 9-12): Clubs, peer tutoring, capstone teams

### Secondary: School Administrators

- Counselors managing conflict avoidance rules
- Activity coordinators running school-wide programs

---

## Use Cases

### UC1: Import Roster from CSV

**Actor:** Teacher  
**Goal:** Create a named roster by pasting CSV/TSV data  
**Flow:**

1. Teacher pastes student data (name, grade, ID)
2. System shows preview with column mapping
3. Teacher confirms; roster is created
4. Roster available for reuse across activities

**Success criteria:** Roster created with all students parsed; clear error messages for malformed data.

---

### UC2: Create Grouping Activity

**Actor:** Teacher  
**Goal:** Set up a new grouping activity linked to a roster  
**Flow:**

1. Teacher names activity (e.g., "Spring Clubs", "Lab Partners Week 3")
2. Teacher selects existing roster or imports new one
3. Activity created and ready for preferences

**Success criteria:** Activity exists with roster reference; teacher understands they can add preferences next.

---

### UC3: Import Group Requests

**Actor:** Teacher
**Goal:** Add student group request data to activity
**Flow:**

1. Teacher pastes request CSV (student ID, ranked group choices)
2. System validates against roster; warns on mismatches
3. Requests attached to activity

**Success criteria:** Requests imported; mismatches clearly surfaced; teacher can proceed to generation.

---

### UC4: Generate Groups

**Actor:** Teacher  
**Goal:** Produce optimized group assignments  
**Flow:**

1. Teacher clicks "Generate Groups"
2. Algorithm creates balanced groups optimizing for preference satisfaction
3. Results displayed with analytics (% top choice, % top 2, average rank)
4. Teacher can regenerate or proceed to editing

**Success criteria:** Groups created in <2 seconds; analytics visible; reproducible via participant snapshot.

---

### UC5: Edit Groups Manually

**Actor:** Teacher  
**Goal:** Refine algorithm output based on teacher knowledge  
**Flow:**

1. Teacher drags students between groups
2. Changes reflected immediately with updated analytics
3. Undo/redo available for session
4. Auto-save preserves work

**Success criteria:** Drag-drop works smoothly; undo reverses changes; no data loss.

---

### UC6: Present Student View

**Actor:** Teacher (presenting), Students (viewing)  
**Goal:** Share final groupings with class  
**Flow:**

1. Teacher opens student view
2. Projects or shares screen showing all groups
3. Students see their assignments

**Success criteria:** Clean, print-friendly layout; no editing controls visible; no authentication required.

---

### UC7: Reuse Roster (Returning User)

**Actor:** Teacher  
**Goal:** Create new activity using existing roster  
**Flow:**

1. Teacher starts new activity
2. System offers "Start from existing roster"
3. Teacher selects roster; only needs to add new preferences

**Success criteria:** Teacher doesn't re-import same students; discovers roster reuse organically.

---

## Roadmap

### NOW (MVP — Current Focus)

Core loop for a single teacher creating one-time groupings:

- Unified "Create Groups" wizard (roster → preferences → generate)
- Balanced grouping algorithm with preference optimization
- Basic analytics (top choice %, top 2 %, average rank)
- Drag-drop group editing with undo/redo
- Read-only student view for classroom presentation
- Roster reuse for returning users
- Auto-save to browser storage

### NEXT (Post-MVP)

Features for semester-long group management:

- **Candidate Gallery** — Browse 3-5 algorithm variations before selecting
- **Inline workspace editing** — Edit directly on activity page, not separate route
- **Conflict rules** — "Never group these students together"
- **Adjustment logging** — Track post-generation changes
- **Pool manual editing** — Add/remove students mid-semester
- **Analytics dashboard** — Cross-activity insights

### LATER (Future)

Features for school-wide adoption:

- **Student portal** — Students submit preferences directly (with consent flows)
- **Authentication** — User accounts, saved activities across devices
- **SIS integration** — Auto-sync rosters from student information systems
- **Multi-teacher collaboration** — Shared activities, presence indicators
- **LMS export** — Push groups to Google Classroom, Canvas
- **Advanced fairness** — Cross-term balancing, historical analysis
- **Observations module** — Teacher micro-observations to inform future groups

---

## Success Metrics

### Usability

- Teacher completes full workflow (import → generate → view) in <15 minutes
- No support requests about "where do I go next" (orientation clarity)

### Value

- Pilot teachers report analytics helped identify allocation problems
- Teachers return to edit groups mid-semester (validates workspace model)

### Technical

- Algorithm runs <100ms for 50 students
- Scenario snapshots enable reproducible results

---

## Scope Boundaries (What We're NOT Building)

### Explicitly Out of Scope

- **Mobile-first design** — Optimize for teacher laptops; mobile is secondary
- **Real-time collaboration** — Single-teacher ownership for MVP
- **Student accounts** — Teacher-presented views only until authentication exists
- **Gradebook integration** — Focus on grouping, not grading
- **Seating charts** — Related but different problem

### Deferred to LATER

- SIS automation (manual CSV for now)
- Cross-school admin features
- Observation/survey modules
- Advanced fairness algorithms

---

## Risks & Mitigations

| Risk                                      | Mitigation                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| No auth raises privacy concerns           | Student view is teacher-presented only; clear guidance for pilots       |
| CSV import inconsistencies                | Strict validation, preview step, helpful error messages                 |
| Scope creep                               | This document locks scope; new features require explicit roadmap update |
| Algorithm doesn't match teacher intuition | Candidate gallery lets teachers choose starting point                   |

---

## Architecture Alignment

The product is built on hexagonal architecture with clear domain boundaries:

| Product Concept    | Domain Entity |
| ------------------ | ------------- |
| Roster             | Pool          |
| Activity           | Program       |
| Generated Groups   | Scenario      |
| Student preference | Preference    |

Teachers see "roster" and "activity"; the domain model uses "Pool" and "Program." This translation happens at the UI layer.

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

---

## Document Maintenance

This document describes **what we're building and why**. It should be:

- Updated when vision changes
- Referenced when prioritizing features
- Stable between major product pivots

For **current implementation status**, see [STATUS.md](STATUS.md).
