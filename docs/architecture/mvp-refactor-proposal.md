# Friend-Hat MVP Re-Architecture Proposal

**Date:** 2025-11-21  
**Status:** Proposed  
**Author:** Architecture Planning Agent

## Executive Summary

This document proposes a comprehensive re-architecture of the Friend-Hat codebase to support the MVP described in `domain_model.md`, `use_cases.md`, and `product_vision.md`. The proposal maintains the existing SvelteKit/TypeScript stack while reorganizing code to support Pool-based roster management, Program/Scenario workflow, and basic analytics—laying a foundation for planned and future features without premature optimization.

## Current State Analysis

### What Exists
- ✅ Working drag-and-drop grouping UI
- ✅ Command pattern with undo/redo
- ✅ Student/Group types and basic algorithms
- ✅ Google Sheets integration for roster import
- ✅ Happiness algorithm for friendship-based grouping
- ✅ Context-based state management patterns

### What's Missing (MVP Requirements)
- ❌ Pool entity and CSV import with validation
- ❌ Program entity referencing Pools
- ❌ Scenario with participant snapshot
- ❌ Preference ingestion and analytics
- ❌ Clear separation between domain logic and UI
- ❌ Feature-oriented directory structure

## Proposed Architecture

### 1. Directory Structure

```
src/lib/
├── domain/                    # Core domain types and interfaces
│   ├── types.ts              # Student, Staff, Pool, Program, Scenario, Group
│   ├── pool.ts               # Pool-specific logic
│   ├── program.ts            # Program-specific logic
│   ├── scenario.ts           # Scenario-specific logic
│   └── preference.ts         # Preference types and validation
│
├── features/                  # Feature modules (MVP focused)
│   ├── pools/
│   │   ├── types.ts          # Pool-specific types
│   │   ├── poolStore.svelte.ts        # Pool state management
│   │   ├── poolImportService.ts       # CSV import/validation
│   │   ├── PoolImport.svelte          # Import UI
│   │   ├── PoolList.svelte            # Pool management UI
│   │   └── PoolEditor.svelte          # Pool editing
│   │
│   ├── programs/
│   │   ├── types.ts          # Program-specific types
│   │   ├── programStore.svelte.ts     # Program state
│   │   ├── ProgramCreate.svelte       # Program creation flow
│   │   ├── ProgramList.svelte         # Program list
│   │   └── ProgramDetail.svelte       # Program detail view
│   │
│   ├── scenarios/
│   │   ├── types.ts          # Scenario-specific types
│   │   ├── scenarioStore.svelte.ts    # Scenario state
│   │   ├── groupingService.ts         # Scenario generation logic
│   │   ├── ScenarioGenerator.svelte   # Generation UI
│   │   ├── ScenarioView.svelte        # Scenario display
│   │   └── algorithms/                # Moved from lib/algorithms
│   │       ├── balanced-assignment.ts
│   │       ├── happiness.ts
│   │       └── types.ts
│   │
│   ├── analytics/
│   │   ├── types.ts          # Analytics types
│   │   ├── analyticsService.ts        # Metrics computation
│   │   ├── AnalyticsPanel.svelte      # Analytics display
│   │   └── preferenceSatisfaction.ts  # Satisfaction metrics
│   │
│   └── student-view/
│       ├── StudentViewMode.svelte     # Read-only student view
│       └── StudentGroupDisplay.svelte # Group assignment display
│
├── components/                # Shared/reusable UI components
│   ├── ui/                   # Generic UI components
│   │   ├── Button.svelte
│   │   ├── Modal.svelte
│   │   ├── Card.svelte
│   │   └── Table.svelte
│   │
│   ├── student/              # Student-specific components
│   │   ├── StudentCard.svelte
│   │   └── StudentBadge.svelte
│   │
│   └── group/                # Group-specific components
│       ├── GroupCard.svelte
│       ├── GroupColumn.svelte
│       ├── HorizontalGroupLayout.svelte
│       └── VerticalGroupLayout.svelte
│
├── infrastructure/            # Cross-cutting concerns
│   ├── csv/
│   │   ├── csvParser.ts      # Generic CSV parsing
│   │   ├── csvValidator.ts   # Validation logic
│   │   └── csvPreview.ts     # Preview generation
│   │
│   ├── persistence/           # Data persistence (future: IndexedDB/localStorage)
│   │   ├── memoryStore.ts    # In-memory storage (MVP)
│   │   └── types.ts
│   │
│   └── api/
│       └── sheets.ts         # Google Sheets API client
│
├── stores/                    # Global/shared stores
│   ├── appStore.svelte.ts    # Application-wide state
│   ├── uiSettings.svelte.ts  # UI preferences (existing)
│   └── commands.svelte.ts    # Command pattern (existing)
│
├── utils/                     # Utility functions
│   ├── validation.ts         # Generic validation utilities
│   ├── formatting.ts         # Display formatting
│   └── pragmatic-dnd.ts      # DnD utilities (existing)
│
└── contexts/                  # Svelte contexts
    └── appData.ts            # App-wide data context (existing)
```

