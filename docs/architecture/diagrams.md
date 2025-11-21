# Friend-Hat Architecture Diagrams

Visual representations of the MVP architecture to complement the written proposal.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Friend-Hat MVP                        │
│                 (SvelteKit Application)                  │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   UI Layer   │  │ Feature      │  │Infrastructure│
│              │  │ Modules      │  │              │
│  Components  │  │              │  │ CSV Parser   │
│  Routes      │  │ Pools        │  │ Persistence  │
│  Layouts     │  │ Programs     │  │ API Clients  │
│              │  │ Scenarios    │  │              │
│              │  │ Analytics    │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                  ┌──────────────┐
                  │Domain Model  │
                  │              │
                  │ Student      │
                  │ Pool         │
                  │ Program      │
                  │ Scenario     │
                  │ Group        │
                  │ Preference   │
                  └──────────────┘
```

---

## 2. Feature Module Structure

```
┌─────────────────────────────────────────────┐
│     Feature Module (e.g., Pools)            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐     ┌──────────────┐     │
│  │  types.ts    │────▶│ Store        │     │
│  │              │     │ (.svelte.ts) │     │
│  │ Feature-     │     │              │     │
│  │ specific     │     │ $state       │     │
│  │ types        │     │ $derived     │     │
│  └──────────────┘     │ methods      │     │
│                       └──────────────┘     │
│                              │              │
│                              ▼              │
│  ┌──────────────┐     ┌──────────────┐     │
│  │  Service.ts  │────▶│  UI          │     │
│  │              │     │  Components  │     │
│  │ Business     │     │              │     │
│  │ logic        │     │ .svelte      │     │
│  │ Validation   │     │ files        │     │
│  │ Transform    │     │              │     │
│  └──────────────┘     └──────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 3. Domain Model Relationships

```
┌──────────┐
│  Staff   │
│          │
│ • id     │
│ • name   │
│ • roles  │
└──────────┘
      │ owns
      ▼
┌──────────┐         references        ┌──────────┐
│   Pool   │◀────────────────────────│ Program  │
│          │                          │          │
│ • id     │                          │ • id     │
│ • name   │                          │ • name   │
│ • type   │                          │ • type   │
│ • member │                          │ • poolIds│
│   Ids[]  │                          └──────────┘
└──────────┘                                │
      │                                     │ has
      │ contains                            ▼
      │                              ┌──────────┐
      ▼                              │ Scenario │
┌──────────┐                         │          │
│ Student  │                         │ • id     │
│          │                         │ • status │
│ • id     │                         │ • groups │
│ • first  │          assigned in    │ • partici│
│   Name   │◀────────────────────────│   pant   │
│ • last   │                         │   Snap   │
│   Name   │                         │   shot[] │
└──────────┘                         └──────────┘
      │                                     │
      │ has                                 │ contains
      ▼                                     ▼
┌──────────┐                         ┌──────────┐
│Preference│                         │  Group   │
│          │                         │          │
│ • id     │                         │ • id     │
│ • student│                         │ • name   │
│   Id     │                         │ • capacity│
│ • program│                         │ • member │
│   Id     │                         │   Ids[]  │
│ • payload│                         └──────────┘
└──────────┘
```

---

## 4. MVP User Flow

```
Teacher                     System                      Data

  │                           │                          │
  │  1. Upload CSV            │                          │
  ├──────────────────────────▶│                          │
  │                           │                          │
  │                           │  Parse & Validate        │
  │                           │  Create Pool             │
  │                           ├─────────────────────────▶│
  │                           │                          │ Pool
  │  2. View Pool             │                          │ stored
  │◀──────────────────────────┤                          │
  │                           │                          │
  │  3. Create Program        │                          │
  ├──────────────────────────▶│                          │
  │    - Select Pool(s)       │                          │
  │    - Set metadata         │  Validate Pool refs      │
  │                           │  Create Program          │
  │                           ├─────────────────────────▶│
  │                           │                          │ Program
  │  4. Program Created       │                          │ stored
  │◀──────────────────────────┤                          │
  │                           │                          │
  │  5. Generate Scenario     │                          │
  ├──────────────────────────▶│                          │
  │    - Choose algorithm     │                          │
  │    - Set group count      │  Capture participant     │
  │                           │  snapshot                │
  │                           │  Run algorithm           │
  │                           │  Create Scenario         │
  │                           ├─────────────────────────▶│
  │                           │                          │ Scenario
  │  6. View Scenario         │                          │ stored
  │◀──────────────────────────┤                          │
  │    with Groups            │                          │
  │                           │                          │
  │  7. View Analytics        │                          │
  ├──────────────────────────▶│                          │
  │                           │  Compute metrics         │
  │                           │  - Top choice %          │
  │                           │  - Avg rank              │
  │  8. Analytics Display     │                          │
  │◀──────────────────────────┤                          │
  │                           │                          │
  │  9. Open Student View     │                          │
  ├──────────────────────────▶│                          │
  │                           │  Generate read-only      │
  │                           │  view                    │
  │  10. Present to Class     │                          │
  │◀──────────────────────────┤                          │
  │                           │                          │
```

