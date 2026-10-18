import { describe, it, expect } from 'vitest';
import { prepareRoster, prepareChoices } from './prepareGroupingActivityImport';

describe('prepareChoices matrix (Google Form)', () => {
  it('parses ranked grid columns', () => {
    const roster = prepareRoster('Ann Lee\nBo Kim');
    const text = [
      ['Timestamp', 'Email Address', 'Your First &amp; Last Name', 'Please Request Four Clubs: [Car Club]', 'Please Request Four Clubs: [Book Club]', 'Please Request Four Clubs: [Scholar\'s Bowl]'].join('\t'),
      ['1/1', 'a@x.org', 'Ann Lee', '2nd Choice', '1st Choice', ''].join('\t'),
      ['1/1', 'b@x.org', 'Nobody', '1st Choice', '', ''].join('\t')
    ].join('\n');
    const r = prepareChoices(text, roster.students);
    expect(r.error).toBeUndefined();
    expect(r.preferences).toEqual([
      { studentId: roster.students[0].id, likeGroupIds: ['Book Club', 'Car Club'] }
    ]);
    expect(r.groupNames).toEqual(['Car Club', 'Book Club', "Scholar's Bowl"]);
    expect(r.unmatchedNames).toEqual(['Nobody']);
  });
});
