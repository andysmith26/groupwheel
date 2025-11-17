import type { Student, Group } from '$lib/types';
import type { StudentPreference } from '$lib/types/preferences';
import { ensurePreferences } from '$lib/data/roster';

/**
 * Represents a single row from a teacher‑provided sheet. Keys are column
 * headers (lowercased) and values are raw cell strings (trimmed but not
 * otherwise parsed). The import wizard constructs these objects after
 * reading TSV/CSV input.
 */
export type RawSheetRow = Record<string, string>;

/**
 * Configuration supplied by the import wizard. It tells the importer which
 * column identifies the subject (the student filling out the form), how to
 * match that column to the roster, and which columns hold which types of
 * preference data. Column names should match the keys of RawSheetRow.
 */
export interface PreferenceMappingConfig {
        /**
         * The column in each row that contains the identifier for the student
         * whose preferences are being recorded. For example, "email" or
         * "student id".
         */
        subjectColumn: string;
        /**
         * How to interpret the subject column when matching against the roster.
         * - 'id': match against Student.id
         * - 'email': match against a Student's email (if stored in meta or id)
         * - 'displayName': match against Student.firstName + ' ' + Student.lastName
         */
        subjectKeyKind: 'id' | 'email' | 'displayName';
        /**
         * Column names, in order, for student preferences. Earlier entries
         * represent higher ranked choices.
         */
        likeStudentColumns: string[];
        /**
         * Column names for student avoid lists. Order is ignored.
         */
        avoidStudentColumns: string[];
        /**
         * Column names, in order, for group preferences. Earlier entries
         * represent higher ranked choices.
         */
        likeGroupColumns: string[];
        /**
         * Column names for group avoid lists. Order is ignored.
         */
        avoidGroupColumns: string[];
        /**
         * Mapping of preference meta keys to column definitions. Each key
         * represents a field on the StudentPreference.meta object and the
         * associated config describes which column to read and how to coerce
         * its value.
         */
        metaColumns: Record<
                string,
                {
                        column: string;
                        type: 'boolean' | 'number' | 'string';
                }
        >;
}

/**
 * Indexes for quickly looking up students in the roster based on different
 * keys. The importer builds these once up front and reuses them for each
 * row. Display names are lowercased to allow case‑insensitive matching.
 */
export interface RosterIndex {
        byId: Map<string, Student>;
        byEmail: Map<string, Student>;
        byDisplayName: Map<string, Student>;
}

/**
 * Indexes for quickly looking up groups by id or by name. Group names are
 * lowercased to allow case‑insensitive matching.
 */
export interface GroupIndex {
        byId: Map<string, Group>;
        byName: Map<string, Group>;
}

/**
 * A warning produced during import. Warnings do not necessarily stop the
 * import, but they surface problematic rows or cells to the teacher so
 * corrections can be made.
 */
export interface ImportWarning {
        /** 1‑based row number corresponding to the source data row. */
        rowNumber: number;
        /** Optional column name that caused the warning. */
        column?: string;
        /** A human readable message describing the issue. */
        message: string;
}

/**
 * Result returned by `importPreferences()`. Contains the parsed
 * StudentPreference objects and any warnings encountered. The caller
 * decides how to handle warnings (e.g. display them to the teacher).
 */
export interface ImportResult {
        preferences: StudentPreference[];
        warnings: ImportWarning[];
}

/**
 * Build a roster index from an array of students. This function is separate
 * from the import logic to allow testing independently. Display names are
 * constructed as "firstName lastName" and lowercased.
 */
export function buildRosterIndex(students: Student[]): RosterIndex {
        const byId = new Map<string, Student>();
        const byEmail = new Map<string, Student>();
        const byDisplayName = new Map<string, Student>();
        for (const student of students) {
            // Normalize identifiers to lower case for consistent lookup
            const id = student.id?.trim().toLowerCase();
            if (id) {
                byId.set(id, student);
                // If the id itself looks like an email (contains '@'), treat it as email
                if (id.includes('@')) {
                    if (!byEmail.has(id)) byEmail.set(id, student);
                }
            }
            // If a meta.email field exists on the student, index it
            const metaEmail = (student as any)?.meta?.email;
            if (typeof metaEmail === 'string' && metaEmail.trim()) {
                const e = metaEmail.trim().toLowerCase();
                if (!byEmail.has(e)) byEmail.set(e, student);
            }
            // Compute display name (firstName + lastName)
            const displayName = `${student.firstName ?? ''} ${student.lastName ?? ''}`
                .trim()
                .toLowerCase();
            if (displayName) {
                // Only record if unique to avoid overwriting earlier duplicates
                if (!byDisplayName.has(displayName)) {
                    byDisplayName.set(displayName, student);
                }
            }
        }
        return { byId, byEmail, byDisplayName };
}

/**
 * Build a group index from an array of groups. Names are lowercased for
 * case‑insensitive matching. Duplicates are ignored – only the first
 * occurrence of a name is indexed.
 */
export function buildGroupIndex(groups: Group[]): GroupIndex {
        const byId = new Map<string, Group>();
        const byName = new Map<string, Group>();
        for (const group of groups) {
                const id = group.id?.trim();
                if (id) {
                        byId.set(id, group);
                }
                const name = group.name?.trim().toLowerCase();
                if (name && !byName.has(name)) {
                        byName.set(name, group);
                }
        }
        return { byId, byName };
}

/**
 * Resolve a student identifier string into a Student object using the
 * appropriate roster index. The `kind` determines which index to use.
 */
