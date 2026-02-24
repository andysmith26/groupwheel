# Groupwheel — Current Status

**Last verified:** February 2026

This document tracks what's actually implemented. Update when features ship.

---

## Implementation Status

### MVP Features

| Feature                     | Status  | Route/Location              | Notes                                      |
| --------------------------- | ------- | --------------------------- | ------------------------------------------ |
| Create Groups wizard        | ✅ Done | `/activities/new`           | Streamlined 3-step wizard                  |
| CSV roster import           | ✅ Done | Wizard Students step        | TSV also supported                         |
| Preference import           | ✅ Done | Wizard Preferences step     | Mismatch warnings shown                    |
| Group configuration         | ✅ Done | Wizard Groups step          | "Specific groups" or "Auto split" modes    |
| Balanced grouping algorithm | ✅ Done | `generateScenario` use case | Request-aware two-phase algorithm          |
| Basic analytics             | ✅ Done | Activity detail page        | Top %, top 2 %, avg rank                   |
| Drag-drop editing           | ✅ Done | Activity detail page        | Via ScenarioEditingStore                   |
| Undo/redo                   | ✅ Done | Activity detail page        | Session-scoped command history             |
| Live view (student/teacher) | ✅ Done | `/activities/[id]/live`     | Read-only student view + teacher view      |
| Roster reuse                | ✅ Done | Wizard Start step           | Shows existing rosters for returning users |
| Auto-save                   | ✅ Done | Activity detail             | 500ms debounce to IndexedDB                |
| Activity dashboard          | ✅ Done | `/activities`               | Lists all activities                       |
| Browser persistence         | ✅ Done | IndexedDB                   | Scenarios persist across sessions          |

### NEXT Features

| Feature                  | Status         | Notes                                |
| ------------------------ | -------------- | ------------------------------------ |
| Candidate Gallery        | 🔲 Not started | Phase 2 UX evolution                 |
| Inline workspace editing | ✅ Done        | Generation integrated into workspace |
| Conflict rules           | 🔲 Not started | Domain model ready                   |
| Adjustment logging       | 🔲 Not started | —                                    |
| Pool manual edit UI      | 🔲 Not started | Use cases ready, no UI               |
| Analytics dashboard      | 🔲 Not started | Route exists as placeholder          |

### LATER Features

| Feature              | Status         |
| -------------------- | -------------- |
| Student portal       | 🔲 Not started |
| Authentication       | ✅ Done        |
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

| Gap                        | Impact                                          | Mitigation                                                    |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Authentication is optional | Users must sign in for cross-device persistence | Browser storage by default; Google Sheets sync when signed in |
| Mobile untested            | Touch drag-drop may have issues                 | Target is laptop; defer mobile                                |
| Algorithm single-run       | Teacher gets one option                         | Candidate Gallery in NEXT phase                               |
| No conflict rules UI       | Teachers can't specify "never group"            | Manual editing as workaround                                  |

---

## Recent Changes

| Date     | Change                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| Dec 2025 | Optional Google authentication + OAuth routes implemented (`/auth/*`)              |
| Feb 2026 | Flow simplification: merged /start, /present, /observe into /workspace and /live   |
| Dec 2025 | Request-aware grouping algorithm (two-phase: preferences first, balanced fallback) |
| Dec 2025 | Group request import with CSV/TSV parser and validation UI                         |
| Dec 2025 | **Groupwheel pivot**: Removed friend-based preferences, request-only mode          |
| Dec 2024 | MVP complete; wizard flow, analytics, student view                                 |
| Nov 2024 | Hexagonal architecture migration                                                   |
| Nov 2024 | Domain model consolidation                                                         |

---

## How to Update This Document

1. When you ship a feature, change its status from 🔲 to ✅
2. Update "Last verified" date
3. Add entry to "Recent Changes"
4. Keep it factual—aspirations go in [PRODUCT.md](PRODUCT.md)
