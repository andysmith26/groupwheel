# Friend Hat - Project Context Document

## Project Overview

**Friend Hat** is a web application that helps teachers create optimal student groupings based on friendship connections. Teachers load student rosters and friendship data, then use automated algorithms or manual drag-and-drop to assign students into balanced groups that maximize happiness by keeping friends together.

**Primary Goals:**
1. Ship a good educational product for real teachers
2. Learn product development and architectural skills
3. Build portfolio evidence for future job applications

**Current Status:** Active MVP development

---

## Tech Stack

### Core Framework
- **SvelteKit 2** with **Svelte 5** (runes-based reactivity)
- **TypeScript** (strict mode)
- **Tailwind CSS 4** (via @tailwindcss/vite)
- **Vite 7** (build tool)

### Key Libraries
- `@atlaskit/pragmatic-drag-and-drop` - drag-and-drop (framework-agnostic, used via custom Svelte actions)
- `googleapis` - Google Sheets API integration (server-side only)

### Deployment
- **Vercel** (GitHub-based deployments, not CLI)
- Environment variables: `GOOGLE_SA_EMAIL`, `GOOGLE_SA_KEY`, `SHEET_ID`

### Testing
- **Vitest** (unit/component tests)
- **Playwright** (e2e tests)
- **vitest-browser-svelte** (browser-based component tests)

---

## Architecture Patterns

### 1. Unified State Store (Command Pattern)
**Location:** `src/lib/stores/commands.svelte.ts`

All state mutations go through commands for undo/redo support:

```typescript
commandStore.dispatch({
  type: 'ASSIGN_STUDENT',
  studentId: 'student-123',
  groupId: 'group-456',
  previousGroupId: 'group-789' // for undo
});
```

**Key Principle:** Store owns `groups` array. Components read reactively via `commandStore.groups` and dispatch commands to mutate.

**History Management:**
- Commands are recorded in `history` array
- `historyIndex` tracks current position
- Undo/redo work by moving index and reversing/re-executing commands
- `initializeGroups()` clears history (fresh start for new data)

### 2. Context for Read-Only Reference Data
**Location:** `src/lib/contexts/appData.ts`

`studentsById` is provided via context to avoid prop drilling:

```typescript
// In +page.svelte (root)
setAppDataContext({ studentsById });

// In any child component
const { studentsById } = getAppDataContext();
```

**Why Context?**
- Loaded once per session, doesn't change
- Many components need access (cards, inspector, columns)
- Read-only reference data (not reactive UI state)

### 3. Derived State (No Dual Tracking)
**Key Lesson:** Never maintain parallel state (e.g., both `unassigned` array AND `groups.memberIds`). One is the source of truth, others are derived.

```typescript
// GOOD: Derive unassigned from groups
const unassigned = $derived.by(() => {
  const assignedIds = new Set(groups.flatMap(g => g.memberIds));
  return studentOrder.filter(id => !assignedIds.has(id));
});

// BAD: Maintain separate unassigned array (causes race conditions)
```

### 4. Pragmatic Drag-and-Drop Integration
**Location:** `src/lib/utils/pragmatic-dnd.ts`

Custom Svelte actions wrap the library's framework-agnostic API:

```svelte
<div use:draggable={{ dragData: { id }, container, callbacks }}>
<div use:droppable={{ container, callbacks: { onDrop } }}>
```

**Important Config:** Vite requires `ssr.noExternal: ['@atlaskit/pragmatic-drag-and-drop']` to bundle the library into serverless builds.

---

## Data Model

### Student
```typescript
type Student = {
  id: string;          // Unique identifier (lowercase)
  firstName: string;
  lastName: string;
  gender: string;      // 'F', 'M', 'X', or ''
  friendIds: string[]; // IDs of friends (bidirectional in practice)
};
```

### Group
```typescript
type Group = {
  id: string;          // Generated via uid()
  name: string;        // Editable label (e.g., "Group 1")
  capacity: number | null; // Max students, null = unlimited
  memberIds: string[]; // IDs of students currently in group
};
```

### Data Sources
1. **Google Sheets API** (`/api/data` endpoint) - Production
2. **TSV/CSV Paste** - Manual input fallback
3. **Test Data** - Hardcoded 20 students with realistic connections

---

## Component Architecture

### Layout Strategy
- **≤5 groups:** `HorizontalGroupLayout` (flexbox columns)
- **>5 groups:** `VerticalGroupLayout` (full-width rows, collapsible)