function resolveStudent(value: string, kind: 'id' | 'email' | 'displayName', rosterIndex: RosterIndex): Student | undefined {
        const trimmed = value.trim().toLowerCase();
        if (!trimmed) return undefined;
        if (kind === 'id') {
                return rosterIndex.byId.get(trimmed);
        }
        if (kind === 'email') {
                return rosterIndex.byEmail.get(trimmed);
        }
        // displayName: match against lowercased display name
        return rosterIndex.byDisplayName.get(trimmed);
}

/**
 * Resolve a group identifier string into a Group object using a
 * case‑insensitive match. It first attempts to match by ID, then by name.
 */
function resolveGroup(value: string, groupIndex: GroupIndex): Group | undefined {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        // Try ID (exact)
        const byId = groupIndex.byId.get(trimmed);
        if (byId) return byId;
        // Try name (case insensitive)
        return groupIndex.byName.get(trimmed.toLowerCase());
}

/**
 * Parse arbitrary meta values from a string based on the desired type. Returns
 * undefined if the cell is empty. For boolean values the strings
 * "true", "yes", "1" (case insensitive) are treated as true; "false",
 * "no", "0" as false. Numbers are parsed via `parseFloat()`.
 */
function parseMeta(value: string, type: 'boolean' | 'number' | 'string'): any {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        if (type === 'string') return trimmed;
        if (type === 'number') {
                const num = parseFloat(trimmed);
                return isNaN(num) ? undefined : num;
        }
        // boolean
        const lowered = trimmed.toLowerCase();
        if (['true', 'yes', '1'].includes(lowered)) return true;
        if (['false', 'no', '0'].includes(lowered)) return false;
        return undefined;
}

/**
 * Main import function. Consumes an array of raw sheet rows, a roster index
 * built from the current class roster, a group index (if group preferences
 * should be resolved) and a mapping configuration. Returns parsed
 * StudentPreference objects along with any warnings generated during import.
 */
export function importPreferences(
        rows: RawSheetRow[],
        rosterIndex: RosterIndex,
        groupIndex: GroupIndex,
        mapping: PreferenceMappingConfig
): ImportResult {
        const preferences: StudentPreference[] = [];
        const warnings: ImportWarning[] = [];

        rows.forEach((row, rowIndex) => {
                const rowNumber = rowIndex + 1; // 1‑based
                const subjectRaw = row[mapping.subjectColumn] ?? '';
                const subject = resolveStudent(subjectRaw, mapping.subjectKeyKind, rosterIndex);
                if (!subject) {
                        warnings.push({
                                rowNumber,
                                column: mapping.subjectColumn,
                                message: `Unknown student for value "${subjectRaw}"`
                        });
                        return;
                }

                // Resolve liked students (ranked)
                const likeStudentIds: string[] = [];
                mapping.likeStudentColumns.forEach((col) => {
                        const val = row[col] ?? '';
                        if (!val.trim()) return;
                        const s = resolveStudent(val, mapping.subjectKeyKind, rosterIndex);
                        if (s) {
                                // avoid duplicates while preserving order
                                if (!likeStudentIds.includes(s.id)) likeStudentIds.push(s.id);
                        } else {
                                warnings.push({
                                        rowNumber,
                                        column: col,
                                        message: `Unknown student "${val}"`
                                });
                        }
                });

                // Resolve avoided students (unordered)
                const avoidStudentIds: string[] = [];
                mapping.avoidStudentColumns.forEach((col) => {
                        const val = row[col] ?? '';
                        if (!val.trim()) return;
                        const s = resolveStudent(val, mapping.subjectKeyKind, rosterIndex);
                        if (s) {
                                if (!avoidStudentIds.includes(s.id)) avoidStudentIds.push(s.id);
                        } else {
                                warnings.push({
                                        rowNumber,
                                        column: col,
                                        message: `Unknown student "${val}"`
                                });
                        }
                });

                // Resolve liked groups (ranked)
                const likeGroupIds: string[] = [];
                mapping.likeGroupColumns.forEach((col) => {
                        const val = row[col] ?? '';
                        if (!val.trim()) return;
                        const g = resolveGroup(val, groupIndex);
                        if (g) {
                                if (!likeGroupIds.includes(g.id)) likeGroupIds.push(g.id);
                        } else {
                                warnings.push({
                                        rowNumber,
                                        column: col,
                                        message: `Unknown group "${val}"`
                                });
                        }
                });

                // Resolve avoided groups (unordered)
                const avoidGroupIds: string[] = [];
                mapping.avoidGroupColumns.forEach((col) => {
                        const val = row[col] ?? '';
                        if (!val.trim()) return;
                        const g = resolveGroup(val, groupIndex);
                        if (g) {
                                if (!avoidGroupIds.includes(g.id)) avoidGroupIds.push(g.id);
                        } else {
                                warnings.push({
                                        rowNumber,
                                        column: col,
                                        message: `Unknown group "${val}"`
                                });
                        }
                });

                // Parse meta columns
                const meta: Record<string, any> = {};
                Object.entries(mapping.metaColumns).forEach(([metaKey, { column, type }]) => {
                        const val = row[column] ?? '';
                        const parsed = parseMeta(val, type);
                        if (parsed !== undefined) {
                                meta[metaKey] = parsed;
                        }
                });

                const preference: StudentPreference = {
                        studentId: subject.id,
                        likeStudentIds,
                        avoidStudentIds,
                        likeGroupIds,
                        avoidGroupIds,
                        ...(Object.keys(meta).length > 0 ? { meta } : {})
                };
                preferences.push(preference);
        });

        const rosterStudents = Array.from(rosterIndex.byId.values());
        const ensuredPreferences = Object.values(ensurePreferences(rosterStudents, preferences));

        return { preferences: ensuredPreferences, warnings };
}