### 2. Domain Model (TypeScript Types)

#### Core Domain Types (`src/lib/domain/types.ts`)

```typescript
// MVP Status annotations included for clarity

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel?: string;
  meta?: Record<string, unknown>;
}

export interface Staff {
  id: string;
  name: string;
  roles: StaffRole[];
}

export type StaffRole = 'TEACHER' | 'ADMIN' | 'COUNSELOR' | 'STAFF' | 'CLUB_LEADER';

// MVP: Pool is the roster source for Programs
export interface Pool {
  id: string;
  schoolId?: string;          // Planned (multi-school support)
  name: string;
  type: PoolType;
  memberIds: string[];        // Derived from CSV import
  primaryStaffOwnerId?: string;
  ownerStaffIds?: string[];
  timeSpan?: TimeSpan;
  status: 'ACTIVE' | 'ARCHIVED';
  source?: 'IMPORT' | 'MANUAL';
  parentPoolId?: string;      // Future (hierarchical support)
  createdAt: Date;
  updatedAt: Date;
}

export type PoolType = 'SCHOOL' | 'GRADE' | 'CLASS' | 'TRIP' | 'CUSTOM';

export interface TimeSpan {
  start: Date;
  end?: Date;
}

// MVP: Program is the grouping context
export interface Program {
  id: string;
  schoolId?: string;
  name: string;
  type: ProgramType;
  timeSpan: TimeSpan | { termLabel: string };
  poolIds: string[];          // References Pools
  primaryPoolId?: string;     // Main pool for participants
  ownerStaffIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProgramType = 'CLUBS' | 'ADVISORY' | 'CABINS' | 'CLASS_ACTIVITY' | 'OTHER';

// MVP: Single Scenario per Program
export interface Scenario {
  id: string;
  programId: string;
  status: ScenarioStatus;
  groups: Group[];
  participantSnapshot: string[];  // REQUIRED: Student IDs at creation
  createdAt: Date;
  createdByStaffId?: string;
  algorithmConfig?: unknown;      // Algorithm parameters used
}

export type ScenarioStatus = 'DRAFT' | 'ADOPTED' | 'ARCHIVED';

export interface Group {
  id: string;
  name: string;
  capacity: number | null;
  memberIds: string[];
  leaderStaffId?: string;     // MVP: data field only
}

// MVP: Preference for analytics
export interface Preference {
  id: string;
  programId: string;
  studentId: string;
  payload: PreferencePayload;  // Flexible for different preference types
}

export type PreferencePayload = 
  | RankedChoicePreference
  | FriendPreference;

export interface RankedChoicePreference {
  type: 'RANKED_CHOICE';
  choices: string[];          // Group IDs in preference order
}

export interface FriendPreference {
  type: 'FRIEND';
  likeStudentIds: string[];
  avoidStudentIds: string[];
}

// MVP: Basic analytics
export interface ScenarioAnalytics {
  scenarioId: string;
  percentAssignedTopChoice: number;
  averagePreferenceRankAssigned: number;
  percentAssignedTop2?: number;
  perStudentMetrics?: StudentMetric[];
}

export interface StudentMetric {
  studentId: string;
  assignedGroupId: string;
  assignedRank: number;       // 1 = top choice, higher = lower preference
  satisfied: boolean;
}
```

### 3. Feature Module Pattern

Each feature module follows a consistent structure:

```typescript
// Example: src/lib/features/pools/poolStore.svelte.ts

import { Pool } from '$lib/domain/types';

export class PoolStore {
  pools = $state<Pool[]>([]);
  activePools = $derived(this.pools.filter(p => p.status === 'ACTIVE'));
  
  addPool(pool: Pool) {
    this.pools.push(pool);
  }
  
  updatePool(id: string, updates: Partial<Pool>) {
    const index = this.pools.findIndex(p => p.id === id);
    if (index >= 0) {
      this.pools[index] = { ...this.pools[index], ...updates, updatedAt: new Date() };
    }
  }
  
  archivePool(id: string) {
    this.updatePool(id, { status: 'ARCHIVED' });
  }
  
  getPoolById(id: string): Pool | undefined {
    return this.pools.find(p => p.id === id);
  }
  
  getPoolMembers(poolId: string, studentsById: Record<string, Student>): Student[] {
    const pool = this.getPoolById(poolId);
    if (!pool) return [];
    return pool.memberIds.map(id => studentsById[id]).filter(Boolean);
  }
}

export const poolStore = new PoolStore();
```

