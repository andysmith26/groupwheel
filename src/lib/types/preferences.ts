/**
 * Types related to student preferences. These are defined in a separate
 * module to avoid circular dependencies with existing types. The Student
 * type (defined in `$lib/types`) does not include any friendship data –
 * preferences are modeled separately via `StudentPreference`. A student
 * preference record expresses who a student likes or wants to avoid, as
 * well as ranked group choices and arbitrary flags (meta).
 */

/**
 * A unique identifier for a student. In practice this will often be their
 * email address, but any unique string is acceptable. The consumer of
 * this type is responsible for ensuring the values used for `studentId`
 * across a scenario are unique.
 */
export type StudentId = string;

/**
 * A unique identifier for a group. Groups are separate from preferences
 * and defined in `$lib/types` alongside the `Group` type. Preference
 * records simply refer to existing groups by ID when expressing
 * likes/avoids.
 */
export type GroupId = string;

/**
 * Represents the preferences expressed by a single student. Ordering of
 * arrays conveys ranking (earlier items are higher ranked). Unordered
 * lists such as avoid lists are treated as sets where ordering has no
 * semantic meaning. Additional flags can be stored in the `meta` field.
 */
export interface StudentPreference {
	/**
	 * The identifier of the student this preference belongs to. Must
	 * correspond to a Student.id in the same scenario.
	 */
	studentId: StudentId;

	/**
	 * An ordered list of other student IDs this student would like to
	 * work with. The first entry is considered the highest priority.
	 */
	likeStudentIds: StudentId[];

	/**
	 * A set of student IDs this student would prefer to avoid. Order
	 * has no meaning.
	 */
	avoidStudentIds: StudentId[];

	/**
	 * An ordered list of group IDs (e.g. "Group A", "Group 2") that
	 * represents the student's ranked choices of groups they would
	 * prefer to join. Leave empty if the student has no group
	 * preference.
	 */
	likeGroupIds: GroupId[];

	/**
	 * A set of group IDs the student would prefer to avoid. Order has
	 * no meaning. Rarely used in practice but included for
	 * completeness.
	 */
	avoidGroupIds: GroupId[];

	/**
	 * Optional catch‑all for additional preference flags. Implementors
	 * can extend this object with arbitrary boolean, numeric or
	 * string values, e.g. `{ wantsAtLeastOneFriend: true }`.
	 */
	meta?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * A grouping scenario ties together a roster of students, a set of groups
 * and a collection of student preferences. This type is not currently
 * consumed by any component but documents how these pieces fit
 * together and can be useful for external integrations.
 */
export interface Scenario {
	id: string;
	students: Array<{ id: StudentId } & Record<string, unknown>>;
	groups: Array<{ id: GroupId } & Record<string, unknown>>;
	preferences: StudentPreference[];
}
