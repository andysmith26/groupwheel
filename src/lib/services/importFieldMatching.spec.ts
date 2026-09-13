import { describe, expect, it } from 'vitest';

import {
  createImportColumnMappings,
  createPeerRequestColumnMappings,
  guessImportFieldMapping
} from './importFieldMatching';

describe('guessImportFieldMapping', () => {
  it.each([
    ['Student ID', 'studentId'],
    ['Student Number', 'studentId'],
    ['SIS-ID', 'studentId'],
    ['Email', 'studentId'],
    ['Display Name', 'displayName'],
    ['First Name', 'firstName'],
    ['surname', 'lastName'],
    ['Group Choice 3', 'choice3'],
    ['Pick', 'choice1'],
    ['Partner Request 2', 'peerRequest2'],
    ['Preferred Partner #3', 'peerRequest3'],
    ['Teammate 4', 'peerRequest4'],
    ['Want to Work With', 'peerRequest1']
  ])('recognizes %s', (header, expected) => {
    expect(guessImportFieldMapping(header)).toBe(expected);
  });

  it('does not map unrelated headers', () => {
    expect(guessImportFieldMapping('Teacher notes')).toBeNull();
  });
});

describe('createImportColumnMappings', () => {
  it('creates one suggested mapping per header', () => {
    expect(
      createImportColumnMappings({
        headers: ['First Name', 'Last Name', 'Student ID'],
        rows: []
      })
    ).toEqual([
      { columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Last Name', mappedTo: 'lastName' },
      { columnIndex: 2, headerName: 'Student ID', mappedTo: 'studentId' }
    ]);
  });
});

describe('createPeerRequestColumnMappings', () => {
  it('preserves Student ID, peer request, and matching-only name fields', () => {
    expect(
      createPeerRequestColumnMappings({
        headers: ['Student ID', 'Peer Request 1', 'Choice 2', 'First Name', 'Name', 'Last Name'],
        rows: []
      })
    ).toEqual([
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' },
      { columnIndex: 2, headerName: 'Choice 2', mappedTo: 'peerRequest2' },
      { columnIndex: 3, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 4, headerName: 'Name', mappedTo: 'displayName' },
      { columnIndex: 5, headerName: 'Last Name', mappedTo: 'lastName' }
    ]);
  });
});
