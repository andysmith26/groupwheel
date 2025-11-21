# MVP Re-Architecture: Feature-Based Organization

**Date:** 2025-11-21  
**Status:** Proposed

## Context

The Friend-Hat codebase currently implements a single-session grouping prototype. The product vision has evolved to require:

1. **Pool-based roster management** - CSV import creating named rosters (Pools)
2. **Program entity** - Grouping contexts (clubs, advisory, etc.) that reference Pools
3. **Scenario with participant snapshot** - Reproducible grouping results
4. **Preference-based analytics** - Satisfaction metrics for student preferences
5. **Read-only student view** - Teacher-presented display mode

The current architecture:
- ✅ Has working grouping algorithms and drag-and-drop UI
- ✅ Uses command pattern for undo/redo
- ✅ Has good component patterns
- ❌ Lacks domain model for Pool/Program/Scenario
- ❌ Organized by technical layer (components/services/utils) not domain concepts
- ❌ No clear boundaries between domain logic, business logic, and UI

We need to refactor to support the MVP while laying a foundation for planned features (ActiveGrouping, ConflictRules, EnrollmentRecords) without premature optimization.

## Decision

We will re-architect the codebase using **feature-based organization** with clear separation between domain model, feature modules, infrastructure, and UI components.

### Key Architectural Choices

1. **Feature-based directory structure** - Organize by domain feature (pools, programs, scenarios) not technical layer
2. **Explicit domain model layer** - `src/lib/domain/` contains all core types and interfaces
3. **Feature module pattern** - Each feature has types, store, service, and components together
4. **Infrastructure layer** - Cross-cutting concerns (CSV parsing, persistence, API clients) separated from features
5. **Participant snapshot enforcement** - Scenarios MUST capture participant snapshot at creation time
6. **MVP scope discipline** - Only implement what's needed for MVP; mark planned/future features clearly
7. **Parallel migration** - Keep existing code functional while building new features; gradual cutover

### Directory Structure

```
src/lib/
├── domain/          # Core types (Student, Pool, Program, Scenario, etc.)
├── features/        # Feature modules (pools, programs, scenarios, analytics)
├── components/      # Shared UI components
├── infrastructure/  # CSV parsing, persistence, API clients
├── stores/          # Global stores (existing command store)
├── utils/           # Pure utility functions
└── contexts/        # Svelte contexts
```

Each feature module contains:
- `types.ts` - Feature-specific types
- `<feature>Store.svelte.ts` - State management (Svelte 5 runes)
- `<feature>Service.ts` - Business logic
- `<Feature>*.svelte` - UI components

### Store Pattern

Continue using Svelte 5 runes-based store classes (proven pattern in codebase):

```typescript
export class PoolStore {
  pools = $state<Pool[]>([]);
  activePools = $derived(this.pools.filter(p => p.status === 'ACTIVE'));
  
  addPool(pool: Pool) { ... }
  updatePool(id: string, updates: Partial<Pool>) { ... }
}

export const poolStore = new PoolStore();
```

### MVP Implementation Order

1. **Foundation** - Domain types, directory structure, infrastructure utilities
2. **Pool Module** - CSV import, validation, Pool CRUD
3. **Program Module** - Program creation, Pool references
4. **Scenario Module** - Migration of algorithms, scenario generation with snapshot
5. **Analytics Module** - Preference import, satisfaction metrics
6. **Student View** - Read-only display mode
7. **Migration & Cleanup** - Remove old code paths, polish, documentation

## Consequences

### Benefits

1. **Clear conceptual organization** - Features map directly to domain model; easier to understand and navigate
2. **Reduced cognitive load** - Related code lives together; no jumping between layers
3. **Easier evolution** - Adding planned features (ActiveGrouping, ConflictRules) requires only new feature modules
4. **Better testing** - Feature boundaries make testing clearer; easier to mock dependencies
5. **Gradual migration** - Parallel implementation avoids "big bang" refactor risk
6. **Foundation for scale** - Architecture supports MVP and planned features without major rework
7. **Preserves working code** - Existing algorithms, components, patterns are reused not rewritten

### Costs

1. **Upfront effort** - 4 weeks estimated for full migration (1 developer)
2. **Learning curve** - Team must understand new organization and patterns
3. **Temporary duplication** - Old and new code coexist during migration
4. **Documentation overhead** - Need to document new patterns and migration path
5. **Risk of scope creep** - Must maintain discipline to avoid building planned/future features prematurely

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing functionality | Parallel implementation; feature flags; gradual cutover; comprehensive testing |
| Over-engineering infrastructure | Start simple; refactor when needed; no premature optimization |
| Scope creep into planned features | Strict MVP checklist; clear marking of deferred features |
| State management complexity | Reuse proven Svelte 5 runes patterns; keep stores focused |

### Success Criteria

MVP is complete when:
- ✅ CSV import creates valid Pools
- ✅ Program creation references Pools
- ✅ Scenario generation writes participant snapshot
- ✅ Analytics compute preference satisfaction metrics
- ✅ Read-only student view works
- ✅ All tests pass
- ✅ Build completes without errors
- ✅ Documentation reflects new architecture

## Alternatives Considered

### Alternative 1: Layer-based organization (status quo)
- **Rejected** - Current approach makes domain concepts hard to find; components/services/utils doesn't map to domain model

### Alternative 2: Full rewrite from scratch
- **Rejected** - Loses working code; higher risk; longer time to value

### Alternative 3: Minimal refactor (just add new types)
- **Rejected** - Technical debt compounds; harder to add planned features; architecture doesn't scale

### Alternative 4: Switch to React/different framework
- **Rejected** - No technical need; SvelteKit works well; migration cost too high for uncertain benefit

## References

- **Full Proposal:** `docs/architecture/mvp-refactor-proposal.md`
- **Migration Checklist:** `docs/architecture/migration-checklist.md`
- **Quick Reference:** `docs/architecture/quick-reference.md`
- **Domain Model:** `docs/domain_model.md`
- **Use Cases:** `docs/use_cases.md`
- **Product Vision:** `docs/product_vision.md`
- **Prior ADR:** `docs/decisions/2025-11-19-refactor-vs-restart.md` (decided to refactor in place)

## Next Steps

1. Review this proposal with stakeholders
2. Get approval on architecture approach
3. Begin Phase 1: Foundation (directory structure, domain types)
4. Track progress via migration checklist
5. Weekly progress reviews to adjust as needed
