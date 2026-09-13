import type { ColumnMapping, MappedField, RawSheetData } from '$lib/domain/import';

/**
 * Suggest a destination field for an imported column header.
 *
 * This is intentionally shared by every import surface so a header-recognition
 * improvement is available consistently for pasted data, uploaded files, and
 * Google Sheets.
 */
export function guessImportFieldMapping(header: string): MappedField | null {
  const normalized = header.toLowerCase().trim();
  const normalizedWords = normalized.replace(/[^a-z0-9]+/g, ' ').trim();
  const compactHeader = normalizedWords.replaceAll(' ', '');

  if (
    [
      'studentid',
      'studentnumber',
      'studentno',
      'studentnum',
      'pupilid',
      'sisid',
      'schoolid'
    ].includes(compactHeader) ||
    normalized === 'id' ||
    normalized === 'email'
  ) {
    return 'studentId';
  }

  if (normalized === 'display name' || normalized === 'name') {
    return 'displayName';
  }

  if (
    normalized === 'first name' ||
    normalized === 'firstname' ||
    normalized === 'first' ||
    normalized === 'fname'
  ) {
    return 'firstName';
  }

  if (
    normalized === 'preferred name' ||
    normalized === 'preferredname' ||
    normalized === 'preferred' ||
    normalized === 'nickname' ||
    normalized === 'chosen name' ||
    normalized === 'chosenname'
  ) {
    return 'preferredName';
  }

  if (
    normalized === 'tags' ||
    normalized === 'tag' ||
    normalized === 'labels' ||
    normalized === 'label' ||
    normalized === 'categories' ||
    normalized === 'category'
  ) {
    return 'tags';
  }

  if (
    normalized === 'last name' ||
    normalized === 'lastname' ||
    normalized === 'last' ||
    normalized === 'lname' ||
    normalized === 'surname'
  ) {
    return 'lastName';
  }

  if (
    normalized.includes('peer request') ||
    normalized.includes('partner request') ||
    normalized.includes('requested peer') ||
    normalized.includes('requested partner') ||
    normalized.includes('preferred peer') ||
    normalized.includes('preferred partner') ||
    normalized.includes('work with') ||
    normalized.includes('want to work with') ||
    /\b(peer|partner|teammate|groupmate)s?\b/.test(normalizedWords)
  ) {
    return `peerRequest${getRank(normalized)}` as MappedField;
  }

  if (
    normalized.includes('choice') ||
    normalized.includes('preference') ||
    normalized.includes('rank') ||
    normalized.includes('pick')
  ) {
    return `choice${getRank(normalized)}` as MappedField;
  }

  return null;
}

/** Create an editable mapping for each source column using shared suggestions. */
export function createImportColumnMappings(data: RawSheetData): ColumnMapping[] {
  return data.headers.map((headerName, columnIndex) => ({
    columnIndex,
    headerName,
    mappedTo: guessImportFieldMapping(headerName)
  }));
}

/**
 * Create mappings for the existing-activity peer request importer.
 *
 * This importer accepts only source Student IDs and ranked peer requests.
 * Group-choice headers are treated as peer request ranks because they are a
 * common label for the same source data in classroom spreadsheets.
 */
export function createPeerRequestColumnMappings(data: RawSheetData): ColumnMapping[] {
  return data.headers.map((headerName, columnIndex) => {
    const suggestedField = guessImportFieldMapping(headerName);
    const mappedTo = suggestedField?.startsWith('choice')
      ? (`peerRequest${suggestedField.slice('choice'.length)}` as MappedField)
      : suggestedField === 'studentId' ||
          suggestedField === 'displayName' ||
          suggestedField === 'firstName' ||
          suggestedField === 'lastName' ||
          suggestedField?.startsWith('peerRequest')
        ? suggestedField
        : 'ignore';

    return { columnIndex, headerName, mappedTo };
  });
}

function getRank(header: string): number {
  const match = header.match(/[1-5]/);
  return match ? parseInt(match[0], 10) : 1;
}
