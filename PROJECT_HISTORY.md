# Project History

This document records significant pivots and historical context for the Turntable project.

---

## December 2025: Friend Hat → Turntable Pivot

### What Changed

The project was originally named **Friend Hat** and focused on grouping students based on social preferences—specifically, who students wanted to work with (friend preferences). The executive team decided this approach:

1. Is ethically problematic—capturing and optimizing for social preferences carries potential for social harm
2. Is not supported by educational research literature
3. Does not align with market demand

### New Direction: Turntable

**Turntable** is a toolbox for forming groups under multiple modes:

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

- **Product name:** Turntable
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
