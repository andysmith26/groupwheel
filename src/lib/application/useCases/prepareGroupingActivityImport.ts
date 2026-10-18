/**
 * prepareGroupingActivityImport — pure parsing/preview helpers for the
 * /activity/new wizard. Nothing is persisted here; the final write happens in
 * createGroupingActivity.
 *
 * @module application/useCases/prepareGroupingActivityImport
 */

import type { MatrixPreferenceColumn } from '$lib/utils/matrixPreferenceParser';
import type { ColumnMapping, RawSheetData } from '$lib/domain/import';
import {
  generateStudentId,
  hasRequiredMappings,
  isPeerRequestField,
  validateMappedData
} from '$lib/domain/import';
import { getStudentLongName } from '$lib/domain/student';
import { detectSimpleNameList } from '$lib/utils/pasteDetection';
import {
  detectMatrixFormat,
  extractChoiceRank,
  parseMatrixRow
} from '$lib/utils/matrixPreferenceParser';
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
  /** Present for Google Form grid imports (one column per group, cells like "1st Choice") */
  matrix?: MatrixChoicesInfo;
  unmatchedNames: string[];
  warnings: string[];
  error?: string;
}

export interface ChoicesImportOptions {
  /** Column holding the student ID for Google Form grid imports (auto-detected when omitted) */
  idColumn?: number;
  /** studentId -> rowIndex chosen when several rows share a student ID (default: latest row) */
  duplicateSelections?: Record<string, number>;
}