### 4. MVP Implementation Order

#### Phase 1: Foundation (Week 1)
1. Create new directory structure
2. Define domain types in `src/lib/domain/`
3. Create basic store patterns for Pool, Program, Scenario
4. Set up infrastructure utilities (CSV parser, validator)

#### Phase 2: Pool Module (Week 1-2)
1. CSV import service with validation
2. Pool store with CRUD operations
3. Pool import UI component
4. Pool list/editor components
5. Preview and field mapping for imports

#### Phase 3: Program Module (Week 2)
1. Program store with CRUD operations
2. Program creation UI
3. Pool selection/association
4. Program list view

#### Phase 4: Scenario Module (Week 2-3)
1. Migrate existing grouping algorithms to new location
2. Scenario store with participant snapshot
3. Grouping service that creates Scenarios from Programs
4. Scenario generation UI
5. Scenario view/export

#### Phase 5: Analytics Module (Week 3)
1. Preference import from CSV
2. Analytics computation service
3. Satisfaction metrics (top choice %, average rank)
4. Analytics display panel

#### Phase 6: Student View & Polish (Week 3-4)
1. Read-only student view mode
2. Student group assignment display
3. Integration testing
4. Documentation updates

#### Phase 7: Migration & Cleanup (Week 4)
1. Remove old code paths
2. Update tests
3. Performance validation
4. Final documentation

### 5. Migration Strategy

#### Backwards Compatibility
- Keep existing `+page.svelte` functional during migration
- Create new routes in parallel (`/workspace`, `/pools`, `/programs`)
- Use feature flags to toggle between old and new UI
- Gradual cutover once MVP features are complete

#### Data Migration
- Existing in-memory state patterns remain valid
- No breaking changes to command store initially
- New stores coexist with existing patterns
- Deprecate old patterns after new ones are stable

#### Code Reuse
**Keep and migrate:**
- `src/lib/algorithms/` → `src/lib/features/scenarios/algorithms/`
- `src/lib/utils/pragmatic-dnd.ts` → stays in utils
- `src/lib/components/student/StudentCard.svelte` → stays
- `src/lib/components/group/` → keep shared components
- `src/lib/stores/commands.svelte.ts` → stays, evolve for multi-entity

**Retire gradually:**
- Current roster parsing (replace with Pool import)
- Single-session state assumptions
- Hardcoded test data (replace with Pool-based fixtures)

### 6. Key Design Decisions

#### 1. Feature-Based Organization
- **Decision:** Organize by feature (pools, programs, scenarios) not by layer (components, services, stores)
- **Rationale:** Features map to domain concepts; easier to understand, maintain, and evolve
- **MVP Scope:** Only implement features needed for MVP; stub planned/future features

#### 2. Store Pattern Evolution
- **Decision:** Use Svelte 5 runes-based stores with class pattern (existing convention)
- **Rationale:** Proven pattern in codebase; consistent with existing `uiSettings.svelte.ts`
- **MVP Scope:** Create stores for Pool, Program, Scenario; keep command store for undo/redo where needed

#### 3. Participant Snapshot Enforcement
- **Decision:** Always write `Scenario.participantSnapshot` at creation time
- **Rationale:** Core MVP requirement for reproducibility
- **Implementation:** Service layer validation; Scenario constructor requires snapshot

#### 4. CSV Import as Primary Interface
- **Decision:** CSV import is the primary Pool creation mechanism in MVP
- **Rationale:** Aligns with MVP scope; Google Sheets integration remains but as enhancement
- **Implementation:** Reusable CSV parser in infrastructure layer

#### 5. No Premature Persistence
- **Decision:** Continue in-memory storage for MVP; prepare for IndexedDB/localStorage
- **Rationale:** Matches current privacy-first approach; keeps scope minimal
- **Future Path:** Persistence layer already abstracted in `infrastructure/persistence/`

#### 6. Single Scenario Per Program (MVP)
- **Decision:** UI and state management assume one active Scenario per Program
- **Rationale:** MVP explicitly scopes to single scenario; reduces complexity
- **Future Path:** Store and types support multiple scenarios; UI can evolve

