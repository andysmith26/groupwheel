# Friend-Hat MVP Migration Checklist

**Status:** Planning  
**Last Updated:** 2025-11-21

This checklist tracks the implementation progress of the MVP re-architecture. Each phase builds on the previous one. Mark items complete as work progresses.

---

## Phase 1: Foundation (Week 1)

### Directory Structure Setup
- [ ] Create `src/lib/domain/` directory
- [ ] Create `src/lib/features/` directory structure
  - [ ] `features/pools/`
  - [ ] `features/programs/`
  - [ ] `features/scenarios/`
  - [ ] `features/analytics/`
  - [ ] `features/student-view/`
- [ ] Create `src/lib/infrastructure/` directory
  - [ ] `infrastructure/csv/`
  - [ ] `infrastructure/persistence/`
  - [ ] `infrastructure/api/`
- [ ] Create `src/lib/components/ui/` for generic components

### Domain Model Types
- [ ] Create `src/lib/domain/types.ts` with core interfaces:
  - [ ] `Student`
  - [ ] `Staff` and `StaffRole`
  - [ ] `Pool` and `PoolType`
  - [ ] `TimeSpan`
  - [ ] `Program` and `ProgramType`
  - [ ] `Scenario` and `ScenarioStatus`
  - [ ] `Group`
  - [ ] `Preference` and `PreferencePayload` types
  - [ ] `ScenarioAnalytics` and `StudentMetric`
- [ ] Create `src/lib/domain/pool.ts` for Pool-specific utilities
- [ ] Create `src/lib/domain/program.ts` for Program-specific utilities
- [ ] Create `src/lib/domain/scenario.ts` for Scenario-specific utilities
- [ ] Create `src/lib/domain/preference.ts` for Preference utilities

### Infrastructure Setup
- [ ] Create `src/lib/infrastructure/csv/csvParser.ts`
  - [ ] Generic CSV parsing function
  - [ ] TSV support
  - [ ] Header detection
- [ ] Create `src/lib/infrastructure/csv/csvValidator.ts`
  - [ ] Field validation rules
  - [ ] Required field checking
  - [ ] Type coercion
- [ ] Create `src/lib/infrastructure/csv/csvPreview.ts`
  - [ ] Preview data structure
  - [ ] Row limit configuration
- [ ] Create `src/lib/infrastructure/persistence/memoryStore.ts`
  - [ ] In-memory storage abstraction
  - [ ] Type-safe storage interface
- [ ] Create `src/lib/infrastructure/api/sheets.ts`
  - [ ] Migrate existing Google Sheets integration
  - [ ] Update to use new domain types

### Testing Foundation
- [ ] Set up test fixtures for domain types
- [ ] Create sample CSV data files for testing
- [ ] Ensure existing tests still pass

---

## Phase 2: Pool Module (Week 1-2)

### Pool Store
- [ ] Create `src/lib/features/pools/types.ts`
  - [ ] Pool-specific types and enums
  - [ ] Import-related types
- [ ] Create `src/lib/features/pools/poolStore.svelte.ts`
  - [ ] `pools` state array
  - [ ] `activePools` derived state
  - [ ] `addPool()` method
  - [ ] `updatePool()` method
  - [ ] `archivePool()` method
  - [ ] `getPoolById()` method
  - [ ] `getPoolMembers()` method

### Pool Import Service
- [ ] Create `src/lib/features/pools/poolImportService.ts`
  - [ ] `parseCSV()` - uses infrastructure CSV parser
  - [ ] `validatePool()` - validates parsed data
  - [ ] `createPool()` - creates Pool from raw data
  - [ ] `previewImport()` - generates preview
  - [ ] Field mapping logic (firstName, lastName, id)
- [ ] Create `src/lib/features/pools/poolValidation.ts`
  - [ ] Duplicate ID detection
  - [ ] Required field validation
  - [ ] Data type validation

### Pool UI Components
- [ ] Create `src/lib/features/pools/PoolImport.svelte`
  - [ ] File upload / paste interface
  - [ ] CSV preview table
  - [ ] Field mapping UI
  - [ ] Validation error display
  - [ ] Confirm import button
- [ ] Create `src/lib/features/pools/PoolList.svelte`
  - [ ] Display list of Pools
  - [ ] Filter by status (active/archived)
  - [ ] Pool type badges
  - [ ] Quick stats (member count)
- [ ] Create `src/lib/features/pools/PoolEditor.svelte`
  - [ ] Edit Pool metadata (name, type, timeSpan)
  - [ ] Add/remove members manually
  - [ ] Archive/activate Pool
- [ ] Create `src/lib/features/pools/PoolCard.svelte`
  - [ ] Compact Pool display for lists

### Pool Routes
- [ ] Create `/pools` route
- [ ] Create `/pools/import` route
- [ ] Create `/pools/[id]` route for detail view

