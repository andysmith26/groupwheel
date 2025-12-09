# Friend Hat

**Friend Hat** is a privacy-first, school-grade social grouping platform that helps teachers create and evaluate student groupings based on preferences and social connections — from five-minute class activities to term-long clubs and year-long advisories.

**Project Goals:**

1. Ship a valuable educational product for real teachers
2. Learn product development and software architecture
3. Build portfolio evidence for professional growth

**Current Status:** ✅ MVP Complete (Dec 2025)

---

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run check        # Type check
npm run lint         # ESLint + Prettier check
npm run test         # Run all tests (unit + e2e)
```

---

## MVP Features (Implemented)

The reduced MVP is **fully implemented** and ready for pilot testing:

- **Unified "Create Groups" Wizard** (`/groups/new`)
  - 4-step flow: Select/Import Roster → Students → Preferences → Name
  - Paste CSV/TSV data with live preview and validation
  - Roster reuse for returning users
  - Preference upload with mismatch warnings

- **Grouping Activities Dashboard** (`/groups`)
  - Lists all grouping activities with student counts and preference coverage
  - Quick access to generate scenarios and view results

- **Scenario Generation**
  - Balanced grouping algorithm with preference optimization
  - Targets 4-6 students per group
  - Uses happiness scoring and iterative swap optimization
  - Preserves reproducibility via participant snapshots

- **Analytics & Insights**
  - Top choice satisfaction percentage
  - Top 2 choice satisfaction percentage
  - Average preference rank assigned
  - Displayed as badges on activity detail pages

- **Read-Only Student View** (`/scenarios/[id]/student-view`)
  - Teacher-presented mode for classroom projection
  - Print-friendly layout
  - No authentication required (intentional for MVP)

See [docs/product_vision.md](docs/product_vision.md) for full MVP scope and roadmap.

---

## Architecture

Friend Hat follows a **hexagonal architecture** (ports & adapters) with clean separation between domain logic, application use cases, and infrastructure.

### Layer Overview

- **Domain Layer** (`src/lib/domain/`) — Pure business logic and domain entities
  - Types: `Student`, `Staff`, `Pool`, `Program`, `Scenario`, `Preference`, `Group`
  - Factories: `createPool()`, `createProgram()`, `createScenario()`, etc.
  - Domain rules and invariants

- **Application Layer** (`src/lib/application/`)
  - **Ports** (`ports/`) — Interfaces for repositories and services
  - **Use Cases** (`useCases/`) — Business operations (functions, not classes)
    - `createGroupingActivity`, `generateScenario`, `computeScenarioAnalytics`, etc.

- **Infrastructure Layer** (`src/lib/infrastructure/`)
  - InMemory repository implementations
  - Service implementations (UUID generator, system clock, grouping algorithm)
  - Environment composition (`createInMemoryEnvironment`)

- **UI Layer** (SvelteKit routes & components)
  - Routes at `/groups/*`, `/scenarios/*`
  - Wizard components at `src/lib/components/wizard/`
  - Gets environment via context, calls use cases via facade

**Key Principles:**

- Domain layer has no dependencies on framework, UI, or infrastructure
- Use cases accept dependencies via `deps` objects (ports)
- Use cases return `Result<Success, Error>` types (no thrown business errors)
- UI components call use cases through facade helpers in `src/lib/services/appEnvUseCases.ts`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture guidelines, import rules, and best practices.

---

## Tech Stack

### Core Framework

- **SvelteKit 2** with **Svelte 5** (runes-based reactivity: `$state`, `$derived`, `$effect`)
- **TypeScript** (strict mode)
- **Tailwind CSS 4** (via @tailwindcss/vite)
- **Vite 7** (build tool)

### Key Libraries

- `@atlaskit/pragmatic-drag-and-drop` - Drag-and-drop (framework-agnostic, used via custom Svelte actions)
- `googleapis` - Google Sheets API integration (server-side only, optional enhancement)

### Deployment

- **Vercel** (GitHub-based deployments)
- Environment variables: `GOOGLE_SA_EMAIL`, `GOOGLE_SA_KEY`, `SHEET_ID` (optional for Sheets integration)

### Testing

- **Vitest** (unit tests for domain, use cases, utilities)
- **Playwright** (e2e tests for critical user flows)
- **vitest-browser-svelte** (browser-based component tests)

---

## Domain Model

See [docs/domain_model.md](docs/domain_model.md) for the complete conceptual model. Key entities:

### Core Entities (MVP Implemented)

**Student**

```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel?: string;
}
```

**Pool** (Roster)

```typescript
{
  id: string;
  name: string;
  type: 'SCHOOL' | 'GRADE' | 'CLASS' | 'TRIP' | 'CUSTOM';
  memberIds: string[];  // Student IDs
  ownerStaffIds?: string[];
  status: 'ACTIVE' | 'ARCHIVED';
}
```

**Program** (Grouping Activity)

```typescript
{
  id: string;
  name: string;
  type: 'CLUBS' | 'ADVISORY' | 'CABINS' | 'CLASS_ACTIVITY' | 'OTHER';
  primaryPoolId?: string;
  poolIds: string[];
  ownerStaffIds?: string[];
  timeSpan: { start: Date; end: Date };
}
```

**Scenario** (Generated Grouping)

```typescript
{
  id: string;
  programId: string;
  status: 'DRAFT' | 'ADOPTED' | 'ARCHIVED';
  groups: Group[];
  participantSnapshot: string[];  // Student IDs at creation time
  createdAt: Date;
}
```

**Group**

```typescript
{
  id: string;
  name: string;
  capacity: number | null;
  memberIds: string[];
  leaderStaffId?: string;  // Optional group leader
}
```

**Preference**

```typescript
{
	id: string;
	programId: string;
	studentId: string;
	payload: unknown; // Flexible preference data (e.g., ranked list)
}
```

---

## File Organization

### Routes & Pages

- `src/routes/groups/+page.svelte` - Activity dashboard
- `src/routes/groups/new/+page.svelte` - Create Groups wizard
- `src/routes/groups/[id]/+page.svelte` - Activity detail page
- `src/routes/scenarios/[id]/student-view/+page.svelte` - Student view

### Domain & Application

- `src/lib/domain/` - Domain entities, factories, validation
- `src/lib/application/ports/` - Port interfaces (repositories, services)
- `src/lib/application/useCases/` - Business operation functions
- `src/lib/infrastructure/` - Implementations and environment composition
- `src/lib/services/appEnvUseCases.ts` - Facade helpers for UI

### UI Components

- `src/lib/components/wizard/` - Create Groups wizard steps
- `src/lib/components/student/` - Student cards, avatars, badges
- `src/lib/components/group/` - Group containers and layouts
- `src/lib/components/inspector/` - Student detail panes
- `src/lib/components/statistics/` - Analytics widgets

### Documentation

- `docs/product_vision.md` - Product strategy and MVP scope
- `docs/ARCHITECTURE.md` - Architecture guidelines and patterns
- `docs/domain_model.md` - Domain entities and relationships
- `docs/decisions/` - Architectural decision records (ADRs)
- `docs/spikes/` - Time-boxed technical experiments

---

## Development Workflow

### Adding a New Feature

1. **Domain First**: Do we need new types, fields, or domain rules? Add/extend in `src/lib/domain/`

2. **Ports**: Do we need new repository/service methods? Update or add ports in `src/lib/application/ports/`

3. **Use Case**: Implement a new function in `src/lib/application/useCases/`
   - Accept a `deps` object (ports) and typed `input`
   - Return a typed `Result<Success, ErrorUnion>`
   - Keep it pure (no Svelte, no direct fetch, no DOM APIs)

4. **Infrastructure**: Update implementations to satisfy new ports

5. **Facade**: Wire the new use case into `appEnvUseCases.ts`

6. **UI**: Use `getAppEnvContext()` + facade helper from routes/components

If you find yourself writing non-trivial business logic directly in a Svelte component, that logic probably belongs in a use case.

### Spike-Driven Development

Before building uncertain features:

1. Create spike log: `docs/spikes/NNN-title.md`
2. Timebox: 2-3 hours typical
3. Answer specific technical question (does X work? is Y fast enough?)
4. Document findings, retire risks, make GO/NO-GO decision

### Decision Records

For strategic choices (scope, architecture, product, process):

1. Create: `docs/decisions/YYYY-MM-DD-title.md`
2. Sections: Context, Decision, Alternatives, Consequences
3. Time budget: 7-10 minutes
4. Max frequency: 1-2 per week

---

## Testing Strategy

### Unit Tests

- Pure domain factories and validators
- Use case functions (with mock ports)
- Utility functions in `src/lib/utils/`

Example:

```bash
npm run test:unit
```

### Component Tests

- Svelte components using `vitest-browser-svelte`
- Test user interactions and component behavior

### E2E Tests

- Critical user flows via Playwright
- Full wizard completion, scenario generation, analytics display

Example:

```bash
npm run test:e2e
```

### Test Utilities

`src/lib/test-utils/fixtures.ts` provides pre-built test data with deterministic IDs. Test code may violate layer boundaries for setup (e.g., directly accessing repositories) — this is intentional and isolated to test code only.

---

## Code Style & Conventions

### Naming

- Components: PascalCase (`StudentCard.svelte`)
- Files: kebab-case (`create-program.ts`)
- Use cases: Verb phrases (`createProgram`, `generateScenario`)
- Decision records: `YYYY-MM-DD-lowercase-with-hyphens.md`

### TypeScript

- Strict mode enabled
- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props`
- Use case functions (not classes)
- `Result<T, E>` types for business errors

### Formatting

- Prettier with tabs, single quotes, no trailing commas
- Tailwind classes sorted via `prettier-plugin-tailwindcss`

### Comments

- JSDoc for public APIs
- Inline comments for non-obvious logic
- **Why over what** (explain reasoning, not mechanics)

---

## Deployment

```bash
git push origin main  # GitHub → Vercel auto-deploy
```

**Never deploy via Vercel CLI** (risks bundling .env file)

---

## Roadmap

### ✅ Phase 1 (MVP) - Complete

- Unified Create Groups wizard
- CSV/TSV roster and preference import
- Single scenario generation with reproducibility
- Basic analytics (satisfaction metrics)
- Read-only student view
- Balanced grouping algorithm

### Phase 2 (Planned) - Next

- EnrollmentRecords (temporal membership tracking)
- ActiveGrouping + AdjustmentEvent logging
- ConflictRules ("never group" constraints)
- SIS sync automation
- Analytics dashboard
- Pool manual edit UI

### Phase 3 (Future)

- Student portal + authentication
- Student-submitted preferences with consent flows
- Surveys and micro-observations
- Advanced analytics and cross-term fairness
- Multi-school admin workflows

See [docs/product_vision.md](docs/product_vision.md) for detailed roadmap.

---

## Key Constraints

### Browser & Device

- Target: Teacher laptops (13-inch screens minimum)
- Primary input: Mouse/trackpad
- Drag-and-drop works on touch but untested on actual mobile devices
- No mobile optimization in MVP

### Data Privacy

- Client-side first (paste functionality works without backend)
- No persistence beyond localStorage (intentional privacy-first design)
- Google Sheets integration is optional enhancement
- Read-only student views require no authentication (teacher-presented only)

### Capacity & Scale

- Tested: 20-50 students per activity
- Target: Up to 50 students, 10 groups
- Grouping algorithm: <100ms for typical class sizes

---

## Additional Resources

- **Product vision**: [docs/product_vision.md](docs/product_vision.md)
- **Architecture guide**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Domain model**: [docs/domain_model.md](docs/domain_model.md)
- **Decision records**: [docs/decisions/](docs/decisions/)
- **Spike logs**: [docs/spikes/](docs/spikes/)

---

**Last Updated:** December 2025 (MVP complete, hexagonal architecture implemented)