---

## 5. Data Flow Through Layers

```
┌───────────────────────────────────────────────────────┐
│                   User Action                         │
│             (Upload CSV, Create Program)              │
└───────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────┐
│                  UI Component                         │
│           (PoolImport.svelte, ProgramCreate)          │
│                                                       │
│  • Handles user input                                 │
│  • Displays validation errors                         │
│  • Calls service methods                              │
└───────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────┐
│              Feature Service                          │
│      (poolImportService, programService)              │
│                                                       │
│  • Validates input                                    │
│  • Transforms data                                    │
│  • Calls infrastructure utilities                     │
│  • Updates store                                      │
└───────────────────────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
┌───────────────────────┐   ┌───────────────────────┐
│   Infrastructure      │   │   Feature Store       │
│   (CSV Parser, etc)   │   │   (poolStore)         │
│                       │   │                       │
│  • Generic utilities  │   │  • $state entities    │
│  • No business logic  │   │  • $derived queries   │
│  • Reusable across    │   │  • CRUD methods       │
│    features           │   │                       │
└───────────────────────┘   └───────────────────────┘
                                       │
                                       ▼
                          ┌───────────────────────┐
                          │   Domain Model        │
                          │   (types.ts)          │
                          │                       │
                          │  • Student            │
                          │  • Pool               │
                          │  • Program            │
                          │  • Scenario           │
                          │  • Group              │
                          └───────────────────────┘
```

---

## 6. Store Pattern (Svelte 5 Runes)

```
┌─────────────────────────────────────────────┐
│          FeatureStore Class                 │
├─────────────────────────────────────────────┤
│                                             │
│  State ($state)                             │
│  ┌───────────────────────────────────┐      │
│  │ entities: Entity[] = $state([])   │      │
│  └───────────────────────────────────┘      │
│                │                            │
│                ▼                            │
│  Derived ($derived)                         │
│  ┌───────────────────────────────────┐      │
│  │ activeEntities = $derived(...)    │      │
│  └───────────────────────────────────┘      │
│                │                            │
│                ▼                            │
│  Methods                                    │
│  ┌───────────────────────────────────┐      │
│  │ addEntity(entity)                 │      │
│  │ updateEntity(id, updates)         │      │
│  │ getEntityById(id)                 │      │
│  │ deleteEntity(id)                  │      │
│  └───────────────────────────────────┘      │
│                                             │
└─────────────────────────────────────────────┘
                   │
                   │ Singleton instance
                   ▼
         export const featureStore = 
              new FeatureStore();
```

**Usage in Components:**
```svelte
<script>
  import { featureStore } from './featureStore.svelte';
  
  // Reactive access (re-renders when store changes)
  const entities = $derived(featureStore.entities);
  
  function handleAction() {
    featureStore.addEntity({ ... });
  }
</script>
```

---

## 7. Directory Tree (Expanded)

```
src/lib/
│
├── domain/                      # Core domain model
│   ├── types.ts                 # All domain interfaces
│   ├── pool.ts                  # Pool utilities
│   ├── program.ts               # Program utilities
│   ├── scenario.ts              # Scenario utilities
│   └── preference.ts            # Preference utilities
│
├── features/                    # Feature modules
│   ├── pools/
│   │   ├── types.ts
│   │   ├── poolStore.svelte.ts
│   │   ├── poolImportService.ts
│   │   ├── poolValidation.ts
│   │   ├── PoolImport.svelte
│   │   ├── PoolList.svelte
│   │   ├── PoolEditor.svelte
│   │   └── PoolCard.svelte
│   │
│   ├── programs/
│   │   ├── types.ts
│   │   ├── programStore.svelte.ts
│   │   ├── programService.ts
│   │   ├── ProgramCreate.svelte
│   │   ├── ProgramList.svelte
│   │   └── ProgramDetail.svelte
│   │
│   ├── scenarios/
│   │   ├── types.ts
│   │   ├── scenarioStore.svelte.ts
│   │   ├── groupingService.ts
│   │   ├── scenarioValidation.ts
│   │   ├── ScenarioGenerator.svelte
│   │   ├── ScenarioView.svelte
│   │   └── algorithms/
│   │       ├── balanced-assignment.ts
│   │       ├── happiness.ts
│   │       └── types.ts
│   │
│   ├── analytics/
│   │   ├── types.ts
│   │   ├── analyticsService.ts
│   │   ├── preferenceService.ts
│   │   ├── preferenceSatisfaction.ts
│   │   ├── AnalyticsPanel.svelte
│   │   └── StudentMetricsTable.svelte
│   │
│   └── student-view/
│       ├── StudentViewMode.svelte
│       └── StudentGroupDisplay.svelte
│
├── components/                  # Shared UI components
│   ├── ui/
│   │   ├── Button.svelte
│   │   ├── Modal.svelte
│   │   ├── Card.svelte
│   │   └── Table.svelte
│   ├── student/
│   │   ├── StudentCard.svelte
│   │   └── StudentBadge.svelte
│   └── group/
│       ├── GroupCard.svelte
│       ├── GroupColumn.svelte
│       ├── HorizontalGroupLayout.svelte
│       └── VerticalGroupLayout.svelte
│
├── infrastructure/              # Cross-cutting utilities
│   ├── csv/
│   │   ├── csvParser.ts
│   │   ├── csvValidator.ts
│   │   └── csvPreview.ts
│   ├── persistence/
│   │   ├── memoryStore.ts
│   │   └── types.ts
│   └── api/
│       └── sheets.ts
│
├── stores/                      # Global stores
│   ├── appStore.svelte.ts
│   ├── uiSettings.svelte.ts
│   └── commands.svelte.ts
│
├── utils/                       # Pure utilities
│   ├── validation.ts
│   ├── formatting.ts
│   └── pragmatic-dnd.ts
│
└── contexts/                    # Svelte contexts
    └── appData.ts
```