### Pool Tests
- [ ] Unit tests for poolStore operations
- [ ] Unit tests for poolImportService
- [ ] Component tests for PoolImport validation
- [ ] E2E test for CSV import flow

---

## Phase 3: Program Module (Week 2)

### Program Store
- [ ] Create `src/lib/features/programs/types.ts`
- [ ] Create `src/lib/features/programs/programStore.svelte.ts`
  - [ ] `programs` state array
  - [ ] `activePrograms` derived state
  - [ ] `addProgram()` method
  - [ ] `updateProgram()` method
  - [ ] `getProgramById()` method
  - [ ] `getProgramPools()` method - resolve Pool references

### Program Services
- [ ] Create `src/lib/features/programs/programService.ts`
  - [ ] `createProgram()` - validates and creates Program
  - [ ] `validateProgram()` - checks Pool references exist
  - [ ] `getProgramParticipants()` - resolves all Pool members

### Program UI Components
- [ ] Create `src/lib/features/programs/ProgramCreate.svelte`
  - [ ] Program name/type form
  - [ ] Pool selection (dropdown or multi-select)
  - [ ] Primary Pool designation
  - [ ] Time span input
  - [ ] Owner staff selection (optional MVP)
- [ ] Create `src/lib/features/programs/ProgramList.svelte`
  - [ ] Display Programs with metadata
  - [ ] Filter by type
  - [ ] Quick participant count
- [ ] Create `src/lib/features/programs/ProgramDetail.svelte`
  - [ ] Program metadata display
  - [ ] Associated Pools list
  - [ ] Participant roster
  - [ ] Link to create Scenario

### Program Routes
- [ ] Create `/programs` route
- [ ] Create `/programs/new` route
- [ ] Create `/programs/[id]` route

### Program Tests
- [ ] Unit tests for programStore
- [ ] Unit tests for programService
- [ ] Component test for ProgramCreate form validation
- [ ] E2E test for Program creation flow

---

## Phase 4: Scenario Module (Week 2-3)

### Migrate Algorithms
- [ ] Create `src/lib/features/scenarios/algorithms/` directory
- [ ] Move `balanced-assignment.ts` from `src/lib/algorithms/`
- [ ] Move `happiness.ts` from `src/lib/algorithms/`
- [ ] Move `types.ts` from `src/lib/algorithms/`
- [ ] Update import paths in existing code
- [ ] Ensure algorithm tests still pass

### Scenario Store
- [ ] Create `src/lib/features/scenarios/types.ts`
- [ ] Create `src/lib/features/scenarios/scenarioStore.svelte.ts`
  - [ ] `scenarios` state array (keyed by programId for MVP)
  - [ ] `getScenarioByProgramId()` method
  - [ ] `addScenario()` method
  - [ ] `updateScenario()` method
  - [ ] `archiveScenario()` method

### Scenario Generation Service
- [ ] Create `src/lib/features/scenarios/groupingService.ts`
  - [ ] `generateScenario()` - creates Scenario from Program
  - [ ] `computeParticipantSnapshot()` - captures Pool members at time of generation
  - [ ] `assignGroups()` - runs algorithm to create Groups
  - [ ] Ensure `participantSnapshot` is always written
- [ ] Create `src/lib/features/scenarios/scenarioValidation.ts`
  - [ ] Validate participant snapshot exists
  - [ ] Validate all groups have valid student IDs

### Scenario UI Components
- [ ] Create `src/lib/features/scenarios/ScenarioGenerator.svelte`
  - [ ] Algorithm selection (balanced, random, etc.)
  - [ ] Group count/size configuration
  - [ ] Generate button
  - [ ] Progress indicator
- [ ] Create `src/lib/features/scenarios/ScenarioView.svelte`
  - [ ] Group display (reuse existing components)
  - [ ] Participant roster
  - [ ] Export as CSV
  - [ ] Link to Analytics view
- [ ] Refactor existing group components to work with Scenario model
  - [ ] Update `GroupColumn.svelte` if needed
  - [ ] Update `HorizontalGroupLayout.svelte`
  - [ ] Update `VerticalGroupLayout.svelte`

### Scenario Routes
- [ ] Create `/programs/[id]/scenario` route
- [ ] Create `/scenarios/[id]` route (or embed in Program detail)

### Scenario Tests
- [ ] Unit test for participantSnapshot generation
- [ ] Unit test for Scenario validation
- [ ] Integration test: Program → Scenario → Groups
- [ ] E2E test for Scenario generation

---

## Phase 5: Analytics Module (Week 3)

### Preference System
- [ ] Create `src/lib/features/analytics/types.ts`
  - [ ] Analytics-specific types
  - [ ] Preference ingestion types
- [ ] Create `src/lib/features/analytics/preferenceService.ts`
  - [ ] `importPreferences()` - parse CSV preferences
  - [ ] `validatePreferences()` - check student IDs exist
  - [ ] Support ranked choice preferences
  - [ ] Support friend-based preferences

