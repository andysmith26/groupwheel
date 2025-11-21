# Friend-Hat MVP Re-Architecture: Executive Summary

**Date:** 2025-11-21  
**Status:** Proposed - Ready for Review  
**Estimated Effort:** 4 weeks (1 developer, focused work)

---

## The Challenge

The current Friend-Hat codebase is a **single-session grouping prototype** that works well but doesn't support the evolved MVP vision:

❌ **Missing:**
- Pool-based roster management (CSV import)
- Program entity that references Pools
- Scenario with participant snapshot (reproducibility)
- Preference-based analytics
- Read-only student view
- Clear separation between domain logic and UI

✅ **Working:**
- Drag-and-drop grouping UI
- Command pattern with undo/redo
- Happiness algorithms
- Svelte 5 with TypeScript

---

## The Solution

**Re-architect using feature-based organization** while preserving working code.

### Key Changes

1. **Feature-Based Directory Structure**
   ```
   src/lib/
   ├── domain/          # Core types (Student, Pool, Program, Scenario)
   ├── features/        # pools, programs, scenarios, analytics
   ├── components/      # Shared UI
   └── infrastructure/  # CSV, persistence, API
   ```

2. **Clear Domain Model**
   - Student, Staff, Pool, Program, Scenario, Group, Preference
   - Explicit relationships: Pool → Students, Program → Pools, Scenario → Groups
   - **Participant snapshot** enforced for reproducibility

3. **MVP Scope Discipline**
   - Only build MVP features
   - Mark planned/future features clearly
   - No premature optimization

4. **Parallel Migration**
   - Old code stays functional
   - New features built alongside
   - Gradual cutover with feature flags

---

## What Gets Built (MVP Only)

✅ **Pool Module**
- CSV import with validation and preview
- Pool CRUD operations
- Member management

✅ **Program Module**
- Program creation with Pool references
- Program metadata management
- Pool member resolution

✅ **Scenario Module**
- Scenario generation with participant snapshot
- Migrate existing algorithms
- Single scenario per Program (MVP)
- Group display and export

✅ **Analytics Module**
- Preference import from CSV
- Satisfaction metrics (top choice %, avg rank)
- Per-student breakdown

✅ **Student View Module**
- Read-only display mode
- Teacher-presented view (no auth in MVP)

---

## Timeline & Phases

### Week 1: Foundation + Pool Module
- Directory structure
- Domain types
- CSV import/validation
- Pool CRUD

### Week 2: Program + Scenario (Core)
- Program CRUD
- Algorithm migration
- Scenario generation with snapshot

### Week 3: Scenario (Complete) + Analytics
- Scenario UI
- Preference import
- Analytics computation

### Week 4: Student View + Migration
- Read-only view
- Integration testing
- Documentation
- Cleanup

---

## Success Criteria

✅ **MVP Complete When:**
1. CSV import creates valid Pools
2. Program references Pools
3. Scenario has participant snapshot
4. Analytics display metrics
5. Student view works
6. All tests pass
7. Build succeeds
8. Documentation current

---

## Benefits

### Technical
- ✅ **Clear architecture** - Features map to domain concepts
- ✅ **Easier to evolve** - Add planned features without major refactor
- ✅ **Better testability** - Clear boundaries enable focused testing
- ✅ **Reduced complexity** - Related code lives together

### Product
- ✅ **Supports MVP vision** - Implements all 6 MVP use cases
- ✅ **Foundation for growth** - Scales to planned/future features
- ✅ **Reproducible results** - Participant snapshots ensure consistency
- ✅ **Professional structure** - Ready for team collaboration

### Risk Management
- ✅ **Gradual migration** - No "big bang" refactor risk
- ✅ **Backwards compatible** - Old code stays functional
- ✅ **Testable at each phase** - Validate continuously
- ✅ **Clear rollback** - Can revert if needed

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Breaking existing functionality** | Parallel implementation + feature flags + comprehensive testing |
| **Scope creep** | Strict MVP checklist + clear marking of planned features |
| **Over-engineering** | Start simple + refactor when needed + no premature optimization |
| **Time overrun** | Weekly reviews + adjust plan + phased approach allows early delivery |