---

## 8. Migration Strategy Visual

```
         Current State                     Target State
              │                                 │
              │                                 │
┌─────────────▼──────────────┐    ┌────────────▼─────────────┐
│   Single-Session           │    │   MVP Architecture       │
│   Grouping Prototype       │    │                          │
│                            │    │  • Pools (rosters)       │
│  • Direct student lists    │    │  • Programs              │
│  • No persistence model    │    │  • Scenarios w/ snapshot │
│  • Basic grouping UI       │    │  • Analytics             │
│  • Algorithm works ✓       │    │  • Student view          │
└────────────────────────────┘    └──────────────────────────┘
              │                                 ▲
              │                                 │
              │      Parallel Migration         │
              │     (4 weeks, 7 phases)         │
              │                                 │
              └─────────────────────────────────┘
                         │
                         │
         ┌───────────────┴───────────────┐
         │                               │
    Old Code                        New Code
    Remains                         Built in
    Functional                      Parallel
         │                               │
         │       Gradual Cutover         │
         │       (feature flags)         │
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  Complete    │
                  │  Migration   │
                  │              │
                  │  Old code    │
                  │  removed     │
                  └─────────────┘
```

---

## 9. Testing Pyramid

```
                    ▲
                   ╱ ╲
                  ╱   ╲
                 ╱ E2E ╲           Small number
                ╱ Tests ╲          (Critical flows)
               ╱─────────╲
              ╱           ╲
             ╱ Integration╲        Medium number
            ╱    Tests     ╲       (Feature flows)
           ╱───────────────╲
          ╱                 ╲
         ╱   Component       ╲     Large number
        ╱      Tests          ╲    (UI validation)
       ╱─────────────────────╲
      ╱                       ╲
     ╱     Unit Tests          ╲   Largest number
    ╱  (Services, Utilities)   ╲  (Fast, isolated)
   ╱───────────────────────────╲
  └─────────────────────────────┘
```

**Test Distribution:**
- **Unit Tests:** ~70% - Services, utilities, domain logic
- **Component Tests:** ~20% - UI components, validation
- **Integration Tests:** ~8% - Feature flows, store interactions
- **E2E Tests:** ~2% - Critical user journeys

---

## 10. Participant Snapshot Flow

```
                    Teacher Action
                          │
                          ▼
                  Create/Generate Scenario
                          │
                          ▼
              ┌───────────────────────┐
              │  1. Resolve Pool(s)   │
              │                       │
              │  Program.poolIds      │
              │  → Pool.memberIds     │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  2. Capture Snapshot  │
              │                       │
              │  participantSnapshot  │
              │  = [...memberIds]     │
              │                       │
              │  ✓ IMMUTABLE          │
              │  ✓ REQUIRED           │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  3. Run Algorithm     │
              │                       │
              │  assignGroups(        │
              │    snapshot,          │
              │    config             │
              │  )                    │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  4. Create Scenario   │
              │                       │
              │  {                    │
              │    participantSnapshot│
              │    groups: [...]      │
              │    status: 'DRAFT'    │
              │  }                    │
              └───────────────────────┘
                          │
                          ▼
                    Store Scenario
                          │
                          ▼
                  ✓ Reproducible Result
              (Snapshot preserves context)
```

---

**Legend:**
- `│`, `─`, `└`, `┌`, etc. = ASCII box drawing
- `▼`, `▲` = Flow direction
- `◀`, `▶` = Relationships
- `✓` = Success/completion
- `•` = List items

**Note:** These diagrams use ASCII art for maximum compatibility. For production documentation, consider tools like Mermaid, PlantUML, or draw.io for more sophisticated visualizations.
