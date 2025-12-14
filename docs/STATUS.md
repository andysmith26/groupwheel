# Turntable — Current Status

**Last verified:** December 2025

This document tracks what's actually implemented. Update when features ship.

---

## Implementation Status

### MVP Features

| Feature                     | Status  | Route/Location                 | Notes                                                    |
| --------------------------- | ------- | ------------------------------ | -------------------------------------------------------- |
| Create Groups wizard        | ✅ Done | `/groups/new`                  | New users: 4 steps; Returning: 5 steps with roster reuse |
| CSV roster import           | ✅ Done | Wizard Students step           | TSV also supported                                       |
| Preference import           | ✅ Done | Wizard Preferences step        | Mismatch warnings shown                                  |
| Group configuration         | ✅ Done | Wizard Groups step             | "Specific groups" or "Auto split" modes                  |
| Balanced grouping algorithm | ✅ Done | `generateScenario` use case    | Request-aware two-phase algorithm                        |
| Basic analytics             | ✅ Done | Activity detail page           | Top %, top 2 %, avg rank                                 |
| Drag-drop editing           | ✅ Done | Activity detail page           | Via ScenarioEditingStore                                 |
| Undo/redo                   | ✅ Done | Activity detail page           | Session-scoped command history                           |
| Read-only student view      | ✅ Done | `/scenarios/[id]/student-view` | Print-friendly                                           |
| Roster reuse                | ✅ Done | Wizard Start step              | Shows existing rosters for returning users               |
| Auto-save                   | ✅ Done | Activity detail                | 500ms debounce to IndexedDB                              |
| Activity dashboard          | ✅ Done | `/groups`                      | Lists all activities                                     |
| Browser persistence         | ✅ Done | IndexedDB                      | Scenarios persist across sessions                        |

### NEXT Features

| Feature                  | Status         | Notes                       |
| ------------------------ | -------------- | --------------------------- |
| Candidate Gallery        | 🔲 Not started | Phase 2 UX evolution        |
| Inline workspace editing | 🔲 Not started | Merge edit into detail page |
| Conflict rules           | 🔲 Not started | Domain model ready          |
| Adjustment logging       | 🔲 Not started | —                           |
| Pool manual edit UI      | 🔲 Not started | Use cases ready, no UI      |
| Analytics dashboard      | 🔲 Not started | Route exists as placeholder |

### LATER Features

| Feature              | Status         |
| -------------------- | -------------- |
| Student portal       | 🔲 Not started |
| Authentication       | 🔲 Not started |
| SIS integration      | 🔲 Not started |
| Multi-teacher collab | 🔲 Not started |
| LMS export           | 🔲 Not started |

---

## Architecture Status

| Layer                 | Status      | Location                                         |
| --------------------- | ----------- | ------------------------------------------------ |
| Domain entities       | ✅ Complete | `src/lib/domain/`                                |
| Domain factories      | ✅ Complete | `createPool`, `createScenario`, etc.             |
| Application ports     | ✅ Complete | `src/lib/application/ports/`                     |
| Use cases             | ✅ Complete | `src/lib/application/useCases/`                  |
| InMemory repositories | ✅ Complete | `src/lib/infrastructure/repositories/inMemory/`  |
| IndexedDB persistence | ✅ Complete | `src/lib/infrastructure/repositories/indexedDb/` |
| Svelte context wiring | ✅ Complete | `src/lib/contexts/appEnv.ts`                     |
| ScenarioEditingStore  | ✅ Complete | `src/lib/application/stores/` — undo/redo        |

---

## Test Coverage

| Area                | Status     | Notes                |
| ------------------- | ---------- | -------------------- |
| Domain unit tests   | ✅ Good    | Factories, analytics |
| Use case unit tests | ⚠️ Partial | Core paths covered   |
| Component tests     | ⚠️ Partial | Wizard steps         |
| E2E tests           | ✅ Good    | Full wizard flow     |

---

## Known Gaps

| Gap                  | Impact                               | Mitigation                       |
| -------------------- | ------------------------------------ | -------------------------------- |
| No authentication    | Can't persist across devices         | Browser storage + export planned |
| Mobile untested      | Touch drag-drop may have issues      | Target is laptop; defer mobile   |
| Algorithm single-run | Teacher gets one option              | Candidate Gallery in NEXT phase  |
| No conflict rules UI | Teachers can't specify "never group" | Manual editing as workaround     |

---

## Recent Changes

| Date     | Change                                                                   |
| -------- | ------------------------------------------------------------------------ |
| Dec 2025 | Request-aware grouping algorithm (two-phase: preferences first, balanced fallback) |
| Dec 2025 | Group request import with CSV/TSV parser and validation UI               |
| Dec 2025 | **Turntable pivot**: Removed friend-based preferences, request-only mode |
| Dec 2024 | MVP complete; wizard flow, analytics, student view                       |
| Nov 2024 | Hexagonal architecture migration                                         |
| Nov 2024 | Domain model consolidation                                               |

---

## How to Update This Document

1. When you ship a feature, change its status from 🔲 to ✅
2. Update "Last verified" date
3. Add entry to "Recent Changes"
4. Keep it factual—aspirations go in [PRODUCT.md](PRODUCT.md)
