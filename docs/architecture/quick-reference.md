# Friend-Hat Architecture Quick Reference

**Last Updated:** 2025-11-21

Quick reference for developers working with the new MVP architecture. For detailed rationale, see [mvp-refactor-proposal.md](./mvp-refactor-proposal.md).

---

## Core Concepts

### Domain Model
- **Student** - Individual learner with basic identity
- **Staff** - Teachers, admins, counselors
- **Pool** - Named roster/cohort from CSV import (replaces ad-hoc student lists)
- **Program** - Grouping context (clubs, advisory, etc.) that references Pools
- **Scenario** - Single grouping result with participant snapshot (reproducible)
- **Group** - Individual group within a Scenario
- **Preference** - Student choices/preferences for analytics

### Key Relationships
```
Pool (1) ──> (*) Student IDs
Program (1) ──> (*) Pool IDs
Program (1) ──> (1) Scenario [MVP: single scenario]
Scenario (1) ──> (*) Groups
Scenario (1) ──> (1) Participant Snapshot [immutable]
Preference (*) ──> (1) Program
```

---

## Directory Structure Quick Map

| Purpose | Location | What Goes Here |
|---------|----------|----------------|
| **Domain types** | `src/lib/domain/` | Core interfaces, type definitions |
| **Feature modules** | `src/lib/features/<feature>/` | Feature-specific logic, stores, components |
| **Shared UI** | `src/lib/components/` | Reusable components across features |
| **Infrastructure** | `src/lib/infrastructure/` | CSV parsing, persistence, API clients |
| **Global stores** | `src/lib/stores/` | App-wide state (existing command store) |
| **Utilities** | `src/lib/utils/` | Pure functions, helpers |

---

## Feature Module Structure

Each feature module follows this pattern:

```
features/<feature-name>/
├── types.ts              # Feature-specific types (extends domain)
├── <feature>Store.svelte.ts    # State management (Svelte 5 runes)
├── <feature>Service.ts   # Business logic, data transformations
├── <Feature>*.svelte     # UI components for this feature
└── README.md             # Feature documentation (optional)
```

**Example:**
```
features/pools/
├── types.ts              # PoolImportResult, ValidationError, etc.
├── poolStore.svelte.ts   # Pool CRUD operations
├── poolImportService.ts  # CSV parsing, validation
├── PoolImport.svelte     # Import UI
├── PoolList.svelte       # List view
└── PoolEditor.svelte     # Edit form
```

---

## Store Pattern (Svelte 5 Runes)

```typescript
// src/lib/features/<feature>/<feature>Store.svelte.ts

import type { SomeEntity } from '$lib/domain/types';

export class FeatureStore {
  // State
  entities = $state<SomeEntity[]>([]);
  
  // Derived state
  activeEntities = $derived(this.entities.filter(e => e.status === 'ACTIVE'));
  
  // Methods
  addEntity(entity: SomeEntity) {
    this.entities.push(entity);
  }
  
  updateEntity(id: string, updates: Partial<SomeEntity>) {
    const index = this.entities.findIndex(e => e.id === id);
    if (index >= 0) {
      this.entities[index] = { ...this.entities[index], ...updates };
    }
  }
  
  getEntityById(id: string): SomeEntity | undefined {
    return this.entities.find(e => e.id === id);
  }
}

// Export singleton instance
export const featureStore = new FeatureStore();
```

**Usage in components:**
```svelte
<script lang="ts">
  import { featureStore } from '$lib/features/<feature>/<feature>Store.svelte';
  
  // Reactive access
  const entities = $derived(featureStore.entities);
  
  function handleAdd() {
    featureStore.addEntity({ ... });
  }
</script>
```

---

## Service Pattern

Services contain business logic and are pure TypeScript (no Svelte runes):