### Analytics Computation
- [ ] Create `src/lib/features/analytics/analyticsService.ts`
  - [ ] `computeScenarioAnalytics()` - main analytics function
  - [ ] `getPercentAssignedTopChoice()` - compute top choice %
  - [ ] `getAveragePreferenceRank()` - compute average rank
  - [ ] `getPercentAssignedTop2()` - optional metric
  - [ ] `getPerStudentMetrics()` - per-student breakdown
- [ ] Create `src/lib/features/analytics/preferenceSatisfaction.ts`
  - [ ] Satisfaction calculation logic
  - [ ] Ranking utilities

### Analytics UI Components
- [ ] Create `src/lib/features/analytics/AnalyticsPanel.svelte`
  - [ ] Display key metrics (top choice %, avg rank)
  - [ ] Explanation text for metrics
  - [ ] Visual indicators (progress bars, charts)
- [ ] Create `src/lib/features/analytics/StudentMetricsTable.svelte`
  - [ ] Per-student assignment rank table
  - [ ] Sortable columns
  - [ ] Export table as CSV
- [ ] Integrate analytics into ScenarioView

### Analytics Tests
- [ ] Unit test for preference parsing
- [ ] Unit test for metrics computation with sample data
- [ ] Component test for AnalyticsPanel display
- [ ] E2E test for full analytics workflow

---

## Phase 6: Student View & Polish (Week 3-4)

### Student View Module
- [ ] Create `src/lib/features/student-view/StudentViewMode.svelte`
  - [ ] Read-only display mode
  - [ ] Clean, simple UI for presentation
  - [ ] No edit controls
- [ ] Create `src/lib/features/student-view/StudentGroupDisplay.svelte`
  - [ ] Display student's assigned groups
  - [ ] Show group name and members
  - [ ] Optional leader display

### Student View Routes
- [ ] Create `/scenarios/[id]/student-view` route
- [ ] Add toggle or link from Scenario view to student view

### UI Polish
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Add success notifications
- [ ] Improve responsive layout
- [ ] Add help text / tooltips

### Integration Testing
- [ ] Complete MVP workflow test:
  1. Import Pool from CSV
  2. Create Program referencing Pool
  3. Generate Scenario with snapshot
  4. View analytics
  5. Open student view
- [ ] Test error states and edge cases
- [ ] Test with various data sizes

---

## Phase 7: Migration & Cleanup (Week 4)

### Workspace Shell
- [ ] Create `src/routes/workspace/+page.svelte` - new main entry point
- [ ] Navigation between Pools, Programs, Scenarios
- [ ] Breadcrumb navigation
- [ ] Feature flags to enable/disable old vs new UI

### Code Migration
- [ ] Update `src/lib/types/index.ts` to re-export from `domain/types.ts`
- [ ] Mark old components as deprecated
- [ ] Update README with new architecture
- [ ] Update context document with new patterns

### Test Migration
- [ ] Migrate existing unit tests to new structure
- [ ] Update component tests for new locations
- [ ] Update E2E tests for new routes

### Documentation
- [ ] Update `docs/architecture/` with implementation notes
- [ ] Create migration guide for developers
- [ ] Update ADRs as needed
- [ ] Document new patterns and conventions

### Cleanup
- [ ] Remove old code paths (if fully replaced)
- [ ] Remove unused imports
- [ ] Remove deprecated utilities
- [ ] Run linter and fix warnings
- [ ] Optimize bundle size

### Final Validation
- [ ] All builds pass without errors
- [ ] All tests pass
- [ ] No console errors in dev mode
- [ ] Performance benchmarks meet or exceed baseline
- [ ] MVP features work end-to-end
- [ ] Documentation is up to date

---

## Success Criteria Checklist

At the end of migration, verify:

- [ ] ✅ CSV import creates valid Pools with member roster
- [ ] ✅ Program creation references Pools and captures metadata
- [ ] ✅ Scenario generation writes participant snapshot at creation
- [ ] ✅ Analytics compute and display preference satisfaction metrics
- [ ] ✅ Read-only student view displays Scenario results
- [ ] ✅ All existing tests pass
- [ ] ✅ Build completes without errors
- [ ] ✅ Documentation reflects new architecture
- [ ] ✅ Code organized by domain/feature, not technical layer
- [ ] ✅ Clear separation: domain types, feature logic, UI components, infrastructure
- [ ] ✅ No premature optimization for planned/future features
- [ ] ✅ Architecture supports planned features without major refactor

---

## Notes & Decisions

### Week 1 Notes
<!-- Add notes as you progress -->

### Week 2 Notes
<!-- Add notes as you progress -->

### Week 3 Notes
<!-- Add notes as you progress -->

### Week 4 Notes
<!-- Add notes as you progress -->

---

**Status:** Ready for implementation  
**Owner:** Development team  
**Review Date:** Weekly progress reviews
