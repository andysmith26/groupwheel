/*
 * Central type definitions for the Friend Hat application. This file
 * exports the core Student and Group interfaces used throughout the
 * application as well as re‑exports of preference types. By placing
 * these definitions in a single module we avoid having to mock or
 * re‑define them in tests when the rest of the repository is not
 * available. These types mirror the minimal fields needed for
 * preference import and grouping logic. Additional properties can
 * be added here as needed without breaking existing consumers.
 */

// Re‑export preference types defined in the dedicated module. This
// allows consumers to import everything from `$lib/types` rather than
// referencing the deeper `$lib/types/preferences` path directly.
export * from './preferences';

/**
 * Represents a student in the class roster. In the original Friend Hat
 * application the Student type includes additional fields like
 * behavioural flags and derived fields. For the purposes of
 * preference collection and grouping we only model a subset:
 *
 * - id: A unique identifier. Usually an email address but can be any
 *   unique string.
 * - firstName: Optional first name for display and displayName
 *   resolution.
 * - lastName: Optional last name for display and displayName
 *   resolution.
 * - gender: Optional gender marker. In the MVP this was 'F', 'M',
 *   'X' or an empty string.
 * - meta: Optional arbitrary metadata collected from the roster
 *   import. For example, a teacher might store `email` here if they
 *   choose not to use it as the id field directly.
 */
export interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  meta?: Record<string, unknown>;
}

/**
 * Represents a group into which students can be assigned. Groups are
 * defined by the teacher prior to grouping or are created on the fly
 * during automatic assignment. The key fields are:
 *
 * - id: A unique identifier for the group. This is what is stored
 *   inside StudentPreference.likeGroupIds.
 * - name: A human readable label (e.g. "Group 1", "Alpha Team").
 * - capacity: Optional integer specifying the maximum number of
 *   members. Null indicates no explicit limit.
 * - memberIds: The list of Student.id values currently assigned to
 *   this group. This is usually maintained by grouping algorithms.
 */
export interface Group {
  id: string;
  name: string;
  capacity: number | null;
  memberIds: string[];
}

/**
 * Mode for creating groups. COUNT indicates "number of groups" while SIZE
 * represents "students per group". The UI toggles between these options when
 * users set up automatic grouping.
 */
export type Mode = 'COUNT' | 'SIZE';
