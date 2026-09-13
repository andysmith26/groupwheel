import type { Student, StudentPreference } from '$lib/domain';
import { normalizeStudentTags, setSourceStudentId } from '$lib/domain/student';
import type { ColumnMapping, RawSheetData } from '$lib/domain/import';
import { generateStudentId, hasRequiredMappings, validateMappedData } from '$lib/domain/import';

export const SHEET_DATA_GUIDANCE = [
  '"Students" tab: columns should include ID and Name (with a header row).',
  'Each student needs a unique ID (email or other identifier).'
];

export class SheetDataError extends Error {
  guidance: string[];
  constructor(message: string, guidance: string[] = SHEET_DATA_GUIDANCE) {
    super(message);
    this.name = 'SheetDataError';
    this.guidance = guidance;
  }
}

export interface RosterData {
  studentsById: Record<string, Student>;
  /** Raw tag name strings parsed from source data, keyed by student ID. */
  rawTagsByStudentId: Record<string, string[]>;
  preferencesById: Record<string, StudentPreference>;
  studentOrder: string[];
  /** @deprecated No longer used - kept for API compatibility */
  unknownFriendIds: Set<string>;
}

export interface SheetStudentPayload {
  id?: string;
  firstName?: string;
  preferredName?: string;
  lastName?: string;
  tags?: string[];
  gender?: string;
}

export interface SheetApiPayload {
  success?: boolean;
  students?: SheetStudentPayload[];
  connections?: Record<string, unknown>;
  studentCount?: number;
}

interface ParsedRosterStudent {
  id: string;
  sourceStudentId: string;
  firstName: string;
  preferredName?: string;
  lastName: string;
  tags?: string[];
}

/**
 * Parse roster data from pasted text (CSV or TSV).
 * Creates students with empty preferences (group requests will be imported separately).
 */
