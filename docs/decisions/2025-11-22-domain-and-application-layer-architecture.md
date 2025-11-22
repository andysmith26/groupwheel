# Domain and Application Layer Architecture for Friend‑Hat MVP

**Date:** 2025-11-22  
**Status:** Accepted

## Context

The current Friend‑Hat codebase implements an early, single‑page grouping UI where domain concepts (students, groups, rosters) are implicit in component state and Svelte stores. The product vision and MVP docs now define a richer domain model (Pools, Programs, Scenarios, Preferences, Analytics) and explicit use cases (CSV import, scenario generation, analytics, read‑only student view), plus a roadmap of near‑term and future features. We need to reach the reduced MVP quickly while avoiding a second major refactor when we add EnrollmentRecords, ActiveGrouping, ConflictRules, and SIS integration. At the same time, we should not over‑engineer a full DDD/hexagonal stack that slows down learning and delivery.

## Decision

We will introduce a minimal but explicit layered architecture with three main layers: (1) a pure TypeScript **domain layer** (`src/lib/domain`) that mirrors the concepts and fields in `docs/domain_model.md`, (2) an **application/use‑case layer** (`src/lib/application`) that encodes the flows in `docs/use_cases.md` using repository ports, `Result` types, and fine‑grained error unions, and (3) an **infrastructure layer** (`src/lib/infrastructure`) that provides concrete repository implementations and utilities (e.g., in‑memory repos, ID generator, clock, grouping adapter). Svelte components, stores, and routes will call these use‑case functions instead of owning domain logic, enabling incremental migration of existing behavior without a big‑bang rewrite.

## Consequences

### Benefits

- **Stable domain vocabulary:** The `src/lib/domain` types (Student, Staff, Pool, Program, Scenario, Group, Preference, ScenarioSatisfaction) become the single source of truth, aligned directly with `docs/domain_model.md`, reducing renames and model thrash as we grow.
- **Explicit use cases:** Each MVP flow (CSV→Pool import, Program creation, Scenario generation, analytics, student view) is captured as a dedicated function with typed inputs, outputs, and error unions, which improves testability and makes behavior easier to reason about and evolve.
- **Separation of concerns:** UI code (Svelte components, stores, contexts) no longer encodes business rules directly; domain invariants and orchestration live in the domain and application layers, making it easier to change UI without breaking logic, or vice versa.
- **Easier future features:** Planned concepts like EnrollmentRecords, ActiveGrouping, AdjustmentEvents, ConflictRules, and SIS sync can be added to the domain and application layers without re‑cutting the entire architecture; we extend repositories and use cases rather than rewriting the core.
- **Testable core:** Use cases and domain functions are pure TS with explicit dependencies (repositories, clocks, ID generators, grouping algorithm), which supports straightforward unit tests without Svelte or Google Sheets in the loop.
- **Pluggable infrastructure:** Repository ports (`*Repository`), `IdGenerator`, `Clock`, and `GroupingAlgorithm` allow swapping implementations (in‑memory, Sheets‑backed, future backend) with minimal impact on domain and use‑cases.

### Costs

- **Up‑front complexity:** Introducing separate domain, application, and infrastructure layers adds conceptual and file structure overhead compared to continuing to put logic into Svelte components and stores.
- **Migration effort:** Existing code that assumes in‑memory groups and students must be gradually refactored to call use‑case functions and work with domain types; there will be a period of duplication and churn while both old and new paths coexist.
- **Indirection for simple flows:** Some operations that could be done inline (e.g., a quick grouping tweak) will now go through a use‑case function and ports, which may feel heavier for very small changes.
- **Discipline required:** The architecture only pays off if we consistently keep domain logic out of the UI and respect the boundaries; mixing responsibilities again would recreate the original problems with more layers in the way.
- **Deferred optimizations:** We will initially implement repositories and grouping adapters in a simple in‑memory fashion and add persistence/integration (e.g., Google Sheets or a dedicated backend) later, which defers some performance and data durability work until after the architecture is in place.