### 7. Testing Strategy

#### Unit Tests
- Domain logic in `src/lib/domain/`
- Feature services (CSV import, analytics, grouping)
- Pure utility functions

#### Integration Tests
- Pool import → Program creation → Scenario generation flow
- Analytics computation with sample preferences
- Export/import round-trip

#### Component Tests
- Pool import UI with validation feedback
- Program creation form
- Scenario display and analytics panel

#### E2E Tests
- Complete MVP workflow: Import pool → Create program → Generate scenario → View analytics
- Read-only student view mode

### 8. Documentation Updates Required

- [ ] Update README.md with new architecture overview
- [ ] Create `docs/architecture/` directory with this proposal
- [ ] Document each feature module's public API
- [ ] Update `docs/decisions/` with key architectural choices
- [ ] Create migration guide for existing code patterns

### 9. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing functionality | Parallel implementation; feature flags; gradual cutover |
| Scope creep into planned/future features | Strict MVP checklist; mark deferred features clearly |
| Over-engineering infrastructure | Simplest implementation first; refactor when needed |
| Performance regression | Profile before/after; maintain existing benchmarks |
| State management complexity | Reuse proven patterns; keep stores focused |

### 10. Success Criteria

✅ **MVP Complete When:**
1. CSV import creates valid Pools with member roster
2. Program creation references Pools and captures metadata
3. Scenario generation writes participant snapshot at creation
4. Analytics compute and display preference satisfaction metrics
5. Read-only student view displays Scenario results
6. All existing tests pass
7. Build completes without errors
8. Documentation reflects new architecture

✅ **Quality Indicators:**
- Code organized by domain/feature, not technical layer
- Clear separation: domain types, feature logic, UI components, infrastructure
- No premature optimization for planned/future features
- Architecture supports planned features without major refactor
- Migration path documented and validated

### 11. Timeline & Milestones

**Week 1:** Foundation + Pool Module  
**Week 2:** Program Module + Scenario Module (core)  
**Week 3:** Scenario Module (complete) + Analytics  
**Week 4:** Student View + Migration + Polish  

**Total Estimated Effort:** 4 weeks (1 developer, focused work)

### 12. Next Steps

1. **Review & Approval:** Validate this proposal with stakeholders
2. **Spike Planning:** Identify any technical unknowns requiring spikes
3. **Backlog Grooming:** Break down each phase into implementable tasks
4. **Begin Phase 1:** Create directory structure and domain types

---

## Appendix A: Directory Migration Map

| Current Location | New Location | Action |
|-----------------|--------------|--------|
| `src/lib/algorithms/` | `src/lib/features/scenarios/algorithms/` | Move |
| `src/lib/types/index.ts` | `src/lib/domain/types.ts` | Expand & Move |
| `src/lib/data/roster.ts` | `src/lib/features/pools/poolImportService.ts` | Refactor |
| `src/lib/services/rosterImport.ts` | `src/lib/infrastructure/csv/` + `src/lib/features/pools/` | Split |
| `src/lib/services/groupAssignment.ts` | `src/lib/features/scenarios/groupingService.ts` | Move |
| `src/lib/components/` | Keep most; organize by feature relevance | Reorganize |
| `src/routes/+page.svelte` | Keep as legacy; create `/workspace` route | Parallel |

## Appendix B: API Surface Examples

### Pool Import Service
```typescript
interface PoolImportService {
  parseCSV(content: string): ParseResult<RawPoolData>;
  validatePool(data: RawPoolData): ValidationResult;
  createPool(data: RawPoolData, options: PoolOptions): Pool;
  previewImport(content: string): ImportPreview;
}
```

### Scenario Generation Service
```typescript
interface ScenarioGenerationService {
  generateScenario(program: Program, options: GenerationOptions): Scenario;
  computeParticipantSnapshot(poolIds: string[]): string[];
  assignGroups(participants: Student[], config: AlgorithmConfig): Group[];
}
```

### Analytics Service
```typescript
interface AnalyticsService {
  computeScenarioAnalytics(scenario: Scenario, preferences: Preference[]): ScenarioAnalytics;
  getPercentAssignedTopChoice(scenario: Scenario, preferences: Preference[]): number;
  getAveragePreferenceRank(scenario: Scenario, preferences: Preference[]): number;
}
```

---

**Document Status:** Proposed for review and refinement  
**Next Review:** After stakeholder feedback