export function parseRosterFromPaste(text: string): RosterData {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('Please paste at least one student row.');
  }

  const parsedTabSeparatedRows = tryParseTabSeparatedRows(lines);
  if (parsedTabSeparatedRows) {
    return buildRosterData(parsedTabSeparatedRows);
  }

  if (lines.length < 2) {
    throw new Error('Please paste at least a header row and one data row.');
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const header = lines[0].split(delimiter).map(normalizeHeaderCell);
  const colName = (...wanted: string[]) => header.findIndex((h) => wanted.includes(h));

  const nameIdx = colName('display name', 'name');
  const firstNameIdx = colName('first name', 'firstname', 'first');
  const preferredNameIdx = colName(
    'preferred name',
    'preferredname',
    'preferred',
    'nickname',
    'chosen name',
    'chosenname'
  );
  const tagsIdx = colName('tags', 'tag', 'labels', 'label', 'categories', 'category');
  const lastNameIdx = colName('last name', 'lastname', 'last');
  const idIdx = colName('id', 'student id', 'studentid');
  if ((nameIdx === -1 && firstNameIdx === -1) || idIdx === -1) {
    throw new Error('Headers must include "display name" (or "name") or "first name", plus "id".');
  }

  const students: ParsedRosterStudent[] = [];

  for (let r = 1; r < lines.length; r++) {
    const raw = lines[r];
    const cells = splitCsvTsvRow(raw, delimiter, header.length);
    if (!cells) continue;

    const name =
      nameIdx !== -1
        ? (cells[nameIdx] ?? '').trim()
        : `${(cells[firstNameIdx] ?? '').trim()} ${(cells[lastNameIdx] ?? '').trim()}`.trim();
    const sourceStudentId = (cells[idIdx] ?? '').trim();
    const id = sourceStudentId.toLowerCase();

    if (!id) {
      continue;
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const preferredName = preferredNameIdx === -1 ? '' : (cells[preferredNameIdx] ?? '').trim();
    const tags = tagsIdx === -1 ? [] : normalizeStudentTags((cells[tagsIdx] ?? '').split(/[,;|]/));
    const lastName = nameParts.slice(1).join(' ') || '';

    students.push({
      id,
      sourceStudentId,
      firstName,
      preferredName: preferredName || undefined,
      lastName,
      tags
    });
  }

  return buildRosterData(students);
}

/**
 * Build roster data from a user-reviewed column mapping.
 *
 * The field mapping UI is shared by pasted, uploaded, and Google Sheets data;
 * this parser keeps roster-paste imports aligned with its selected mappings.
 */
export function parseRosterFromMappedData(
  data: RawSheetData,
  mappings: ColumnMapping[]
): RosterData {
  if (!hasRequiredMappings(mappings)) {
    throw new Error('Map a First Name or Display Name column before importing.');
  }

  const validation = validateMappedData(data, mappings);
  if (validation.validRows.length === 0) {
    throw new Error('No valid student rows found in the pasted data.');
  }

  const students = validation.validRows.flatMap((row) => {
    if (!row.student) return [];

    const sourceStudentId = row.student.sourceStudentId;
    return [
      {
        id: (
          sourceStudentId ||
          generateStudentId(row.student.firstName, row.student.lastName, row.rowIndex)
        ).toLowerCase(),
        sourceStudentId:
          sourceStudentId ||
          generateStudentId(row.student.firstName, row.student.lastName, row.rowIndex),
        firstName: row.student.firstName,
        preferredName: row.student.preferredName,
        lastName: row.student.lastName ?? '',
        tags: row.student.tags
      }
    ];
  });

  return buildRosterData(students);
}

function normalizeHeaderCell(value: string): string {
  return value.trim().toLowerCase();
}

function tryParseTabSeparatedRows(lines: string[]): ParsedRosterStudent[] | null {
  const parsedStudents: ParsedRosterStudent[] = [];

  for (const line of lines) {
    if (!line.includes('\t')) {
      return null;
    }

    const cells = splitCsvTsvRow(line, '\t', 3).map((cell) => cell.trim());
    const [firstName, lastName, rawId] = cells;
    const sourceStudentId = rawId;
    const id = rawId.toLowerCase();

    if (
      normalizeHeaderCell(firstName) === 'first' &&
      normalizeHeaderCell(lastName) === 'last' &&
      (normalizeHeaderCell(rawId) === 'id' || normalizeHeaderCell(rawId) === 'student id')
    ) {
      return null;
    }

    if (!firstName || !lastName || !id) {
      return null;
    }

    parsedStudents.push({ id, sourceStudentId, firstName, lastName });
  }

  return parsedStudents;
}

function buildRosterData(students: ParsedRosterStudent[]): RosterData {
  const map: Record<string, Student> = {};
  const rawTagsByStudentId: Record<string, string[]> = {};
  const order: string[] = [];
  const prefMap: Record<string, StudentPreference> = {};

  for (const [index, student] of students.entries()) {
    if (map[student.id]) {
      throw new Error(`Duplicate id found on row ${index + 1}: ${student.id}`);
    }

    map[student.id] = {
      id: student.id,
      firstName: student.firstName,
      preferredName: student.preferredName,
      lastName: student.lastName,
      tagIds: [],
      gender: '',
      meta: setSourceStudentId(undefined, student.sourceStudentId)
    };
    if (student.tags && student.tags.length > 0) {
      rawTagsByStudentId[student.id] = [...student.tags];
    }
    order.push(student.id);

    prefMap[student.id] = {
      studentId: student.id,
      avoidStudentIds: [],
      likeGroupIds: [],
      avoidGroupIds: [],
      meta: {}
    };
  }

  return {
    studentsById: map,
    rawTagsByStudentId,
    preferencesById: prefMap,
    studentOrder: order,
    unknownFriendIds: new Set() // Deprecated, kept for compatibility
  };
}

/**
 * Parse roster data from structured sheets data.
 * Creates students with empty preferences (group requests will be imported separately).
 */
export function parseRosterFromSheets(
  students: Array<{
    id: string;
    firstName: string;
    preferredName?: string;
    lastName: string;
    tags?: string[];
    gender: string;
  }>,
  _connections: Record<string, string[]> = {} // Deprecated parameter, ignored
): RosterData {
  const map: Record<string, Student> = {};
  const rawTagsByStudentId: Record<string, string[]> = {};
  const prefMap: Record<string, StudentPreference> = {};
  const order: string[] = [];

  for (const student of students) {
    if (!student.id) continue;

    const id = student.id.toLowerCase();

    if (map[id]) {
      throw new Error(`Duplicate student ID: ${student.id}`);
    }

    map[id] = {
      id,
      firstName: student.firstName,
      preferredName: student.preferredName,
      lastName: student.lastName,
      tagIds: [],
      gender: student.gender
    };
    const normalizedTags = normalizeStudentTags(student.tags);
    if (normalizedTags.length > 0) {
      rawTagsByStudentId[id] = normalizedTags;
    }

    // Create empty preference - group requests will be imported separately
    prefMap[id] = {
      studentId: id,
      avoidStudentIds: [],
      likeGroupIds: [],
      avoidGroupIds: [],
      meta: {}
    };

    order.push(id);
  }

  return {
    studentsById: map,
    rawTagsByStudentId,
    preferencesById: prefMap,
    studentOrder: order,
    unknownFriendIds: new Set() // Deprecated, kept for compatibility
  };
}

export function splitCsvTsvRow(row: string, delim: string, minCols: number) {
  const parts = row.split(delim);
  if (parts.length < minCols) {
    while (parts.length < minCols) parts.push('');
  }
  return parts;
}

export function normalizeSheetResponse(payload: unknown) {
  const data = (payload ?? {}) as SheetApiPayload;
  const students = Array.isArray(data.students) ? data.students : [];

  if (students.length === 0) {
    throw new SheetDataError(
      'No student rows were returned from Google Sheets.',
      SHEET_DATA_GUIDANCE
    );
  }

  const validStudents: Array<{
    id: string;
    firstName: string;
    preferredName?: string;
    lastName: string;
    tags?: string[];
    gender: string;
  }> = [];
  for (const student of students) {
    if (!student || typeof student !== 'object') continue;
    const id = typeof student.id === 'string' ? student.id.trim() : '';
    if (!id) continue;
    validStudents.push({
      id,
      firstName: typeof student.firstName === 'string' ? student.firstName : '',
      preferredName: typeof student.preferredName === 'string' ? student.preferredName : undefined,
      lastName: typeof student.lastName === 'string' ? student.lastName : '',
      tags: normalizeStudentTags(student.tags),
      gender: typeof student.gender === 'string' ? student.gender : ''
    });
  }

  if (validStudents.length === 0) {
    throw new SheetDataError(
      "No IDs were found in the Students tab. Column A must contain each student's email or unique ID.",
      SHEET_DATA_GUIDANCE
    );
  }

  // Connections are no longer used - return empty object
  return { students: validStudents, connections: {} as Record<string, string[]> };
}

/**
 * Get a test dataset for development/testing.
 */
export function getTestRosterDataset() {
  const students = [
    { id: 'and-al-1', firstName: 'Alice', lastName: 'Anderson', gender: 'F' },
    { id: 'bro-bo-1', firstName: 'Bob', lastName: 'Brown', gender: 'M' },
    { id: 'che-ca-1', firstName: 'Carol', lastName: 'Chen', gender: 'F' },
    { id: 'dav-da-1', firstName: 'David', lastName: 'Davis', gender: 'M' },
    { id: 'eva-ev-1', firstName: 'Eve', lastName: 'Evans', gender: 'F' },
    { id: 'fos-fr-1', firstName: 'Frank', lastName: 'Foster', gender: 'M' },
    { id: 'gar-gr-1', firstName: 'Grace', lastName: 'Garcia', gender: 'F' },
    { id: 'har-he-1', firstName: 'Henry', lastName: 'Harris', gender: 'M' },
    { id: 'iva-ir-1', firstName: 'Iris', lastName: 'Ivanov', gender: 'F' },
    { id: 'jac-ja-1', firstName: 'Jack', lastName: 'Jackson', gender: 'M' },
    { id: 'kim-ka-1', firstName: 'Kate', lastName: 'Kim', gender: 'F' },
    { id: 'lop-le-1', firstName: 'Leo', lastName: 'Lopez', gender: 'M' },
    { id: 'mil-ma-1', firstName: 'Maya', lastName: 'Miller', gender: 'F' },
    { id: 'ngu-ni-1', firstName: 'Nina', lastName: 'Nguyen', gender: 'F' },
    { id: 'ort-os-1', firstName: 'Oscar', lastName: 'Ortiz', gender: 'M' },
    { id: 'par-pa-1', firstName: 'Paul', lastName: 'Park', gender: 'M' },
    { id: 'qui-qu-1', firstName: 'Quinn', lastName: 'Quinn', gender: 'X' },
    { id: 'rob-ro-1', firstName: 'Rose', lastName: 'Roberts', gender: 'F' },
    { id: 'smi-sa-1', firstName: 'Sam', lastName: 'Smith', gender: 'M' },
    { id: 'tay-ti-1', firstName: 'Tina', lastName: 'Taylor', gender: 'F' }
  ];

  // No connections - these are now handled via group requests
  const connections: Record<string, string[]> = {};

  return { students, connections };
}
