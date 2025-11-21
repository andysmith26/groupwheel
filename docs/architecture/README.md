# Friend-Hat Architecture Documentation

This directory contains architectural documentation for the Friend-Hat MVP re-architecture.

## Documents

### 📋 [MVP Refactor Proposal](./mvp-refactor-proposal.md)
**Comprehensive architecture proposal** for re-organizing the codebase to support the MVP vision.

- Current state analysis
- Proposed directory structure
- Domain model types
- Feature module patterns
- Implementation phases (4 weeks)
- Migration strategy
- Risk mitigation
- Success criteria

**Start here** for the full architectural vision and rationale.

### ✅ [Migration Checklist](./migration-checklist.md)
**Detailed implementation checklist** tracking progress through all 7 phases of the migration.

- Phase-by-phase task lists
- Clear completion criteria
- Testing requirements
- Documentation requirements
- Weekly notes sections

**Use this** to track implementation progress and mark tasks complete.

### 🚀 [Quick Reference](./quick-reference.md)
**Developer quick reference** for working with the new architecture.

- Core concepts (Pool, Program, Scenario)
- Directory structure map
- Store patterns
- Service patterns
- Common tasks
- Testing patterns
- Debugging tips

**Reference this** when implementing features or components.

## Key Architectural Decisions

### Feature-Based Organization
Code is organized by **domain feature** (pools, programs, scenarios) rather than technical layer (components, services, utils).

**Rationale:** Features map to domain concepts, making the codebase easier to understand and evolve.

### MVP Scope Discipline
Only implement what's needed for MVP. Planned and future features are clearly marked but not built.

**MVP Features:**
- Pool import from CSV
- Program creation with Pool references
- Single Scenario per Program with participant snapshot
- Basic preference analytics
- Read-only student view

**Deferred (Planned):**
- ActiveGrouping with adjustment tracking
- ConflictRules
- EnrollmentRecords
- SIS sync automation

### Participant Snapshot Requirement
Every Scenario **must** capture a participant snapshot at creation time for reproducibility.

### Parallel Migration Strategy
Old code remains functional while new features are built in parallel. Gradual cutover minimizes risk.

## Directory Structure (Target)

```
src/lib/
├── domain/          # Core types and interfaces
├── features/        # Feature modules (pools, programs, scenarios, analytics)
├── components/      # Shared UI components
├── infrastructure/  # CSV parsing, persistence, API clients
├── stores/          # Global stores
├── utils/           # Pure utility functions
└── contexts/        # Svelte contexts
```

Each feature module contains:
- `types.ts` - Feature-specific types
- `<feature>Store.svelte.ts` - State management
- `<feature>Service.ts` - Business logic
- `<Feature>*.svelte` - UI components

## Store Pattern (Svelte 5 Runes)

```typescript
export class FeatureStore {
  entities = $state<Entity[]>([]);
  activeEntities = $derived(this.entities.filter(e => e.status === 'ACTIVE'));
  
  addEntity(entity: Entity) { ... }
  updateEntity(id: string, updates: Partial<Entity>) { ... }
}

export const featureStore = new FeatureStore();
```

## Related Documentation

### Domain & Product
- [Domain Model](../domain_model.md) - Canonical domain entities and relationships
- [Use Cases](../use_cases.md) - MVP and planned user flows
- [Product Vision](../product_vision.md) - Product strategy and scope

### Decisions
- [2025-11-21: MVP Feature-Based Architecture](../decisions/2025-11-21-mvp-feature-based-architecture.md) - ADR for this architecture
- [2025-11-19: Refactor vs Restart](../decisions/2025-11-19-refactor-vs-restart.md) - Decision to refactor in place

### Implementation
- [Migration Checklist](./migration-checklist.md) - Implementation tracking
- [Quick Reference](./quick-reference.md) - Developer guide

## Timeline

**Total Estimated Effort:** 4 weeks (1 developer, focused work)

- **Week 1:** Foundation + Pool Module
- **Week 2:** Program Module + Scenario Module (core)
- **Week 3:** Scenario Module (complete) + Analytics
- **Week 4:** Student View + Migration + Polish

## Success Criteria

✅ MVP Complete When:
1. CSV import creates valid Pools with member roster
2. Program creation references Pools and captures metadata
3. Scenario generation writes participant snapshot at creation
4. Analytics compute and display preference satisfaction metrics
5. Read-only student view displays Scenario results
6. All existing tests pass
7. Build completes without errors
8. Documentation reflects new architecture

## Getting Started

1. **Review the proposal:** Read [mvp-refactor-proposal.md](./mvp-refactor-proposal.md) for full context
2. **Check the ADR:** See [2025-11-21-mvp-feature-based-architecture.md](../decisions/2025-11-21-mvp-feature-based-architecture.md) for decision rationale
3. **Use the checklist:** Track progress with [migration-checklist.md](./migration-checklist.md)
4. **Reference patterns:** Keep [quick-reference.md](./quick-reference.md) handy while coding

## Questions?

- **Architecture rationale?** → See the ADR and full proposal
- **How do I implement X?** → Check the quick reference
- **What's the current status?** → See the migration checklist
- **What's in/out of MVP scope?** → See domain model and use cases docs

---

**Last Updated:** 2025-11-21  
**Status:** Proposed (awaiting approval to begin implementation)