### Shared Components
- `StudentCard` - Draggable student with happiness indicator
- `Inspector` - Bottom drawer showing student details (minimized/expanded states)
- `GroupColumn` - Single group container (horizontal layout)
- `UnassignedHorizontal` - Top-of-page roster for unassigned students

### Data Flow
```
+page.svelte (root)
├── setAppDataContext({ studentsById })
├── groups = $derived(commandStore.groups)
├── HorizontalGroupLayout | VerticalGroupLayout
│   ├── GroupColumn (for each group)
│   │   └── StudentCard (for each member)
│   │       └── uses getAppDataContext()
└── Inspector
    └── InspectorOverview
        └── uses getAppDataContext()
```

---

## Algorithms

### Auto-Assign Balanced
**Location:** `+page.svelte` (inline, ~150 lines)

**Strategy:**
1. Build undirected friendship graph from `friendIds`
2. Sort students by friend degree (most connected first)
3. **Greedy placement:** Assign each student to group with most existing friends
4. **Local improvement:** 300 random swaps, keep beneficial ones
5. Initialize store with final groups

**Happiness Score:** Count of friends in same group (e.g., 2/3 = 2 friends out of 3 total)

**Performance:** <100ms for 20 students, untested at 50+

---

## Key Constraints

### Browser & Device
- Target: Teacher laptops (13-inch screens)
- Primary input: Mouse/trackpad (touch support via library, untested on actual devices)
- No mobile optimization in MVP

### Data Privacy
- Client-side first (paste functionality works without backend)
- Google Sheets integration is optional enhancement
- No persistence (intentional - privacy-first design)

### Capacity & Scale
- Tested: 20 students, 5 groups
- Target: Up to 50 students, 10 groups
- Unknown: Performance at scale, needs profiling

---

## Common Tasks

### Add a New Command Type
1. Add to `Command` union in `commands.svelte.ts`
2. Implement `executeCommand()` case
3. Implement `reverseCommand()` case
4. Dispatch from component: `commandStore.dispatch({ type: 'NEW_TYPE', ... })`

### Create a New Component Using Context
```svelte
<script lang="ts">
  import { getAppDataContext } from '$lib/contexts/appData';
  
  const { studentsById } = getAppDataContext();
  const student = $derived(studentsById[studentId]);
</script>
```

### Add a Utility Function
**Location:** `src/lib/utils/friends.ts`

Pure functions for data transformation (testable, reusable). Examples:
- `getDisplayName(student)` - Format full name
- `resolveFriendNames(friendIds, studentsById)` - Convert IDs to display objects
- `getFriendLocations(friendIds, groups)` - Map friends to their groups

### Update Group Properties (Non-Command)
For configuration changes that don't need undo (name, capacity):
```typescript
commandStore.updateGroup(groupId, { name: 'New Name', capacity: 10 });
```

### Deploy to Production
```bash
git push origin main  # GitHub → Vercel auto-deploy
```
**Never deploy via Vercel CLI** (risks bundling .env file)

---

## Known Issues & Gotchas

### Svelte 5 Reactivity
- **Array mutations don't trigger updates:** Use `arr = arr` pattern after mutations
- **Derived state needs explicit typing:** `$derived.by(() => ...)` for complex logic
- **Context must be set at top level:** Don't call `setContext()` inside `$effect`

### Drag-and-Drop
- Library is 1.x (stable but could have breaking changes)
- Server bundle +15 KB (acceptable, monitor if grows)
- Mobile touch events untested on real devices
- Auto-expand collapsed groups on drop implemented

### Google Sheets API
- Cold start: ~4 seconds (serverless function warmup)
- Credentials in Vercel env vars (need rotation process documented)
- No error recovery if Sheets API is down
- Service account auth only (no OAuth complexity)

