/**
 * Student entity for the Groupwheel domain.
 *
 * Represents a student in a class roster. Students are identified by a
 * unique ID and have display information (name). Preferences about who
 * they want to work with are modeled separately via StudentPreference.
 *
 * @module domain/student
 */

/**
 * Represents a student in the class roster.
 *
 * Students are the primary participants in grouping activities. They are
 * imported from CSV/TSV files or entered manually by teachers.
 */
export interface Student {
  /**
   * Unique identifier for this student.
   * Often an email address, but can be any unique string.
   * This is what StudentPreference.likeStudentIds references.
   */
  id: string;

  /**
   * Canonical identity ID for cross-activity tracking.
   * Links this student record to a StudentIdentity.
   * If not set, the student's own `id` is used as the canonical ID
   * (backward compatible with existing data).
   */
  canonicalId?: string;

  /**
   * Student's first name. Required for display purposes.
   */
  firstName: string;

  /**
   * Optional name the student uses in class. When present, this is used in
   * student-facing displays instead of `firstName`.
   */
  preferredName?: string;

  /**
   * Student's last name. Optional (some contexts use single names).
   */
  lastName?: string;

  /**
   * Grade level (e.g., "5", "10th", "Senior").
   * Optional; used for display and potential filtering.
   */
  gradeLevel?: string;

  /**
   * Gender marker. In the MVP this was 'F', 'M', 'X' or empty string.
   * Optional; used for display and potential balancing algorithms.
   */
  gender?: string;

  /**
   * Optional program-scoped Tag IDs assigned to this student.
   */
  tagIds?: string[];

  /**
   * Arbitrary metadata collected from roster import.
   * Examples: email (if not used as id), homeroom, advisor, etc.
   */
  meta?: Record<string, unknown>;
}

export const SOURCE_STUDENT_ID_META_KEY = 'sourceStudentId';

/**
 * Factory function to create a Student with validation.
 *
 * @throws Error if required fields are missing or invalid.
 */
export function createStudent(input: {
  id: string;
  canonicalId?: string;
  firstName: string;
  preferredName?: string;
  lastName?: string;
  gradeLevel?: string;
  gender?: string;
  tagIds?: string[];
  meta?: Record<string, unknown>;
}): Student {
  if (!input.id || typeof input.id !== 'string') {
    throw new Error('Student id is required and must be a string');
  }
  if (!input.firstName || typeof input.firstName !== 'string') {
    throw new Error('Student firstName is required and must be a string');
  }

  return {
    id: input.id.trim(),
    canonicalId: input.canonicalId?.trim(),
    firstName: input.firstName.trim(),
    preferredName: input.preferredName?.trim(),
    lastName: input.lastName?.trim(),
    gradeLevel: input.gradeLevel?.trim(),
    gender: input.gender?.trim(),
    tagIds: input.tagIds ? [...input.tagIds] : [],
    meta: input.meta
  };
}

/**
 * Normalize student tags while preserving the teacher's capitalization.
 * Empty values are removed and duplicate tags are matched case-insensitively.
 */
export function normalizeStudentTags(tags: readonly string[] | undefined): string[] {
  if (!tags) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const cleaned = tag.trim();
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    normalized.push(cleaned);
  }

  return normalized;
}

/**
 * Get the effective canonical ID for a student.
 * Returns canonicalId if set, otherwise returns the student's own id.
 * This ensures backward compatibility with existing student records.
 */
export function getCanonicalId(student: Student): string {
  return student.canonicalId ?? student.id;
}

/**
 * Get the student ID from the original source data when available.
 * Falls back to the current student id for legacy records that predate
 * explicit source-id storage.
 */
export function getSourceStudentId(student: Student): string | undefined {
  const rawSourceId = student.meta?.[SOURCE_STUDENT_ID_META_KEY];

  if (typeof rawSourceId === 'string') {
    const trimmedSourceId = rawSourceId.trim();
    return trimmedSourceId || undefined;
  }

  const legacyId = student.id.trim();
  return legacyId || undefined;
}

/**
 * Merge a source student id into student metadata.
 * An empty string sentinel preserves the intentional absence of a source id
 * and disables the legacy fallback to student.id.
 */
export function setSourceStudentId(
  meta: Record<string, unknown> | undefined,
  sourceStudentId: string | undefined
): Record<string, unknown> {
  const nextMeta: Record<string, unknown> = { ...(meta ?? {}) };
  const trimmedSourceId = sourceStudentId?.trim() ?? '';

  nextMeta[SOURCE_STUDENT_ID_META_KEY] = trimmedSourceId;

  return nextMeta;
}

/**
 * Get the name a student uses in class, falling back to their first name.
 */
export function getStudentGivenName(student: Pick<Student, 'firstName' | 'preferredName'>): string {
  return student.preferredName?.trim() || student.firstName?.trim() || '';
}

/**
 * Get a long display name for contexts with enough room for the last name.
 * Returns "PreferredName LastName", falling back to the student's first name.
 */
export function getStudentLongName(
  student: Pick<Student, 'firstName' | 'preferredName' | 'lastName'>
): string {
  const givenName = student.preferredName?.trim() || student.firstName || '';
  const lastName = student.lastName || '';
  const combined = `${givenName} ${lastName}`.trim();
  return combined || givenName.trim() || lastName.trim();
}

/**
 * Get a compact display name for cards and other constrained UI.
 * Returns "PreferredName L.", falling back gracefully when a name is absent.
 */
export function getStudentShortName(
  student: Pick<Student, 'firstName' | 'preferredName' | 'lastName'>
): string {
  const givenName = getStudentGivenName(student);
  const lastInitial = student.lastName?.trim().charAt(0) ?? '';
  if (givenName && lastInitial) return `${givenName} ${lastInitial}.`;
  return givenName || student.lastName?.trim() || '';
}

/**
 * Get a display-friendly name including grade level when known.
 */
export function getStudentDisplayName(student: Student): string {
  const baseName = getStudentLongName(student);
  const grade = (student.gradeLevel ?? '').toString().trim();
  return grade ? `${baseName} (Grade ${grade})` : baseName;
}
