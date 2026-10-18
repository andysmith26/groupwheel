/**
 * prepareGroupingActivityImport — pure parsing/preview helpers for the
 * /activity/new wizard. Nothing is persisted here; the final write happens in
 * createGroupingActivity.
 *
 * @module application/useCases/prepareGroupingActivityImport
 */

import type { ColumnMapping, RawSheetData } from '$lib/domain/import';
import {
  generateStudentId,
  hasRequiredMappings,
  isPeerRequestField,
  validateMappedData
} from '$lib/domain/import';
import { getStudentLongName } from '$lib/domain/student';
import { detectSimpleNameList } from '$lib/utils/pasteDetection';
import { parseCsvToSheetData } from '$lib/services/googleSheets';
import { createImportColumnMappings } from '$lib/services/importFieldMatching';
import type {
  ParsedPreference,
  ParsedStudent
} from '$lib/application/useCases/createGroupingActivity';

export interface PreparedRoster {
  /** Students ready for createGroupingActivity */
  students: ParsedStudent[];
  /** rowIndex -> studentId (for peer request extraction); empty for simple name lists */
  rowStudentLinks: Array<{ rowIndex: number; studentId: string }>;
  /** Present only when the roster is tabular and needs column mapping */
  rawData?: RawSheetData;
  columnMappings?: ColumnMapping[];
  warnings: string[];
  error?: string;
}

export interface PreparedChoices {
  preferences: ParsedPreference[];
  groupNames: string[];
  rawData: RawSheetData;
  columnMappings: ColumnMapping[];
  /** rowIndex -> rosterStudentId for rows matched to the roster */
  rowStudentLinks: Array<{ rowIndex: number; studentId: string }>;
  /** Roster students with at least one choice */
  coveredCount: number;
  hasPeerRequestColumns: boolean;
  unmatchedNames: string[];
  warnings: string[];
  error?: string;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildStudent(
  firstName: string,
  lastName: string | undefined,
  rowIndex: number,
  extra: Partial<ParsedStudent> = {}
): ParsedStudent {
  return {
    id: generateStudentId(firstName, lastName, rowIndex),
    firstName,
    lastName: lastName ?? '',
    displayName: getStudentLongName({ firstName, lastName }),
    ...extra
  };
}

/** Parse roster text (pasted or from a file) into students. */
export function prepareRoster(
  text: string,
  mappingsOverride?: ColumnMapping[]
): PreparedRoster {
  const empty: PreparedRoster = { students: [], rowStudentLinks: [], warnings: [] };
  if (!text.trim()) return { ...empty, error: 'Add a roster to continue.' };

  const simple = mappingsOverride ? null : detectSimpleNameList(text);
  if (simple?.isSimpleNameList) {
    const students = simple.names.map((name, index) => {
      const [first, ...rest] = name.split(/\s+/);
      return buildStudent(first, rest.join(' ') || undefined, index + 1);
    });
    return { ...empty, students };
  }

  const rawData = parseCsvToSheetData(text);
  if (rawData.headers.length === 0 || rawData.rows.length === 0) {
    return { ...empty, error: 'The roster needs a header row and at least one student.' };
  }
  const columnMappings = mappingsOverride ?? createImportColumnMappings(rawData);
  if (!hasRequiredMappings(columnMappings)) {
    return {
      ...empty,
      rawData,
      columnMappings,
      error: 'Map a First Name or Display Name column to continue.'
    };
  }

  const validation = validateMappedData(rawData, columnMappings);
  const students: ParsedStudent[] = [];
  const rowStudentLinks: PreparedRoster['rowStudentLinks'] = [];
  for (const row of validation.validRows) {
    if (!row.student) continue;
    const student = buildStudent(row.student.firstName, row.student.lastName, row.rowIndex, {
      id:
        row.student.sourceStudentId?.trim().toLowerCase() ||
        generateStudentId(row.student.firstName, row.student.lastName, row.rowIndex),
      preferredName: row.student.preferredName
    });
    students.push(student);
    rowStudentLinks.push({ rowIndex: row.rowIndex, studentId: student.id });
  }
  const warnings = validation.invalidRows.map(
    (row) => `Roster row ${row.rowIndex}: ${row.errors.join(', ')}`
  );
  return {
    students,
    rowStudentLinks,
    rawData,
    columnMappings,
    warnings,
    error: students.length === 0 ? 'No valid student rows found in the roster.' : undefined
  };
}

/** Parse a (possibly partial) choices file and match its rows to the roster. */
export function prepareChoices(
  text: string,
  roster: ParsedStudent[],
  mappingsOverride?: ColumnMapping[]
): PreparedChoices {
  const base: PreparedChoices = {
    preferences: [],
    groupNames: [],
    rawData: { headers: [], rows: [] },
    columnMappings: [],
    rowStudentLinks: [],
    coveredCount: 0,
    hasPeerRequestColumns: false,
    unmatchedNames: [],
    warnings: []
  };
  const rawData = parseCsvToSheetData(text);
  if (rawData.headers.length === 0 || rawData.rows.length === 0) {
    return { ...base, error: 'The choices file needs a header row and at least one data row.' };
  }
  const columnMappings = mappingsOverride ?? createImportColumnMappings(rawData);
  const hasPeerRequestColumns = columnMappings.some(
    (m) => m.mappedTo !== null && isPeerRequestField(m.mappedTo)
  );
  if (!hasRequiredMappings(columnMappings)) {
    return {
      ...base,
      rawData,
      columnMappings,
      hasPeerRequestColumns,
      error: 'Map a First Name or Display Name column so choices can be matched to the roster.'
    };
  }

  const byName = new Map<string, ParsedStudent>();
  for (const student of roster) {
    byName.set(normalize(student.displayName), student);
  }

  const validation = validateMappedData(rawData, columnMappings);
  const preferences: ParsedPreference[] = [];
  const rowStudentLinks: PreparedChoices['rowStudentLinks'] = [];
  const unmatchedNames: string[] = [];
  const groupNames = new Set<string>();
  const seen = new Set<string>();

  for (const row of validation.validRows) {
    if (!row.student) continue;
    const name = getStudentLongName(row.student);
    const match = byName.get(normalize(name));
    if (!match) {
      unmatchedNames.push(name);
      continue;
    }
    rowStudentLinks.push({ rowIndex: row.rowIndex, studentId: match.id });
    const choices = (row.choices ?? []).filter(Boolean);
    if (choices.length === 0 || seen.has(match.id)) continue;
    seen.add(match.id);
    choices.forEach((c) => groupNames.add(c));
    preferences.push({ studentId: match.id, likeGroupIds: choices });
  }

  const warnings = validation.invalidRows.map(
    (row) => `Choices row ${row.rowIndex}: ${row.errors.join(', ')}`
  );
  if (unmatchedNames.length > 0) {
    warnings.push(
      `${unmatchedNames.length} name${unmatchedNames.length === 1 ? '' : 's'} in the choices file did not match the roster and will be skipped.`
    );
  }

  return {
    preferences,
    groupNames: Array.from(groupNames).sort(),
    rawData,
    columnMappings,
    rowStudentLinks,
    coveredCount: preferences.length,
    hasPeerRequestColumns,
    unmatchedNames,
    warnings
  };
}