### State Management
- `initializeGroups()` clears command history (intentional for fresh starts)
- Undo/redo on auto-assign: Currently discards future commands after new action
- No serialization of commands (save/load doesn't preserve undo stack)

---

## File Organization

### Entry Points
- `src/routes/+page.svelte` - Main application UI
- `src/routes/api/data/+server.ts` - Google Sheets API endpoint

### Core Logic
- `src/lib/stores/commands.svelte.ts` - State management + undo/redo
- `src/lib/contexts/appData.ts` - Context provider for read-only data
- `src/lib/utils/pragmatic-dnd.ts` - Drag-and-drop Svelte actions
- `src/lib/utils/friends.ts` - Pure utility functions

### Components
- `src/lib/components/` - All UI components (Inspector, layouts, cards)

### Types
- `$lib/types` - Shared TypeScript definitions

### Documentation
- `docs/decisions/` - Architectural decision records
- `docs/spikes/` - Time-boxed technical experiments
- `docs/journal/` - Weekly learning reflections
- `docs/roadmap.md` - NOW/NEXT/LATER priorities

### Test Data
- Project files: `/mnt/project/test-data-*.tsv` (students, groups, preferences, connections)

---

## Development Workflow

### Local Development
```bash
npm run dev           # Start dev server
npm run check         # Type check
npm run lint          # ESLint + Prettier check
npm run test          # Run all tests (unit + e2e)
npm run test:unit     # Vitest only
npm run test:e2e      # Playwright only
```

### Spike-Driven Development
Before building uncertain features:
1. Create spike log: `docs/spikes/NNN-title.md`
2. Timebox: 2-3 hours typical
3. Answer specific technical question (does X work? is Y fast enough?)
4. Document findings, retire risks, make GO/NO-GO decision

### Decision Records
For strategic choices (scope, architecture, product, process):
1. Create: `docs/decisions/YYYY-MM-DD-title.md`
2. Sections: Context, Decision, Consequences (Benefits + Costs)
3. Time budget: 7-10 minutes
4. Max frequency: 1-2 per week

---

## Testing Strategy

### Unit Tests
- Pure functions in `src/lib/utils/` (friends.ts)
- Demo test: `src/demo.spec.ts` (shows Vitest setup)

### Component Tests
- Svelte components using vitest-browser-svelte
- Example: `src/routes/page.svelte.spec.ts`

### E2E Tests
- Critical user flows via Playwright
- Example: `e2e/demo.test.ts` (h1 visibility check)

### Current Coverage
- Minimal (MVP focus on shipping)
- Test infrastructure ready, needs expansion

---

## Code Style & Conventions

### Naming
- Components: PascalCase (`StudentCard.svelte`)
- Files: kebab-case (`commands.svelte.ts`)
- Decision records: `YYYY-MM-DD-lowercase-with-hyphens.md`

### TypeScript
- Strict mode enabled
- Props via `let { prop }: Props = $props()`
- Derived state via `$derived` or `$derived.by()`
- State via `$state`

### Comments
- JSDoc for public APIs
- Inline comments for non-obvious logic
- **Why over what** (explain reasoning, not mechanics)

### Formatting
- Prettier (tabs, single quotes, no trailing commas)
- Tailwind classes sorted via prettier-plugin-tailwindcss

---

## Next Steps (Roadmap Snapshot)

### NOW (Active Work)
- ✅ Command pattern implementation
- ✅ Inspector with student details
- 🚧 Statistics panel (happiness metrics, balance visualization)

### NEXT (Queued)
- Full testing coverage
- Document existing algorithms
- Plan new algorithms
- Group preferences mode (toggle between friends/preferences)

### LATER (Backlog)
- Pin students to specific groups
- Save results back to Google Sheets
- Multiple scenarios/tabs for comparing grouping alternatives
- Mobile-optimized drag-drop
- Teacher accounts and saved configurations

---

## Quick Reference

### Getting Student Display Name
```typescript
import { getDisplayName } from '$lib/utils/friends';
const name = getDisplayName(student); // "Alice Anderson"
```

### Dispatching a Command
```typescript
commandStore.dispatch({
  type: 'ASSIGN_STUDENT',
  studentId: id,
  groupId: targetGroupId,
  previousGroupId: sourceGroupId
});
```

### Reading Groups Reactively
```typescript
const groups = $derived(commandStore.groups);
```

### Accessing Student Data in Child Component
```typescript
const { studentsById } = getAppDataContext();
const student = $derived(studentsById[studentId]);
```

### Calculating Happiness
```typescript
// Count of friends in same group / total friends
const happiness = studentHappiness(studentId); // returns number
```

---

## Additional Resources

- **User stories:** `user-stories-from-v2.md` (extracted from previous iteration)
- **Spike logs:** `docs/spikes/` (Google Sheets, drag-drop, algorithms, command pattern, Pragmatic DnD migration)
- **Decision records:** `docs/decisions/` (timebox spikes to 3 hours)
- **Documentation system:** `docs/DOCUMENTATION-SYSTEM-README.md`

---

**Last Updated:** Based on codebase as of Spike 6 (Pragmatic Drag and Drop migration complete)
