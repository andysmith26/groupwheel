# Project History

This document records significant pivots and historical context for the Groupwheel project.

---

## December 2025: Friend Hat → Turntable Pivot

### What Changed

The project was originally named **Friend Hat** and focused on grouping students based on social preferences—specifically, who students wanted to work with (friend preferences). The executive team decided this approach:

1. Is ethically problematic—capturing and optimizing for social preferences carries potential for social harm
2. Is not supported by educational research literature
3. Does not align with market demand

### New Direction: Turntable

**Turntable** (now **Groupwheel**) is a toolbox for forming groups under multiple modes:

- **Request-based placement** into named groups ("clubs") with optional capacities
- **Random/ad-hoc grouping** (quick splits) with optional constraints
- **Manual adjustments** post-generation with live metrics

Students submit **requests/choices** for groups (e.g., which club they want to join), not social preferences about classmates. The system uses those requests as input while maintaining teacher control.

### What Was Removed

- Friend preference collection (`likeStudentIds` field)
- Friend-based "happiness" optimization algorithm
- UI elements showing friend relationships in groups
- Analytics based on friend satisfaction

### What Was Preserved

- Hexagonal architecture (domain/application/infrastructure layers)
- Privacy-first browser-local processing
- Drag-drop group editing with undo/redo
- Core domain concepts: Roster (Pool), Groups, Scenarios
- `avoidStudentIds` and `avoidGroupIds` fields (for future constraint support)

### Brand

- **Product name:** Groupwheel (formerly Turntable)
- **Tagline:** Groups shaped together

---

## Original Vision (Historical)

For historical reference, the original Friend Hat vision was:

> "Help K-12 teachers make better grouping decisions through data-informed, reproducible practice—without compromising student privacy."

The core workflow was:
1. Import roster
2. Import friend preferences (who wants to work with whom)
3. Generate groups optimizing for friend satisfaction
4. Review and refine

This approach was retired in December 2025.

---

## Implementation Milestones (December 2025)

### Milestone 1: Brand + Purge ✅

- Renamed Friend Hat → Turntable throughout codebase
- Removed `likeStudentIds` field from StudentPreference
- Replaced friend-based "happiness" algorithm with balanced random assignment
- Updated IndexedDB database name from 'friend-hat' to 'turntable'
- Updated all documentation to reflect new brand and direction

### Milestone 2: Group Request Import ✅

Added CSV/TSV import for student group requests (ranked choices):

- **`src/lib/services/groupRequestImport.ts`**: Parser for group request data
  - Supports CSV and TSV formats (auto-detected)
  - Case-insensitive matching for student IDs and group names
  - Returns canonical group names from defined groups
  - Comprehensive warnings for unknown students/groups
  - Configurable maximum choices

- **`src/lib/components/wizard/StepPreferences.svelte`**: Full UI for pasting group requests
  - Text area for paste input
  - Live parsing with stats (imported/skipped/total)
  - Warnings display with unknown students/groups
  - Example CSV generator based on defined groups
  - Available groups reference display

- **Analytics update**: `computeScenarioSatisfaction` now matches preferences by group name (case-insensitive) in addition to group ID, supporting the preference format from the import

### Milestone 3: Request-Aware Optimization ✅

Rewrote the balanced assignment algorithm to prioritize student group requests:

- **Two-phase algorithm** in `src/lib/algorithms/balanced-assignment.ts`:
  1. **Phase 1**: Process students with preferences first (shuffled for fairness)
     - Try to assign each student to their first choice, then second, etc.
     - Match by group ID or name (case-insensitive)
  2. **Phase 2**: Balanced fallback for remaining students
     - Students without preferences or whose preferences couldn't be satisfied
     - Assigns to group with most remaining capacity

- **Group matching**: Supports both ID-based and name-based matching (case-insensitive) to handle preferences stored as group names from the import

- **Seeded determinism**: Both phases use seeded RNG for reproducible results

### Milestone 4: Documentation & Polish ✅

- Updated PROJECT_HISTORY.md with implementation milestones
- Updated STATUS.md with current feature status
- Verified all 255 tests pass
