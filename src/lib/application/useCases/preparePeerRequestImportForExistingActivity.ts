import type { ColumnMapping, RawSheetData, UnmatchedStudentIdRow } from '$lib/domain/import';
import {
  getMappedColumnIndex,
  hasAnyChoiceMappings,
  hasAnyPeerRequestMappings,
  hasDuplicateMappings,
  isPeerRequestField
} from '$lib/domain/import';

export interface PreparedUnmatchedPeerRequestRow extends UnmatchedStudentIdRow {
  matchName: string;
  peerRequestTexts: string[];
}

export function validatePeerRequestImportMappings(mappings: ColumnMapping[]): string | null {
  const duplicateMappings = hasDuplicateMappings(mappings);
  if (duplicateMappings.length > 0) {
    return `Resolve duplicate mappings before continuing: ${duplicateMappings.join(', ')}.`;
  }

  if (getMappedColumnIndex(mappings, 'studentId') === null) {
    return 'Map the source Student ID column before continuing.';
  }

  if (!hasAnyPeerRequestMappings(mappings)) {
    return 'Map at least one Peer Request column before continuing.';
  }

  if (hasAnyChoiceMappings(mappings)) {
    return 'This importer only supports peer requests. Remove any Choice mappings and try again.';
  }

  return null;
}

export function extractPeerRequestTextsFromCells(
  cells: string[],
  mappings: ColumnMapping[]
): string[] {
  return mappings
    .filter((mapping) => mapping.mappedTo !== null && isPeerRequestField(mapping.mappedTo))
    .sort((left, right) => left.columnIndex - right.columnIndex)
    .map((mapping) => (cells[mapping.columnIndex] ?? '').trim())
    .filter((value) => value.length > 0);
}

export function extractMatchNameFromCells(cells: string[], mappings: ColumnMapping[]): string {
  const displayNameIdx = getMappedColumnIndex(mappings, 'displayName');
  const displayName = displayNameIdx !== null ? (cells[displayNameIdx] ?? '').trim() : '';
  if (displayName) return displayName;
  const firstNameIdx = getMappedColumnIndex(mappings, 'firstName');
  const lastNameIdx = getMappedColumnIndex(mappings, 'lastName');
  const firstName = firstNameIdx !== null ? (cells[firstNameIdx] ?? '').trim() : '';
  const lastName = lastNameIdx !== null ? (cells[lastNameIdx] ?? '').trim() : '';
  return [firstName, lastName].filter(Boolean).join(' ');
}

export function prepareUnmatchedPeerRequestRows(
  _data: RawSheetData,
  mappings: ColumnMapping[],
  unmatchedRows: UnmatchedStudentIdRow[]
): PreparedUnmatchedPeerRequestRow[] {
  return unmatchedRows.map((row) => ({
    ...row,
    matchName: extractMatchNameFromCells(row.cells, mappings),
    peerRequestTexts: extractPeerRequestTextsFromCells(row.cells, mappings)
  }));
}