---

## Investment vs. Value

### Investment
- **Time:** 4 weeks (1 developer)
- **Effort:** 150+ implementation tasks
- **Documentation:** 50K+ words, 10 diagrams (already complete)

### Value
- **Immediate:** MVP features enable real teacher workflows
- **Near-term:** Easy addition of planned features (ActiveGrouping, ConflictRules)
- **Long-term:** Scalable architecture supports product evolution
- **Learning:** Portfolio-quality codebase demonstrates architectural skills

---

## Why This Approach?

### Alternatives Considered

❌ **Status quo (minimal changes)**
- Pro: Least effort
- Con: Technical debt compounds, hard to add planned features

❌ **Full rewrite**
- Pro: Clean slate
- Con: Loses working code, high risk, longer time to value

❌ **Switch framework (React, etc.)**
- Pro: Larger ecosystem
- Con: No technical need, high cost, uncertain benefit

✅ **Feature-based refactor (CHOSEN)**
- Pro: Preserves working code, clear architecture, MVP-focused, scales to vision
- Con: Upfront planning effort (already done), 4-week implementation

---

## Documentation Delivered

All documentation is **complete and ready for use**:

1. **`docs/architecture/mvp-refactor-proposal.md`** (18K words)
   - Complete architecture proposal with all details

2. **`docs/architecture/migration-checklist.md`** (13K words)
   - Executable implementation plan with 150+ tasks

3. **`docs/architecture/quick-reference.md`** (11K words)
   - Developer guide with patterns and examples

4. **`docs/decisions/2025-11-21-mvp-feature-based-architecture.md`** (7K words)
   - Formal architectural decision record

5. **`docs/architecture/README.md`** (5K words)
   - Navigation guide and overview

6. **`docs/architecture/diagrams.md`** (10 diagrams)
   - Visual representations of architecture

**Total:** 6 documents, 50K+ words, 10 diagrams

---

## Alignment with Product Docs

Perfect alignment with existing vision:

✅ **`docs/domain_model.md`**
- Implements all MVP entities (Pool, Program, Scenario)
- Matches type definitions exactly
- Respects MVP vs Planned vs Future annotations

✅ **`docs/use_cases.md`**
- Covers all 6 MVP use cases
- Maps features to use case requirements
- Supports workflows end-to-end

✅ **`docs/product_vision.md`**
- Achieves reduced MVP scope
- Lays foundation for planned features
- Preserves upgrade path to aspirational vision

---

## Recommendation

**✅ APPROVE** and proceed with Phase 1 (Foundation + Pool Module)

### Why Now?
1. **Documentation complete** - Zero additional planning needed
2. **Clear path forward** - 150+ tasks with completion criteria
3. **Low risk** - Parallel migration preserves existing functionality
4. **High value** - Enables real MVP workflows for teachers

### First Steps
1. Review this proposal with stakeholders (**this week**)
2. Get approval on architecture approach (**this week**)
3. Begin Phase 1: Foundation (**Week 1**)
4. Weekly progress reviews with migration checklist

---

## Questions?

### Architecture
→ See full proposal: `docs/architecture/mvp-refactor-proposal.md`

### Implementation
→ See checklist: `docs/architecture/migration-checklist.md`

### Developer patterns
→ See quick reference: `docs/architecture/quick-reference.md`

### Decision rationale
→ See ADR: `docs/decisions/2025-11-21-mvp-feature-based-architecture.md`

---

**Bottom Line:** This is a **professional, comprehensive, executable plan** to achieve the MVP vision while building a foundation for the product's future. All planning is complete. Implementation can begin immediately upon approval.

**Recommended Action:** ✅ Approve and begin Phase 1