```typescript
// src/lib/features/<feature>/<feature>Service.ts

import type { SomeEntity, SomeInput } from '$lib/domain/types';

export interface FeatureService {
  createEntity(input: SomeInput): SomeEntity;
  validateEntity(entity: SomeEntity): ValidationResult;
  transformEntity(entity: SomeEntity): TransformedEntity;
}

export function createFeatureService(): FeatureService {
  return {
    createEntity(input: SomeInput): SomeEntity {
      // Business logic here
      return { ... };
    },
    
    validateEntity(entity: SomeEntity): ValidationResult {
      // Validation logic
      return { isValid: true, errors: [] };
    },
    
    transformEntity(entity: SomeEntity): TransformedEntity {
      // Transformation logic
      return { ... };
    }
  };
}

// Export singleton or factory
export const featureService = createFeatureService();
```

---

## Key Patterns & Conventions

### 1. Participant Snapshot (Critical!)
**Always** capture participant snapshot when creating a Scenario:

```typescript
function generateScenario(program: Program): Scenario {
  // Resolve all Pool members at creation time
  const participantSnapshot = computeParticipantSnapshot(program.poolIds);
  
  return {
    id: generateId(),
    programId: program.id,
    participantSnapshot,  // ✅ REQUIRED
    groups: assignGroups(participantSnapshot, ...),
    status: 'DRAFT',
    createdAt: new Date()
  };
}
```

### 2. Pool as Roster Source
Programs reference Pools, not direct student lists:

```typescript
// ❌ OLD WAY (direct student list)
const students = loadStudentsFromCSV();
const groups = assignGroups(students);

// ✅ NEW WAY (via Pool)
const pool = poolStore.getPoolById(program.primaryPoolId);
const participants = pool.memberIds.map(id => studentsById[id]);
const scenario = generateScenario(program, participants);
```

### 3. MVP Scope Boundaries
Mark planned/future features clearly:

```typescript
export interface Pool {
  id: string;
  name: string;
  memberIds: string[];  // MVP
  parentPoolId?: string;  // Future: hierarchical pools
}

// In code comments:
// MVP: Simple member list management
// Planned: EnrollmentRecord temporal tracking
// Future: SIS sync automation
```

### 4. Single Scenario Per Program (MVP)
```typescript
// Store design supports multiple scenarios
scenarios = $state<Record<string, Scenario[]>>({});

// But UI and logic assume single scenario in MVP
function getScenarioForProgram(programId: string): Scenario | undefined {
  const scenarios = this.scenarios[programId] ?? [];
  return scenarios[0];  // MVP: only one scenario
}
```

---

## Import Paths

Use SvelteKit path aliases:

```typescript
// Domain types
import type { Pool, Program, Scenario } from '$lib/domain/types';

// Feature stores
import { poolStore } from '$lib/features/pools/poolStore.svelte';
import { programStore } from '$lib/features/programs/programStore.svelte';

// Feature services
import { poolImportService } from '$lib/features/pools/poolImportService';

// Shared components
import StudentCard from '$lib/components/student/StudentCard.svelte';

// Infrastructure
import { parseCSV } from '$lib/infrastructure/csv/csvParser';

// Utilities
import { formatDisplayName } from '$lib/utils/formatting';
```

---

## Testing Patterns

### Unit Tests (Services & Utilities)
```typescript
// src/lib/features/pools/poolImportService.spec.ts

import { describe, it, expect } from 'vitest';
import { parsePoolCSV } from './poolImportService';

describe('poolImportService', () => {
  it('should parse valid CSV into Pool', () => {
    const csv = 'id,firstName,lastName\n1,Alice,Smith\n2,Bob,Jones';
    const result = parsePoolCSV(csv);
    
    expect(result.isValid).toBe(true);
    expect(result.pool.memberIds).toHaveLength(2);
  });
});
```

