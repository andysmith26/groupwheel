> **⚠️ Historical Document:** This decision record describes the original preference schema
> that included friend-based preferences (`likeStudentIds`). That feature was removed in
> December 2025. See PROJECT_HISTORY.md. The group-request portions (`likeGroupIds`) remain valid.

# Canonical Preference Schema and Import Wizard

## Context

The Friend Hat MVP loaded student data from a Google Sheet with two tabs: _Students_ (id, name, gender) and _Connections_ (free‑form lists of friend IDs). The `Student` type included a `friendIds` array, and most of the UI logic assumed this was the only kind of preference. As we plan features like ranking groups, avoiding certain classmates, and collecting data from forms other than Google Sheets, this model no longer scales. The existing parsing functions (`parsePasted()`, `parseFromSheets()`) bake a lot of assumptions into string matching and mutate the `Student` objects directly. There is also no clear path to support group preferences or avoid lists.

We need a canonical preference schema that:

- Separates preference data from the roster so students can be represented without carrying around derived lists of friends.
- Supports positive and negative preferences for both classmates and groups, with ranking for the positive lists.
- Allows arbitrary flags (e.g. "wantsAtLeastOneFriend") without polluting the student model.
- Is flexible enough to be populated from multiple data sources (Google Forms, CSV, in‑app survey) via an import wizard that lets teachers map arbitrary columns to our fields.
- Removes the legacy `friendIds` property from `Student` to avoid dual sources of truth and to encourage explicit derivation of connections.

## Decision

### 1. New `StudentPreference` model

We introduce a new `StudentPreference` interface in `src/lib/types/preferences.ts`. Each `StudentPreference` contains:

- `studentId`: The `id` of the student who owns the record (unique per scenario).
- `likeStudentIds`: An **ordered** list of student IDs the student would like to work with. Position in the array expresses ranking.
- `avoidStudentIds`: A **set** of student IDs the student would prefer to avoid. Order is not meaningful.
- `likeGroupIds`: An **ordered** list of group IDs representing the student’s group choices.
- `avoidGroupIds`: A **set** of group IDs the student wants to avoid.
- `meta`: An optional bag of key/value pairs for additional flags (e.g. `wantsAtLeastOneFriend`, `preferredGroupSize`, etc.).

The `Student` type exposed from `$lib/types` is updated to **remove** `friendIds` and instead includes only stable identity and display fields (`id`, `firstName`, `lastName`, `gender`, and an optional `meta` map). Preferences are always modeled via `StudentPreference`, never on `Student` itself. A new `Scenario` type documents how students, groups and preferences fit together.

### 2. Import wizard configuration and parsing

We implement a pure function `importPreferences()` in `src/lib/utils/importPreferences.ts`. It accepts:

- A list of `RawSheetRow` objects (row data keyed by column name),
- A `RosterIndex` built from the current roster (indexes by id, email and display name),
- A `GroupIndex` built from defined groups,
- A `PreferenceMappingConfig` that tells the importer which column identifies the student and which columns contain each preference list.

`importPreferences()` returns an array of `StudentPreference` objects and a list of warnings. Warnings report unknown student or group identifiers and are surfaced to the teacher but do not stop the import. The importer deduplicates identifiers while preserving ranking and parses meta columns into booleans, numbers or strings based on configuration.

Helper functions `buildRosterIndex()` and `buildGroupIndex()` construct lookup maps from roster and group arrays. Students are indexed by id, email (via either the id if it contains "@" or an optional `meta.email` field) and by display name (first + last name, lower‑cased). Groups are indexed by id and lower‑cased name.

### 3. Support for arbitrary unique student identifiers

The canonical schema treats `Student.id` as an opaque primary key. In most scenarios this will be the student’s email address, but any unique string is acceptable. The import wizard allows teachers to choose which column (email, id, display name) should match the roster when resolving preferences. This avoids baking email semantics into the core types and means IDs can be replaced or anonymised without changing the model.

### 4. Unit tests

We add a Vitest suite `importPreferences.spec.ts` covering the following cases:

1. Mapping simple positive preferences when subject and friend identifiers are student IDs.
2. Resolving identifiers by display name and warning on unknown names while deduplicating duplicates.
3. Resolving group preferences and avoid lists by both id and name, warning on unknown groups.
4. Parsing meta columns into typed values (boolean, number, string).

These tests ensure the importer is deterministic, validates inputs and produces the expected `StudentPreference` objects.

## Consequences

**Benefits:**

- The data model cleanly separates reference data (roster) from preference data. This reduces coupling and makes it easy to swap input sources or gather preferences in‑app later.
- Ranking is explicit via array order rather than magic field names (e.g. "friend 1 id", "friend 2 id"). Teachers can map any number of columns, and the importer preserves ordering.
- Arbitrary flags are supported via the `meta` map without requiring schema migrations. Future algorithms can consume these flags as needed.
- The import wizard can now normalise messy CSV/TSV/form responses into a canonical structure and surface errors early. This reduces the manual "sheet massaging" that previously plagued teachers.
- Tests cover the importer’s core behaviour, giving confidence in future refactors and extensions.

**Costs/Risks:**

- Existing UI components and algorithms that rely on `student.friendIds` will need to be updated to derive friend connections from `StudentPreference.likeStudentIds`. This entails refactoring `StudentCard`, `GroupColumn`, `autoAssignBalanced()` and related functions. Until those updates are made, the UI will not compile with the new types.
- Teachers will need to map columns explicitly via the wizard when importing preferences rather than relying on a fixed column order. Good UX design will be essential to avoid confusion.
- Email remains a convenient default identifier, but supporting arbitrary keys means testing edge cases where display names or IDs collide.

Despite these costs, the benefits of a flexible, explicit preference model outweigh the migration effort. This decision lays a solid foundation for richer grouping algorithms and multiple input pipelines.