export interface MatrixChoicesInfo {
  /** Column used to match rows to the roster */
  idColumnIndex: number | null;
  /** Columns the user may pick from (every non-group column) */
  idColumnOptions: Array<{ index: number; header: string }>;
  stats: {
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    blankIdRows: number;
    noChoiceRows: number;
    duplicateRows: number;
    studentsWithChoices: number;
  };
  /** Sample rows: what the import row looked like and how it parsed */
  samples: Array<{
    rowIndex: number;
    rawCells: Array<{ header: string; value: string }>;
    idValue: string;
    studentName: string | null;
    choices: string[];
  }>;
  /** Student IDs that appear on more than one row */
  duplicates: Array<{
    studentId: string;
    studentName: string;
    rows: Array<{ rowIndex: number; choices: string[]; used: boolean }>;
  }>;
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
export function prepareRoster(text: string, mappingsOverride?: ColumnMapping[]): PreparedRoster {
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
  mappingsOverride?: ColumnMapping[],
  options: ChoicesImportOptions = {}
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
  const matrix = detectMatrixFormat(rawData);
  if (
    matrix.isMatrixFormat &&
    rawData.rows.some((row) =>
      matrix.columns.some((col) => extractChoiceRank(row.cells[col.columnIndex] ?? '') !== null)
    )
  ) {
    return prepareMatrixChoices(rawData, matrix.columns, roster, base, options);
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

const MAX_MATRIX_CHOICES = 5;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

/**
 * Google Forms grid format: one column per group, cells like "1st Choice".
 * Rows are matched to the roster by student ID found in a single non-group column.
 */
function prepareMatrixChoices(
  rawData: RawSheetData,
  columns: MatrixPreferenceColumn[],
  roster: ParsedStudent[],
  base: PreparedChoices,
  options: ChoicesImportOptions
): PreparedChoices {
  const groupCols = columns.map((c) => ({ ...c, groupName: decodeEntities(c.groupName) }));
  const groupIdx = new Set(groupCols.map((c) => c.columnIndex));
  const columnMappings: ColumnMapping[] = rawData.headers.map((headerName, columnIndex) => ({
    columnIndex,
    headerName,
    mappedTo: null
  }));
  const idColumnOptions = rawData.headers
    .map((header, index) => ({ index, header: decodeEntities(header) }))
    .filter((o) => !groupIdx.has(o.index));

  const byId = new Map<string, ParsedStudent>();
  for (const student of roster) byId.set(normalize(student.id), student);
  const cellOf = (row: RawSheetData['rows'][number], i: number) =>
    decodeEntities((row.cells[i] ?? '').trim());

  // Default: the column whose header mentions "email"; otherwise the one matching the most roster IDs
  let idColumnIndex: number | null = null;
  if (options.idColumn !== undefined && idColumnOptions.some((o) => o.index === options.idColumn)) {
    idColumnIndex = options.idColumn;
  } else {
    idColumnIndex = idColumnOptions.find((o) => /e-?mail/i.test(o.header))?.index ?? null;
    if (idColumnIndex === null) {
      let best = 0;
      for (const o of idColumnOptions) {
        const hits = rawData.rows.filter((r) => byId.has(normalize(cellOf(r, o.index)))).length;
        if (hits > best) {
          best = hits;
          idColumnIndex = o.index;
        }
      }
    }
  }

  const rowStudentLinks: PreparedChoices['rowStudentLinks'] = [];
  const unmatchedNames: string[] = [];
  const stats = {
    totalRows: rawData.rows.length,
    matchedRows: 0,
    unmatchedRows: 0,
    blankIdRows: 0,
    noChoiceRows: 0,
    duplicateRows: 0,
    studentsWithChoices: 0
  };
  const samples: MatrixChoicesInfo['samples'] = [];
  const candidates = new Map<string, Array<{ rowIndex: number; choices: string[] }>>();

  for (const row of rawData.rows) {
    const idValue = idColumnIndex === null ? '' : cellOf(row, idColumnIndex);
    if (!idValue) {
      stats.blankIdRows++;
      continue;
    }
    const match = byId.get(normalize(idValue));
    const choices = parseMatrixRow(row, groupCols).rankedChoices.slice(0, MAX_MATRIX_CHOICES);
    if (samples.length < 3) {
      samples.push({
        rowIndex: row.rowIndex,
        rawCells: rawData.headers
          .map((header, i) => ({ header: decodeEntities(header), value: cellOf(row, i) }))
          .filter((c) => c.value),
        idValue,
        studentName: match?.displayName ?? null,
        choices
      });
    }
    if (!match) {
      stats.unmatchedRows++;
      unmatchedNames.push(idValue);
      continue;
    }
    stats.matchedRows++;
    rowStudentLinks.push({ rowIndex: row.rowIndex, studentId: match.id });
    if (choices.length === 0) {
      stats.noChoiceRows++;
      continue;
    }
    const list = candidates.get(match.id) ?? [];
    list.push({ rowIndex: row.rowIndex, choices });
    candidates.set(match.id, list);
  }

  const preferences: ParsedPreference[] = [];
  const duplicates: MatrixChoicesInfo['duplicates'] = [];
  const groupNames = new Set<string>();
  for (const [studentId, rows] of candidates) {
    const selected = options.duplicateSelections?.[studentId];
    const chosen = rows.find((r) => r.rowIndex === selected) ?? rows[rows.length - 1];
    chosen.choices.forEach((c) => groupNames.add(c));
    preferences.push({ studentId, likeGroupIds: chosen.choices });
    if (rows.length > 1) {
      stats.duplicateRows += rows.length - 1;
      duplicates.push({
        studentId,
        studentName: byId.get(normalize(studentId))?.displayName ?? studentId,
        rows: rows.map((r) => ({ ...r, used: r === chosen }))
      });
    }
  }
  stats.studentsWithChoices = preferences.length;

  const warnings: string[] = [];
  if (stats.unmatchedRows > 0) {
    warnings.push(
      `${stats.unmatchedRows} row${stats.unmatchedRows === 1 ? '' : 's'} in the choices file did not match a roster student ID and will be skipped.`
    );
  }

  return {
    ...base,
    preferences,
    // Keep every form column as a group, even if nobody picked it
    groupNames: Array.from(new Set([...groupCols.map((c) => c.groupName), ...groupNames])),
    rawData,
    columnMappings,
    rowStudentLinks,
    coveredCount: preferences.length,
    matrix: {
      idColumnIndex,
      idColumnOptions,
      stats,
      samples,
      duplicates
    },
    unmatchedNames,
    warnings
  };
}