### Component Tests (Svelte Components)
```typescript
// src/lib/features/pools/PoolImport.spec.ts

import { render, fireEvent } from '@testing-library/svelte';
import PoolImport from './PoolImport.svelte';

describe('PoolImport', () => {
  it('should show validation errors for invalid CSV', async () => {
    const { getByText, getByLabelText } = render(PoolImport);
    
    const textarea = getByLabelText('CSV Input');
    await fireEvent.input(textarea, { target: { value: 'invalid,csv' } });
    
    expect(getByText('Invalid CSV format')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
// tests/integration/pool-to-scenario.spec.ts

describe('Pool to Scenario flow', () => {
  it('should create Scenario with participant snapshot', () => {
    // 1. Create Pool
    const pool = poolStore.addPool({ name: 'Test Pool', memberIds: ['s1', 's2'] });
    
    // 2. Create Program
    const program = programStore.addProgram({ poolIds: [pool.id] });
    
    // 3. Generate Scenario
    const scenario = scenarioService.generateScenario(program);
    
    // 4. Verify snapshot
    expect(scenario.participantSnapshot).toEqual(['s1', 's2']);
  });
});
```

---

## Common Tasks

### Add a New Feature Module

1. Create directory: `src/lib/features/<feature>/`
2. Create `types.ts` for feature-specific types
3. Create `<feature>Store.svelte.ts` for state management
4. Create `<feature>Service.ts` for business logic
5. Create UI components as needed
6. Add tests
7. Document in feature README (optional)

### Add a New Domain Type

1. Add interface to `src/lib/domain/types.ts`
2. Add utility functions to `src/lib/domain/<type>.ts` if needed
3. Update stores/services that use the type
4. Add tests for new type behavior

### Add a New Route

1. Create route file: `src/routes/<path>/+page.svelte`
2. Import feature components
3. Wire up stores and services
4. Add navigation links
5. Add to E2E tests

---

## Debugging Tips

### Store State Inspection
```svelte
<script>
  import { poolStore } from '$lib/features/pools/poolStore.svelte';
  
  // In dev mode, expose store for debugging
  if (typeof window !== 'undefined') {
    window.__DEBUG_poolStore = poolStore;
  }
</script>

<!-- Then in browser console: -->
<!-- window.__DEBUG_poolStore.pools -->
```

### Participant Snapshot Validation
```typescript
function validateScenario(scenario: Scenario): void {
  if (!scenario.participantSnapshot || scenario.participantSnapshot.length === 0) {
    console.error('❌ Scenario missing participant snapshot!', scenario);
    throw new Error('Participant snapshot is required');
  }
  console.log('✅ Scenario has valid snapshot:', scenario.participantSnapshot);
}
```

---

## Migration Notes

### Deprecation Path
Old code remains functional during migration:

- **Keep:** `src/routes/+page.svelte` (legacy grouping UI)
- **New:** `src/routes/workspace/+page.svelte` (MVP shell)
- **Toggle:** Feature flag to switch between old/new

### Gradual Cutover
1. Phase 1-6: Build new features in parallel
2. Phase 7: Redirect users to new workspace
3. Post-MVP: Remove old code paths

---

## Resources

- **Full Proposal:** [mvp-refactor-proposal.md](./mvp-refactor-proposal.md)
- **Migration Checklist:** [migration-checklist.md](./migration-checklist.md)
- **Domain Model:** [../domain_model.md](../domain_model.md)
- **Use Cases:** [../use_cases.md](../use_cases.md)
- **Product Vision:** [../product_vision.md](../product_vision.md)

---

## Questions?

For architecture questions:
1. Check this quick reference
2. Review the full proposal document
3. Look at existing feature module examples
4. Consult domain model docs

For implementation details:
1. Check migration checklist for current status
2. Look at test examples
3. Review existing code patterns in similar features

---

**Remember:** 
- ✅ MVP scope: Pools, Programs, Scenarios, Analytics, Student View
- ✅ Participant snapshots are required
- ✅ Keep it simple: in-memory storage, no premature optimization
- ✅ Feature-based organization: domain logic, business logic, UI together
